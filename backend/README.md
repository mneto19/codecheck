# CodeCheck - Backend

## Tecnologias
- Node.js + Express
- PostgreSQL (Supabase) com connection pooling via pgBouncer
- Prisma ORM v5
- Socket.io (WebSockets)
- Judge0 (execução segura de código em sandbox)
- Anthropic API (comparação de código com IA)
- Fila de workers assíncrona com concorrência limitada

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Cria um ficheiro `.env` na raiz do projeto:
DATABASE_URL="postgresql://postgres.xxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
JWT_SECRET="string_longa_e_aleatoria_com_pelo_menos_64_caracteres"
ANTHROPIC_API_KEY="sk-ant-..."
JUDGE0_BASE_URL="https://judge0-ce.p.rapidapi.com"
JUDGE0_RAPIDAPI_KEY="a_tua_chave_rapidapi"
PORT=3000
NODE_ENV="development"
CORS_ORIGINS="http://localhost:5173"

### 3. Criar as tabelas na base de dados
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Arrancar o servidor
```bash
npm run dev
```

## Estrutura
src/
server.js                       # Ponto de entrada
app.js                          # Express + middleware
routes/                         # auth, rooms, questions, students, submissions, results
controllers/                    # Lógica de negócio
middleware/
auth.js                       # Autenticação JWT para docentes
studentAuth.js                # Autenticação JWT para alunos
validate.js                   # Validação de inputs com Zod
services/
judge0Service.js              # Execução de código em sandbox com limites de CPU e memória
claudeService.js              # Comparação semântica de código via IA
socketService.js              # WebSockets para timer e notificações em tempo real
workerQueue.js                # Fila assíncrona para processar submissões sem bloquear a API
prisma/
schema.prisma                 # Modelos da base de dados
client.js                     # Cliente Prisma singleton
utils/
roomCode.js                   # Gerador de códigos de sala de 6 caracteres

## Endpoints

| Método | Path | Quem acede | Descrição |
|--------|------|-----------|-----------|
| POST | /api/auth/register | Docente | Criar conta |
| POST | /api/auth/login | Docente | Login |
| GET | /api/auth/me | Docente | Perfil |
| POST | /api/rooms | Docente | Criar sala |
| GET | /api/rooms | Docente | Listar salas |
| GET | /api/rooms/:id | Docente | Detalhes da sala |
| POST | /api/rooms/:id/start | Docente | Iniciar exame |
| POST | /api/rooms/:id/finish | Docente | Terminar exame |
| DELETE | /api/rooms/:id | Docente | Eliminar sala |
| POST | /api/questions | Docente | Adicionar pergunta |
| PUT | /api/questions/:id | Docente | Editar pergunta |
| DELETE | /api/questions/:id | Docente | Eliminar pergunta |
| POST | /api/students/join | Aluno | Entrar com código de sala |
| GET | /api/students/room/:code | Aluno | Info da sala |
| POST | /api/submissions | Aluno | Submeter código |
| GET | /api/results/room/:id | Docente | Resultados completos |
| GET | /api/results/submission/:id | Docente | Detalhe de uma submissão |

## Arquitetura de segurança

- O código dos alunos nunca é executado no servidor principal.
- Toda a execução passa pelo Judge0 em sandbox isolada com limites de CPU (5s), memória (64MB) e sem acesso à rede.
- A fila de workers processa no máximo 3 submissões em simultâneo para proteger o sistema.
- O código de referência do docente nunca é exposto aos alunos em nenhum endpoint.
- Alunos e docentes usam tokens JWT separados com claims distintos.