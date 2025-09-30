const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT id, username, role FROM users WHERE username=? AND password=?';
    db.query(sql, [username, password], (err, results) => {
        if (err) return res.status(500).json({ error: 'db error' });
        if (!results.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        res.json({ success: true, user: results[0] });
    });
});

module.exports = router;
