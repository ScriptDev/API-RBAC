const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/rbac.middleware');

// ==========================================
// ROTAS PÚBLICAS
// ==========================================
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/seed-demo', userController.setupDemoAccounts);

// ==========================================
// ROTAS PROTEGIDAS POR RBAC
// ==========================================

// Listar todos os usuários (ADMIN e EDITOR)
router.get('/', authenticate, authorize(['ADMIN', 'EDITOR']), userController.list);

// Obter dados de usuário por ID (ADMIN, EDITOR ou o próprio USER)
router.get('/:id', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), userController.getById);

// Editar dados de usuário (ADMIN, EDITOR para perfil USER, USER para si próprio)
router.put('/:id', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), userController.update);
router.patch('/:id', authenticate, authorize(['ADMIN', 'EDITOR', 'USER']), userController.update);

// Deletar usuário (Apenas ADMIN)
router.delete('/:id', authenticate, authorize(['ADMIN']), userController.remove);

module.exports = router;