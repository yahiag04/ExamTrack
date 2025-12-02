
//file env
require('dotenv').config();

const { Pool } = require('pg');

//pool di connessioni a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

//funzione che permette la gestione di errori dopo inserimento query
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Errore durante l’esecuzione della query:', err);
    throw err;
  }
}

//funzione disponibile a tutto il progetto
module.exports = {
  query,
};