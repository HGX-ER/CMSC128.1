const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * POST /api/registration/new
 * Create a new patient + encounter (queue generation)
 */
router.post('/registration/new', async (req, res) => {
    try {
        const [result] = await db.query(`
            INSERT INTO patients (full_name, dob, sex)
            VALUES ('', NULL, NULL)
        `);
        const patientId = result.insertId;

        const now = new Date();

        // ✅ Include seconds + random digits for uniqueness
        const datePart = now
            .toISOString()
            .slice(2, 19)
            .replace(/[-T:]/g, '')    // Remove separators
            .slice(0, 12);            // YYMMDDHHMMSS
        const randomPart = Math.floor(100 + Math.random() * 900); // random 3 digits
        const qn = `ED${datePart}${randomPart}`;

        await db.query(
            `
      INSERT INTO encounters (patient_id, queue_number, status, arrival_time)
      VALUES (?, ?, 'arrived', NOW())
      `,
            [patientId, qn]
        );

        res.json({ queueNumber: qn });
    } catch (err) {
        console.error('Error creating registration:', err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ Update patient registration info by queue number
router.put('/registration/patient/:queueNumber', async (req, res) => {
    try {
        const queueNumber = req.params.queueNumber;
        const { name, dateOfBirth, sex } = req.body;

        // Find encounter and linked patient
        const [rows] = await db.query(
            `SELECT patient_id FROM encounters WHERE queue_number = ? LIMIT 1`,
            [queueNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Queue number not found' });
        }

        const patientId = rows[0].patient_id;

        // ✅ Update patient info
        await db.query(
            `
                UPDATE patients
                SET full_name = ?, dob = ?, sex = ?
                WHERE id = ?
            `,
            [name || '', dateOfBirth || null, sex || '', patientId]
        );

        // ✅ Optionally update encounter status to 'registered'
        await db.query(
            `
                UPDATE encounters
                SET status = 'registered'
                WHERE queue_number = ?
            `,
            [queueNumber]
        );

        res.json({ message: 'Patient registration updated successfully' });
    } catch (err) {
        console.error('Error saving registration:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
