// routes/patient.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/patient/status/:queueNumber
 * Return current visit status for a patient by queue number
 */
router.get("/patient/status/:queueNumber", async (req, res) => {
    try {
        const qn = (req.params.queueNumber || "").trim();

        if (!qn) {
            return res.status(400).json({ error: "Missing queue number" });
        }

        // Optional: Validate format (e.g., A001)
        if (!/^[A-Z]\d{3}$/i.test(qn)) {
            return res.status(400).json({ error: "Invalid queue number format" });
        }

        // --- Query encounter + patient details ---
        const [rows] = await db.query(
            `
      SELECT
        e.id                  AS encounter_id,
        e.queue_number,
        e.status              AS backend_status,
        e.priority_esi,
        e.arrival_time,
        e.triage_time,
        e.room_time,
        e.provider_start_time,
        e.disposition_time,
        e.depart_time,
        e.chief_complaint,
        e.assigned_doctor,
        e.assigned_nurse,
        e.room_number,
        e.estimated_wait_time,
        p.id                  AS patient_id,
        p.full_name,
        p.dob,
        p.sex
      FROM encounters e
      JOIN patients p ON p.id = e.patient_id
      WHERE e.queue_number = ?
      LIMIT 1
      `,
            [qn]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Queue number not found in the system" });
        }

        const enc = rows[0];

        // --- Fetch timeline events (optional) ---
        const [events] = await db.query(
            `
      SELECT type, at, payload
      FROM encounter_events
      WHERE encounter_id = ?
      ORDER BY at ASC
      `,
            [enc.encounter_id]
        );

        // --- Backend → Frontend stage mapping ---
        const stageMap = {
            arrived: "kiosk",
            waiting_for_triage: "waiting_triage",
            in_triage: "triage",
            waiting_for_registration: "waiting_registration",
            in_registration: "registration",
            waiting_for_provider: "waiting_doctor",
            with_provider: "consultation",
            waiting_for_discharge: "waiting_discharge",
            discharge_in_progress: "discharge_documents",
            ready_to_depart: "awaiting_departure",
            departed: "departed",
        };

        const frontendStage = stageMap[enc.backend_status] || "unknown";

        // --- Construct response object ---
        const response = {
            queue_number: enc.queue_number,
            encounter_id: enc.encounter_id,
            patient_id: enc.patient_id,
            patient: {
                full_name: enc.full_name,
                dob: enc.dob,
                sex: enc.sex,
            },
            status: enc.backend_status,
            frontend_stage: frontendStage,
            timestamps: {
                arrived: enc.arrival_time || null,
                triaged: enc.triage_time || null,
                roomed: enc.room_time || null,
                provider_started: enc.provider_start_time || null,
                dispositioned: enc.disposition_time || null,
                departed: enc.depart_time || null,
            },
            events: events || [],
            priority_esi: enc.priority_esi || null,
            // Optional enhancements per README
            chief_complaint: enc.chief_complaint || null,
            assigned_doctor: enc.assigned_doctor || null,
            assigned_nurse: enc.assigned_nurse || null,
            room_number: enc.room_number || null,
            estimated_wait_time: enc.estimated_wait_time || null,
        };

        // Return clean structured JSON
        return res.status(200).json(response);
    } catch (err) {
        console.error([${new Date().toISOString()}] GET /patient/status error:, err);

        if (err.code === "ECONNREFUSED") {
            return res.status(503).json({ error: "Database unavailable" });
        }

        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;