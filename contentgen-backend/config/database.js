// Conexao e inicializacao do banco de dados SQLite
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./env');

let db = null;

// Retorna a instancia singleton do banco de dados
function getDb() {
  if (!db) {
    const dbDir = path.dirname(config.DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(config.DATABASE_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

// Executa o schema.sql para criar as tabelas
function initDb() {
  const database = getDb();
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
  console.log('[DB] Banco de dados inicializado com sucesso');
}

module.exports = { getDb, initDb };
