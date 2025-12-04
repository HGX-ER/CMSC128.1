// backend/routes/transfer.js
const express = require('express');
const router = express.Router();
const db = require('../db'); // adjust if your DB helper path is different

/**
 * POST /api/doctor/encounters/:id/transfer
 * Body: { toDoctor: string, note?: string }
 *
 * Behavior:
 * - Validates `toDoctor`
 * - Starts a transaction, locks the encounter row, updates assigned_doctor + status
 * - Inserts an audit record to encounter_events (parameterized)
 * - If the `type` ENUM rejects 'transferred', falls back to inserting without the type column
 */
router.post('/doctor/encounters/:id/transfer', async (req, res) => {
    const encounterId = req.params.id;
    const { toDoctor, note } = req.body;

    if (!toDoctor || typeof toDoctor !== 'string' || toDoctor.trim() === '') {
        return res.status(400).json({ error: 'toDoctor is required' });
    }

    // Optionally capture actor info if you have auth middleware
    const performedBy = (req.user && (req.user.username || req.user.id)) || null;

    let conn;
    try {
        // Get connection (works whether db exposes pool.query or getConnection)
        conn = typeof db.getConnection === 'function' ? await db.getConnection() : db;

        if (typeof conn.beginTransaction === 'function') {
            await conn.beginTransaction();
        }

        // Lock encounter row for update
        const [rows] = await conn.query('SELECT * FROM encounters WHERE id = ? FOR UPDATE', [encounterId]);
        if (!rows || rows.length === 0) {
            if (typeof conn.rollback === 'function') await conn.rollback();
            return res.status(404).json({ error: 'Encounter not found' });
        }

        const encounter = rows[0];
        const prevDoctor = encounter.assigned_doctor || null;

        // Update assignment and status
        const newStatus = 'waiting_doctor'; // tweak if your app uses different status labels
        await conn.query('UPDATE encounters SET assigned_doctor = ?, status = ? WHERE id = ?', [
            toDoctor,
            newStatus,
            encounterId,
        ]);

        // Build payload for audit
        const payloadObj = {
            fromDoctor: prevDoctor,
            toDoctor,
            note: note || null,
            performedBy,
            at: new Date().toISOString(),
        };
        const payloadJson = JSON.stringify(payloadObj);

        // Insert audit event (parameterized). Try inserting with `type` first.
        try {
            await conn.query(
                'INSERT INTO encounter_events (encounter_id, type, at, payload) VALUES (?, ?, NOW(), ?)',
                [encounterId, 'transferred', payloadJson]
            );
        } catch (insertErr) {
            // If enum truncation occurs, fall back to inserting without `type`
            const isEnumTruncation = insertErr && (insertErr.errno === 1265 || insertErr.code === 'WARN_DATA_TRUNCATED');

            if (isEnumTruncation) {
                console.warn('encounter_events.type rejected "transferred", falling back to insert without `type`', insertErr);
                await conn.query('INSERT INTO encounter_events (encounter_id, at, payload) VALUES (?, NOW(), ?)', [
                    encounterId,
                    payloadJson,
                ]);
            } else {
                throw insertErr;
            }
        }

        if (typeof conn.commit === 'function') await conn.commit();

        const [updatedRows] = await conn.query('SELECT * FROM encounters WHERE id = ?', [encounterId]);
        return res.json(updatedRows[0]);
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