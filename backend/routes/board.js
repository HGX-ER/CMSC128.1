// backend/routes/board.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/board', async (_req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT e.queue_number,
              e.status,
              e.priority_esi,
              TIMESTAMPDIFF(MINUTE, e.arrival_time, NOW()) AS waiting_min,
              p.first_name, p.last_name
       FROM encounters e
       JOIN patients p ON p.id=e.patient_id
       WHERE e.status <> 'departed'
       ORDER BY e.arrival_time DESC`
        );
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Failed to load board' });
    }
});

module.exports = router;
