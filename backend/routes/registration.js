// backend/routes/registration.js
const express = require('express');
const router = express.Router();
const db = require('../db');

function generateQueueNumber() {
    // ED + yymmddHHMM + 2-digit random; trimmed to <=12 chars
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const code = `ED${String(d.getFullYear()).slice(2)}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
    const rand = Math.floor(Math.random()*90+10);
    return `${code}${rand}`.slice(0, 12);
}

// Create patient (optional) + encounter (status=arrived)
router.post('/registration/encounters', async (req, res) => {
    const { first_name = null, last_name = null, dob = null, sex = null, patient_id = null } = req.body || {};
    const publishEvent = req.app.get('publishEvent');

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        let pid = patient_id;
        if (!pid) {
            const [p] = await conn.query(
                'INSERT INTO patients (mrn, first_name, last_name, dob, sex) VALUES (?, ?, ?, ?, ?)',
                [null, first_name, last_name, dob, sex]
            );
            pid = p.insertId;
        }

        let queue_number;
        for (;;) {
            queue_number = generateQueueNumber();
            const [exist] = await conn.query('SELECT 1 FROM encounters WHERE queue_number=? LIMIT 1', [queue_number]);
            if (!exist.length) break;
        }

        const [enc] = await conn.query(
            `INSERT INTO encounters (patient_id, queue_number, status, arrival_time)
       VALUES (?, ?, 'arrived', NOW())`,
            [pid, queue_number]
        );

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
       VALUES (?, 'arrived', NOW(), JSON_OBJECT('queue_number', ?))`,
            [enc.insertId, queue_number]
        );

        await conn.commit();

        // SSE notify
        if (typeof publishEvent === 'function') {
            publishEvent({ type: 'encounter.created', queue_number, encounter_id: enc.insertId, patient_id: pid });
        }

        res.json({ queue_number, encounter_id: enc.insertId, patient_id: pid });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ message: 'Failed to create encounter' });
    } finally {
        conn.release();
    }
});

// Complete registration: update patient, set status=registered
router.post('/registration/complete', async (req, res) => {
    const { queue_number, first_name, last_name, dob, sex } = req.body || {};
    if (!queue_number) return res.status(400).json({ message: 'Missing queue_number' });
    const publishEvent = req.app.get('publishEvent');

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [[enc]] = await conn.query(
            `SELECT e.id, e.patient_id FROM encounters e WHERE e.queue_number=? LIMIT 1`,
            [queue_number]
        );
        if (!enc) {
            await conn.rollback();
            return res.status(404).json({ message: 'Encounter not found' });
        }

        await conn.query(
            `UPDATE patients SET first_name=?, last_name=?, dob=?, sex=? WHERE id=?`,
            [first_name ?? null, last_name ?? null, dob ?? null, sex ?? null, enc.patient_id]
        );

        await conn.query(`UPDATE encounters SET status='registered' WHERE id=?`, [enc.id]);

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
       VALUES (?, 'registered', NOW(), NULL)`,
            [enc.id]
        );

        await conn.commit();

        if (typeof publishEvent === 'function') {
            publishEvent({ type: 'encounter.registered', queue_number });
        }

        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ message: 'Failed to complete registration' });
    } finally {
        conn.release();
    }
});

module.exports = router;
