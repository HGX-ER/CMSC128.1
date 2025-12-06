// backend/routes/icd10.js

const express = require('express');
const router = express.Router();
const { searchICD10, getByCode, getAllCodes } = require('../services/icd10Service');
const { getCommonEDCodes, clearCache } = require('../services/commonCodesService');
const { getCommonCodesWithStats } = require('../services/diagnosisStatsService');

// ✅ Search ICD-10 codes (for doctors)
router.get('/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
        return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    res.json(searchICD10(q));
});

// ✅ HYBRID: Get common codes - BOTH database stats AND online research
router.get('/common', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const refresh = req.query.refresh === 'true';

        if (refresh) {
            clearCache();
            console.log('🗑️ Cleared common ED ICD-10 cache');
        }

        // Get BOTH database stats AND online research codes
        const result = await getCommonCodesWithStats(limit);

        // ✅ Return result directly - don't wrap it again
        res.json(result);

    } catch (error) {
        console.error('Error fetching common codes:', error);

        // Fallback: return just online codes if everything fails
        try {
            const onlineCodes = await getCommonEDCodes(limit);
            res.json({
                database: {
                    codes: [],
                    totalEncounters: 0,
                    uniqueCodes: 0,
                    calculatedAt: null,
                    message: 'Database unavailable'
                },
                online: {
                    codes: onlineCodes.map(c => ({ ...c, source: 'online' }))
                },
                timestamp: new Date().toISOString()
            });
        } catch (fallbackError) {
            res.status(500).json({
                error: 'Failed to fetch ICD-10 codes',
                message: fallbackError.message
            });
        }
    }
});

// ✅ Get ONLY database statistics
router.get('/database-stats', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const result = await getCommonCodesWithStats(limit);
        res.json(result.database || {
            codes: [],
            totalEncounters: 0,
            uniqueCodes: 0,
            message: 'No patient data yet'
        });
    } catch (error) {
        console.error('Error fetching database statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// ✅ Get ONLY online research codes
router.get('/research', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const refresh = req.query.refresh === 'true';

        if (refresh) clearCache();

        const codes = await getCommonEDCodes(limit);
        res.json({
            codes: codes.map(c => ({ ...c, source: 'online' })),
            source: 'research',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching research codes:', error);
        res.status(500).json({
            error: 'Failed to fetch research codes',
            message: error.message
        });
    }
});

// ✅ Get single code by ID (for doctors)
router.get('/:code', (req, res) => {
    const result = getByCode(req.params.code);
    if (!result) return res.status(404).json({ error: 'Code not found' });
    res.json(result);
});

module.exports = router;
