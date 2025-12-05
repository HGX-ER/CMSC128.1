// routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../db");

/* =============================
   GET ALL USERS
   GET /api/admin/users
============================= */
router.get("/admin/users", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, username, role, full_name, specialty, room, floor, 
              email, phone, status 
       FROM users`
        );
        res.json(rows);
    } catch (err) {
        console.error("❌ Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

/* =============================
   CREATE NEW USER
   POST /api/admin/users
============================= */
router.post("/admin/users", async (req, res) => {
    try {
        const { username, password, role, full_name, specialty, room, floor, email, phone } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ error: "Missing required fields: username, password, role" });
        }

        // Check if username already exists
        const [existing] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const [result] = await db.query(
            `INSERT INTO users (username, password, role, full_name, specialty, room, floor, email, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [username, password, role, full_name || null, specialty || null, room || null, floor || null, email || null, phone || null]
        );

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error("❌ Error creating user:", err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

/* =============================
   UPDATE EXISTING USER
   PUT /api/admin/users/:id
============================= */
router.put("/admin/users/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { full_name, specialty, room, floor, role, email, phone, status } = req.body;

        await db.query(
            `UPDATE users
             SET full_name = ?, specialty = ?, room = ?, floor = ?, role = ?,
                 email = ?, phone = ?, status = ?
             WHERE id = ?`,
            [full_name, specialty, room, floor, role, email || null, phone || null, status || 'active', id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Error updating user:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

/* =============================
   RESET USER PASSWORD
   PUT /api/admin/users/:id/password
============================= */
router.put("/admin/users/:id/password", async (req, res) => {
    try {
        const id = req.params.id;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        await db.query("UPDATE users SET password = ? WHERE id = ?", [password, id]);

        res.json({ success: true });
    } catch (err) {
        console.error("❌ Error resetting password:", err);
        res.status(500).json({ error: "Failed to reset password" });
    }
});

/* =============================
   DELETE USER
   DELETE /api/admin/users/:id
============================= */
router.delete("/admin/users/:id", async (req, res) => {
    try {
        const id = req.params.id;
        await db.query("DELETE FROM users WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

module.exports = router;
