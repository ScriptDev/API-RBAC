require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger.json');

// Importação das Rotas da Arquitetura
const userRoutes = require('./routes/user.routes');
const eventRoutes = require('./routes/event.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const certificateRoutes = require('./routes/certificate.routes');

const app = express();

// Middlewares globais
app.use(express.json());
app.use(cors());

// Servir Painel Web de Demonstração (Permite testar e apresentar via navegador sem Postman)
app.use(express.static(path.join(__dirname, '../public')));

// Documentação Swagger Interativa
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check do Sistema
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'API Gestão de Eventos Acadêmicos - RBAC',
        timestamp: new Date().toISOString()
    });
});

// Injeção de Rotas Modulares da API
app.use('/users', userRoutes);
app.use('/events', eventRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/certificates', certificateRoutes);

// Endpoint de metadados da API (caso requisitado via JSON)
app.get('/api', (req, res) => {
    res.json({
        name: 'API Gestão de Eventos Acadêmicos com RBAC',
        version: '1.0.0',
        documentation: '/api-docs',
        dashboard: '/',
        healthCheck: '/health',
        resources: ['/users', '/events', '/subscriptions', '/certificates']
    });
});

// Middleware 404 para rotas inexistentes
app.use((req, res) => {
    res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware de tratamento global de erros
app.use((err, req, res, next) => {
    console.error('[GlobalErrorHandler]', err.stack || err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno no servidor.',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 API RBAC OPERACIONAL NA PORTA ${PORT}`);
    console.log(`🌐 Painel Web Interativo: http://localhost:${PORT}`);
    console.log(`📖 Documentação Swagger: http://localhost:${PORT}/api-docs`);
    console.log(`=======================================================`);
});

module.exports = app;