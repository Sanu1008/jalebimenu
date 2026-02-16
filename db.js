const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  uri: process.env.MYSQL_URL,   // ✅ Railway provides this
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
