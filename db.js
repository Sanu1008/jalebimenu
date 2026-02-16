const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,             // e.g., containers-us-west-123.railway.app
  user: process.env.MYSQL_USER,             // e.g., root
  password: process.env.MYSQL_PASSWORD,     // your password
  database: process.env.MYSQL_DATABASE,     // your database name
  port: Number(process.env.MYSQL_PORT)      // make sure this is a number
});

module.exports = pool;
