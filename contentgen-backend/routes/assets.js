// Rotas para assets de video (streaming e download)
const express = require('express');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const Project = require('../models/Project');
const VideoAsset = require('../models/VideoAsset');
const { authenticateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticateToken);

function verifyVideoOwnership(req, videoId) {
  const video = Video.findById(videoId);
  if (!video) throw new AppError('Video nao encontrado', 404);
  const project = Project.findById(video.projectId);
  if (!project || project.userId !== req.user.id) {
    throw new AppError('Video nao encontrado', 404);
  }
  return video;
}

// GET /api/videos/:id/assets - Listar assets de um video
router.get('/videos/:id/assets', (req, res, next) => {
  try {
    verifyVideoOwnership(req, req.params.id);
    const { type } = req.query;
    const assets = VideoAsset.findByVideoId(req.params.id, type || undefined);
    res.json({ assets });
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id/stream - Streaming de um asset (video/audio)
router.get('/assets/:id/stream', (req, res, next) => {
  try {
    const asset = VideoAsset.findById(req.params.id);
    if (!asset) throw new AppError('Asset nao encontrado', 404);

    // Verifica ownership
    verifyVideoOwnership(req, asset.videoId);

    const filePath = asset.filePath;
    if (!fs.existsSync(filePath)) {
      throw new AppError('Arquivo nao encontrado no disco', 404);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Suporte a Range requests para streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      const stream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': asset.mimeType || 'application/octet-stream',
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': asset.mimeType || 'application/octet-stream',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id/download - Download de um asset
router.get('/assets/:id/download', (req, res, next) => {
  try {
    const asset = VideoAsset.findById(req.params.id);
    if (!asset) throw new AppError('Asset nao encontrado', 404);

    verifyVideoOwnership(req, asset.videoId);

    const filePath = asset.filePath;
    if (!fs.existsSync(filePath)) {
      throw new AppError('Arquivo nao encontrado no disco', 404);
    }

    res.download(filePath, asset.fileName);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
