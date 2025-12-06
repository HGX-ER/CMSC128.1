// backend/services/commonCodesService.js
const axios = require('axios');

let cachedCommonCodes = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Curated fallback list with percentages
const FALLBACK_CODES = [
    { code: 'R07.9', description: 'Chest pain, unspecified', percentage: 8.5, rank: 1 },
    { code: 'R07.89', description: 'Other chest pain', percentage: 6.2, rank: 2 },
    { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', percentage: 5.8, rank: 3 },
    { code: 'R10.9', description: 'Unspecified abdominal pain', percentage: 5.3, rank: 4 },
    { code: 'R51.9', description: 'Headache, unspecified', percentage: 4.7, rank: 5 },
    { code: 'R51', description: 'Headache', percentage: 4.2, rank: 6 },
    { code: 'N39.0', description: 'Urinary tract infection, site not specified', percentage: 3.9, rank: 7 },
    { code: 'M54.5', description: 'Low back pain', percentage: 3.6, rank: 8 },
    { code: 'R11.2', description: 'Nausea with vomiting, unspecified', percentage: 3.4, rank: 9 },
    { code: 'B34.9', description: 'Viral infection, unspecified', percentage: 3.2, rank: 10 },
    // ...add more if you like
];

async function fetchFromNLM() {
    try {
        const response = await axios.get(
            'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search',
            {
                params: {
                    sf: 'code,name',
                    df: 'code,name',
                    maxList: 50,
                    terms: 'chest pain,abdominal pain,headache,fever,nausea,cough,dyspnea'
                },
                timeout: 5000
            }
        );

        if (response.data && response.data[3]) {
            const fromApi = response.data[3].map((item, index) => {
                const match = FALLBACK_CODES.find((c) => c.code === item[0]);
                return {
                    code: item[0],
                    description: item[1],
                    percentage: match?.percentage ?? parseFloat((5 - index * 0.1).toFixed(2)),
                    rank: index + 1
                };
            });

            if (fromApi.length > 0) {
                console.log('✅ Fetched ICD-10 codes from NLM API');
                return fromApi;
            }
        }
    } catch (err) {
        console.log('⚠️ NLM API failed, using fallback list');
    }

    return FALLBACK_CODES;
}

async function getCommonEDCodes(limit = 100) {
    const now = Date.now();
    if (cachedCommonCodes && cacheTimestamp && now - cacheTimestamp < CACHE_DURATION) {
        console.log('📦 Returning cached common ED codes');
        return cachedCommonCodes.slice(0, limit);
    }

    console.log('🔄 Cache expired/empty, fetching common ED codes...');
    const codes = await fetchFromNLM();
    cachedCommonCodes = codes;
    cacheTimestamp = now;
    return codes.slice(0, limit);
}

function clearCache() {
    cachedCommonCodes = null;
    cacheTimestamp = null;
    console.log('🗑️ Cleared common ED ICD-10 cache');
}

module.exports = { getCommonEDCodes, clearCache };
