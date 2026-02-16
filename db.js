const mysql = require('mysql2/promise');
console.log("MYSQL_URL exists:", !!process.env.MYSQL_URL); // 👈 ADD HERE
console.log("MYSQL_URL value:", process.env.MYSQL_URL);    // optional (for debugging)
const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,   // ✅ single Railway variable
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false } // sometimes required on Railway
});

module.exports = pool;
