// backend/routes/whiteboard.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// normalize raw status to snake_case key
const toStageKey = (s) =>
    (s || '').toString().toLowerCase().replace(/[\s-]+/g, '_');

/**
 * GET /api/whiteboard
 * Returns all non-departed encounters with patient info,
 * plus latest chief complaint and diagnosis.
 */
router.get('/whiteboard', async (_req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.id AS encounter_id,
                e.patient_id,
                e.queue_number,
                e.status,
                e.priority_esi,
                e.assigned_doctor,
                e.assigned_nurse,
                e.arrival_time,
                e.triage_time,
                e.room_time,
                e.provider_start_time,
                e.diagnosis,              -- diagnosis lives on encounters
                e.disposition,

                p.full_name,
                p.dob,
                p.sex,

                -- latest "complaint" observation value (chief complaint)
                (
                    SELECT o.value
                    FROM observations o
                    WHERE o.encounter_id = e.id AND o.type = 'complaint'
                    ORDER BY o.recorded_at DESC
                        LIMIT 1
                ) AS chief_complaint
            FROM encounters e
                JOIN patients p ON p.id = e.patient_id
            WHERE e.status IS NULL OR e.status <> 'departed'
            ORDER BY
                CASE e.status
                WHEN 'waiting_triage' THEN 0
                WHEN 'triage' THEN 1
                WHEN 'waiting_registration' THEN 2
                WHEN 'registration' THEN 3
                WHEN 'waiting_doctor' THEN 4
                WHEN 'consultation' THEN 5
                WHEN 'waiting_observation' THEN 6
                WHEN 'waiting_admission' THEN 7
                WHEN 'waiting_discharge' THEN 8
                ELSE 9
            END,
        COALESCE(e.priority_esi, 99),
        e.arrival_time ASC
        `);

        const data = rows.map((r) => ({
            // identity
            id: r.encounter_id,
            encounter_id: r.encounter_id,
            patient_id: r.patient_id,
            queue_number: r.queue_number,

            // patient
            name: r.full_name,
            full_name: r.full_name,
            sex: r.sex || null,
            dateOfBirth: r.dob || null,

            // stage/status
            currentStage: toStageKey(r.status),
            esiLevel: r.priority_esi ?? null,

            // assignments
            assignedDoctor: r.assigned_doctor || null,
            assignedNurse: r.assigned_nurse || null,

            // times (mysql2 gives JS Dates)
            arrivalTime: r.arrival_time || null,
            triageTime: r.triage_time || null,
            roomTime: r.room_time || null,
            providerStartTime: r.provider_start_time || null,

            // clinical
            chiefComplaint: r.chief_complaint || null,
            diagnosis: r.diagnosis || null,
            disposition: r.disposition || null,

            isActive: (r.status || '') !== 'departed',
        }));

        res.json(data);
    } catch (e) {
        console.error('GET /whiteboard error:', e);
        res.status(500).json({ error: 'Failed to load whiteboard' });
    }
});

module.exports = router;
