const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // INDISPENSABLE pour Aiven
  ssl: {
    rejectUnauthorized: false
  }
});

pool.getConnection()
  .then(conn => { console.log('Connecte au Serveur de Données'); conn.release(); })
  .catch(err => { console.error('Erreur de connexion a la base de donnees:', err.message); });

module.exports = pool;
