const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * GET /api/getdoctor/:username
 * Fetch a doctor's details (for dynamic display in DoctorInterface.jsx)
 */
router.get("/:username", async (req, res) => {
    const { username } = req.params;

    try {
        const [rows] = await db.query(
            `
      SELECT 
        username,
        full_name,
        specialty,
        room,
        floor
      FROM users
      WHERE username = ? AND role = 'doctor'
      LIMIT 1
      `,
            [username]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "Doctor not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("❌ Error fetching doctor info:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
