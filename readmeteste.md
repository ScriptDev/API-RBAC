# 📘 Guia de Testes Passo a Passo da API & Plataforma de Eventos Acadêmicos (RBAC)

Este documento é o manual oficial de homologação e validação técnica da **Plataforma de Gestão de Eventos Acadêmicos**, desenvolvida em arquitetura limpa (Clean Architecture), Node.js, Express, PostgreSQL e controle de acesso baseado em papéis (**RBAC - Role-Based Access Control**).

O objetivo deste roteiro é orientar o desenvolvedor, o professor ou o avaliador em uma jornada completa de testes, cobrindo **100% dos requisitos funcionais, regras de negócio e a matriz de segurança**, além de fornecer o **protocolo DevSecOps seguro para clone e execução em computadores compartilhados da faculdade**.

---

## 🧭 Índice do Roteiro de Testes

1. [🎓 Guia de Apresentação no PC da Faculdade (Clone, `.env` Temporário e Sanitização)](#1--guia-de-apresentação-no-pc-da-faculdade-clone-env-temporário-e-sanitização)
2. [Pré-requisitos e Inicialização do Ambiente](#2-pré-requisitos-e-inicialização-do-ambiente)
3. [Cenário 1: Teste Automatizado de Integridade (Bateria de 38 Asserções)](#3-cenário-1-teste-automatizado-de-integridade-bateria-de-38-asserções)
4. [Cenário 2: Teste Visual pelo Painel Web Integrado (Navegador)](#4-cenário-2-teste-visual-pelo-painel-web-integrado-navegador)
   - [4.1 Visão Visitante Público (Sem Login)](#41-visão-visitante-público-sem-login)
   - [4.2 Visão Aluno (Perfil USER)](#42-visão-aluno-perfil-user)
   - [4.3 Visão Organizador (Perfil EDITOR)](#43-visão-organizador-perfil-editor)
   - [4.4 Visão Administrador Geral (Perfil ADMIN)](#44-visão-administrador-geral-perfil-admin)
5. [Cenário 3: Teste Interativo via Swagger UI (OpenAPI 3.0)](#5-cenário-3-teste-interativo-via-swagger-ui-openapi-30)
6. [Cenário 4: Teste Manual via Terminal (PowerShell / cURL)](#6-cenário-4-teste-manual-via-terminal-powershell--curl)
7. [Cenário 5: Teste em Contêineres Docker (DevSecOps)](#7-cenário-5-teste-em-contêineres-docker-devsecops)
8. [Matriz de Permissões RBAC & Critérios de Aceite](#8-matriz-de-permissões-rbac--critérios-de-aceite)
9. [Protocolo Pós-Apresentação: Sanitização de Dados e Limpeza](#9-protocolo-pós-apresentação-sanitização-de-dados-e-limpeza)
10. [Troubleshooting & Resolução de Problemas](#10-troubleshooting--resolução-de-problemas)

---

## 1. 🎓 Guia de Apresentação no PC da Faculdade (Clone, `.env` Temporário e Sanitização)

> [!IMPORTANT]
> Em computadores públicos ou de laboratórios acadêmicos, **chaves de API e credenciais de banco de dados NUNCA devem permanecer no disco após a apresentação**. Siga rigorosamente este fluxo:

```mermaid
flowchart LR
    A["1. Aba Anônima<br/>Acessar Drive"] --> B["2. Clone do Git<br/>npm install"]
    B --> C["3. Criar .env<br/>Colar Segredos"]
    C --> D["4. Apresentação<br/>npm test & web"]
    D --> E["5. Sanitização<br/>Excluir .env & Limpar"]
```

### Passo 1: Acesso Seguro aos Segredos no Google Drive
1. No navegador do computador da faculdade, abra uma **Janela Anônima** (`Ctrl + Shift + N` no Chrome/Edge).
2. Acesse o seu Google Drive e abra o arquivo de texto onde você guardou o conteúdo da `.env`.
3. Mantenha essa aba aberta temporariamente.

---

### Passo 2: Clonar o Repositório e Instalar Dependências
1. Abra o **PowerShell** ou **Git Bash** no computador da faculdade (sugestão: vá para a Área de Trabalho):
   ```powershell
   cd Desktop
   ```
2. Clone o repositório oficial do projeto:
   ```powershell
   git clone https://github.com/ScriptDev/API-RBAC.git
   ```
3. Entre na pasta clonada:
   ```powershell
   cd API-RBAC
   ```
4. Baixe as dependências do projeto:
   ```powershell
   npm install
   ```

---

### Passo 3: Injeção Temporária do Arquivo `.env`
O repositório Git propositalmente não versiona o arquivo `.env` (está protegido no `.gitignore` por boas práticas DevSecOps). Para configurá-lo no computador da faculdade:

1. No terminal aberto dentro da pasta do projeto, crie o arquivo `.env`:
   ```powershell
   New-Item -Path .env -ItemType File -Force
   notepad .env
   ```
   *(Ou abra com o VS Code se estiver instalado: `code .env`)*.

2. Copie o texto das variáveis que está aberto no Google Drive e cole dentro do arquivo `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[SENHA_DO_SUPABASE]@db.[REF_DO_PROJETO].supabase.co:5432/postgres
   PORT=3000
   JWT_SECRET=chave_secreta_jwt_2026
   ```

3. Salve o arquivo no Bloco de Notas (`Ctrl + S`) e feche a janela do Notepad.

---

### Passo 4: Executar a Demonstração para o Professor

#### A. Prova de Fogo Imediata (Testes Automatizados de Engenharia):
Antes mesmo de abrir o navegador, mostre ao professor a maturidade da arquitetura rodando a bateria de 38 testes de ponta a ponta:
```powershell
npm test
```
*O terminal rodará em segundos e exibirá: `TESTES FINALIZADOS: 38 PASSOU | 0 FALHOU`.*

#### B. Inicializar a Aplicação:
```powershell
npm start
```
*Mantenha este terminal aberto servindo a aplicação.*

#### C. Demonstração Visual:
Abra o navegador e acesse:
- **Painel Web:** `http://localhost:3000` *(Mostre os fluxos de Aluno, Organizador, Administrador e Validação de Diploma)*.
- **Documentação Swagger:** `http://localhost:3000/api-docs` *(Mostre os contratos REST e o botão Authorize)*.

---

### Passo 5: Sanitização Completa e Destruição das Credenciais (Após a Apresentação)

Assim que terminar a apresentação para o professor, execute este protocolo imediato para não deixar rastros:

1. **Parar o Servidor Node:**
   - No terminal onde o servidor está rodando, pressione: `Ctrl + C` (confirme com `S` ou `Y` se perguntado).

2. **Exclusão Definitiva do `.env` (Sem enviar para a Lixeira):**
   ```powershell
   Remove-Item -Path .env -Force
   ```

3. **Verificação de Confirmação:**
   Execute:
   ```powershell
   Test-Path .env
   ```
   *Deve retornar obrigatoriamente: `False`.*

4. **Desconectar do Google Drive:**
   - Feche a janela anônima do navegador. Isso encerra automaticamente a sessão do Drive e destrói cookies e cache.

5. **(Opcional / Recomendado) Remover a pasta inteira do computador da faculdade:**
   Caso queira remover todo o código clonado da máquina compartilhada:
   ```powershell
   cd ..
   Remove-Item -Path ".\API-RBAC" -Recurse -Force
   ```

6. **Limpar histórico do terminal PowerShell:**
   ```powershell
   Clear-History
   ```

---

## 2. Pré-requisitos e Inicialização do Ambiente

### 2.1 Requisitos do Sistema
- **Node.js** v18.x ou v20+ instalado.
- **npm** (incluso com o Node.js).
- Conexão com o banco de dados PostgreSQL (instância no Supabase já configurada ou PostgreSQL local).

### 2.2 Verificação de Arquivos e Dependências
Abra o terminal (PowerShell ou Bash) na pasta do projeto:
```powershell
cd "Samuel BK"
```

Instale as dependências caso ainda não tenham sido instaladas:
```powershell
npm install
```

### 2.3 Banco de Dados (DDL & Seed Inicial)
Se estiver utilizando um novo banco, execute o script `script.sql` no console SQL do Supabase ou cliente PostgreSQL.
O script criará o tipo `user_role` (ADMIN, EDITOR, USER), as tabelas (`users`, `events`, `subscriptions`, `certificates`), os índices de performance e o usuário **Admin padrão**:
- **E-mail:** `admin@eventos.edu.br`
- **Senha:** `Admin@123456`

---

## 3. Cenário 1: Teste Automatizado de Integridade (Bateria de 38 Asserções)

Para validar a integridade estrutural, a conformidade da Clean Architecture e a blindagem contra regressão de código, o projeto conta com uma suíte de testes ponta a ponta automatizada (`test_suite.js`).

### 3.1 Como Executar

Você pode executar a suíte completa de uma vez ou testar **separadamente por papel ou entidade**:

| Comando | Escopo Testado | Quantidade de Asserções |
| :--- | :--- | :---: |
| **`npm test`** | **Modo Completo** (Toda a matriz RBAC e regras de negócio) | **38 asserções** |
| **`npm run test:user`** | **Apenas Aluno (`USER`)** (Inscrições, limite, duplicidade, certificado próprio) | **13 asserções** |
| **`npm run test:admin`** | **Apenas Administrador (`ADMIN`)** (Poder pleno, auditoria, exclusão em cascata) | **10 asserções** |
| **`npm run test:editor`** | **Apenas Organizador (`EDITOR`)** (Criação e edição de eventos, gestão de alunos) | **7 asserções** |
| **`npm run test:events`** | **Apenas Entidade Eventos** (Leitura pública, criação/edição por editor, exclusão por admin) | **8 asserções** |
| **`npm run test:subs`** | **Apenas Entidade Inscrições** (Concorrência, lotação de vagas, duplicidade e isolamento) | **7 asserções** |
| **`npm run test:certs`** | **Apenas Entidade Certificados** (Geração de hash, isolamento e validação pública) | **5 asserções** |

### 3.2 O que é Validado Automaticamente
A suíte roda em uma porta isolada (`3099`) e executa **38 asserções rigorosas**, cobrindo:
1. `GET /health` e disponibilidade da documentação Swagger.
2. Cadastro de usuários e proteção de papel (criação anônima força papel `USER`; apenas `ADMIN` pode registrar diretamente como `EDITOR` ou `ADMIN`).
3. Geração e validação de tokens JWT no login.
4. Barramento de requisições anônimas (`401 Unauthorized`) em rotas privadas.
5. Barramento de acessos não autorizados (`403 Forbidden`) para cada papel na listagem e alteração de usuários.
6. Permissão de autoedição: `USER` só pode editar seus próprios dados; `EDITOR` só edita `USER`; `ADMIN` edita qualquer conta.
7. Exclusão restrita: `DELETE /users/:id` permitido exclusivamente para `ADMIN`.
8. Leitura pública de eventos (`GET /events`).
9. Criação e edição de eventos permitida para `ADMIN` e `EDITOR`, mas proibida para `USER` (`403`).
10. Exclusão de eventos permitida exclusivamente para `ADMIN` (`DELETE /events/:id`).
11. **Regra de Negócio de Capacidade:** Bloqueio de novas inscrições quando a capacidade do evento é atingida (`400 Bad Request`).
12. **Regra de Duplicidade:** Bloqueio de tentativa de inscrição duplicada do mesmo usuário (`409 Conflict`).
13. **Isolamento de Dados (Multitenancy):** `USER` lista exclusivamente as suas próprias inscrições; `ADMIN` lista todas as inscrições do sistema.
14. **Geração Automática de Certificados:** Certificado com código criptográfico único gerado na inscrição.
15. Proteção de certificado: `USER` não consegue visualizar certificados de outros participantes (`403`).
16. **Validação Pública:** `GET /certificates/validate/:code` permite que qualquer pessoa ou instituição valide a autenticidade do diploma sem necessidade de login.
17. Limpeza e encerramento elegante do servidor.

### 3.3 Resultado Esperado
```text
====================================================
TESTES FINALIZADOS: 38 PASSOU | 0 FALHOU
====================================================
```

---

## 4. Cenário 2: Teste Visual pelo Painel Web Integrado (Navegador)

A aplicação conta com um painel frontend moderno em HTML5 e TailwindCSS embutido em `public/index.html`. Não é necessário instalar nenhum frontend adicional.

Abra o seu navegador em: **`http://localhost:3000`**

---

### 4.1 Visão Visitante Público (Sem Login)

1. **Identificação:**
   - Observe a barra superior: o crachá exibirá **`PÚBLICO`** com indicador cinza.
2. **Consulta de Eventos:**
   - Na aba **📅 Eventos Acadêmicos**, todos os eventos cadastrados são visíveis.
   - Digite no campo de busca textual (ex: "Tecnologia", "Node", "IA") para testar a filtragem em tempo real (debounce).
   - Observe que o botão **"+ Novo Evento" NÃO aparece** para visitantes públicos.
3. **Teste de Bloqueio em Inscrição:**
   - Clique no botão **"Inscrever-se"** de qualquer evento.
   - **Resultado Esperado:** Um aviso (toast) vermelho é exibido na tela: *"É necessário estar autenticado para se inscrever no evento"*.
4. **Validação Pública de Certificados:**
   - Acesse a aba **📜 Emissão de Certificados**.
   - Note a seção **"Consultar Autenticidade Pública de Certificado"**.
   - Digite um código inexistente (ex: `TESTE-INVALIDO`) e clique em **"Verificar"**.
   - **Resultado Esperado:** Mensagem clara informando que o certificado é inválido ou inexistente.
5. **Tentativa de Acessar Áreas Restritas:**
   - Clique na aba **👥 Gestão de Usuários**.
   - **Resultado Esperado:** A interface alerta que a área requer privilégios de Administrador ou Editor.

---

### 4.2 Visão Aluno (Perfil USER)

1. **Autenticação:**
   - No topo direito, clique no botão de acesso rápido **`Aluno`** (ou utilize o formulário de login com um usuário cadastrado).
   - O crachá superior mudará para verde: **`USER: Aluno Acadêmico`**.
2. **Realizar Inscrição em um Evento:**
   - Na aba **📅 Eventos Acadêmicos**, localize um evento com vagas disponíveis.
   - Clique em **"Inscrever-se"**.
   - **Resultado Esperado:** Toast verde: *"Inscrição realizada com sucesso!"*. As vagas restantes do evento são decrementadas visualmente.
3. **Teste de Bloqueio de Duplicidade:**
   - Clique novamente no botão **"Inscrever-se"** no mesmo evento.
   - **Resultado Esperado:** Toast de aviso: *"409 - Participante já está inscrito neste evento"*. A integridade dos dados é preservada.
4. **Verificação de Vagas Esgotadas (Capacidade):**
   - Se o evento atingir o limite de vagas (`capacity`), o botão mudará para **"Esgotado"** e qualquer tentativa adicional de inscrição retornará erro 400.
5. **Visualizar Inscrições do Aluno (Isolamento de Dados):**
   - Acesse a aba **✍️ Minhas Inscrições**.
   - Apenas as inscrições pertencentes a este aluno logado serão exibidas.
6. **Emissão e Impressão do Certificado Acadêmico:**
   - Na aba **📜 Emissão de Certificados**, localize a inscrição realizada.
   - Clique em **"Emitir Diploma / Certificado"**.
   - **Resultado Esperado:** Abre-se a prévia oficial do certificado acadêmico com:
     - Nome do participante;
     - Título do evento acadêmico;
     - Data e carga horária;
     - Código autenticador único em formato hash (ex: `CERT-1-4-A1B2C3`);
     - Botão **"Imprimir / Salvar em PDF"** estilizado (com regras CSS `@media print` que ocultam o restante da página e imprimem apenas a lâmina do certificado).
   - Copie o código gerado para testar na validação pública.
7. **Teste de Bloqueio RBAC do Aluno:**
   - O aluno tenta criar um evento ou gerenciar outros usuários: o painel oculta botões de criação e bloqueia chamadas não autorizadas.

---

### 4.3 Visão Organizador (Perfil EDITOR)

1. **Autenticação:**
   - Clique no botão de acesso rápido **`Editor`** no cabeçalho.
   - O crachá superior mudará para amarelo: **`EDITOR: Organizador do Evento`**.
2. **Criação de Novo Evento Acadêmico:**
   - Na aba **📅 Eventos Acadêmicos**, o botão **"+ Novo Evento"** estará visível.
   - Clique no botão e preencha o formulário modal:
     - **Título:** `Seminário de Segurança em Nuvem 2026`
     - **Descrição:** `Práticas de DevSecOps e Zero Trust`
     - **Data:** `2026-11-25T14:00`
     - **Local:** `Auditório Principal`
     - **Capacidade:** `50`
   - Clique em **"Salvar Evento"**.
   - **Resultado Esperado:** Toast verde de confirmação e o evento surge imediatamente no catálogo.
3. **Edição do Evento Criado:**
   - Localize o evento recém-criado e clique no botão **"Editar"**.
   - Altere a capacidade ou a localização e salve.
   - **Resultado Esperado:** O evento é atualizado instantaneamente.
4. **Teste de Bloqueio de Exclusão (Regra Restrita ao Admin):**
   - O perfil `EDITOR` **não** possui permissão para deletar eventos.
   - Se tentar acionar a exclusão, a API rejeita com status `403 Forbidden: Acesso exclusivo para ADMIN`.
5. **Gestão de Usuários com Perfil EDITOR:**
   - Acesse a aba **👥 Gestão de Usuários**.
   - O Editor visualiza a lista de participantes.
   - Pode editar dados de contas com papel `USER`.
   - Se tentar alterar uma conta `ADMIN`, o sistema bloqueia imediatamente com erro `403`.

---

### 4.4 Visão Administrador Geral (Perfil ADMIN)

1. **Autenticação:**
   - Clique no botão de acesso rápido **`Admin`** (ou efetue login com `admin@eventos.edu.br` / `Admin@123456`).
   - O crachá superior mudará para vermelho: **`ADMIN: Administrador Geral`**.
2. **Poder Pleno de Gestão:**
   - **Exclusão de Eventos:** O Admin tem o botão **"Excluir"** habilitado nos eventos. Clique em excluir no evento de teste e confirme. O evento é removido do banco.
   - **Gestão Total de Usuários:**
     - Acesse a aba **👥 Gestão de Usuários**.
     - Edite o nome ou e-mail de qualquer usuário.
     - Exclua contas de teste utilizando o botão **"Excluir Usuário"**.
     - O sistema solicita confirmação e executa a exclusão em cascata.
3. **Visão Global de Inscrições:**
   - Acesse **✍️ Minhas Inscrições**.
   - Diferente do aluno, o Admin enxerga **todas as inscrições realizadas em toda a plataforma**, permitindo auditoria centralizada.
4. **Auditoria da Matriz RBAC:**
   - Acesse a aba **🛡️ Auditoria de Permissões (RBAC)**.
   - Revise visualmente o mapa de concessões e restrições ativas para garantir que o sistema está em estrita conformidade com as diretrizes de segurança.

---

## 5. Cenário 3: Teste Interativo via Swagger UI (OpenAPI 3.0)

A documentação interativa permite testar os contratos de requisição e resposta diretamente pelo navegador.

1. Acesse: **`http://localhost:3000/api-docs`**
2. **Autenticando no Swagger:**
   - Expanda o endpoint `POST /users/login`.
   - Clique em **"Try it out"**, informe o payload do Admin:
     ```json
     {
       "email": "admin@eventos.edu.br",
       "password": "Admin@123456"
     }
     ```
   - Clique em **"Execute"**. Copie o valor do campo `token` retornado no JSON.
   - Suba ao topo da página e clique no botão verde **"Authorize"** (com ícone de cadeado).
   - No campo `Value`, digite: `Bearer SEU_TOKEN_COPIADO` (ou apenas o token, conforme indicado) e clique em **Authorize**.
3. **Roteiro Sequencial de Teste:**
   - `GET /users`: Clique em Execute. O Swagger retornará a lista completa com código `200`.
   - `POST /events`: Envie um payload de evento. O Swagger retornará `201 Created`.
   - `GET /events`: Teste a busca passando o parâmetro de query `q` (ex: `q=Node`).
   - `POST /subscriptions`: Inscreva um participante enviando `{"event_id": 1}`.
   - `GET /certificates/validate/{code}`: Teste a validação pública informando o código gerado.
   - `DELETE /events/{id}`: Teste a exclusão do evento como Admin.

---

## 6. Cenário 4: Teste Manual via Terminal (PowerShell / cURL)

Para testar diretamente via linha de comando ou scripts automatizados de CI/CD, utilize os comandos PowerShell abaixo:

### 6.1 Obter Token de Login do Admin
```powershell
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/users/login" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email":"admin@eventos.edu.br","password":"Admin@123456"}'

$token = $loginResponse.token
Write-Host "Token obtido com sucesso: $token"
```

### 6.2 Listar Usuários com Perfil Autenticado
```powershell
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type"  = "application/json"
}

$users = Invoke-RestMethod -Uri "http://localhost:3000/users" -Method GET -Headers $headers
$users | Format-Table id, name, email, role
```

### 6.3 Criar Novo Evento Acadêmico
```powershell
$eventBody = @{
  title       = "Congresso Nacional de Computação 2026"
  description = "Apresentação de artigos científicos e palestras magnas"
  event_date  = "2026-12-05T09:00:00Z"
  location    = "Centro de Convenções"
  capacity    = 150
} | ConvertTo-Json

$createdEvent = Invoke-RestMethod -Uri "http://localhost:3000/events" `
  -Method POST `
  -Headers $headers `
  -Body $eventBody

Write-Host "Evento criado com ID:" $createdEvent.event.id
```

### 6.4 Testar Tentativa de Violação de Segurança (Regra 403)
Tentar executar uma exclusão sem privilégios ou com token de perfil `USER`:
```powershell
# Cria usuário comum
$userLogin = Invoke-RestMethod -Uri "http://localhost:3000/users/register" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"name":"Aluno Teste","email":"aluno_cli@teste.com","password":"User123456"}'

$userAuth = Invoke-RestMethod -Uri "http://localhost:3000/users/login" `
  -Method POST `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"email":"aluno_cli@teste.com","password":"User123456"}'

$userToken = $userAuth.token

# Tenta deletar evento como USER (Deve retornar 403 Forbidden)
try {
  Invoke-RestMethod -Uri "http://localhost:3000/events/1" `
    -Method DELETE `
    -Headers @{ "Authorization" = "Bearer $userToken" }
} catch {
  Write-Host "Bloqueio RBAC validado com sucesso! Resposta:" $_.Exception.Response.StatusCode
}
```

---

## 7. Cenário 5: Teste em Contêineres Docker (DevSecOps)

Caso queira testar a aplicação em contêiner isolado simulando o deploy de produção:

### 7.1 Subir com Docker Compose
```powershell
docker-compose up -d --build
```

### 7.2 Verificar Status e Saúde do Contêiner
```powershell
docker ps
Invoke-RestMethod -Uri "http://localhost:3000/health"
```

### 7.3 Encerrar os Contêineres
```powershell
docker-compose down
```

---

## 8. Matriz de Permissões RBAC & Critérios de Aceite

Abaixo está o resumo executivo dos critérios de aceite de cada endpoint para fins de conferência:

| Funcionalidade / Recurso | Endpoint | Método | ADMIN | EDITOR | USER | PÚBLICO | Status de Sucesso | Status de Violação |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Health Check** | `/health` | `GET` | ✓ | ✓ | ✓ | ✓ | `200 OK` | - |
| **Catálogo de Eventos** | `/events` | `GET` | ✓ | ✓ | ✓ | ✓ | `200 OK` | - |
| **Buscar Evento por ID** | `/events/:id` | `GET` | ✓ | ✓ | ✓ | ✓ | `200 OK` | `404 Not Found` |
| **Criar Evento** | `/events` | `POST` | ✓ | ✓ | ✖ | ✖ | `201 Created` | `401 / 403` |
| **Editar Evento** | `/events/:id` | `PUT` | ✓ | ✓ | ✖ | ✖ | `200 OK` | `401 / 403` |
| **Excluir Evento** | `/events/:id` | `DELETE` | ✓ | ✖ | ✖ | ✖ | `200 OK` | `401 / 403` |
| **Registrar Conta** | `/users/register` | `POST` | ✓ | ✓ | ✓ | ✓ | `201 Created` | `400 Bad Request` |
| **Login e Obtenção de JWT**| `/users/login` | `POST` | ✓ | ✓ | ✓ | ✓ | `200 OK` | `401 Unauthorized` |
| **Listar Todos os Usuários**| `/users` | `GET` | ✓ | ✓ | ✖ | ✖ | `200 OK` | `401 / 403` |
| **Editar Usuário** | `/users/:id` | `PUT` | ✓ *(Todos)* | ✓ *(Apenas USER)* | ✓ *(Apenas o seu)* | ✖ | `200 OK` | `403 Forbidden` |
| **Deletar Usuário** | `/users/:id` | `DELETE` | ✓ | ✖ | ✖ | ✖ | `200 OK` | `401 / 403` |
| **Inscrever-se em Evento** | `/subscriptions` | `POST` | ✓ | ✓ | ✓ *(Apenas Atuais/Futuros)* | ✖ | `201 Created` | `400 (Lotado/Expirado) / 409 (Duplicado)` |
| **Listar Inscrições** | `/subscriptions` | `GET` | ✓ *(Todas)* | ✓ *(Todas)* | ✓ *(Apenas as suas)* | ✖ | `200 OK` | `401 Unauthorized` |
| **Confirmar Presença (Check-in)** | `/subscriptions/:id/attendance` | `PATCH` | ✓ | ✓ | ✖ | ✖ | `200 OK` | `401 / 403 Forbidden` |
| **Cancelar Inscrição** | `/subscriptions/:id` | `DELETE` | ✓ | ✓ | ✓ *(Apenas a sua)* | ✖ | `200 OK` | `403 Forbidden` |
| **Concluir Evento Acadêmico** | `/events/:id/status` | `PATCH` | ✓ | ✖ | ✖ | ✖ | `200 OK` | `401 / 403 Forbidden` |
| **Emitir Certificado** | `/certificates/:id` | `GET` | ✓ | ✓ | ✓ *(Presença + Concluído)* | ✖ | `200 OK` | `400 / 401 / 403` |
| **Validação de Código Hash**| `/certificates/validate/:code` | `GET` | ✓ | ✓ | ✓ | ✓ | `200 OK` | `404 Not Found` |

---

### 8.1 Regras de Negócio e Segregação Temporal de Eventos (USER vs ADMIN/EDITOR)

Para atender estritamente ao domínio acadêmico e à integridade operacional:
1. **Eventos Atuais e Futuros (`event_date >= agora`):**
   - **Visibilidade:** Disponíveis publicamente no catálogo e calendário (PÚBLICO, USER, EDITOR, ADMIN).
   - **Inscrição:** Usuários com perfil `USER` podem se inscrever com 1 clique (desde que haja vagas disponíveis e não haja duplicidade).
   - **Modal de Detalhes:** Qualquer usuário pode consultar detalhes completos (ementa, palestrantes, local, data/hora e percentual de lotação).

2. **Eventos Passados / Concluídos (`event_date < agora`):**
   - **Bloqueio Criptográfico e de Negócio:** O backend bloqueia novas inscrições retornando `HTTP 400`: *"Inscrições encerradas. Não é possível se inscrever em um evento acadêmico que já ocorreu."*
   - **Segregação Visual para Aluno (`USER`):** O aluno visualiza estritamente os eventos passados em que **participou (estava inscrito)**. Eventos passados de terceiros são filtrados para não poluir sua visão acadêmica.
   - **Emissão Direta de Certificado:** No card e no modal do evento passado em que o aluno participou, exibe-se o badge `🎓 Concluído • Você Participou` e o botão direto `🎓 Ver Certificado`, abrindo instantaneamente o diploma com validação criptográfica.
   - **Visão Editorial (ADMIN e EDITOR):** Têm acesso global e irrestrito a todo o histórico de eventos da instituição para auditoria, emissão de relatórios e planejamento no Calendário Editorial.

---

### 8.2 Ciclo Completo de Certificação, Homologação e Bloqueio com Feedback

O simples ato de se inscrever em um evento acadêmico **NÃO garante a obtenção do certificado**. Para que o diploma seja emitido, dois critérios mandatórios de engenharia e negócio devem ser satisfeitos:

1. **Poder de Conclusão do Evento (Exclusivo do ADMIN):**
   - O Administrador Geral possui o poder de finalizar e dar o evento como concluído através de `PATCH /events/:id/status` (`status: 'COMPLETED'`) ou pelo botão **🏁 Concluir** no painel web.

2. **Poder de Homologação de Presença (EDITOR e ADMIN):**
   - Na aba de Inscrições, o Coordenador/Editor e o Administrador possuem o controle de check-in através de `PATCH /subscriptions/:id/attendance` ou pelo botão **Confirmar Presença ✓**.

3. **Matriz de Feedback Instrucional ao Aluno:**
   - **Se o evento ainda estiver em andamento:**
     O certificado fica bloqueado com feedback visual amarelo:
     *`⏳ Evento Acadêmico em Andamento: O certificado será liberado após a conclusão oficial do evento pelo Administrador e a validação de sua presença.`*
   - **Se o evento foi concluído, mas o aluno NÃO teve presença confirmada:**
     O certificado é sumariamente bloqueado com feedback visual vermelho e status `HTTP 403`:
     *`⚠️ Presença Não Registrada: O evento foi finalizado, mas sua presença não foi homologada pela coordenação. O simples fato de estar inscrito não garante a certificação.`*
   - **Se o evento foi concluído E a presença foi confirmada:**
     O certificado é homologado e liberado com feedback verde e botão dourado:
     *`🏆 Presença Confirmada & Homologada! Seu certificado oficial integraliza a carga horária acadêmica.`*

4. **Lâmina do Diploma Acadêmico & Download em PDF:**
   - Ao abrir o diploma, o sistema apresenta a lâmina oficial universitária formatada com:
     - Nome completo do participante e nome do evento;
     - Carga horária complementar oficial em destaque (ex: 20 Horas);
     - Data do evento, local e data de emissão;
     - Código de autenticidade criptográfica com URL pública de validação;
     - **2 Assinaturas Institucionais Formatadas:** Coordenação Acadêmica de Extensão e Diretoria Geral / Reitoria;
     - Botão funcional **`🖨️ Baixar em PDF / Imprimir Diploma`** acionando o spooler de impressão nativo com regras `@media print` para folha A4 paisagem sem artefatos de navegador.

---

### 8.3 Homologação Contextual de Participantes e Regra de Staff (Admin/Editor)

1. **Modal de Homologação de Presença & Participantes:**
   - Ao clicar em **`🏁 Concluir Evento`** (Admin) ou **`👥 Confirmar Presença`** (Editor), abre-se a lista contextualizada com todos os inscritos naquele evento específico.
   - Cada participante exibe: Nome, E-mail, Matrícula/Papel e o botão interativo para confirmar ou desmarcar presença com 1 clique (`PATCH /subscriptions/:id/attendance`).
   - Há também o botão em lote **`✓ Confirmar Todos os Alunos`**.

2. **Segregação de Poderes no Fechamento do Evento:**
   - **Administrador:** No rodapé da lista de presença, possui o botão exclusivo **`🏁 Concluir Evento e Liberar Certificados`** (`PATCH /events/:id/status`), que finaliza o evento e habilita a emissão dos diplomas dos alunos presentes.
   - **Editor:** Possui autorização plena para homologar presenças dos alunos, mas **não possui o botão de conclusão do evento** (prerrogativa exclusiva do Administrador).

3. **Inscrição Assídua de Staff sem Ocupação de Vagas:**
   - Administrador e Coordenador/Editor constam assiduamente inscritos em todos os eventos acadêmicos para fins de gestão, docência e organização.
   - **Regra de Ouro da Capacidade:** A contagem de vagas ocupadas (`total_subscriptions`) e vagas restantes (`available_slots`) é calculada estritamente sobre os **alunos** (`role = 'USER'`). A inscrição do Staff não consome vagas de alunos.

---

## 9. Protocolo Pós-Apresentação: Sanitização de Dados e Limpeza

> [!CAUTION]
> **AÇÃO CRÍTICA DE SEGURANÇA (DEVSECOPS):**
> Nunca deixe credenciais ativas em computadores acadêmicos. Sempre execute a deleção forçada e irreversível:

```powershell
# 1. Parar o Node (se ainda estiver rodando: Ctrl + C)

# 2. Excluir o arquivo .env permanentemente
Remove-Item -Path .env -Force

# 3. Validar se o arquivo realmente foi eliminado (deve retornar False)
Test-Path .env

# 4. Caso vá excluir todo o projeto clonado do PC da faculdade:
cd ..
Remove-Item -Path ".\API-RBAC" -Recurse -Force
```

---

## 10. Troubleshooting & Resolução de Problemas

- **Erro de Conexão com o Banco (`ETIMEDOUT` ou `ECONNREFUSED`):**
  - Verifique se a variável `DATABASE_URL` no `.env` possui o endereço e a senha corretos do PostgreSQL.
  - No caso do Supabase, certifique-se de que a conexão utiliza a porta `5432` ou `6543` (Transaction Pooler com SSL ativado).
  - Em redes acadêmicas com firewall bloqueando a porta 5432, utilize a porta do pooler `6543`.
- **Porta 3000 em uso no laboratório:**
  - Caso outro processo ou serviço da faculdade esteja utilizando a porta `3000`, altere para `PORT=3001` no `.env` ou encerre o processo anterior no PowerShell:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
    ```
- **Token JWT Inválido ou Expirado:**
  - Caso receba `401 Token inválido ou expirado`, refaça o login em `/users/login` ou clique novamente nos botões de acesso rápido do painel web para renovar a sessão.

---

> [!NOTE]
> Este projeto foi concebido seguindo estritamente as boas práticas de **Clean Code**, **SOLID**, **Segurança por Design (OWASP)** e **Isolamento em Camadas**, garantindo alta manutenibilidade, extensibilidade e estabilidade operacional.

---

Ass: Samuel Mendes Cardoso - Software Factory Labs
