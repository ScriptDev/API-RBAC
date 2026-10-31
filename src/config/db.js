const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')
        ? { rejectUnauthorized: false }
        : undefined
});

pool.on('error', (err) => {
    console.error('[DB] Erro inesperado no client do PostgreSQL:', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
