// backend/routes/doctors.js
const express = require("express");
const router = express.Router();
const db = require("../db");

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
    arrivalTime: r.arrival_time ? new Date(r.arrival_time).toISOString() : null,
    triageTime: r.triage_time ? new Date(r.triage_time).toISOString() : null,
    disposition: r.disposition || null,
});

// ---------- GET all doctors ----------
router.get("/doctors", async (_req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT username, full_name, specialty, room, floor
             FROM users
             WHERE role='doctor'
             ORDER BY COALESCE(full_name, username)`
        );
        res.json(rows.map(toDoctor));
    } catch (e) {
        console.error("GET /doctors error:", e);
        res.status(500).json({ error: "Failed to load doctors" });
    }
});

// ---------- GET one doctor profile ----------
router.get("/doctor/:username", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT username, full_name, specialty, room, floor
             FROM users
             WHERE role='doctor' AND username = ?
                 LIMIT 1`,
            [req.params.username]
        );
        if (!rows.length) return res.status(404).json({ error: "Doctor not found" });
        res.json(toDoctor(rows[0]));
    } catch (e) {
        console.error("GET /doctor/:username error:", e);
        res.status(500).json({ error: "Failed to load doctor" });
    }
});

// ---------- GET patients assigned to a doctor ----------
router.get("/doctor/:username/patients", async (req, res) => {
    try {
        const [rows] = await db.query(
            `
                SELECT e.id AS encounter_id, e.queue_number, e.status, e.priority_esi,
                       e.assigned_doctor, e.assigned_nurse, e.arrival_time, e.triage_time,
                       e.disposition,
                       p.id AS patient_id, p.full_name, p.dob, p.sex
                FROM encounters e
                         JOIN patients p ON p.id = e.patient_id
                WHERE e.assigned_doctor = ?
                  AND e.status <> 'departed'
                ORDER BY
                    CASE e.status WHEN 'waiting_doctor' THEN 0 WHEN 'consultation' THEN 1 ELSE 2 END,
                    COALESCE(e.priority_esi, 99),
                    e.arrival_time ASC
            `,
            [req.params.username]
        );
        res.json(rows.map(toEncounter));
    } catch (e) {
        console.error("GET /doctor/:username/patients error:", e);
        res.status(500).json({ error: "Failed to load doctor patients" });
    }
});

// ---------- start a consultation ----------
router.post("/doctor/encounters/:id/start", async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid encounter id" });

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters
             SET status='consultation', provider_start_time=NOW()
             WHERE id=?`,
            [id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'provider_started', NOW(), NULL)`,
            [id]
        );

        await conn.commit();
        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        console.error("POST /doctor/encounters/:id/start error:", e);
        res.status(500).json({ error: "Failed to start consultation" });
    } finally {
        conn.release();
    }
});

// ---------- complete a consultation ----------
router.patch("/doctor/encounters/:id/complete", async (req, res) => {
    const id = Number(req.params.id);
    const { diagnosis, disposition } = req.body || {};
    if (!id) return res.status(400).json({ error: "Invalid encounter id" });
    if (!diagnosis || !disposition) {
        return res.status(400).json({ error: "diagnosis and disposition are required" });
    }

    const nextMap = {
        "Discharge": "dispositioned",
        "Observation": "waiting_observation",
        "Admission Non-ICU": "waiting_admission",
        "Admission ICU": "waiting_admission",
    };
    const next = nextMap[disposition] || "dispositioned";

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters SET status=?, disposition=? WHERE id=?`,
            [next, disposition, id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
             VALUES (?, 'dispositioned', NOW(), JSON_OBJECT('diagnosis', ?, 'disposition', ?))`,
            [id, diagnosis, disposition]
        );

        await conn.commit();
        res.json({ success: true, nextStatus: next });
    } catch (e) {
        await conn.rollback();
        console.error("PATCH /doctor/encounters/:id/complete error:", e);
        res.status(500).json({ error: "Failed to complete consultation" });
    } finally {
        conn.release();
    }
});

module.exports = router;
