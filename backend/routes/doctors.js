// backend/routes/doctors.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// ---------- helpers ----------
const toDoctor = (r) => ({
    username: r.username,
    full_name: r.full_name,
    specialty: r.specialty,
    room: r.room,
    floor: r.floor,
});

const toEncounter = (r) => ({
    id: r.encounter_id,
    encounter_id: r.encounter_id,
    queue_number: r.queue_number,
    name: r.full_name,
    full_name: r.full_name,
    sex: r.sex,
    dateOfBirth: r.dob,
    currentStage: r.status,
    esiLevel: r.priority_esi ?? null,
    assignedDoctor: r.assigned_doctor || null,
    assignedNurse: r.assigned_nurse || null,
    arrivalTime: r.arrival_time || null,  // ✅ FIXED
    triageTime: r.triage_time || null,     // ✅ FIXED
    disposition: r.disposition || null,
    diagnosis: r.diagnosis || null,
});

// Map UI disposition -> next encounter.status
const NEXT_STAGE_BY_DISPOSITION = {
    'Discharge': 'discharge_documents',
    'Observation': 'waiting_observation',
    'Admission Non-ICU': 'awaiting_non_icu',
    'Admission ICU': 'awaiting_icu',
};

// ---------- DOCTOR LIST ----------
router.get('/doctors', async (_req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT username, full_name, specialty, room, floor
             FROM users
             WHERE role = 'doctor'
             ORDER BY COALESCE(full_name, username)`
        );
        res.json(rows.map(toDoctor));
    } catch (e) {
        console.error('GET /doctors error:', e);
        res.status(500).json({ error: 'Failed to load doctors' });
    }
});

// ---------- MANAGER LIST (optional nice-to-have) ----------
router.get('/managers', async (_req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT username, full_name, specialty, room, floor
             FROM users
             WHERE role = 'ed_manager'
             ORDER BY COALESCE(full_name, username)`
        );
        res.json(rows.map(toDoctor));
    } catch (e) {
        console.error('GET /managers error:', e);
        res.status(500).json({ error: 'Failed to load managers' });
    }
});

// ---------- USER PROFILE for doctors AND managers ----------
router.get('/doctor/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const [rows] = await db.query(
            `SELECT username, role, full_name, specialty, room, floor
             FROM users
             WHERE username = ?
               AND role IN ('doctor','ed_manager')
                 LIMIT 1`,
            [username]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json(toDoctor(rows[0]));
    } catch (e) {
        console.error('GET /doctor/:username error:', e);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// ---------- Clean alias specifically for managers (optional) ----------
router.get('/manager/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const [rows] = await db.query(
            `SELECT username, role, full_name, specialty, room, floor
             FROM users
             WHERE username = ?
               AND role = 'ed_manager'
                 LIMIT 1`,
            [username]
        );
        if (!rows.length) return res.status(404).json({ error: 'Manager not found' });
        res.json(toDoctor(rows[0]));
    } catch (e) {
        console.error('GET /manager/:username error:', e);
        res.status(500).json({ error: 'Failed to load manager' });
    }
});

// ---------- Patients assigned to a doctor ----------
// ---------- Patients assigned to a doctor ----------
router.get('/doctor/:username/patients', async (req, res) => {
    try {
        const { username } = req.params;

        const [rows] = await db.query(
            `SELECT
                 e.id AS encounter_id,
                 e.queue_number,
                 e.status,
                 e.priority_esi,
                 e.assigned_doctor,
                 e.assigned_nurse,
                 e.arrival_time,
                 e.triage_time,
                 e.provider_start_time,
                 e.diagnosis,
                 e.disposition,
                 p.id AS patient_id,
                 p.full_name,
                 p.dob,
                 p.sex
             FROM encounters e
                      JOIN patients p ON p.id = e.patient_id
             WHERE e.assigned_doctor = ?
               AND (
                 e.status <> 'departed'
                     OR (e.status = 'departed' AND DATE(e.depart_time) = CURDATE())
                 )
             ORDER BY
                 CASE e.status
                 WHEN 'waiting_doctor'   THEN 0
                 WHEN 'consultation'     THEN 1
                 WHEN 'in_observation'   THEN 2
                 WHEN 'admitted_non_icu' THEN 3
                 WHEN 'admitted_icu'     THEN 4
                 ELSE 5
            END,
                 COALESCE(e.priority_esi, 99),
                 e.arrival_time ASC`,
            [username]
        );

        res.json(rows.map(toEncounter));
    } catch (e) {
        console.error('GET /doctor/:username/patients error:', e);
        res.status(500).json({ error: 'Failed to load doctor patients' });
    }
});

// ---------- Start consultation ----------
router.post('/doctor/encounters/:id/start', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid encounter id' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters
             SET status = 'consultation',
                 provider_start_time = IFNULL(provider_start_time, NOW()),
                 updated_at = NOW()
             WHERE id = ?`,
            [id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'provider_started', NOW(), NULL)`,
            [id]
        );

        await conn.commit();
        res.json({ ok: true });
    } catch (e) {
        await conn.rollback();
        console.error('POST /doctor/encounters/:id/start error:', e);
        res.status(500).json({ error: 'Failed to start consultation' });
    } finally {
        conn.release();
    }
});

// ---------- Complete consultation with ICD-10 support ----------
router.patch('/doctor/encounters/:id/complete', async (req, res) => {
    const id = Number(req.params.id);
    const { diagnosis, disposition, icdCodes } = req.body || {};

    if (!id) return res.status(400).json({ error: 'Invalid encounter id' });
    if (!diagnosis || !disposition) {
        return res.status(400).json({ error: 'diagnosis and disposition are required' });
    }

    const FINAL_STATUS_BY_DISPOSITION = {
        'Discharge': 'departed',
        'Observation': 'in_observation',
        'Admission Non-ICU': 'admitted_non_icu',
        'Admission ICU': 'admitted_icu',
    };

    const finalStatus = FINAL_STATUS_BY_DISPOSITION[disposition];
    if (!finalStatus) {
        return res.status(400).json({ error: `Unknown disposition: ${disposition}` });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [r] = await conn.query(
            `UPDATE encounters
             SET status = ?,
                 diagnosis = ?,
                 disposition = ?,
                 depart_time = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [finalStatus, diagnosis, disposition, id]
        );

        if (!r.affectedRows) {
            await conn.rollback();
            return res.status(404).json({ error: 'Encounter not found' });
        }

        if (icdCodes && Array.isArray(icdCodes) && icdCodes.length > 0) {
            await conn.query('DELETE FROM encounter_icd_codes WHERE encounter_id = ?', [id]);

            const values = icdCodes.map(icd => [id, icd.code, icd.description || '']);
            await conn.query(
                'INSERT INTO encounter_icd_codes (encounter_id, icd_code, icd_description) VALUES ?',
                [values]
            );

            console.log(`✅ Stored ${icdCodes.length} ICD-10 codes for encounter ${id}`);
        }

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'dispositioned', NOW(), JSON_OBJECT('nextStatus', ?, 'diagnosis', ?, 'disposition', ?))`,
            [id, finalStatus, diagnosis, disposition]
        );

        let completionEventType;
        switch (disposition) {
            case 'Discharge':
                completionEventType = 'departed';
                break;
            case 'Observation':
                completionEventType = 'transferred';
                break;
            case 'Admission Non-ICU':
                completionEventType = 'transferred';
                break;
            case 'Admission ICU':
                completionEventType = 'transferred';
                break;
            default:
                completionEventType = 'departed';
        }

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, ?, NOW(), JSON_OBJECT('disposition', ?))`,
            [id, completionEventType, disposition]
        );

        await conn.commit();

        console.log(`✅ Consultation completed - Patient ${finalStatus}:`, id);

        res.json({ ok: true, nextStatus: finalStatus });

    } catch (e) {
        await conn.rollback();
        console.error('PATCH /doctor/encounters/:id/complete error:', e);
        res.status(500).json({ error: e.sqlMessage || e.message || 'Server error' });
    } finally {
        conn.release();
    }
});

// ---------- Transfer encounter to another doctor ----------
router.post('/doctor/encounters/:id/transfer', async (req, res) => {
    const id = Number(req.params.id);
    const { toDoctor, note } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Invalid encounter id' });
    if (!toDoctor) return res.status(400).json({ error: 'toDoctor is required' });

    const performedBy = req.user?.username || null;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT id, assigned_doctor, patient_id, status
             FROM encounters
             WHERE id = ?
                 FOR UPDATE`,
            [id]
        );
        if (!rows || rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Encounter not found' });
        }
        const current = rows[0];
        const fromDoctor = current.assigned_doctor || null;

        await conn.query(
            `UPDATE encounters
             SET assigned_doctor = ?, status = 'waiting_doctor', updated_at = NOW()
             WHERE id = ?`,
            [toDoctor, id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'transferred', NOW(), JSON_OBJECT(
                     'fromDoctor', ?, 'toDoctor', ?, 'note', ?, 'performedBy', ?
                                              ))`,
            [id, fromDoctor, toDoctor, note || null, performedBy]
        );

        await conn.commit();

        const [updatedRows] = await db.query(
            `SELECT id AS encounter_id, queue_number, status, assigned_doctor, arrival_time, disposition, diagnosis
             FROM encounters
             WHERE id = ?`,
            [id]
        );

        return res.json({ ok: true, encounter: updatedRows[0] || null });
    } catch (err) {
        await conn.rollback();
        console.error('POST /doctor/encounters/:id/transfer error:', err);
        return res.status(500).json({ error: err.sqlMessage || err.message || 'Server error' });
    } finally {
        conn.release();
    }
});

// ---------- Resume from observation ----------
router.post('/doctor/encounters/:id/resume', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid encounter id' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters 
             SET status = 'consultation', 
                 updated_at = NOW() 
             WHERE id = ?`,
            [id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'resumed_from_observation', NOW(), NULL)`,
            [id]
        );

        await conn.commit();
        res.json({ ok: true });
    } catch (e) {
        await conn.rollback();
        console.error('POST /doctor/encounters/:id/resume error:', e);
        res.status(500).json({ error: 'Failed to resume observation' });
    } finally {
        conn.release();
    }
});

// ---------- Mark admitted patient as departed ----------
router.post('/doctor/encounters/:id/depart', async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid encounter id' });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters 
             SET status = 'departed', 
                 depart_time = NOW(),
                 updated_at = NOW() 
             WHERE id = ?`,
            [id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'departed', NOW(), NULL)`,
            [id]
        );

        await conn.commit();
        res.json({ ok: true });
    } catch (e) {
        await conn.rollback();
        console.error('POST /doctor/encounters/:id/depart error:', e);
        res.status(500).json({ error: 'Failed to mark as departed' });
    } finally {
        conn.release();
    }
});

module.exports = router;
