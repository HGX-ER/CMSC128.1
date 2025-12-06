// services/diagnosisStatsService.js
const pool = require('../db');
const fs = require('fs');
const path = require('path');

// Get national research codes
async function getNationalCommonCodes(limit = 100) {
    try {
        // Return ONLY common ED research codes (NOT database codes)
        return [
            { code: 'R07.9', description: 'Chest pain, unspecified', percentage: 8.5, rank: 1 },
            { code: 'R07.89', description: 'Other chest pain', percentage: 6.2, rank: 2 },
            { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', percentage: 5.8, rank: 3 },
            { code: 'R10.9', description: 'Unspecified abdominal pain', percentage: 5.3, rank: 4 },
            { code: 'R51.9', description: 'Headache, unspecified', percentage: 4.7, rank: 5 },
            { code: 'R51', description: 'Headache', percentage: 4.2, rank: 6 },
            { code: 'N39.0', description: 'Urinary tract infection, site not specified', percentage: 3.9, rank: 7 },
            { code: 'M54.5', description: 'Low back pain', percentage: 3.6, rank: 8 },
            { code: 'R11.2', description: 'Nausea with vomiting, unspecified', percentage: 3.4, rank: 9 },
            { code: 'B34.9', description: 'Viral infection, unspecified', percentage: 3.2, rank: 10 }
            // ❌ Do NOT include A000 here - that's database only
        ].slice(0, limit);
    } catch (error) {
        console.error('Error loading national codes:', error);
        return [];
    }
}


async function calculateCodeFrequencies() {
    try {
        const [rows] = await pool.query(`
            SELECT
                icd_code as code,
                icd_description as description,
                COUNT(*) as count,
        ROUND((COUNT(*) * 100.0 / (
          SELECT COUNT(*) 
          FROM encounter_icd_codes 
          WHERE icd_code IS NOT NULL AND icd_code != ''
        )), 2) as percentage
            FROM encounter_icd_codes
            WHERE icd_code IS NOT NULL
              AND icd_code != ''
            GROUP BY icd_code, icd_description
            HAVING COUNT(*) >= 1
            ORDER BY count DESC
                LIMIT 100
        `);

        return rows.map((row, index) => ({
            code: row.code,
            description: row.description || 'No description available',
            count: parseInt(row.count),
            percentage: parseFloat(row.percentage),
            rank: index + 1,
            source: 'database'
        }));
    } catch (error) {
        console.log('⚠️ No encounter ICD data yet:', error.message);
        return [];
    }
}

async function getCommonCodesWithStats(limit = 100) {
    try {
        // Get YOUR ED's actual frequencies
        const databaseStats = await calculateCodeFrequencies();

        // Get national research codes
        const nationalCodes = await getNationalCommonCodes(limit);

        return {
            database: {
                codes: databaseStats,
                totalEncounters: databaseStats.reduce((sum, c) => sum + (c.count || 0), 0),
                uniqueCodes: databaseStats.length,
                calculatedAt: new Date().toISOString()
            },
            online: {
                codes: nationalCodes.map(c => ({ ...c, source: 'online' }))
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error in getCommonCodesWithStats:', error);
        const nationalCodes = await getNationalCommonCodes(limit);
        return {
            database: {
                codes: [],
                totalEncounters: 0,
                uniqueCodes: 0,
                calculatedAt: null
            },
            online: {
                codes: nationalCodes.map(c => ({ ...c, source: 'online' }))
            },
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = {
    calculateCodeFrequencies,
    getCommonCodesWithStats,
    getNationalCommonCodes
};
