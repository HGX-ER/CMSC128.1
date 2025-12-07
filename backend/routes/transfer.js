// backend/routes/transfer.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust path if necessary

router.post('/doctor/encounters/:id/transfer', async (req, res) => {
    const encounterId = req.params.id;
    const { toDoctor, note } = req.body;

    if (!toDoctor || typeof toDoctor !== 'string' || toDoctor.trim() === '') {
        return res.status(400).json({ error: 'toDoctor is required' });
    }

    // optional actor info from auth middleware
    const performedBy = (req.user && (req.user.username || req.user.id)) || null;

    let conn;
    try {
        conn = typeof db.getConnection === 'function' ? await db.getConnection() : db;
        if (typeof conn.beginTransaction === 'function') await conn.beginTransaction();

        // lock the encounter row
        const [rows] = await conn.query('SELECT * FROM encounters WHERE id = ? FOR UPDATE', [encounterId]);
        if (!rows || rows.length === 0) {
            if (typeof conn.rollback === 'function') await conn.rollback();
            return res.status(404).json({ error: 'Encounter not found' });
        }
        const encounter = rows[0];
        const prevDoctor = encounter.assigned_doctor || null;

        // update assignment + status
        const newStatus = 'waiting_doctor';
        await conn.query('UPDATE encounters SET assigned_doctor = ?, status = ? WHERE id = ?', [
            toDoctor,
            newStatus,
            encounterId,
        ]);

        // audit payload
        const payloadObj = {
            fromDoctor: prevDoctor,
            toDoctor,
            note: note || null,
            performedBy,
            at: new Date().toISOString(),
        };
        const payloadJson = JSON.stringify(payloadObj);

        // insert event (try with type then fallback)
        try {
            await conn.query(
                'INSERT INTO encounter_events (encounter_id, type, at, payload) VALUES (?, ?, NOW(), ?)',
                [encounterId, 'transferred', payloadJson]
            );
        } catch (insertErr) {
            // if enum or other issue, fall back to inserting without type
            const isEnumTruncation = insertErr && (insertErr.errno === 1265 || insertErr.code === 'WARN_DATA_TRUNCATED');
            if (isEnumTruncation) {
                await conn.query('INSERT INTO encounter_events (encounter_id, at, payload) VALUES (?, NOW(), ?)', [
                    encounterId,
                    payloadJson,
                ]);
            } else {
                throw insertErr;
            }
        }

        // Persist transfer note to encounters.transfer_note (recommended)
        if (note && note.trim().length > 0) {
            try {
                await conn.query('UPDATE encounters SET transfer_note = ? WHERE id = ?', [note, encounterId]);
            } catch (uErr) {
                // column may not exist yet — log and continue
                console.warn('Failed to persist transfer_note on encounters (column may be missing).', uErr);
            }
        }

        if (typeof conn.commit === 'function') await conn.commit();

        const [updatedRows] = await conn.query('SELECT * FROM encounters WHERE id = ?', [encounterId]);
        const updated = (updatedRows && updatedRows[0]) ? updatedRows[0] : null;

        // attach note to response if DB didn't store it
        if (updated && (!updated.transfer_note || updated.transfer_note === null) && note && note.trim().length > 0) {
            updated.transfer_note = note;
        }

        return res.json(updated);
    } catch (err) {
        if (conn && typeof conn.rollback === 'function') {
            try { await conn.rollback(); } catch (_) {}
        }
        console.error('Transfer error', err);
        return res.status(500).json({ error: 'Transfer failed', detail: err && err.message ? err.message : err });
    } finally {
        if (conn && typeof conn.release === 'function') {
            try { conn.release(); } catch (_) {}
        }
    }
});

module.exports = router;