// ContentGen API - Ponto de entrada do servidor
const config = require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/database');
const { errorHandler } = require('./middleware/errorHandler');

// Rotas
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const videoRoutes = require('./routes/videos');
const generationRoutes = require('./routes/generation');
const projectSettingsRoutes = require('./routes/projectSettings');
const assetsRoutes = require('./routes/assets');

const app = express();

// Middleware globais
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estaticos de storage (videos, imagens, audio)
app.use('/storage', express.static(config.STORAGE_PATH));

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
app.use('/api', generationRoutes);
app.use('/api', projectSettingsRoutes);
app.use('/api', assetsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota raiz - informacoes da API
app.get('/', (req, res) => {
  res.json({
    nome: 'ContentGen API',
    versao: '2.0.0',
    descricao: 'Plataforma de geracao de conteudo faceless com IA',
  });
});

// Tratamento global de erros (deve ser o ultimo middleware)
app.use(errorHandler);

// Iniciar servidor
app.listen(config.PORT, () => {
  console.log(`[ContentGen] Servidor rodando em http://localhost:${config.PORT}`);
  console.log(`[ContentGen] Ambiente: ${config.NODE_ENV}`);
});
