const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/patient/status/:queueNumber
 * Return current visit status for a patient by queue number
 */
router.get("/patient/status/:queueNumber", async (req, res) => {
    try {
        // Normalize queue number (strip spaces and convert to uppercase)
        const queueNumber = (req.params.queueNumber || "").trim().toUpperCase();

        if (!queueNumber) {
            return res.status(400).json({ error: "Missing queue number" });
        }

        console.log("🔍 Fetching patient status for queue:", queueNumber);

        // Look up encounter + basic patient info
        const [rows] = await db.query(
            `
                SELECT
                    e.id AS encounter_id,
                    e.queue_number,
                    e.status,
                    e.priority_esi,
                    e.arrival_time,
                    e.triage_time,
                    e.room_time,
                    e.provider_start_time,
                    e.disposition,
                    e.depart_time,
                    p.id AS patient_id,
                    p.full_name,
                    p.dob,
                    p.sex,
                    p.contact_number,
                    p.emergency_contact,
                    p.insurance_info,
                    p.address
                FROM encounters e
                         JOIN patients p ON p.id = e.patient_id
                WHERE e.queue_number = ?
                    LIMIT 1
            `,
            [queueNumber]
        );

        if (rows.length === 0) {
            console.log("❌ Queue number not found:", queueNumber);
            return res.status(404).json({ error: "Queue number not found" });
        }

        const encounter = rows[0];

        // Get encounter events for timeline
        const [events] = await db.query(
            `
                SELECT type, at, payload
                FROM encounter_events
                WHERE encounter_id = ?
                ORDER BY at ASC
            `,
            [encounter.encounter_id]
        );

        // Build comprehensive timestamps object from both encounter table and events
        const timestamps = {
            arrived: encounter.arrival_time,
            triaged: encounter.triage_time,
            roomed: encounter.room_time,
            provider_started: encounter.provider_start_time,
            dispositioned: encounter.disposition,
            departed: encounter.depart_time
        };

        // Map backend status to frontend stage names
        const statusToStageMap = {
            'arrived': 'kiosk',
            'waiting_for_triage': 'waiting_triage',
            'in_triage': 'triage',
            'waiting_for_registration': 'waiting_registration',
            'in_registration': 'registration',
            'waiting_for_provider': 'waiting_doctor',
            'with_provider': 'consultation',
            'waiting_for_admission': 'waiting_admission',
            'waiting_for_observation': 'waiting_observation',
            'waiting_for_discharge': 'waiting_discharge',
            'admission_in_progress': 'admission_orders',
            'awaiting_bed': 'awaiting_non_icu',
            'awaiting_icu_bed': 'awaiting_icu',
            'discharge_in_progress': 'discharge_documents',
            'ready_to_depart': 'awaiting_departure',
            'departed': 'departed'
        };

        // Map event types to frontend stages for the timeline
        const eventTypeToStageMap = {
            'arrived': 'kiosk',
            'registered': 'registration',
            'triaged': 'triage',
            'roomed': 'consultation',
            'provider_started': 'consultation',
            'results_ready': 'consultation',
            'dispositioned': 'waiting_discharge',
            'departed': 'departed'
        };

        // Transform events to include frontend stage mapping
        const mappedEvents = events.map(event => ({
            ...event,
            frontend_stage: eventTypeToStageMap[event.type] || event.type
        }));

        const response = {
            queue_number: encounter.queue_number,
            status: encounter.status,
            frontend_stage: statusToStageMap[encounter.status] || encounter.status,
            priority_esi: encounter.priority_esi,
            patient: {
                full_name: encounter.full_name,
                dob: encounter.dob,
                sex: encounter.sex,
                contact_number: encounter.contact_number,
                emergency_contact: encounter.emergency_contact,
                insurance_info: encounter.insurance_info,
                address: encounter.address
            },
            timestamps: timestamps,
            events: mappedEvents,
            encounter_id: encounter.encounter_id,
            patient_id: encounter.patient_id
        };

        console.log("✅ Patient status found:", response.queue_number, "- Status:", response.status);
        res.json(response);

    } catch (err) {
        console.error("❌ GET /patient/status error:", err);
        return res.status(500).json({
            error: "Internal server error",
            details: err.message
        });
    }
});

/**
 * GET /api/patient/exists/:queueNumber
 * Quick check if queue number exists (for validation)
 */
router.get("/patient/exists/:queueNumber", async (req, res) => {
    try {
        const queueNumber = (req.params.queueNumber || "").trim().toUpperCase();

        if (!queueNumber) {
            return res.json({ exists: false });
        }

        const [rows] = await db.query(
            `SELECT queue_number FROM encounters WHERE queue_number = ? LIMIT 1`,
            [queueNumber]
        );

        res.json({
            exists: rows.length > 0,
            queueNumber: queueNumber
        });

    } catch (err) {
        console.error("❌ GET /patient/exists error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * POST /api/patient/feedback
 * Submit real-time patient feedback
 */
router.post("/patient/feedback", async (req, res) => {
    try {
        const { queueNumber, rating, comment, stage, stageName } = req.body;

        if (!queueNumber || !rating) {
            return res.status(400).json({ error: "Queue number and rating are required" });
        }

        console.log("📝 Patient feedback received:", { queueNumber, rating, stage });

        // Store feedback in database (you might want to create a patient_feedback table)
        // For now, we'll just log it and send real-time update
        const publishEvent = req.app.get("publishEvent");
        if (publishEvent) {
            publishEvent({
                type: "patient_feedback",
                queueNumber: queueNumber,
                rating: rating,
                comment: comment,
                stage: stage,
                stageName: stageName,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: "Feedback received",
            feedbackId: Date.now() // temporary ID
        });

    } catch (err) {
        console.error("❌ POST /patient/feedback error:", err);
        res.status(500).json({ error: "Failed to submit feedback" });
    }
});

module.exports = router;