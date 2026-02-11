// Carregamento e validacao de variaveis de ambiente
require('dotenv').config();

const config = {
  PORT: parseInt(process.env.PORT, 10) || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'chave-padrao-apenas-para-desenvolvimento',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  // Banco de dados
  DATABASE_PATH: process.env.DATABASE_PATH || './data/contentgen.db',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Bcrypt
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  // APIs externas (fase futura)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  RUNWAY_API_KEY: process.env.RUNWAY_API_KEY || '',
};

// Aviso se JWT_SECRET esta usando valor padrao
if (config.JWT_SECRET === 'chave-padrao-apenas-para-desenvolvimento') {
  console.warn('[AVISO] JWT_SECRET usando valor padrao. Configure no arquivo .env para producao.');
}

module.exports = config;
