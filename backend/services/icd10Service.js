// backend/services/icd10Service.js
const fs = require('fs');
const csv = require('csv-parser');

let icd10Data = [];

function loadICD10() {
    return new Promise((resolve, reject) => {
        const records = [];
        fs.createReadStream('./data/ICD10.csv')
            .pipe(csv())
            .on('data', (row) => {
                records.push({
                    code: row['﻿CODE'] || row['CODE'] || '',
                    shortDesc: row['SHORT DESCRIPTION (VALID ICD-10 FY2026)'] || '',
                    longDesc: row['LONG DESCRIPTION (VALID ICD-10 FY2026)'] || '',
                    nfExcl: row['NF EXCL'] || null
                });
            })
            .on('end', () => {
                icd10Data = records;
                console.log(`✅ Loaded ${icd10Data.length} ICD-10 codes into memory`);
                resolve(icd10Data);
            })
            .on('error', reject);
    });
}

function searchICD10(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();

    return icd10Data
        .filter((item) => {
            const code = (item.code || '').toLowerCase();
            const shortDesc = (item.shortDesc || '').toLowerCase();
            const longDesc = (item.longDesc || '').toLowerCase();

            return (
                code.startsWith(q) ||
                code.includes(q) ||
                shortDesc.includes(q) ||
                longDesc.includes(q)
            );
        })
        .slice(0, 50);
}

function getByCode(code) {
    return icd10Data.find((item) => item.code === code) || null;
}

function getAllCodes() {
    return icd10Data;
}

module.exports = { loadICD10, searchICD10, getByCode, getAllCodes };
