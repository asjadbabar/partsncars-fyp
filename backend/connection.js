// MySQL connection pool. Plain db.query(...) calls work as before, and
// db.promise().getConnection() gives a dedicated connection for transactions.
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'partsncars',
  waitForConnections: true,
  connectionLimit: 10,
});

pool.getConnection((err, conn) => {
  if (err) {
    console.error('MySQL connection error:', err);
    return;
  }
  console.log('Connected to MySQL database ✅');
  conn.release();
});

module.exports = pool;
