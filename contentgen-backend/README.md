# ContentGen Backend

Backend da plataforma ContentGen — plataforma de geracao de conteudo com IA para YouTube e TikTok.

## Tecnologias

- **Node.js** + **Express** — Framework HTTP
- **SQLite** (better-sqlite3) — Banco de dados
- **JWT** — Autenticacao
- **bcrypt** — Hash de senhas
- **express-validator** — Validacao de entrada

## Pre-requisitos

- Node.js 18+
- npm

## Instalacao

```bash
# Instalar dependencias
npm install

# Copiar variaveis de ambiente
cp .env.example .env

# Iniciar em modo desenvolvimento
npm run dev
```

O banco de dados SQLite e criado automaticamente na primeira execucao.

## Como Executar

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Producao
npm start
```

O servidor roda em `http://localhost:3001` por padrao.

## API Endpoints

### Autenticacao (`/api/auth`)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/auth/me` | Dados do usuario (autenticado) |
| PUT | `/api/auth/me` | Atualizar perfil (autenticado) |

### Projetos (`/api/projects`) — requer autenticacao

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/projects` | Listar projetos |
| GET | `/api/projects/:id` | Detalhes do projeto |
| POST | `/api/projects` | Criar projeto |
| PUT | `/api/projects/:id` | Atualizar projeto |
| DELETE | `/api/projects/:id` | Deletar projeto |

### Videos — requer autenticacao

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/projects/:projectId/videos` | Listar videos do projeto |
| GET | `/api/videos/:id` | Detalhes do video |
| POST | `/api/projects/:projectId/videos` | Criar video |
| PUT | `/api/videos/:id` | Atualizar video |
| DELETE | `/api/videos/:id` | Deletar video |

## Estrutura do Projeto

```
contentgen-backend/
├── server.js              # Ponto de entrada
├── config/
│   ├── env.js             # Variaveis de ambiente
│   └── database.js        # Conexao SQLite
├── database/
│   └── schema.sql         # Schema do banco
├── middleware/
│   ├── auth.js            # Autenticacao JWT
│   ├── errorHandler.js    # Tratamento de erros
│   └── validate.js        # Validacao de entrada
├── models/
│   ├── User.js            # Modelo de usuario
│   ├── Project.js         # Modelo de projeto
│   └── Video.js           # Modelo de video
├── routes/
│   ├── auth.js            # Rotas de autenticacao
│   ├── projects.js        # Rotas de projetos
│   └── videos.js          # Rotas de videos
└── data/                  # Banco de dados (gitignored)
```

## Variaveis de Ambiente

Veja `.env.example` para a lista completa de variaveis configuráveis.
