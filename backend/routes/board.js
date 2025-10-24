const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/board", async (_req, res) => {
    try {
        const [rows] = await db.query(
            `
                SELECT
                    e.id AS encounter_id,
                    e.queue_number,
                    e.status,
                    e.priority_esi,
                    e.assigned_doctor,
                    e.arrival_time,
                    TIMESTAMPDIFF(MINUTE, e.arrival_time, NOW()) AS waiting_min,
                    p.id AS patient_id,
                    p.full_name,
                    p.dob,
                    p.sex
                FROM encounters e
                         JOIN patients p ON p.id = e.patient_id
                WHERE e.status <> 'departed'
                ORDER BY e.arrival_time DESC
            `
        );

        const enriched = rows.map((r) => ({
            ...r,
            assignedDoctor: r.assigned_doctor || null,
            stageHistory: [
                {
                    stage: r.status,
                    startTime: new Date(r.arrival_time),
                },
            ],
        }));

        res.json(enriched);
    } catch (err) {
        console.error("GET /board error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/board/assign-doctor", async (req, res) => {
    const { encounter_id, doctor_username } = req.body;
    if (!encounter_id || !doctor_username) {
        return res.status(400).json({ error: "Missing encounter_id or doctor_username" });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters 
       SET assigned_doctor = ?, status = 'consultation'
       WHERE id = ?`,
            [doctor_username, encounter_id]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
       VALUES (?, 'provider_started', NOW(), JSON_OBJECT('doctor', ?))`,
            [encounter_id, doctor_username]
        );

        await conn.commit();
        res.json({ success: true, message: "Doctor assigned successfully" });
    } catch (err) {
        await conn.rollback();
        console.error("POST /board/assign-doctor error:", err);
        res.status(500).json({ error: "Failed to assign doctor" });
    } finally {
        conn.release();
    }
});

module.exports = router;
