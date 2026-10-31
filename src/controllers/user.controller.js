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