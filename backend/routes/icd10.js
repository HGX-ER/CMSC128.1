const express = require('express');
const router = express.Router();
const { searchICD10, getByCode } = require('../services/icd10Service');

// Search ICD-10 codes
router.get('/icd10/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    res.json(searchICD10(q));
});

// Get single code
router.get('/icd10/:code', (req, res) => {
    const result = getByCode(req.params.code);
    if (!result) return res.status(404).json({ error: 'Code not found' });
    res.json(result);
});

module.exports = router;
