-- =========================================================================
-- BANCO DE DADOS: PLATAFORMA DE GESTÃO DE EVENTOS ACADÊMICOS
-- SISTEMA RBAC (ADMIN, EDITOR, USER)
-- =========================================================================

-- 1. TIPO ENUM PARA PERFIS DE ACESSO
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'EDITOR', 'USER');
    END IF;
END $$;

-- 2. TABELA DE USUÁRIOS (PARTICIPANTES E GESTORES)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE EVENTOS ACADÊMICOS
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    capacity INTEGER DEFAULT 100,
    status VARCHAR(50) DEFAULT 'OPEN',
    workload_hours INTEGER DEFAULT 20,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE INSCRIÇÕES
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attended BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscriptions_user_id_event_id_key UNIQUE (user_id, event_id)
);

-- 5. TABELA DE CERTIFICADOS
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    certificate_code VARCHAR(100) UNIQUE NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ÍNDICES DE PERFORMANCE E OTIMIZAÇÃO DE BUSCA
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_event ON subscriptions(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);

-- 7. SEED INICIAL (ADMIN PADRÃO)
-- Senha padrão do admin: Admin@123456
INSERT INTO users (name, email, password, role)
VALUES (
    'Administrador do Sistema',
    'admin@eventos.edu.br',
    '$2a$10$Wd3Qe1aO3iP8N5Wf1zL50e7kXlC4W8n2mH7K9k0x1v5a2z9u0w8q6', -- Hash bcrypt de 'Admin@123456'
    'ADMIN'
)
ON CONFLICT (email) DO NOTHING;
