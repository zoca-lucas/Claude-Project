// Servico de gerenciamento de arquivos no filesystem local
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const SUBDIRS = ['audio', 'images', 'video', 'subtitles', 'thumbnails'];

// Garante que o diretorio base de storage existe
function ensureStorageDir() {
  if (!fs.existsSync(config.STORAGE_PATH)) {
    fs.mkdirSync(config.STORAGE_PATH, { recursive: true });
  }
}

// Retorna o caminho base para assets de um video: ./storage/videos/{videoId}/
function getVideoDir(videoId) {
  return path.join(config.STORAGE_PATH, 'videos', String(videoId));
}

// Cria todos os subdiretorios para um video
function createVideoDirectories(videoId) {
  ensureStorageDir();
  const baseDir = getVideoDir(videoId);

  for (const sub of SUBDIRS) {
    const dir = path.join(baseDir, sub);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return baseDir;
}

// Retorna o caminho completo para um asset
function getAssetPath(videoId, subdir, filename) {
  return path.join(getVideoDir(videoId), subdir, filename);
}

// Salva buffer/stream em arquivo
async function saveFile(videoId, subdir, filename, data) {
  const dir = path.join(getVideoDir(videoId), subdir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, filename);

  if (Buffer.isBuffer(data)) {
    fs.writeFileSync(filePath, data);
  } else if (typeof data === 'string') {
    fs.writeFileSync(filePath, data, 'utf-8');
  } else if (data && typeof data.pipe === 'function') {
    // Stream
    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(filePath);
      data.pipe(ws);
      ws.on('finish', () => resolve(filePath));
      ws.on('error', reject);
    });
  }

  return filePath;
}

// Salva buffer a partir de resposta fetch (ArrayBuffer)
async function saveFromArrayBuffer(videoId, subdir, filename, arrayBuffer) {
  const buffer = Buffer.from(arrayBuffer);
  return saveFile(videoId, subdir, filename, buffer);
}

// Le arquivo e retorna buffer
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

// Retorna tamanho do arquivo em bytes
function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const stats = fs.statSync(filePath);
  return stats.size;
}

// Remove arquivo
function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Remove todos os assets de um video
function removeVideoAssets(videoId) {
  const dir = getVideoDir(videoId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Lista arquivos em um subdiretorio de video
function listFiles(videoId, subdir) {
  const dir = path.join(getVideoDir(videoId), subdir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort();
}

// Retorna o caminho relativo para servir via express.static
function getRelativePath(absolutePath) {
  return path.relative(config.STORAGE_PATH, absolutePath);
}

module.exports = {
  ensureStorageDir,
  getVideoDir,
  createVideoDirectories,
  getAssetPath,
  saveFile,
  saveFromArrayBuffer,
  readFile,
  getFileSize,
  removeFile,
  removeVideoAssets,
  listFiles,
  getRelativePath,
  STORAGE_PATH: config.STORAGE_PATH,
};
