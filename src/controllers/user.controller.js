const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Cadastro de novo participante/usuário no sistema
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✓ | PÚBLICO ✓
 */
exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Campos obrigatórios: name, email e password.' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
    }

    try {
        // [Segurança/RBAC] Apenas administradores autenticados podem definir papéis diferentes de USER
        let assignedRole = 'USER';
        if (role && ['ADMIN', 'EDITOR', 'USER'].includes(role.toUpperCase())) {
            const authHeader = req.header('Authorization');
            if (authHeader) {
                try {
                    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_jwt_2026');
                    if (decoded.role === 'ADMIN') {
                        assignedRole = role.toUpperCase();
                    }
                } catch (_) {
                    // Token inválido; mantém USER como papel seguro padrão
                }
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
            [name.trim(), email.toLowerCase().trim(), hashedPassword, assignedRole]
        );

        res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            user: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') { // Violação de constraint UNIQUE no email
            return res.status(409).json({ error: 'O email informado já está em uso.' });
        }
        console.error('[UserController.register] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao cadastrar usuário.' });
    }
};

/**
 * Autenticação de usuários com emissão de token JWT
 * Público
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Informe o email e a senha.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const user = result.rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name, email: user.email },
            process.env.JWT_SECRET || 'chave_secreta_jwt_2026',
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Autenticação realizada com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[UserController.login] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao realizar autenticação.' });
    }
};

/**
 * Listagem de usuários com suporte a paginação e filtros
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✖ | PÚBLICO ✖
 */
exports.list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const roleFilter = req.query.role ? req.query.role.toUpperCase() : null;
        const search = req.query.search ? `%${req.query.search.trim()}%` : null;

        let query = 'SELECT id, name, email, role, created_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const params = [];
        const countParams = [];

        if (roleFilter && ['ADMIN', 'EDITOR', 'USER'].includes(roleFilter)) {
            params.push(roleFilter);
            query += ` AND role = $${params.length}`;
            countParams.push(roleFilter);
            countQuery += ` AND role = $${countParams.length}`;
        }

        if (search) {
            params.push(search);
            query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
            countParams.push(search);
            countQuery += ` AND (name ILIKE $${countParams.length} OR email ILIKE $${countParams.length})`;
        }

        const totalRes = await db.query(countQuery, countParams);
        const total = parseInt(totalRes.rows[0].count);

        params.push(limit, offset);
        query += ` ORDER BY id ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await db.query(query, params);

        res.json({
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            },
            data: result.rows
        });
    } catch (error) {
        console.error('[UserController.list] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao listar usuários.' });
    }
};

/**
 * Endpoint de inicialização de dados de demonstração (Seed Rápido)
 * Garante contas de ADMIN, EDITOR e USER para testes visuais e eventos de exemplo
 */
exports.setupDemoAccounts = async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const adminPass = await bcrypt.hash('Admin@123456', salt);
        const editorPass = await bcrypt.hash('EditorPassword123', salt);
        const userPass = await bcrypt.hash('UserPassword123', salt);

        // 1. Garante o ADMIN oficial com papel ADMIN
        await db.query(`
            INSERT INTO users (name, email, password, role)
            VALUES ('Administrador Geral', 'admin@eventos.edu.br', $1, 'ADMIN')
            ON CONFLICT (email) DO UPDATE SET role = 'ADMIN', password = $1, name = 'Administrador Geral'
        `, [adminPass]);

        // 2. Garante o EDITOR oficial com papel EDITOR
        await db.query(`
            INSERT INTO users (name, email, password, role)
            VALUES ('Coordenador de Eventos', 'editor@eventos.edu.br', $1, 'EDITOR')
            ON CONFLICT (email) DO UPDATE SET role = 'EDITOR', password = $1, name = 'Coordenador de Eventos'
        `, [editorPass]);

        // 3. Garante o USER oficial com papel USER e alunos de demonstração
        await db.query(`
            INSERT INTO users (name, email, password, role)
            VALUES 
            ('Carlos Aluno', 'aluno@eventos.edu.br', $1, 'USER'),
            ('Mariana Silva', 'mariana@eventos.edu.br', $1, 'USER'),
            ('Lucas Fernandes', 'lucas@eventos.edu.br', $1, 'USER'),
            ('Beatriz Costa', 'beatriz@eventos.edu.br', $1, 'USER')
            ON CONFLICT (email) DO UPDATE SET password = $1, role = 'USER'
        `, [userPass]);

        // 4. Insere eventos acadêmicos (futuros e passados) se a tabela estiver vazia
        const eventsCount = await db.query('SELECT COUNT(*) FROM events');
        if (parseInt(eventsCount.rows[0].count) === 0) {
            const adminRes = await db.query("SELECT id FROM users WHERE email = 'admin@eventos.edu.br'");
            const adminId = adminRes.rows[0]?.id || null;

            await db.query(`
                INSERT INTO events (title, description, event_date, location, capacity, status, workload_hours, created_by)
                VALUES 
                ('Simpósio de Inteligência Artificial e Engenharia de Software 2026', 'Palestrantes abordando agentes autônomos, LLMs, Clean Architecture e DevSecOps.', CURRENT_TIMESTAMP + INTERVAL '15 days', 'Auditório Nobre Central', 100, 'OPEN', 30, $1),
                ('Workshop de Microsserviços e Segurança RBAC com Node.js', 'Construção prática de APIs REST com autenticação JWT, controle de acesso e Docker.', CURRENT_TIMESTAMP + INTERVAL '7 days', 'Laboratório de Informática 3', 2, 'OPEN', 15, $1),
                ('Seminário Nacional de Cibersegurança e Proteção de Dados (Edição Anterior)', 'Boas práticas OWASP, Zero-Trust e proteção contra vazamento de credenciais.', CURRENT_TIMESTAMP - INTERVAL '10 days', 'Auditório Nobre Central', 50, 'COMPLETED', 20, $1)
            `, [adminId]);
        }

        // 5. Garante inscrições de Alunos nos eventos para validação de presença e testes de certificação
        const allEvents = await db.query("SELECT id, title, status FROM events ORDER BY id ASC");
        const allStudents = await db.query("SELECT id, name, email FROM users WHERE role = 'USER'");

        for (const ev of allEvents.rows) {
            const isCompleted = ev.status === 'COMPLETED';
            for (const st of allStudents.rows) {
                let shouldEnroll = false;
                let shouldAttend = false;

                if (ev.title.includes('Simpósio') && ['aluno@eventos.edu.br', 'mariana@eventos.edu.br', 'lucas@eventos.edu.br'].includes(st.email)) {
                    shouldEnroll = true;
                    shouldAttend = false;
                } else if (ev.title.includes('Workshop') && ['mariana@eventos.edu.br', 'beatriz@eventos.edu.br'].includes(st.email)) {
                    shouldEnroll = true;
                    shouldAttend = false;
                } else if (isCompleted) {
                    shouldEnroll = ['aluno@eventos.edu.br', 'lucas@eventos.edu.br', 'beatriz@eventos.edu.br'].includes(st.email);
                    shouldAttend = ['aluno@eventos.edu.br', 'lucas@eventos.edu.br'].includes(st.email);
                }

                if (shouldEnroll) {
                    const checkSub = await db.query(
                        "SELECT id FROM subscriptions WHERE user_id = $1 AND event_id = $2",
                        [st.id, ev.id]
                    );

                    let subId;
                    if (checkSub.rows.length === 0) {
                        const insertSub = await db.query(
                            "INSERT INTO subscriptions (user_id, event_id, attended) VALUES ($1, $2, $3) RETURNING id",
                            [st.id, ev.id, shouldAttend]
                        );
                        subId = insertSub.rows[0].id;
                    } else {
                        subId = checkSub.rows[0].id;
                        if (isCompleted) {
                            await db.query("UPDATE subscriptions SET attended = $1 WHERE id = $2", [shouldAttend, subId]);
                        }
                    }

                    if (isCompleted && shouldAttend && subId) {
                        const checkCert = await db.query("SELECT id FROM certificates WHERE subscription_id = $1", [subId]);
                        if (checkCert.rows.length === 0) {
                            const certCode = `CERT-${ev.id}-${subId}-${st.email.split('@')[0].toUpperCase()}`;
                            await db.query(
                                "INSERT INTO certificates (subscription_id, certificate_code) VALUES ($1, $2)",
                                [subId, certCode]
                            );
                        }
                    }
                }
            }
        }

        // 6. [Regra de Negócio]: Admin e Editor assiduamente inscritos em todos os eventos (Staff / Coordenação sem consumir vagas)
        const staffUsers = await db.query("SELECT id FROM users WHERE role IN ('ADMIN', 'EDITOR')");
        for (const stf of staffUsers.rows) {
            for (const ev of allEvents.rows) {
                const checkStaffSub = await db.query(
                    "SELECT id FROM subscriptions WHERE user_id = $1 AND event_id = $2",
                    [stf.id, ev.id]
                );
                if (checkStaffSub.rows.length === 0) {
                    await db.query(
                        "INSERT INTO subscriptions (user_id, event_id, attended) VALUES ($1, $2, true)",
                        [stf.id, ev.id]
                    );
                }
            }
        }

        res.json({ message: 'Ambiente de demonstração e eventos de teste preparados com sucesso!' });
    } catch (err) {
        console.error('[setupDemoAccounts] Erro:', err);
        res.status(500).json({ error: 'Erro ao configurar ambiente de demonstração.' });
    }
};

/**
 * Consulta de usuário por ID
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✓ (Apenas o próprio perfil) | PÚBLICO ✖
 */
exports.getById = async (req, res) => {
    const targetId = parseInt(req.params.id);

    // Validação de acesso por usuário comum
    if (req.user.role === 'USER' && req.user.id !== targetId) {
        return res.status(403).json({ error: 'Acesso negado. Usuários só podem visualizar seu próprio perfil.' });
    }

    try {
        const result = await db.query(
            'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
            [targetId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[UserController.getById] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao buscar usuário.' });
    }
};

/**
 * Atualização de usuário
 * Matriz RBAC:
 * - ADMIN: ✓ (Edita qualquer perfil e pode alterar papéis)
 * - EDITOR: ✓ (Apenas perfil USER; não pode editar outros EDITORS ou ADMINS)
 * - USER: ✓ (Apenas o próprio perfil; não pode alterar papel)
 * - PÚBLICO: ✖
 */
exports.update = async (req, res) => {
    const targetId = parseInt(req.params.id);
    const { name, email, password, role } = req.body;

    try {
        // 1. Busca o usuário que será editado
        const targetRes = await db.query('SELECT * FROM users WHERE id = $1', [targetId]);
        if (targetRes.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        const targetUser = targetRes.rows[0];

        // 2. Aplicação estrita das regras de RBAC do PDF
        if (req.user.role === 'USER') {
            if (req.user.id !== targetId) {
                return res.status(403).json({ error: 'Acesso negado. Você só pode editar o seu próprio perfil.' });
            }
            if (role && role !== targetUser.role) {
                return res.status(403).json({ error: 'Acesso negado. Usuários não possuem permissão para alterar o nível de acesso.' });
            }
        } else if (req.user.role === 'EDITOR') {
            // [Regra PDF]: EDITOR edita apenas perfil USER
            if (targetUser.role !== 'USER') {
                return res.status(403).json({ error: 'Acesso negado. Editores só podem modificar contas de perfil USER.' });
            }
            if (role && role !== 'USER') {
                return res.status(403).json({ error: 'Acesso negado. Editores não podem promover contas para ADMIN ou EDITOR.' });
            }
        }
        // ADMIN tem acesso irrestrito para atualizar

        // 3. Monta query de atualização dinâmica
        const updates = [];
        const params = [];

        if (name) {
            params.push(name.trim());
            updates.push(`name = $${params.length}`);
        }
        if (email) {
            params.push(email.toLowerCase().trim());
            updates.push(`email = $${params.length}`);
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'A senha deve conter no mínimo 6 caracteres.' });
            }
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(password, salt);
            params.push(hashed);
            updates.push(`password = $${params.length}`);
        }
        if (role && req.user.role === 'ADMIN' && ['ADMIN', 'EDITOR', 'USER'].includes(role.toUpperCase())) {
            params.push(role.toUpperCase());
            updates.push(`role = $${params.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum dado informado para atualização.' });
        }

        params.push(targetId);
        const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id, name, email, role, created_at`;
        const updated = await db.query(updateQuery, params);

        res.json({
            message: 'Usuário atualizado com sucesso!',
            user: updated.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'O email informado já está em uso por outro usuário.' });
        }
        console.error('[UserController.update] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar usuário.' });
    }
};

/**
 * Exclusão de usuário
 * Matriz RBAC: ADMIN ✓ | EDITOR ✖ | USER ✖ | PÚBLICO ✖
 */
exports.remove = async (req, res) => {
    const targetId = parseInt(req.params.id);

    try {
        if (req.user.id === targetId) {
            return res.status(400).json({ error: 'Não é permitido excluir o próprio usuário autenticado.' });
        }

        const result = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, name, email', [targetId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Usuário excluído com sucesso!', deletedUser: result.rows[0] });
    } catch (error) {
        console.error('[UserController.remove] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao excluir usuário.' });
    }
};