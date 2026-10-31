const http = require('http');
const app = require('./src/index');

// Inicia servidor em porta de teste temporária
const TEST_PORT = 3099;
let server;

function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port: TEST_PORT,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (_) {
                    parsed = data;
                }
                resolve({ status: res.statusCode, body: parsed });
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('INICIANDO BATERIA DE TESTES DE INTEGRIDADE DA API RBAC');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message, details = '') {
        if (condition) {
            console.log(`[PASS] ${message}`);
            passed++;
        } else {
            console.error(`[FAIL] ${message} - Detalhes:`, details);
            failed++;
        }
    }

    try {
        server = app.listen(TEST_PORT);
        await new Promise(r => setTimeout(r, 1000));

        // 1. Health check
        const health = await request('GET', '/health');
        assert(health.status === 200 && health.body.status === 'UP', 'GET /health retorna 200 e status UP');

        // 2. Swagger docs
        const docs = await request('GET', '/api-docs/');
        assert(docs.status === 200 || docs.status === 301, 'GET /api-docs/ disponível e respondendo');

        const timestamp = Date.now();
        const adminEmail = `admin_${timestamp}@eventos.edu.br`;
        const editorEmail = `editor_${timestamp}@eventos.edu.br`;
        const user1Email = `user1_${timestamp}@eventos.edu.br`;
        const user2Email = `user2_${timestamp}@eventos.edu.br`;

        // 3. Cadastrar ADMIN
        const regAdmin = await request('POST', '/users/register', {
            name: 'Admin Teste',
            email: adminEmail,
            password: 'AdminPassword123'
        });
        assert(regAdmin.status === 201, 'POST /users/register cria usuário', regAdmin.body);

        // Promover diretamente para ADMIN no banco para fins de teste
        const db = require('./src/config/db');
        await db.query('UPDATE users SET role = $1 WHERE email = $2', ['ADMIN', adminEmail]);

        // Login ADMIN
        const loginAdmin = await request('POST', '/users/login', {
            email: adminEmail,
            password: 'AdminPassword123'
        });
        assert(loginAdmin.status === 200 && loginAdmin.body.token, 'POST /users/login para ADMIN retorna 200 e JWT');
        const tokenAdmin = loginAdmin.body.token;
        const adminId = loginAdmin.body.user.id;

        // 4. Cadastrar EDITOR usando token de ADMIN
        const regEditor = await request('POST', '/users/register', {
            name: 'Editor Teste',
            email: editorEmail,
            password: 'EditorPassword123',
            role: 'EDITOR'
        }, tokenAdmin);
        assert(regEditor.status === 201 && regEditor.body.user.role === 'EDITOR', 'POST /users/register com token ADMIN cria role EDITOR');

        const loginEditor = await request('POST', '/users/login', {
            email: editorEmail,
            password: 'EditorPassword123'
        });
        const tokenEditor = loginEditor.body.token;
        const editorId = loginEditor.body.user.id;

        // 5. Cadastrar USER 1 e USER 2 (públicos)
        const regUser1 = await request('POST', '/users/register', {
            name: 'Aluno Um',
            email: user1Email,
            password: 'UserPassword123'
        });
        assert(regUser1.status === 201 && regUser1.body.user.role === 'USER', 'POST /users/register público define role padrão USER');

        const regUser2 = await request('POST', '/users/register', {
            name: 'Aluno Dois',
            email: user2Email,
            password: 'UserPassword123'
        });
        const user1Id = regUser1.body.user.id;
        const user2Id = regUser2.body.user.id;

        const loginUser1 = await request('POST', '/users/login', { email: user1Email, password: 'UserPassword123' });
        const tokenUser1 = loginUser1.body.token;

        const loginUser2 = await request('POST', '/users/login', { email: user2Email, password: 'UserPassword123' });
        const tokenUser2 = loginUser2.body.token;

        // 6. Testar RBAC em GET /users
        const listUsersAnon = await request('GET', '/users');
        assert(listUsersAnon.status === 401, 'GET /users anônimo retorna 401');

        const listUsersUser = await request('GET', '/users', null, tokenUser1);
        assert(listUsersUser.status === 403, 'GET /users com perfil USER retorna 403 (Proibido)');

        const listUsersEditor = await request('GET', '/users', null, tokenEditor);
        assert(listUsersEditor.status === 200, 'GET /users com perfil EDITOR retorna 200');

        const listUsersAdmin = await request('GET', '/users', null, tokenAdmin);
        assert(listUsersAdmin.status === 200, 'GET /users com perfil ADMIN retorna 200');

        // 7. Testar RBAC em PUT /users/:id
        // USER tentando editar outro USER
        const editOtherUser = await request('PUT', `/users/${user2Id}`, { name: 'Tentativa Hacker' }, tokenUser1);
        assert(editOtherUser.status === 403, 'PUT /users/:id: USER não pode editar outro usuário (403)');

        // USER editando a si próprio
        const editSelf = await request('PUT', `/users/${user1Id}`, { name: 'Aluno Um Atualizado' }, tokenUser1);
        assert(editSelf.status === 200 && editSelf.body.user.name === 'Aluno Um Atualizado', 'PUT /users/:id: USER pode editar seu próprio perfil (200)');

        // EDITOR editando conta USER
        const editUserByEditor = await request('PUT', `/users/${user2Id}`, { name: 'Aluno Dois Modificado por Editor' }, tokenEditor);
        assert(editUserByEditor.status === 200, 'PUT /users/:id: EDITOR pode editar perfil USER (200)');

        // EDITOR tentando editar conta ADMIN
        const editAdminByEditor = await request('PUT', `/users/${adminId}`, { name: 'Hacked Admin' }, tokenEditor);
        assert(editAdminByEditor.status === 403, 'PUT /users/:id: EDITOR não pode editar perfil ADMIN (403)');

        // ADMIN editando qualquer conta
        const editByAdmin = await request('PUT', `/users/${editorId}`, { name: 'Editor Nome Atualizado por Admin' }, tokenAdmin);
        assert(editByAdmin.status === 200, 'PUT /users/:id: ADMIN pode editar qualquer perfil (200)');

        // 8. Testar RBAC em DELETE /users/:id
        const delByUser = await request('DELETE', `/users/${user2Id}`, null, tokenUser1);
        assert(delByUser.status === 403, 'DELETE /users/:id com perfil USER retorna 403');

        const delByEditor = await request('DELETE', `/users/${user2Id}`, null, tokenEditor);
        assert(delByEditor.status === 403, 'DELETE /users/:id com perfil EDITOR retorna 403');

        // 9. Testar RBAC em /events
        // GET /events público
        const listEventsPublic = await request('GET', '/events');
        assert(listEventsPublic.status === 200, 'GET /events público retorna 200');

        // POST /events sem token
        const createEventAnon = await request('POST', '/events', { title: 'Hack Event', event_date: '2026-12-01' });
        assert(createEventAnon.status === 401, 'POST /events anônimo retorna 401');

        // POST /events com USER
        const createEventUser = await request('POST', '/events', { title: 'Hack Event', event_date: '2026-12-01' }, tokenUser1);
        assert(createEventUser.status === 403, 'POST /events com perfil USER retorna 403');

        // POST /events com EDITOR
        const createEventEditor = await request('POST', '/events', {
            title: `Workshop de Node.js e RBAC ${timestamp}`,
            description: 'Implementação de segurança e Clean Architecture',
            event_date: '2026-12-10T14:00:00Z',
            location: 'Laboratório 3',
            capacity: 2
        }, tokenEditor);
        assert(createEventEditor.status === 201 && createEventEditor.body.event.id, 'POST /events com perfil EDITOR cria evento com sucesso (201)');
        const eventId = createEventEditor.body.event.id;

        // PUT /events/:id com USER
        const editEventUser = await request('PUT', `/events/${eventId}`, { title: 'Modificado por User' }, tokenUser1);
        assert(editEventUser.status === 403, 'PUT /events/:id com perfil USER retorna 403');

        // PUT /events/:id com EDITOR
        const editEventEditor = await request('PUT', `/events/${eventId}`, { title: `Workshop de Node.js e RBAC Atualizado ${timestamp}` }, tokenEditor);
        assert(editEventEditor.status === 200, 'PUT /events/:id com perfil EDITOR edita evento (200)');

        // DELETE /events/:id com EDITOR
        const delEventEditor = await request('DELETE', `/events/${eventId}`, null, tokenEditor);
        assert(delEventEditor.status === 403, 'DELETE /events/:id com perfil EDITOR retorna 403 (Apenas ADMIN)');

        // 10. Testar Inscrições (/subscriptions)
        // Inscrição anônima
        const subAnon = await request('POST', '/subscriptions', { event_id: eventId });
        assert(subAnon.status === 401, 'POST /subscriptions anônimo retorna 401');

        // Inscrição USER 1 no evento
        const subUser1 = await request('POST', '/subscriptions', { event_id: eventId }, tokenUser1);
        assert(subUser1.status === 201 && subUser1.body.subscription.id, 'POST /subscriptions com USER inscreve com sucesso (201)');
        const sub1Id = subUser1.body.subscription.id;

        // Duplicidade de inscrição
        const subUser1Dup = await request('POST', '/subscriptions', { event_id: eventId }, tokenUser1);
        assert(subUser1Dup.status === 409, 'POST /subscriptions duplicado retorna 409 Conflito');

        // Inscrição USER 2 no evento (atingindo a capacidade = 2)
        const subUser2 = await request('POST', '/subscriptions', { event_id: eventId }, tokenUser2);
        assert(subUser2.status === 201, 'POST /subscriptions USER 2 inscreve com sucesso (201)');

        // Inscrição extra em evento lotado
        const subUserExtra = await request('POST', '/subscriptions', { event_id: eventId }, tokenAdmin);
        assert(subUserExtra.status === 400, 'POST /subscriptions em evento com capacidade esgotada retorna 400');

        // 11. Testar Segregação RBAC em GET /subscriptions
        const listSubUser1 = await request('GET', '/subscriptions', null, tokenUser1);
        assert(
            listSubUser1.status === 200 &&
            listSubUser1.body.data.every(s => s.user_id === user1Id),
            'GET /subscriptions com USER retorna estritamente apenas as suas próprias inscrições'
        );

        const listSubAdmin = await request('GET', '/subscriptions', null, tokenAdmin);
        assert(
            listSubAdmin.status === 200 && listSubAdmin.body.data.length >= 2,
            'GET /subscriptions com ADMIN retorna todas as inscrições do sistema'
        );

        // 12. Testar Certificados (/certificates/:id)
        // Acesso anônimo a certificado
        const certAnon = await request('GET', `/certificates/${sub1Id}`);
        assert(certAnon.status === 401, 'GET /certificates/:id anônimo retorna 401');

        // USER 2 tentando acessar o certificado da inscrição de USER 1
        const certOtherUser = await request('GET', `/certificates/${sub1Id}`, null, tokenUser2);
        assert(certOtherUser.status === 403, 'GET /certificates/:id: USER não pode acessar certificado de outro participante (403)');

        // USER 1 acessando o seu próprio certificado
        const certOwnUser = await request('GET', `/certificates/${sub1Id}`, null, tokenUser1);
        assert(certOwnUser.status === 200 && certOwnUser.body.certificate.code, 'GET /certificates/:id: USER acessa seu próprio certificado com sucesso (200)');
        const certCode = certOwnUser.body.certificate.code;

        // ADMIN acessando qualquer certificado
        const certByAdmin = await request('GET', `/certificates/${sub1Id}`, null, tokenAdmin);
        assert(certByAdmin.status === 200, 'GET /certificates/:id: ADMIN pode acessar qualquer certificado (200)');

        // Validação pública de autenticidade do certificado
        const validatePub = await request('GET', `/certificates/validate/${certCode}`);
        assert(validatePub.status === 200 && validatePub.body.valid === true, 'GET /certificates/validate/:code valida autenticidade publicamente');

        // 13. Limpeza / DELETE /events/:id com ADMIN
        const delEventAdmin = await request('DELETE', `/events/${eventId}`, null, tokenAdmin);
        assert(delEventAdmin.status === 200, 'DELETE /events/:id com perfil ADMIN deleta evento com sucesso (200)');

        // DELETE /users/:id com ADMIN
        const delUserAdmin = await request('DELETE', `/users/${user2Id}`, null, tokenAdmin);
        assert(delUserAdmin.status === 200, 'DELETE /users/:id com perfil ADMIN deleta usuário com sucesso (200)');

        console.log('\n====================================================');
        console.log(`TESTES FINALIZADOS: ${passed} PASSOU | ${failed} FALHOU`);
        console.log('====================================================');

    } catch (err) {
        console.error('ERRO FATAL NA EXECUÇÃO DOS TESTES:', err);
    } finally {
        if (server) server.close();
        process.exit(failed > 0 ? 1 : 0);
    }
}

runTests();
