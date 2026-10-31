# Plataforma de Gestão de Eventos Acadêmicos (API REST com RBAC)

API REST desenvolvida em **Node.js**, **Express** e **PostgreSQL** (hospedado no Supabase), estruturada com foco em **Clean Architecture**, segurança corporativa e **Controle de Acesso Baseado em Papéis (RBAC)**.

O sistema atende a todos os requisitos de gestão de eventos acadêmicos, participantes, inscrições com controle de capacidade, emissão automática de certificados com hash de validação, documentação interativa via **Swagger**, suíte automatizada de testes e uma **Interface Web Integrada** para consumo direto dos recursos.

---

## 🏗️ Estrutura de Diretórios e Arquivos

```text
Samuel BK/
├── public/
│   └── index.html          # Interface Web integrada (HTML5/Tailwind/JS nativo)
├── src/
│   ├── config/
│   │   ├── db.js           # Gerenciamento do pool de conexões PostgreSQL (pg) com SSL
│   │   └── swagger.json    # Especificação OpenAPI 3.0 para documentação interativa
│   ├── controllers/
│   │   ├── user.controller.js          # Regras de cadastro, login (JWT), listagem e perfil
│   │   ├── event.controller.js         # CRUD de eventos, busca textual e cálculo de vagas
│   │   ├── subscription.controller.js  # Inscrições, controle de duplicidade e lotação
│   │   └── certificate.controller.js   # Emissão de certificados e verificação pública
│   ├── middlewares/
│   │   └── rbac.middleware.js          # Validação de token JWT e filtro de papéis (RBAC)
│   ├── routes/
│   │   ├── user.routes.js              # Rotas /users
│   │   ├── event.routes.js             # Rotas /events
│   │   ├── subscription.routes.js      # Rotas /subscriptions
│   │   └── certificate.routes.js       # Rotas /certificates
│   └── index.js            # Entrypoint do Express, middlewares globais e tratamento de erros
├── script.sql              # DDL com tabelas, ENUM, constraints, índices e seed de Admin
├── Dockerfile              # Imagem Docker otimizada baseada em Node 20 Alpine
├── docker-compose.yml      # Configuração para execução em containers
├── postman_collection.json # Coleção Postman com todas as requisições e scripts de token
├── test_suite.js           # Suíte de testes com 38 asserções automatizadas da matriz RBAC
├── .env.example            # Modelo de variáveis de ambiente sem credenciais sensíveis
└── package.json            # Metadados, scripts e dependências do projeto
```

---

## 📦 Dependências e Suas Funções no Projeto

| Pacote | Onde é consumido | Finalidade Técnica |
| :--- | :--- | :--- |
| **`express`** | `src/index.js`, rotas | Framework HTTP para orquestração de rotas, middlewares e envio de respostas JSON. |
| **`pg` (node-postgres)** | `src/config/db.js` | Driver nativo para comunicação com o PostgreSQL. Utiliza um `Pool` para manter conexões abertas reutilizáveis e suporta queries parametrizadas (`$1, $2`). |
| **`jsonwebtoken`** | `rbac.middleware.js`, `user.controller.js` | Geração de tokens de autenticação `jwt.sign()` no login e validação criptográfica com `jwt.verify()` nas rotas protegidas. |
| **`bcryptjs`** | `user.controller.js` | Hashing seguro de senhas com salting (10 rounds), garantindo que senhas nunca sejam gravadas em texto plano. |
| **`dotenv`** | `src/index.js`, `src/config/db.js` | Carregamento de segredos e URLs a partir do arquivo `.env` para a memória em `process.env`. |
| **`cors`** | `src/index.js` | Middleware que anexa os headers de CORS para permitir requisições seguras de navegadores ou apps externos. |
| **`swagger-ui-express`** | `src/index.js` | Renderização visual da documentação OpenAPI 3.0 no endpoint `/api-docs`. |

---

## 🚀 Como Executar o Projeto

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Configuração do `.env`
Crie ou edite o arquivo `.env` na raiz:
```env
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
PORT=3000
JWT_SECRET=sua_chave_secreta_jwt
```

### 3. Inicialização do Servidor
```bash
# Modo de desenvolvimento com reinicialização automática:
npm run dev

# Modo tradicional:
npm start
```

### 4. Execução dos Testes Automatizados
```bash
npm test
```
*Executa a bateria de 38 asserções em `test_suite.js` validando cada célula da matriz RBAC e as regras de negócio.*

---

## 🌐 Formas de Interação com o Sistema

1. **Interface Web Integrada:** Acesse `http://localhost:3000` para navegar pelas funcionalidades visuais (busca de eventos, inscrições, emissão e impressão de diplomas acadêmicos).
2. **Documentação Swagger UI:** Acesse `http://localhost:3000/api-docs` para inspecionar endpoints, testar chamadas e verificar contratos de dados.
3. **Coleção Postman:** Importe o arquivo `postman_collection.json` caso prefira utilizar o cliente Postman.

---

## 🛡️ Matriz de Permissões RBAC

| Funcionalidade / Endpoint | Método HTTP | ADMIN | EDITOR | USER | PÚBLICO |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Listar / Buscar Eventos** (`/events`) | `GET` | ✓ | ✓ | ✓ | ✓ |
| **Criar Evento** (`/events`) | `POST` | ✓ | ✓ | ✖ | ✖ |
| **Editar Evento** (`/events/:id`) | `PUT` | ✓ | ✓ | ✖ | ✖ |
| **Deletar Evento** (`/events/:id`) | `DELETE` | ✓ | ✖ | ✖ | ✖ |
| **Cadastrar-se no Sistema** (`/users/register`) | `POST` | ✓ | ✓ | ✓ | ✓ |
| **Listar Todos os Usuários** (`/users`) | `GET` | ✓ | ✓ | ✖ | ✖ |
| **Editar Dados de Usuários** (`/users/:id`) | `PUT` / `PATCH` | ✓ | ✓ *(Apenas perfil USER)* | ✓ *(Apenas o próprio)* | ✖ |
| **Deletar Usuário** (`/users/:id`) | `DELETE` | ✓ | ✖ | ✖ | ✖ |
| **Inscrever-se em Evento** (`/subscriptions`) | `POST` | ✓ | ✓ | ✓ | ✖ |
| **Listar Inscrições** (`/subscriptions`) | `GET` | ✓ *(Todas)* | ✓ *(Todas)* | ✓ *(Apenas as suas)* | ✖ |
| **Emitir / Baixar Certificado** (`/certificates/:id`) | `GET` | ✓ | ✓ | ✓ *(Apenas das suas)* | ✖ |
| **Validar Autenticidade por Código** (`/certificates/validate/:code`) | `GET` | ✓ | ✓ | ✓ | ✓ |

---

## 🔄 Fluxo e Correlação das Linhas de Código

Para entender como uma requisição percorre a aplicação:

1. **Recepção:** O cliente envia uma requisição HTTP. Ela entra por `src/index.js`, passa pelo `express.json()` para conversão de corpo e segue para a rota correspondente (ex: `/subscriptions`).
2. **Autenticação:** O middleware `authenticate` em `rbac.middleware.js` intercepta a requisição, extrai o header `Authorization: Bearer <token>`, valida a assinatura com `jwt.verify()` e armazena os dados do usuário decodificado em `req.user`.
3. **Autorização:** O middleware `authorize(['ADMIN', 'EDITOR', 'USER'])` confere se o valor de `req.user.role` está na lista permitida. Caso contrário, corta o processamento imediatamente com status `403`.
4. **Regras de Negócio no Controlador:** No controlador (ex: `subscription.controller.js`), o sistema executa as validações específicas:
   - Se a capacidade foi atingida (`COUNT >= capacity` -> `400`);
   - Se já existe inscrição para aquele participante (`409`);
   - Se for uma listagem e o usuário for `USER`, adiciona dinamicamente a cláusula `WHERE user_id = req.user.id`.
5. **Persistência Parametrizada:** O controlador chama `db.query(sql, params)`, enviando os parâmetros pelo driver `pg` sem concatenação de strings para prevenir SQL Injection.
6. **Resposta:** O resultado é formatado e enviado ao cliente com o status HTTP adequado (`200`, `201`, `400`, `403`, etc.).

---

## 💡 Decisões Técnicas de Engenharia

### 1. Escalabilidade e Performance
- **Stateless:** A API não armazena sessões em memória no servidor; cada requisição é autocontida com seu token JWT. Isso viabiliza escalabilidade horizontal através de múltiplas instâncias atrás de um balanceador de carga.
- **Indexação de Banco:** Índices foram criados em `script.sql` para as colunas mais consultadas (`idx_events_date`, `idx_subscriptions_user`, `idx_certificates_code`), reduzindo o custo de I/O em grandes volumes de dados.

### 2. Segurança da Informação
- **Proteção de Senhas:** Hashing unidirecional com `bcryptjs` e salting de 10 rounds.
- **Integridade de Chaves:** Injeção de variáveis via `.env`, com `.env` bloqueado no Git e apenas o `.env.example` versionado.
- **Blindagem SQL:** Todas as queries utilizam prepared statements (`$1, $2, ...`).

### 3. Integração com Aplicações Externas
- A conformidade estrita com o padrão REST e contratos OpenAPI em JSON garante que qualquer cliente externo (seja uma SPA em React/Vue ou aplicativo mobile em Flutter/React Native) consiga consumir os endpoints realizando chamadas padrão `fetch/axios` com o cabeçalho `Authorization: Bearer <token>`.
