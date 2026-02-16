const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,             // e.g., containers-us-west-123.railway.app
  user: process.env.MYSQLUSER,             // e.g., root
  password: process.env.MYSQLPASSWORD,     // your password
  database: process.env.MYSQL_DATABASE,     // your database name
  port: Number(process.env.MYSQLPORT)      // make sure this is a number
});

module.exports = pool;
