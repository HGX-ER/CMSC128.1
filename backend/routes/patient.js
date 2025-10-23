const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/patient/status/:queueNumber
 * Return current visit status for a patient by queue number
 */
router.get("/patient/status/:queueNumber", async (req, res) => {
    try {
        // normalize (strip spaces)
        const qn = (req.params.queueNumber || "").trim();

        if (!qn) {
            return res.status(400).json({ error: "Missing queue number" });
        }

        // Look up encounter + basic patient info
        const [rows] = await db.query(
            `
      SELECT
        e.id                AS encounter_id,
        e.queue_number,
        e.status,
        e.priority_esi,
        e.arrival_time,
        e.triage_time,
        e.room_time,
        e.provider_start_time,
        e.disposition,
        e.depart_time,
        p.id                AS patient_id,
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
            // Not found should be 404, not 500
            return res.status(404).json({ error: "Queue number not found" });
        }

        const enc = rows[0];

        // Optional: fetch event timeline (if you want to show progress)
        const [events] = await db.query(
            `
      SELECT type, at, payload
      FROM encounter_events
      WHERE encounter_id = ?
      ORDER BY at ASC
      `,
            [enc.encounter_id]
        );

        return res.json({
            queue_number: enc.queue_number,
            encounter_id: enc.encounter_id,
            patient_id: enc.patient_id,
            patient: {
                full_name: enc.full_name,
                dob: enc.dob,
                sex: enc.sex,
            },
            status: enc.status,
            timestamps: {
                arrived: enc.arrival_time,
                triaged: enc.triage_time,
                roomed: enc.room_time,
                provider_started: enc.provider_start_time,
                dispositioned: enc.disposition ? enc.disposition : null,
                departed: enc.depart_time,
            },
            events, // optional timeline; safe to remove if you don't use it on UI
        });
    } catch (err) {
        console.error("GET /patient/status error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
