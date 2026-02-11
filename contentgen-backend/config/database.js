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

// Executa o schema.sql para criar as tabelas base
function initDb() {
  const database = getDb();

  // Schema base
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  database.exec(schema);
  console.log('[DB] Schema base aplicado');

  // Sistema de migrations
  runMigrations(database);
  console.log('[DB] Banco de dados inicializado com sucesso');
}

// Tabela de controle de migrations
function ensureMigrationsTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// Executa migrations pendentes em ordem
function runMigrations(database) {
  ensureMigrationsTable(database);

  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = database.prepare('SELECT name FROM _migrations').all().map(r => r.name);

  for (const file of files) {
    if (applied.includes(file)) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      // Executa cada statement separadamente para lidar com ALTER TABLE
      // que pode falhar se a coluna ja existe
      // Remove linhas de comentario antes de splitar
      const cleanedSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

      const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        try {
          database.exec(stmt + ';');
        } catch (stmtErr) {
          // Ignora erros de "column already exists" e "table already exists"
          if (stmtErr.message.includes('duplicate column name') ||
              stmtErr.message.includes('already exists')) {
            console.log(`[DB] Ignorando (ja existe): ${stmtErr.message.substring(0, 80)}`);
          } else {
            throw stmtErr;
          }
        }
      }

      database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
      console.log(`[DB] Migration aplicada: ${file}`);
    } catch (err) {
      console.error(`[DB] Erro na migration ${file}:`, err.message);
      throw err;
    }
  }
}

module.exports = { getDb, initDb };
