// ContentGen API - Ponto de entrada do servidor
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

// Rotas
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const videoRoutes = require('./routes/videos');

const app = express();

// Middleware globais
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log de requisicoes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Inicializar banco de dados
initDb();

// Montar rotas
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', videoRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota raiz - informacoes da API
app.get('/', (req, res) => {
  res.json({
    nome: 'ContentGen API',
    versao: '1.0.0',
    descricao: 'Plataforma de geracao de conteudo com IA',
  });
});

// Tratamento global de erros (deve ser o ultimo middleware)
app.use(errorHandler);

// Iniciar servidor
app.listen(config.PORT, () => {
  console.log(`[ContentGen] Servidor rodando em http://localhost:${config.PORT}`);
  console.log(`[ContentGen] Ambiente: ${config.NODE_ENV}`);
});
