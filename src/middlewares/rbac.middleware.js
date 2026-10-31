const jwt = require('jsonwebtoken');

/**
 * Middleware para validar o token JWT
 */
const authenticate = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (!token) {
        return res.status(401).json({ error: 'Acesso negado. Token malformado.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'chave_secreta_jwt_2026');
        req.user = verified;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
};

/**
 * Middleware para autorização baseada em papéis (RBAC)
 * @param {Array<string>} roles - Lista de perfis permitidos (ex: ['ADMIN', 'EDITOR'])
 */
const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Permissão negada. Nível de acesso insuficiente para este recurso.',
                requiredRoles: roles,
                currentRole: req.user ? req.user.role : null
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };