const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/board
 * Returns active encounters for the ED tracking board.
 */
router.get("/board", async (_req, res) => {
    try {
        const [rows] = await db.query(
            `
                SELECT
                    e.id                           AS encounter_id,
                    e.queue_number,
                    e.status,
                    e.priority_esi,
                    e.arrival_time,
                    TIMESTAMPDIFF(MINUTE, e.arrival_time, NOW()) AS waiting_min,
                    p.id                           AS patient_id,
                    p.full_name                    AS patient_name,      -- <— switched to full_name
                    p.dob,
                    p.sex
                FROM encounters e
                         JOIN patients  p ON p.id = e.patient_id
                WHERE e.status <> 'departed'
                ORDER BY e.arrival_time DESC
            `
        );

        res.json(rows);
    } catch (err) {
        console.error("GET /board error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
