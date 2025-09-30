const express = require('express');
const router = express.Router();
const db = require('../db');

function newQueueNumber() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

router.post('/patients', (req, res) => {
    const { mrn, first_name, last_name, dob, sex } = req.body;
    const sql = 'INSERT INTO patients (mrn, first_name, last_name, dob, sex) VALUES (?,?,?,?,?)';
    db.query(sql, [mrn || null, first_name, last_name, dob || null, sex || null], (err, r) => {
        if (err) return res.status(500).json({ error: 'db error' });
        res.json({ id: r.insertId });
    });
});

router.post('/encounters', (req, res) => {
    const { patient_id } = req.body;
    const now = new Date();
    const code = newQueueNumber();

    const sql = 'INSERT INTO encounters (patient_id, queue_number, status, arrival_time) VALUES (?,?, "arrived", ?)';
    db.query(sql, [patient_id, code, now], (err, r) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'queue_number collision' });
            return res.status(500).json({ error: 'db error' });
        }
        const ev = 'INSERT INTO encounter_events (encounter_id, type, at, payload) VALUES (?,?,?, JSON_OBJECT("queue_number", ?))';
        db.query(ev, [r.insertId, 'arrived', now, code], () => {});
        req.app.get('publishEvent')({ encounter_id: r.insertId, type: 'arrived', at: now, queue_number: code });
        res.json({ id: r.insertId, queue_number: code });
    });
});

router.get('/registration/verify/:queue', (req, res) => {
    const code = req.params.queue.toUpperCase();
    const sql = `
    SELECT id, status FROM encounters 
    WHERE queue_number=? AND status IN ('arrived','registered','triaged','roomed')
  `;
    db.query(sql, [code], (err, rows) => {
        if (err) return res.status(500).json({ error: 'db error' });
        if (!rows.length) return res.json({ exists: false });
        res.json({ exists: true, encounter_id: rows[0].id, status: rows[0].status });
    });
});

router.post('/registration/complete', (req, res) => {
    const {
        encounter_id,
        first_name, last_name, dob, sex,
        phone, emergency_contact, address,
        insurance, complaint
    } = req.body;
    const now = new Date();

    const q0 = 'SELECT patient_id FROM encounters WHERE id=?';
    db.query(q0, [encounter_id], (e0, r0) => {
        if (e0) return res.status(500).json({ error: 'db error' });
        if (!r0.length) return res.status(404).json({ error: 'Encounter not found' });
        const pid = r0[0].patient_id;

        db.getConnection((err, conn) => {
            if (err) return res.status(500).json({ error: 'conn error' });
            conn.beginTransaction(txErr => {
                if (txErr) { conn.release(); return res.status(500).json({ error: 'tx start' }); }

                const updPat = 'UPDATE patients SET first_name=?, last_name=?, dob=?, sex=? WHERE id=?';
                conn.query(updPat, [first_name, last_name, dob || null, sex || null, pid], (e1) => {
                    if (e1) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'patient update' }); });

                    const obs = [];
                    if (complaint) obs.push([encounter_id, 'complaint', complaint, null, now]);
                    if (phone) obs.push([encounter_id, 'complaint', `Phone:${phone}`, null, now]);
                    if (address) obs.push([encounter_id, 'complaint', `Addr:${address}`, null, now]);
                    if (insurance) obs.push([encounter_id, 'complaint', `Ins:${insurance}`, null, now]);

                    const doObs = obs.length
                        ? cb => conn.query('INSERT INTO observations (encounter_id, type, value, unit, recorded_at) VALUES ?', [obs], cb)
                        : cb => cb(null);

                    doObs((e2) => {
                        if (e2) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'obs' }); });

                        const updEnc = 'UPDATE encounters SET status="registered" WHERE id=?';
                        conn.query(updEnc, [encounter_id], (e3) => {
                            if (e3) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'enc update' }); });

                            const ev = 'INSERT INTO encounter_events (encounter_id, type, at) VALUES (?,?,?)';
                            conn.query(ev, [encounter_id, 'registered', now], (e4) => {
                                if (e4) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'event' }); });
                                conn.commit((e5) => {
                                    if (e5) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'commit' }); });
                                    conn.release();
                                    req.app.get('publishEvent')({ encounter_id, type: 'registered', at: now });
                                    res.json({ ok: true });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// Nurse intake: minimal arrival without demographics
router.post('/nurse/intake', (req, res) => {
    const now = new Date();

    db.query('INSERT INTO patients (mrn) VALUES (NULL)', [], (e1, r1) => {
        if (e1) return res.status(500).json({ error: 'db error creating patient' });
        const patientId = r1.insertId;

        function newQueueNumber() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
        let code = newQueueNumber();

        const tryInsert = () => {
            const ins = 'INSERT INTO encounters (patient_id, queue_number, status, arrival_time) VALUES (?,?, "arrived", ?)';
            db.query(ins, [patientId, code, now], (e2, r2) => {
                if (e2) {
                    if (e2.code === 'ER_DUP_ENTRY') { code = newQueueNumber(); return tryInsert(); }
                    return res.status(500).json({ error: 'db error creating encounter' });
                }
                const encounterId = r2.insertId;

                const ev = 'INSERT INTO encounter_events (encounter_id, type, at, payload) VALUES (?,?,?, JSON_OBJECT("queue_number", ?))';
                db.query(ev, [encounterId, 'arrived', now, code], () => {});
                try { req.app.get('publishEvent')({ encounter_id: encounterId, type: 'arrived', at: now, queue_number: code }); } catch {}

                res.json({ encounter_id: encounterId, patient_id: patientId, queue_number: code });
            });
        };
        tryInsert();
    });
});


module.exports = router;
