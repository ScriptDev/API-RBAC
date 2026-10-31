const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const { authenticate, authorize } = require('../middlewares/rbac.middleware');

// ==========================================
// ROTAS PÚBLICAS (Acesso: PÚBLICO, USER, EDITOR, ADMIN)
// ==========================================
router.get('/', eventController.list);
router.get('/:id', eventController.getById);

// ==========================================
// ROTAS RESTRITAS A ADMIN E EDITOR
// ==========================================
router.post('/', authenticate, authorize(['ADMIN', 'EDITOR']), eventController.create);
router.put('/:id', authenticate, authorize(['ADMIN', 'EDITOR']), eventController.update);

// ==========================================
// ROTA EXCLUSIVA DE ADMIN
// ==========================================
router.delete('/:id', authenticate, authorize(['ADMIN']), eventController.remove);

module.exports = router;
