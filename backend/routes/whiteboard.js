// backend/routes/whiteboard.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// ✅ FIXED: Correct flow - Triage BEFORE Registration
const statusToStageMap = {
    // Step 1: Just arrived → needs TRIAGE first
    'arrived': 'waiting_triage',

    // Step 2: After triage → needs REGISTRATION
    'triaged': 'waiting_registration',

    // Step 3: After registration → ready for DOCTOR
    'registered': 'waiting_doctor',

    // Other stages
    'waiting_triage': 'waiting_triage',
    'in_triage': 'triage',
    'waiting_registration': 'waiting_registration',
    'in_registration': 'registration',
    'waiting_doctor': 'waiting_doctor',
    'waiting_for_provider': 'waiting_doctor',
    'with_provider': 'consultation',
    'consultation': 'consultation',
    'roomed': 'consultation',
    'provider_started': 'consultation',

    // *** ADDED: normalize observation/admission statuses from doctor backend ***
    'waiting_observation': 'waiting_observation',
    'in_observation': 'waiting_observation',   // doctor sets this → show as For Observation
    'observation': 'waiting_observation',      // safety alias

    'waiting_admission': 'waiting_admission',
    'admitted_non_icu': 'waiting_admission',   // in admission pipeline
    'admitted_icu': 'waiting_admission',       // in admission pipeline

    'waiting_discharge': 'waiting_discharge',

    'admission_orders': 'admission_orders',
    'awaiting_non_icu': 'awaiting_non_icu',
    'awaiting_icu': 'awaiting_icu',
    'discharge_documents': 'discharge_documents',
    'awaiting_departure': 'awaiting_departure',
    'dispositioned': 'waiting_discharge',
    'departed': 'departed',
};

// normalize raw status to snake_case key and map to frontend stage
const toStageKey = (s) => {
    const normalized = (s || '').toString().toLowerCase().replace(/[\s-]+/g, '_');
    return statusToStageMap[normalized] || normalized || 'kiosk';
};

/**
 * GET /api/whiteboard
 * Returns all non-departed encounters with patient info,
 * plus latest chief complaint and diagnosis.
 */
// backend/routes/whiteboard.js

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
                e.diagnosis,
                e.disposition,
                p.full_name,
                p.dob,
                p.sex,
                p.insurance_info,
                p.address,
                (
                    SELECT o.value
                    FROM observations o
                    WHERE o.encounter_id = e.id AND o.type = 'complaint'
                    ORDER BY o.recorded_at DESC
                        LIMIT 1
                ) AS chief_complaint
            FROM encounters e
                JOIN patients p ON p.id = e.patient_id
            -- ✅ REMOVED: Don't filter out departed patients
            -- WHERE e.status IS NULL OR e.status <> 'departed'
            ORDER BY
                CASE e.status
                WHEN 'arrived' THEN 0
                WHEN 'waiting_triage' THEN 0
                WHEN 'triage' THEN 1
                WHEN 'triaged' THEN 2
                WHEN 'waiting_registration' THEN 2
                WHEN 'registration' THEN 3
                WHEN 'registered' THEN 4
                WHEN 'waiting_doctor' THEN 5
                WHEN 'consultation' THEN 6
                WHEN 'waiting_observation' THEN 7
                WHEN 'waiting_admission' THEN 8
                WHEN 'waiting_discharge' THEN 9
                WHEN 'departed' THEN 99
                ELSE 99
            END,
        COALESCE(e.priority_esi, 99),
        e.arrival_time ASC
        `);

        const data = rows.map((r) => ({
            id: r.queue_number,
            encounter_id: r.encounter_id,
            patient_id: r.patient_id,
            queue_number: r.queue_number,

            name: r.full_name,
            full_name: r.full_name,
            sex: r.sex || null,
            dateOfBirth: r.dob || null,
            insurance_info: r.insurance_info || null,
            address: r.address || null,

            currentStage: toStageKey(r.status),
            esiLevel: r.priority_esi ?? null,

            assignedDoctor: r.assigned_doctor || null,
            assignedNurse: r.assigned_nurse || null,

            arrivalTime: r.arrival_time || null,
            triageTime: r.triage_time || null,
            roomTime: r.room_time || null,
            providerStartTime: r.provider_start_time || null,

            chiefComplaint: r.chief_complaint || null,
            diagnosis: r.diagnosis || null,
            disposition: r.disposition || null,

            // ✅ UPDATED: Mark departed as inactive
            isActive: (r.status || '') !== 'departed',
        }));

        res.json(data);
    } catch (e) {
        console.error('GET /whiteboard error:', e);
        res.status(500).json({ error: 'Failed to load whiteboard' });
    }
});

module.exports = router;