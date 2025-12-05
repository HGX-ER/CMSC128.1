// backend/db.js
const mysql = require('mysql2');

// Create a normal pool…
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'tinTONtangg777!',
    database: process.env.DB_NAME || 'testdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// …then export its Promise wrapper.
module.exports = pool.promise();
