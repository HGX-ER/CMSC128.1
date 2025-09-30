const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/patient/status/:queue', (req, res) => {
    const code = req.params.queue.toUpperCase();
    const sql = `
        SELECT e.id, e.queue_number, e.status, e.priority_esi,
               e.arrival_time, e.triage_time, e.room_time, e.provider_start_time, e.disposition, e.depart_time
        FROM encounters e
        WHERE e.queue_number = ?
    `;
    db.query(sql, [code], (err, rows) => {
        if (err) return res.status(500).json({ error: 'db error' });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0]);
    });
});

module.exports = router;
