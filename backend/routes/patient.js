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
                    e.assigned_doctor,   -- NEW
                    e.assigned_nurse,    -- NEW
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
            arrived: "kiosk",
            waiting_for_triage: "waiting_triage",
            in_triage: "triage",
            waiting_for_registration: "waiting_registration",
            in_registration: "registration",
            waiting_for_provider: "waiting_doctor",
            with_provider: "consultation",
            waiting_for_admission: "waiting_admission",
            waiting_for_observation: "waiting_observation",
            waiting_for_discharge: "waiting_discharge",
            admission_in_progress: "admission_orders",
            awaiting_bed: "awaiting_non_icu",
            awaiting_icu_bed: "awaiting_icu",
            discharge_in_progress: "discharge_documents",
            ready_to_depart: "awaiting_departure",
            departed: "departed"
        };

        // Map event types to frontend stages for the timeline
        const eventTypeToStageMap = {
            arrived: "kiosk",
            registered: "registration",
            triaged: "triage",
            roomed: "consultation",
            provider_started: "consultation",
            results_ready: "consultation",
            dispositioned: "waiting_discharge",
            departed: "departed"
        };

        // Transform events to include frontend stage mapping
        const mappedEvents = events.map((event) => ({
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
            timestamps,
            events: mappedEvents,
            encounter_id: encounter.encounter_id,
            patient_id: encounter.patient_id,
            assigned_doctor: encounter.assigned_doctor || null, // NEW
            assigned_nurse: encounter.assigned_nurse || null   // NEW
        };

        console.log(
            "✅ Patient status found:",
            response.queue_number,
            "- Status:",
            response.status,
            "- Doctor:",
            response.assigned_doctor,
            "- Nurse:",
            response.assigned_nurse
        );
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

        // Get encounter ID and patient name from queue number
        const [encounters] = await db.query(
            `SELECT e.id, p.full_name
             FROM encounters e
                      JOIN patients p ON p.id = e.patient_id
             WHERE e.queue_number = ?
                 LIMIT 1`,
            [queueNumber]
        );

        if (encounters.length === 0) {
            return res.status(404).json({ error: "Queue number not found" });
        }

        const encounterId = encounters[0].id;
        const patientName = encounters[0].full_name;

        // Insert feedback into patient_feedback table (with patient name)
        await db.query(
            `INSERT INTO patientfeedback
             (encounterid, queuenumber, patientname, rating, comment, stage, stagedisplayname, submittedat, isread)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), FALSE)`,
            [encounterId, queueNumber, patientName, rating, comment || null, stage, stageName || null]
        );

        // Send real-time update to ED Manager via SSE
        const publishEvent = req.app.get("publishEvent");
        if (publishEvent) {
            publishEvent({
                type: "patientfeedback",
                encounterid: encounterId,
                queuenumber: queueNumber,
                patientname: patientName,
                rating: rating,
                comment: comment,
                stage: stage,
                stageName: stageName,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: "Feedback received"
        });

    } catch (err) {
        console.error("❌ POST /patient/feedback error:", err);
        res.status(500).json({
            error: "Failed to submit feedback",
            details: err.message
        });
    }
});

/**
 * PATCH /api/patient/depart/:queueNumber
 * Manually mark a patient as departed (for nurses/staff)
 */
router.patch("/patient/depart/:queueNumber", async (req, res) => {
    const queueNumber = (req.params.queueNumber || "").trim().toUpperCase();

    if (!queueNumber) {
        return res.status(400).json({ error: "Missing queue number" });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log("🚪 Manually marking patient as departed:", queueNumber);

        // Get encounter ID and current status
        const [encounters] = await conn.query(
            `SELECT id, status FROM encounters WHERE queuenumber = ? LIMIT 1`,
            [queueNumber]
        );

        if (encounters.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Queue number not found' });
        }

        const encounterId = encounters[0].id;
        const currentStatus = encounters[0].status;

        // Update status to departed
        await conn.query(
            `UPDATE encounters 
             SET status = 'departed', 
                 departtime = NOW(), 
                 updatedat = NOW() 
             WHERE id = ?`,
            [encounterId]
        );

        // Create departed event
        await conn.query(
            `INSERT INTO encounterevents (encounterid, type, at, payload) 
             VALUES (?, 'departed', NOW(), JSON_OBJECT('previousstatus', ?))`,
            [encounterId, currentStatus]
        );

        await conn.commit();

        console.log("✅ Patient marked as departed:", queueNumber);

        const publishEvent = req.app.get("publishEvent");
        if (publishEvent) {
            publishEvent({
                type: "patientdeparted",
                queuenumber: queueNumber,
                encounterid: encounterId
            });
        }

        res.json({
            ok: true,
            message: 'Patient marked as departed',
            queuenumber: queueNumber
        });

    } catch (e) {
        await conn.rollback();
        console.error("❌ Error marking patient as departed:", e);
        res.status(500).json({
            error: 'Failed to mark as departed',
            details: e.sqlMessage || e.message
        });
    } finally {
        conn.release();
    }
});


module.exports = router;