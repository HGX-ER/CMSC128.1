const mysql = require('mysql2/promise');
const readline = require('node:readline/promises');
const { stdin: input, stdout: output } = require('node:process');

function newQueueNumber() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function resetDemo(db) {
    // Safer than TRUNCATE with FKs: delete children first, then parents, then reset AUTO_INCREMENT [web:218][web:219]
    await db.execute('DELETE FROM encounter_events');
    await db.execute('DELETE FROM observations');
    await db.execute('DELETE FROM encounters');
    await db.execute('DELETE FROM patients');

    await db.execute('ALTER TABLE encounter_events AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE observations AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE encounters AUTO_INCREMENT = 1');
    await db.execute('ALTER TABLE patients AUTO_INCREMENT = 1');
}

(async () => {
    const rl = readline.createInterface({ input, output });

    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '091373gelo',
        database: 'testdb',
        multipleStatements: true
    });

    try {
        console.log('--- Nurse Console (Demo Reset + Nurse Intake) ---');

        // Optional: reset all demo tables
        const doReset = (await rl.question('Reset demo tables first? (y/n): ')).trim().toLowerCase() === 'y';
        if (doReset) {
            await resetDemo(db); // clears rows and resets AUTO_INCREMENT safely for FK schemas [web:219][web:218]
            console.log('Demo tables cleared.');
        }

        // Login as nurse
        const username = await rl.question('Username: ');
        const password = await rl.question('Password: ');
        const [u] = await db.execute(
            'SELECT id, username, role FROM users WHERE username=? AND password=?',
            [username.trim(), password.trim()]
        );
        if (!u.length || u[0].role !== 'nurse') {
            console.log('Login failed or role is not nurse.');
            await db.end(); rl.close(); return;
        }
        console.log(`Logged in as ${u[0].username} (${u[0].role})`);

        // Nurse intake: create anonymous patient + arrived encounter with queue
        const now = new Date();
        const [pIns] = await db.execute('INSERT INTO patients (mrn) VALUES (NULL)');
        const patientId = pIns.insertId;

        let code = newQueueNumber();
        let encounterId;
        while (true) {
            try {
                const [eIns] = await db.execute(
                    'INSERT INTO encounters (patient_id, queue_number, status, arrival_time) VALUES (?,?, "arrived", ?)',
                    [patientId, code, now]
                );
                encounterId = eIns.insertId;
                await db.execute(
                    'INSERT INTO encounter_events (encounter_id, type, at, payload) VALUES (?,?,?, JSON_OBJECT("queue_number", ?))',
                    [encounterId, 'arrived', now, code]
                );
                break;
            } catch (e) {
                if (e && e.code === 'ER_DUP_ENTRY') { code = newQueueNumber(); continue; }
                throw e;
            }
        }
        console.log(`Encounter created id=${encounterId}, queue=${code}`);

        // Registration Center flow: verify by queue
        const verifyInput = await rl.question('Enter queue to verify (or press Enter to auto-use): ');
        const verifyCode = (verifyInput || code).toUpperCase();
        const [ver] = await db.execute(
            `SELECT id, status FROM encounters
             WHERE queue_number=? AND status IN ('arrived','registered','triaged','roomed')`,
            [verifyCode]
        );
        if (!ver.length) {
            console.log('Queue not found or not in registrable state.');
            await db.end(); rl.close(); return;
        }
        const regEncounterId = ver[0].id;
        console.log(`Queue verified, encounter=${regEncounterId}, status=${ver[0].status}`);

        // Complete registration: collect demographics, set status=registered
        const firstN = await rl.question('Registration - Full name (First): ');
        const lastN = await rl.question('Registration - Full name (Last): ');
        const dobN = await rl.question('Registration - DOB (YYYY-MM-DD): ');
        const sexN = await rl.question('Registration - Sex: ');
        const phone = await rl.question('Registration - Phone: ');
        const address = await rl.question('Registration - Address: ');
        const insurance = await rl.question('Registration - Insurance: ');
        const complaint = await rl.question('Registration - Chief complaint: ');

        const [pRow] = await db.execute('SELECT patient_id FROM encounters WHERE id=?', [regEncounterId]);
        const pid = pRow[0].patient_id;

        await db.beginTransaction();
        try {
            await db.execute(
                'UPDATE patients SET first_name=?, last_name=?, dob=?, sex=? WHERE id=?',
                [firstN || null, lastN || null, dobN || null, sexN || null, pid]
            );
            const now2 = new Date();
            const obs = [];
            if (complaint) obs.push([regEncounterId, 'complaint', complaint, null, now2]);
            if (phone) obs.push([regEncounterId, 'complaint', `Phone:${phone}`, null, now2]);
            if (address) obs.push([regEncounterId, 'complaint', `Addr:${address}`, null, now2]);
            if (insurance) obs.push([regEncounterId, 'complaint', `Ins:${insurance}`, null, now2]);
            if (obs.length) {
                await db.query('INSERT INTO observations (encounter_id, type, value, unit, recorded_at) VALUES ?', [obs]);
            }
            await db.execute('UPDATE encounters SET status="registered" WHERE id=?', [regEncounterId]);
            await db.execute('INSERT INTO encounter_events (encounter_id, type, at) VALUES (?,?,?)',
                [regEncounterId, 'registered', now2]);
            await db.commit();
            console.log('Registration completed and event logged.');
        } catch (e) {
            await db.rollback();
            throw e;
        }

        // Snapshot board + metrics
        const [board] = await db.execute(
            `SELECT e.id, e.queue_number, e.priority_esi, e.status,
                    TIMESTAMPDIFF(MINUTE, COALESCE(e.triage_time, e.arrival_time), NOW()) AS waiting_min
             FROM encounters e
             WHERE e.status IN ('arrived','registered','triaged','roomed')
             ORDER BY e.priority_esi IS NULL, e.priority_esi ASC, e.arrival_time ASC`
        );
        console.table(board);
        const [metrics] = await db.execute(
            `SELECT
                 SUM(status IN ('arrived','registered','triaged','roomed')) AS active,
                 SUM(status IN ('arrived','registered','triaged')) AS waiting,
                 AVG(CASE WHEN provider_start_time IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, arrival_time, provider_start_time) END)
                                                                            AS door_to_provider_min
             FROM encounters`
        );
        console.log('Metrics:', metrics[0]);

        await db.end();
        rl.close();
    } catch (err) {
        console.error(err);
        try { await db.end(); } catch {}
        rl.close();
    }
})();
