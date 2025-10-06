// backend/routes/patient.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/patient/status/:queue', async (req, res) => {
    const q = req.params.queue;
    try {
        const [[row]] = await db.query(
            `SELECT e.id AS encounter_id, e.queue_number, e.status, e.priority_esi,
              e.arrival_time, e.triage_time, e.room_time, e.provider_start_time, e.depart_time,
              p.first_name, p.last_name
       FROM encounters e
       JOIN patients p ON p.id=e.patient_id
       WHERE e.queue_number=?`,
            [q]
        );
        if (!row) return res.status(404).json({ message: 'Not found' });
        res.json(row);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
