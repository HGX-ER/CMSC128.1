// backend/routes/triage.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/encounters/:id/triage', async (req, res) => {
    const encId = Number(req.params.id);
    const { esi, complaint, vitals = {} } = req.body || {};
    if (!encId) return res.status(400).json({ message: 'Invalid encounter id' });
    const publishEvent = req.app.get('publishEvent');

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        await conn.query(
            `UPDATE encounters SET priority_esi=?, triage_time=NOW(), status='triaged' WHERE id=?`,
            [esi ?? null, encId]
        );

        const toRows = [];
        if (complaint) toRows.push(['complaint', String(complaint), null]);
        if (vitals.temp != null) toRows.push(['temp', String(vitals.temp), 'C']);
        if (vitals.hr != null) toRows.push(['hr', String(vitals.hr), 'bpm']);
        if (vitals.rr != null) toRows.push(['rr', String(vitals.rr), 'rpm']);
        if (vitals.bp_sys != null) toRows.push(['bp_sys', String(vitals.bp_sys), 'mmHg']);
        if (vitals.bp_dia != null) toRows.push(['bp_dia', String(vitals.bp_dia), 'mmHg']);
        if (vitals.spo2 != null) toRows.push(['spo2', String(vitals.spo2), '%']);

        if (toRows.length) {
            const values = toRows.map(() => '(?, ?, ?, NOW(), ? )').join(',');
            const flat = [];
            for (const [type, value, unit] of toRows) flat.push(encId, type, value, unit);
            await conn.query(
                `INSERT INTO observations (encounter_id, type, value, recorded_at, unit) VALUES ${values}`,
                flat
            );
        }

        await conn.query(
            `INSERT INTO encounter_events (encounter_id, type, at, payload)
       VALUES (?, 'triaged', NOW(), JSON_OBJECT('esi', ?))`,
            [encId, esi ?? null]
        );

        await conn.commit();

        if (typeof publishEvent === 'function') {
            publishEvent({ type: 'encounter.triaged', encounter_id: encId, esi: esi ?? null });
        }

        res.json({ success: true });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ message: 'Failed to save triage' });
    } finally {
        conn.release();
    }
});

module.exports = router;
