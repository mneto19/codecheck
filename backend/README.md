# CodeCheck — Backend

API da plataforma CodeCheck. Trata da autenticação, das salas de exame, das submissões dos alunos, da execução do código e da avaliação.

## Tecnologias

- Node.js + Express
- PostgreSQL (Supabase), com pooling via pgBouncer
- Prisma ORM v5
- Socket.io para o tempo real (timer, entrada de alunos, resultados)
- JDoodle para correr o código dos alunos
- Groq (modelo llama-3.3-70b) para a avaliação por IA e para gerar casos de teste
- Fila de workers com concorrência limitada para processar as submissões

## Setup

### 1. Instalar dependências
```bash
npm install
```

### 2. Variáveis de ambiente
Cria um ficheiro `.env` na pasta `backend/`:

```
# Base de dados (Supabase)
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://...supabase.co:5432/postgres"

# Autenticação
JWT_SECRET="uma string longa e aleatória"
JWT_EXPIRES_IN="7d"

# IA (Groq)
GROQ_API_KEY="gsk_..."

# Execução de código (JDoodle)
JDOODLE_CLIENT_ID="..."
JDOODLE_CLIENT_SECRET="..."

# Servidor
PORT=3000
NODE_ENV="development"
CORS_ORIGINS="http://localhost:5173"
```

O `DATABASE_URL` é o que a aplicação usa (com pooling); o `DIRECT_URL` é só para as migrações do Prisma.

### 3. Base de dados
```bash
npx prisma generate
npx prisma migrate deploy   # aplica as migrações existentes
```

### 4. Arrancar
```bash
npm run dev
```

## Scripts

- `npm run dev` — arranca com nodemon (reinicia ao guardar)
- `npm start` — arranca em produção
- `npm run db:migrate` — cria/aplica migrações em desenvolvimento
- `npm run db:studio` — abre o Prisma Studio

## Estrutura

```
src/
  server.js            ponto de entrada (HTTP + Socket.io)
  app.js               Express, middleware, rate limiting, rotas
  routes/              auth, rooms, questions, students, submissions, results
  controllers/         lógica de cada rota
  middleware/
    auth.js            JWT do docente (cookie httpOnly)
    studentAuth.js     JWT do aluno (Bearer)
    validate.js        validação dos pedidos com Zod
  services/
    codeExecutionService.js   chama o JDoodle
    aiService.js              avaliação por IA + geração de testes (Groq)
    testRunnerService.js      correção por testes (Python/JS)
    socketService.js          canais de tempo real
    workerQueue.js            fila das submissões
  prisma/
    schema.prisma      modelos
    client.js          cliente Prisma
  utils/
    roomCode.js        gera o código de sala de 6 caracteres
```

## Endpoints

| Método | Path | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | /api/auth/register | Docente | Criar conta |
| POST | /api/auth/login | Docente | Login |
| GET | /api/auth/me | Docente | Perfil |
| POST | /api/auth/logout | Docente | Logout |
| POST | /api/rooms | Docente | Criar sala |
| GET | /api/rooms | Docente | Listar salas |
| GET | /api/rooms/:id | Docente | Detalhes da sala |
| POST | /api/rooms/:id/start | Docente | Iniciar exame |
| POST | /api/rooms/:id/finish | Docente | Terminar exame |
| DELETE | /api/rooms/:id | Docente | Eliminar sala |
| POST | /api/questions | Docente | Adicionar pergunta |
| PUT | /api/questions/:id | Docente | Editar pergunta |
| DELETE | /api/questions/:id | Docente | Eliminar pergunta |
| POST | /api/questions/generate-tests | Docente | Gerar casos de teste (Python/JS) |
| POST | /api/students/join | Aluno | Entrar com código de sala |
| GET | /api/students/room/:code | Aluno | Info da sala |
| POST | /api/submissions | Aluno | Submeter código |
| GET | /api/results/room/:id | Docente | Resultados da sala |
| GET | /api/results/submission/:id | Docente | Detalhe de uma submissão |
| POST | /api/results/room/:id/analyze | Docente | Re-analisar as submissões |

## Como é dada a nota

Há duas formas, conforme a pergunta:

- **Correção por testes** (só Python e JavaScript). Se a pergunta tiver casos de teste, o código do aluno é corrido contra cada input e comparado com o resultado da referência. A nota é a percentagem de testes que passam — é determinística e não depende da IA.
- **Avaliação por IA** (restantes casos). Quando não há testes, o Groq compara o código do aluno com a referência e dá uma nota, com limites conforme o output bate ou não certo.

Em qualquer dos casos a IA dá ainda feedback qualitativo (diferenças de lógica, notas de estilo) e um aviso de possível uso de IA. Esse aviso é só informativo — **nunca** altera a nota sozinho.

Também se regista quando o aluno cola código no editor, como sinal extra de integridade para o docente.

## Notas de segurança

- O código dos alunos corre sempre no JDoodle, nunca no servidor.
- O código de referência do docente nunca é devolvido a um aluno em nenhum endpoint.
- Alunos e docentes usam tokens JWT separados, com claims diferentes.
- Rate limiting global e mais apertado no login, na entrada em salas e nas submissões.
