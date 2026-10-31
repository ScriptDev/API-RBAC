const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middlewares/rbac.middleware');

// ==========================================
// ROTAS DE INSCRIÇÕES PROTEGIDAS POR RBAC
// ==========================================

// Inscrever-se em evento (ADMIN, EDITOR, USER)
router.post('/', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), subscriptionController.create);

// Listar inscrições (ADMIN e EDITOR veem todas; USER vê apenas as suas)
router.get('/', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), subscriptionController.list);

// Cancelar inscrição (ADMIN ou o próprio USER)
router.delete('/:id', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), subscriptionController.remove);

module.exports = router;
