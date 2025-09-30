const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/board', (req, res) => {
    const sql = `
        SELECT e.id, e.queue_number, p.first_name, p.last_name,
               e.priority_esi, e.status,
               TIMESTAMPDIFF(MINUTE, COALESCE(e.triage_time, e.arrival_time), NOW()) AS waiting_min
        FROM encounters e
                 JOIN patients p ON p.id = e.patient_id
        WHERE e.status IN ('arrived','registered','triaged','roomed')
        ORDER BY e.priority_esi IS NULL, e.priority_esi ASC, e.arrival_time ASC
    `;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: 'db error' });
        res.json(rows);
    });
});

router.get('/metrics', (req, res) => {
    const sql = `
        SELECT
            SUM(status IN ('arrived','registered','triaged','roomed')) AS active,
            SUM(status IN ('arrived','registered','triaged')) AS waiting,
            AVG(CASE WHEN provider_start_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, arrival_time, provider_start_time) END) AS door_to_provider_min
        FROM encounters
    `;
    db.query(sql, (err, rows) => {
        if (err) return res.status(500).json({ error: 'db error' });
        res.json(rows[0]);
    });
});

module.exports = router;
