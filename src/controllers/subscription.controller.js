const db = require('../config/db');
const crypto = require('crypto');

/**
 * Inscrição de participante em evento acadêmico
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✓ | PÚBLICO ✖
 */
exports.create = async (req, res) => {
    const { event_id } = req.body;

    if (!event_id) {
        return res.status(400).json({ error: 'O campo event_id é obrigatório.' });
    }

    // Administrador pode inscrever outro usuário se informado; demais inscrevem a si próprios
    let targetUserId = req.user.id;
    if (req.user.role === 'ADMIN' && req.body.user_id) {
        targetUserId = parseInt(req.body.user_id);
    }

    try {
        // 1. Verifica se o evento existe e busca a capacidade
        const eventRes = await db.query(
            `SELECT e.*, COUNT(s.id)::int as current_subscriptions
             FROM events e
             LEFT JOIN subscriptions s ON e.id = s.event_id
             WHERE e.id = $1
             GROUP BY e.id`,
            [event_id]
        );

        if (eventRes.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado.' });
        }

        const event = eventRes.rows[0];

        // 2. Validação temporal: Inscrições permitidas apenas para eventos atuais ou futuros
        if (new Date(event.event_date) < new Date()) {
            return res.status(400).json({
                error: 'Inscrições encerradas. Não é possível se inscrever em um evento acadêmico que já ocorreu.'
            });
        }

        // 3. Verifica se a capacidade foi excedida
        if (event.capacity && event.current_subscriptions >= event.capacity) {
            return res.status(400).json({
                error: 'Inscrições encerradas. A capacidade máxima do evento foi atingida.'
            });
        }

        // 4. Verifica duplicidade de inscrição
        const checkSub = await db.query(
            'SELECT * FROM subscriptions WHERE user_id = $1 AND event_id = $2',
            [targetUserId, event_id]
        );
        if (checkSub.rows.length > 0) {
            return res.status(409).json({ error: 'Participante já está inscrito neste evento.' });
        }

        // 4. Cria a inscrição
        const subResult = await db.query(
            `INSERT INTO subscriptions (user_id, event_id)
             VALUES ($1, $2)
             RETURNING id, user_id, event_id, created_at`,
            [targetUserId, event_id]
        );
        const subscription = subResult.rows[0];

        // 5. Gera automaticamente o certificado associado para pronta emissão
        const certCode = `CERT-${event_id}-${subscription.id}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        await db.query(
            `INSERT INTO certificates (subscription_id, certificate_code)
             VALUES ($1, $2)`,
            [subscription.id, certCode]
        );

        res.status(201).json({
            message: 'Inscrição realizada com sucesso!',
            subscription: {
                ...subscription,
                event_title: event.title,
                event_date: event.event_date,
                certificate_code: certCode
            }
        });
    } catch (error) {
        console.error('[SubscriptionController.create] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao realizar inscrição no evento.' });
    }
};

/**
 * Listagem de inscrições
 * Matriz RBAC:
 * - ADMIN: ✓ (Todas)
 * - EDITOR: ✓ (Todas)
 * - USER: ✓ (Apenas as suas)
 * - PÚBLICO: ✖
 */
exports.list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                s.id as subscription_id,
                s.created_at as subscription_date,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email,
                e.id as event_id,
                e.title as event_title,
                e.event_date,
                e.location as event_location,
                c.id as certificate_id,
                c.certificate_code,
                c.issued_at as certificate_issued_at
            FROM subscriptions s
            JOIN users u ON s.user_id = u.id
            JOIN events e ON s.event_id = e.id
            LEFT JOIN certificates c ON s.id = c.subscription_id
            WHERE 1=1
        `;

        let countQuery = `
            SELECT COUNT(*) 
            FROM subscriptions s 
            JOIN users u ON s.user_id = u.id 
            JOIN events e ON s.event_id = e.id 
            WHERE 1=1
        `;

        const params = [];
        const countParams = [];

        // [Regra RBAC PDF]: USER enxerga apenas as suas próprias inscrições
        if (req.user.role === 'USER') {
            params.push(req.user.id);
            query += ` AND s.user_id = $${params.length}`;
            countParams.push(req.user.id);
            countQuery += ` AND s.user_id = $${countParams.length}`;
        } else {
            // ADMIN e EDITOR podem filtrar por user_id específico se desejado
            if (req.query.user_id) {
                params.push(parseInt(req.query.user_id));
                query += ` AND s.user_id = $${params.length}`;
                countParams.push(parseInt(req.query.user_id));
                countQuery += ` AND s.user_id = $${countParams.length}`;
            }
        }

        // Filtro opcional por event_id
        if (req.query.event_id) {
            params.push(parseInt(req.query.event_id));
            query += ` AND s.event_id = $${params.length}`;
            countParams.push(parseInt(req.query.event_id));
            countQuery += ` AND s.event_id = $${countParams.length}`;
        }

        const countRes = await db.query(countQuery, countParams);
        const total = parseInt(countRes.rows[0].count);

        params.push(limit, offset);
        query += ` ORDER BY s.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

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
        console.error('[SubscriptionController.list] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao consultar inscrições.' });
    }
};

/**
 * Cancelamento de inscrição
 * ADMIN ou o próprio USER
 */
exports.remove = async (req, res) => {
    const subId = parseInt(req.params.id);

    try {
        const subRes = await db.query('SELECT * FROM subscriptions WHERE id = $1', [subId]);
        if (subRes.rows.length === 0) {
            return res.status(404).json({ error: 'Inscrição não encontrada.' });
        }

        const sub = subRes.rows[0];

        // Apenas ADMIN ou o próprio usuário que realizou a inscrição pode cancelar
        if (req.user.role !== 'ADMIN' && req.user.id !== sub.user_id) {
            return res.status(403).json({ error: 'Acesso negado. Você só pode cancelar a sua própria inscrição.' });
        }

        await db.query('DELETE FROM subscriptions WHERE id = $1', [subId]);

        res.json({ message: 'Inscrição cancelada com sucesso!' });
    } catch (error) {
        console.error('[SubscriptionController.remove] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao cancelar inscrição.' });
    }
};
