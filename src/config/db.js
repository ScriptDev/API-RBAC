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

// Inicialização e migração idempotente de colunas adicionais de auditoria e certificação
async function initSchema() {
    try {
        await pool.query(`
            ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'OPEN';
            ALTER TABLE events ADD COLUMN IF NOT EXISTS workload_hours INTEGER DEFAULT 20;
            ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
        `);
    } catch (_) {}
}
initSchema();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
