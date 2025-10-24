// backend/routes/registration.js
const express = require("express");
const router = express.Router();
const db = require("../db");


// ============================================================
// ✅ GET /api/registration
// Fetch only patients waiting for registration (status = 'arrived')
// ============================================================
router.get("/registration", async (_req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                e.id AS encounter_id,
                e.queue_number,
                e.status,
                e.priority_esi,
                e.arrival_time,
                TIMESTAMPDIFF(MINUTE, e.arrival_time, NOW()) AS waiting_min,
                p.id AS patient_id,
                p.full_name,
                p.dob,
                p.sex
            FROM encounters e
                     JOIN patients p ON p.id = e.patient_id
            WHERE e.status = 'arrived'
            ORDER BY e.arrival_time ASC
        `);

        res.json(rows);
    } catch (err) {
        console.error("❌ Error loading registration list:", err);
        res.status(500).json({ message: "Failed to load registration patients" });
    }
});


// ============================================================
// POST /api/registration/new
// Create a new patient and encounter (Queue Generation)
// ============================================================
router.post("/registration/new", async (req, res) => {
    try {
        const [result] = await db.query(`
            INSERT INTO patients (full_name, dob, sex)
            VALUES ('', NULL, NULL)
        `);

        const patientId = result.insertId;

        // Generate a short queue number (ED + 3 digits)
        const nextNum = String(Math.floor(1 + Math.random() * 999)).padStart(3, "0");
        const qn = `ED${nextNum}`;

        await db.query(
            `
                INSERT INTO encounters (patient_id, queue_number, status, arrival_time)
                VALUES (?, ?, 'arrived', NOW())
            `,
            [patientId, qn]
        );

        res.json({ queueNumber: qn });
    } catch (err) {
        console.error("Error creating registration:", err);
        res.status(500).json({ error: err.message });
    }
});


// ============================================================
// PUT /api/registration/patient/:queueNumber
// Update patient registration info via queue number
// ============================================================
router.put("/registration/patient/:queueNumber", async (req, res) => {
    try {
        const { queueNumber } = req.params;
        const {
            name,
            dateOfBirth,
            sex,
            contactNumber,
            emergencyContact,
            insuranceInfo,
            address,
        } = req.body;

        // Look up encounter by queue number
        const [encounters] = await db.query(
            `SELECT patient_id FROM encounters WHERE queue_number = ? LIMIT 1`,
            [queueNumber]
        );

        if (encounters.length === 0) {
            return res.status(404).json({ error: "Queue number not found" });
        }

        const patientId = encounters[0].patient_id;

        // Update patient record
        await db.query(
            `
                UPDATE patients
                SET
                    full_name = ?,
                    dob = ?,
                    sex = ?,
                    contact_number = ?,
                    emergency_contact = ?,
                    insurance_info = ?,
                    address = ?
                WHERE id = ?
            `,
            [
                name || "",
                dateOfBirth || null,
                sex || "",
                contactNumber || null,
                emergencyContact || null,
                insuranceInfo || null,
                address || null,
                patientId,
            ]
        );

        // Update encounter status to registered
        await db.query(
            `UPDATE encounters SET status = 'registered' WHERE queue_number = ?`,
            [queueNumber]
        );

        // Log event
        await db.query(
            `
            INSERT INTO encounter_events (encounter_id, type, at, payload)
            SELECT e.id, 'registered', NOW(), JSON_OBJECT(
                'full_name', ?,
                'dob', ?,
                'sex', ?,
                'contact_number', ?,
                'emergency_contact', ?,
                'insurance_info', ?,
                'address', ?
            )
            FROM encounters e
            WHERE e.queue_number = ?
            `,
            [
                name,
                dateOfBirth,
                sex,
                contactNumber,
                emergencyContact,
                insuranceInfo,
                address,
                queueNumber,
            ]
        );

        res.json({ message: "Patient registration updated successfully" });
    } catch (err) {
        console.error("Error saving registration:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
