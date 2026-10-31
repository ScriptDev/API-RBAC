const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { authenticate, authorize } = require('../middlewares/rbac.middleware');

// ==========================================
// ROTA PÚBLICA DE VALIDAÇÃO
// ==========================================
router.get('/validate/:code', certificateController.validateCode);

// ==========================================
// ROTA PROTEGIDA POR RBAC (ADMIN, EDITOR, USER para seus próprios certificados)
// ==========================================
router.get('/:id', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), certificateController.getById);

module.exports = router;
