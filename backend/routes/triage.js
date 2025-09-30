const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/encounters/:id/triage', (req, res) => {
    const id = req.params.id;
    const { esi, complaint, vitals } = req.body;
    const now = new Date();

    db.getConnection((err, conn) => {
        if (err) return res.status(500).json({ error: 'db conn' });
        conn.beginTransaction(txErr => {
            if (txErr) { conn.release(); return res.status(500).json({ error: 'tx start' }); }

            const up = 'UPDATE encounters SET status="triaged", priority_esi=?, triage_time=? WHERE id=?';
            conn.query(up, [esi, now, id], (e1) => {
                if (e1) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'update' }); });

                const rows = [];
                if (complaint) rows.push([id, 'complaint', complaint, null, now]);
                (vitals || []).forEach(v => rows.push([id, v.type, v.value, v.unit || null, now]));

                const doObs = rows.length
                    ? cb => conn.query('INSERT INTO observations (encounter_id, type, value, unit, recorded_at) VALUES ?', [rows], cb)
                    : cb => cb(null);

                doObs((e2) => {
                    if (e2) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'obs' }); });

                    const ev = 'INSERT INTO encounter_events (encounter_id, type, at, payload) VALUES (?,?,?, JSON_OBJECT("esi", ?, "complaint", ?))';
                    conn.query(ev, [id, 'triaged', now, esi, complaint || null], (e3) => {
                        if (e3) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'event' }); });

                        conn.commit((e4) => {
                            if (e4) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'commit' }); });
                            conn.release();
                            req.app.get('publishEvent')({ encounter_id: Number(id), type: 'triaged', at: now, esi });
                            res.json({ ok: true });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
