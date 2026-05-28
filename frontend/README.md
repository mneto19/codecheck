# CodeCheck - Frontend

Interface web da plataforma CodeCheck, construída em React.

## Tecnologias

- React 18 + Vite
- TailwindCSS
- React Router 6
- Zustand (gestão de estado)
- Axios (cliente HTTP)
- Socket.io client (tempo real)
- Monaco Editor (editor de código integrado)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Garantir que o backend está a correr

O frontend faz proxy para `http://localhost:3000` (configurado em `vite.config.js`).

```bash
cd ../backend
npm run dev
```

### 3. Arrancar o frontend

Numa janela de terminal separada:

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

## Páginas

| Rota | Quem acede | Descrição |
|------|-----------|-----------|
| /join | Aluno | Entrada via código de sala (estilo Kahoot) |
| /exam | Aluno | Editor de código, timer e submissões |
| /login | Docente | Login |
| /register | Docente | Registo |
| /dashboard | Docente | Lista de salas |
| /rooms/:id | Docente | Gerir sala e perguntas, gerar casos de teste e iniciar exame |
| /rooms/:id/results | Docente | Resultados: notas, resultado dos testes, aviso de IA e de colagens |

## Estrutura

```
src/
  App.jsx                     # Router principal
  main.jsx                    # Ponto de entrada
  index.css                   # Estilos globais (Tailwind + animações)
  pages/
    LoginPage.jsx             # Login do docente
    RegisterPage.jsx          # Registo do docente
    DashboardPage.jsx         # Lista de salas do docente
    RoomPage.jsx              # Gestão de uma sala
    ResultsPage.jsx           # Resultados detalhados
    JoinPage.jsx              # Entrada do aluno
    ExamPage.jsx              # Página de exame do aluno
  components/
    ui/index.jsx              # Button, Input, Card, Badge, Spinner, ScoreRing
  hooks/
    useSocket.js              # Hook para Socket.io autenticado
    useTimer.js               # Hook para countdown do exame
  services/
    api.js                    # Endpoints axios
  store/
    authStore.js              # Zustand: docente + aluno
```

## Build de produção

```bash
npm run build
```

Os ficheiros estáticos ficam em `dist/`. Podes servi-los com qualquer servidor estático (Nginx, Vercel, Netlify, etc).
