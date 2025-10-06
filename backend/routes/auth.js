// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ success: false, message: 'Missing credentials' });

    try {
        const [rows] = await db.query(
            'SELECT id, username, role FROM users WHERE username=? AND password=? LIMIT 1',
            [username, password]
        );
        if (!rows.length) return res.json({ success: false, message: 'Invalid username or password' });
        res.json({ success: true, user: rows[0] });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
