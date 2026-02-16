const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,       // e.g., maglev.proxy.rlwy.net
  user: process.env.MYSQLUSER,       // e.g., root
  password: process.env.MYSQLPASSWORD, // your root password
  database: process.env.MYSQL_DATABASE, // e.g., digital_menu
  port: process.env.MYSQLPORT,       // e.g., 12264
  waitForConnections: true,
  connectionLimit: 10,
  ssl: { rejectUnauthorized: false }
});

console.log("MySQL connection pool created");

module.exports = pool;
