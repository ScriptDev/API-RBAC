const db = require('../config/db');

/**
 * Listagem de eventos com filtros e paginação
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✓ | PÚBLICO ✓
 */
exports.list = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
        const offset = (page - 1) * limit;

        const { search, location, from_date } = req.query;

        let query = `
            SELECT 
                e.id, 
                e.title, 
                e.description, 
                e.event_date, 
                e.location, 
                e.capacity, 
                e.created_by,
                u.name as organizer_name,
                COUNT(s.id)::int as total_subscriptions,
                GREATEST(0, e.capacity - COUNT(s.id)::int) as available_slots,
                e.created_at
            FROM events e
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN subscriptions s ON e.id = s.event_id
            WHERE 1=1
        `;

        let countQuery = 'SELECT COUNT(*) FROM events WHERE 1=1';
        const params = [];
        const countParams = [];

        if (search) {
            params.push(`%${search.trim()}%`);
            query += ` AND (e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
            countParams.push(`%${search.trim()}%`);
            countQuery += ` AND (title ILIKE $${countParams.length} OR description ILIKE $${countParams.length})`;
        }

        if (location) {
            params.push(`%${location.trim()}%`);
            query += ` AND e.location ILIKE $${params.length}`;
            countParams.push(`%${location.trim()}%`);
            countQuery += ` AND location ILIKE $${countParams.length}`;
        }

        if (from_date) {
            params.push(from_date);
            query += ` AND e.event_date >= $${params.length}`;
            countParams.push(from_date);
            countQuery += ` AND event_date >= $${countParams.length}`;
        }

        const totalRes = await db.query(countQuery, countParams);
        const total = parseInt(totalRes.rows[0].count);

        query += ` GROUP BY e.id, u.name ORDER BY e.event_date ASC`;

        params.push(limit, offset);
        query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

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
        console.error('[EventController.list] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao listar eventos.' });
    }
};

/**
 * Consulta de evento por ID
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✓ | PÚBLICO ✓
 */
exports.getById = async (req, res) => {
    const eventId = parseInt(req.params.id);

    try {
        const query = `
            SELECT 
                e.id, 
                e.title, 
                e.description, 
                e.event_date, 
                e.location, 
                e.capacity, 
                e.created_by,
                u.name as organizer_name,
                COUNT(s.id)::int as total_subscriptions,
                GREATEST(0, e.capacity - COUNT(s.id)::int) as available_slots,
                e.created_at
            FROM events e
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN subscriptions s ON e.id = s.event_id
            WHERE e.id = $1
            GROUP BY e.id, u.name
        `;
        const result = await db.query(query, [eventId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('[EventController.getById] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao buscar evento.' });
    }
};

/**
 * Criação de evento acadêmico
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✖ | PÚBLICO ✖
 */
exports.create = async (req, res) => {
    const { title, description, event_date, location, capacity } = req.body;

    if (!title || !event_date) {
        return res.status(400).json({ error: 'Campos obrigatórios: title e event_date.' });
    }

    try {
        const parsedDate = new Date(event_date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Formato inválido para event_date. Use ISO 8601 (ex: 2026-11-15T09:00:00Z).' });
        }

        const eventCapacity = capacity ? parseInt(capacity) : 100;
        if (eventCapacity <= 0) {
            return res.status(400).json({ error: 'A capacidade deve ser um número inteiro positivo.' });
        }

        const result = await db.query(
            `INSERT INTO events (title, description, event_date, location, capacity, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title.trim(), description || null, parsedDate, location || null, eventCapacity, req.user.id]
        );

        res.status(201).json({
            message: 'Evento acadêmico criado com sucesso!',
            event: result.rows[0]
        });
    } catch (error) {
        console.error('[EventController.create] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao criar evento.' });
    }
};

/**
 * Atualização de dados do evento
 * Matriz RBAC: ADMIN ✓ | EDITOR ✓ | USER ✖ | PÚBLICO ✖
 */
exports.update = async (req, res) => {
    const eventId = parseInt(req.params.id);
    const { title, description, event_date, location, capacity } = req.body;

    try {
        const check = await db.query('SELECT * FROM events WHERE id = $1', [eventId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado.' });
        }

        const updates = [];
        const params = [];

        if (title) {
            params.push(title.trim());
            updates.push(`title = $${params.length}`);
        }
        if (description !== undefined) {
            params.push(description);
            updates.push(`description = $${params.length}`);
        }
        if (event_date) {
            const parsedDate = new Date(event_date);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ error: 'Formato de data inválido.' });
            }
            params.push(parsedDate);
            updates.push(`event_date = $${params.length}`);
        }
        if (location !== undefined) {
            params.push(location);
            updates.push(`location = $${params.length}`);
        }
        if (capacity !== undefined) {
            const cap = parseInt(capacity);
            if (cap <= 0) {
                return res.status(400).json({ error: 'A capacidade deve ser positiva.' });
            }
            params.push(cap);
            updates.push(`capacity = $${params.length}`);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum dado informado para atualização.' });
        }

        params.push(eventId);
        const query = `UPDATE events SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`;
        const result = await db.query(query, params);

        res.json({
            message: 'Evento atualizado com sucesso!',
            event: result.rows[0]
        });
    } catch (error) {
        console.error('[EventController.update] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao atualizar evento.' });
    }
};

/**
 * Exclusão de evento
 * Matriz RBAC: ADMIN ✓ | EDITOR ✖ | USER ✖ | PÚBLICO ✖
 */
exports.remove = async (req, res) => {
    const eventId = parseInt(req.params.id);

    try {
        const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING *', [eventId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Evento não encontrado.' });
        }

        res.json({
            message: 'Evento excluído com sucesso!',
            deletedEvent: result.rows[0]
        });
    } catch (error) {
        console.error('[EventController.remove] Erro:', error);
        res.status(500).json({ error: 'Erro interno ao excluir evento.' });
    }
};
