// Servico MiniMax - TTS, Geracao de Imagens e Geracao de Video (image-to-video)
// API Docs: https://www.minimaxi.com/document
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const API_BASE = 'https://api.minimaxi.com/v1';

// Vozes disponiveis no MiniMax TTS (speech-2.8-hd)
const MINIMAX_VOICES = [
  { id: 'male-qn-qingse', name: 'Qingse (Masculina)', description: 'Masculina, jovem, clara' },
  { id: 'male-qn-jingying', name: 'Jingying (Masculina)', description: 'Masculina, profissional' },
  { id: 'male-qn-badao', name: 'Badao (Masculina)', description: 'Masculina, forte, narrador' },
  { id: 'male-qn-daxuesheng', name: 'Daxuesheng (Masculina)', description: 'Masculina, jovem, estudante' },
  { id: 'female-shaonv', name: 'Shaonv (Feminina)', description: 'Feminina, jovem, suave' },
  { id: 'female-yujie', name: 'Yujie (Feminina)', description: 'Feminina, madura, elegante' },
  { id: 'female-chengshu', name: 'Chengshu (Feminina)', description: 'Feminina, madura, profissional' },
  { id: 'female-tianmei', name: 'Tianmei (Feminina)', description: 'Feminina, doce, storytelling' },
  { id: 'presenter_male', name: 'Presenter Male', description: 'Masculina, apresentador' },
  { id: 'presenter_female', name: 'Presenter Female', description: 'Feminina, apresentadora' },
  { id: 'audiobook_male_1', name: 'Audiobook Male', description: 'Masculina, audiobook, narrador' },
  { id: 'audiobook_female_1', name: 'Audiobook Female', description: 'Feminina, audiobook, narradora' },
];

// Modelos de imagem disponiveis
const IMAGE_MODELS = {
  'image-01': 'image-01',
};

// Modelos de video disponiveis
const VIDEO_MODELS = {
  'hailuo-2.3': 'MiniMax-Hailuo-2.3',
  'hailuo-2': 'MiniMax-Hailuo-2',
  'hailuo-2-lite': 'MiniMax-Hailuo-2-lite',
};

function getHeaders() {
  return {
    'Authorization': `Bearer ${config.MINIMAX_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function isConfigured() {
  return !!config.MINIMAX_API_KEY;
}

// ==========================================
// TTS (Text-to-Speech) com MiniMax
// ==========================================

// Lista vozes disponiveis
function listVoices() {
  return MINIMAX_VOICES;
}

// Gera audio TTS a partir de texto
// Retorna: Buffer (mp3)
async function generateSpeech(text, {
  voiceId = 'presenter_male',
  model = 'speech-02-hd',
  speed = 1.0,
  pitch = 0,
  emotion = 'neutral',
} = {}) {
  if (!isConfigured()) {
    throw new Error('MINIMAX_API_KEY nao configurada. Adicione no arquivo .env');
  }

  const groupId = config.MINIMAX_GROUP_ID || '';

  const res = await fetch(`${API_BASE}/t2a_v2?GroupId=${groupId}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      text,
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed,
        vol: 1.0,
        pitch,
        emotion,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MiniMax TTS falhou (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax TTS erro: ${data.base_resp.status_msg || 'Erro desconhecido'}`);
  }

  // A resposta contem o audio em hex
  if (!data.data || !data.data.audio) {
    throw new Error('MiniMax TTS: resposta sem dados de audio');
  }

  // Decodifica hex para buffer
  const audioBuffer = Buffer.from(data.data.audio, 'hex');
  console.log(`[MiniMax TTS] Audio gerado: ${(audioBuffer.length / 1024).toFixed(0)} KB`);

  return audioBuffer;
}

// ==========================================
// Geracao de Imagens com MiniMax
// ==========================================

// Gera uma imagem a partir de prompt
// Retorna: Buffer (png/jpg)
async function generateImage(prompt, {
  model = 'image-01',
  width = 1280,
  height = 720,
  numOutputs = 1,
} = {}) {
  if (!isConfigured()) {
    throw new Error('MINIMAX_API_KEY nao configurada. Adicione no arquivo .env');
  }

  // Determina aspect ratio baseado nas dimensoes
  let aspectRatio = '16:9';
  if (width < height) aspectRatio = '9:16';
  else if (width === height) aspectRatio = '1:1';

  const res = await fetch(`${API_BASE}/image_generation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      model,
      prompt,
      aspect_ratio: aspectRatio,
      response_format: 'url',
      n: numOutputs,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MiniMax Image falhou (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax Image erro: ${data.base_resp.status_msg || 'Erro desconhecido'}`);
  }

  if (!data.data || !data.data.image_urls || data.data.image_urls.length === 0) {
    throw new Error('MiniMax Image: resposta sem imagens');
  }

  return data.data.image_urls;
}

// Baixa imagem de URL e retorna Buffer
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao baixar imagem MiniMax: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Gera multiplas imagens para cenas do video
async function generateSceneImages(scenes, {
  model = 'image-01',
  width = 1280,
  height = 720,
  style = 'cinematic',
} = {}) {
  const results = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const enhancedPrompt = `${scene.imagePrompt}. Style: ${style}, high quality, 4k, detailed`;

    console.log(`[MiniMax Image] Gerando imagem ${i + 1}/${scenes.length}: ${scene.imagePrompt.substring(0, 60)}...`);

    try {
      const urls = await generateImage(enhancedPrompt, { model, width, height });
      const imageUrl = Array.isArray(urls) ? urls[0] : urls;
      const buffer = await downloadImage(imageUrl);

      results.push({
        sceneIndex: i,
        url: imageUrl,
        buffer,
        prompt: scene.imagePrompt,
      });
    } catch (err) {
      console.error(`[MiniMax Image] Erro na cena ${i + 1}:`, err.message);
      results.push({
        sceneIndex: i,
        error: err.message,
        prompt: scene.imagePrompt,
      });
    }
  }

  return results;
}

// ==========================================
// Geracao de Video com MiniMax (Image-to-Video / Text-to-Video)
// ==========================================

// Inicia geracao de video (text-to-video ou image-to-video)
// Retorna: task_id para polling
async function createVideoGeneration({
  prompt,
  imageUrl,         // Se fornecido, faz image-to-video
  imageFilePath,    // Caminho local da imagem (alternativa a imageUrl)
  model = 'MiniMax-Hailuo-2.3',
  resolution = '1080P',
  duration = 6,      // 6 ou 10 segundos
  fps = 30,
  cameraControl,    // Objeto com controle de camera (opcional)
} = {}) {
  if (!isConfigured()) {
    throw new Error('MINIMAX_API_KEY nao configurada. Adicione no arquivo .env');
  }

  const body = {
    model,
    prompt: prompt || 'Smooth cinematic camera movement',
  };

  // Se tem imagem, faz image-to-video
  if (imageUrl) {
    body.first_frame_image = imageUrl;
  } else if (imageFilePath) {
    // Faz upload da imagem primeiro
    const uploadedUrl = await uploadFile(imageFilePath);
    body.first_frame_image = uploadedUrl;
  }

  // Configuracoes de resolucao e duracao
  if (resolution) body.resolution = resolution;
  if (duration) body.duration = duration;
  if (fps) body.fps = fps;

  // Controle de camera (opcional)
  if (cameraControl) {
    body.camera_control = cameraControl;
  }

  console.log(`[MiniMax Video] Iniciando geracao: ${body.first_frame_image ? 'image-to-video' : 'text-to-video'}`);

  const res = await fetch(`${API_BASE}/video_generation`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MiniMax Video falhou (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax Video erro: ${data.base_resp.status_msg || 'Erro desconhecido'}`);
  }

  const taskId = data.task_id;
  if (!taskId) {
    throw new Error('MiniMax Video: resposta sem task_id');
  }

  console.log(`[MiniMax Video] Task criado: ${taskId}`);
  return taskId;
}

// Faz upload de arquivo para MiniMax e retorna URL
async function uploadFile(filePath) {
  if (!isConfigured()) {
    throw new Error('MINIMAX_API_KEY nao configurada');
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Determina mime type
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  const mimeType = mimeTypes[ext] || 'image/png';

  // Cria FormData para upload
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', blob, fileName);
  formData.append('purpose', 'file-extract');

  const res = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.MINIMAX_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MiniMax upload falhou (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.file && data.file.download_url) {
    return data.file.download_url;
  }

  throw new Error('MiniMax upload: resposta sem URL de download');
}

// Polling para verificar status da geracao de video
async function queryVideoGeneration(taskId) {
  if (!isConfigured()) {
    throw new Error('MINIMAX_API_KEY nao configurada');
  }

  const res = await fetch(`${API_BASE}/query/video_generation?task_id=${taskId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`MiniMax Video query falhou (${res.status}): ${error}`);
  }

  const data = await res.json();

  if (data.base_resp && data.base_resp.status_code !== 0) {
    throw new Error(`MiniMax Video query erro: ${data.base_resp.status_msg || 'Erro desconhecido'}`);
  }

  return {
    status: data.status, // 'Queueing', 'Processing', 'Success', 'Fail'
    fileId: data.file_id,
    downloadUrl: data.file_id ? `${API_BASE}/files/retrieve?file_id=${data.file_id}` : null,
  };
}

// Aguarda video ficar pronto (polling)
async function waitForVideo(taskId, { maxAttempts = 120, intervalMs = 5000 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await queryVideoGeneration(taskId);

    console.log(`[MiniMax Video] Status (${i + 1}/${maxAttempts}): ${result.status}`);

    if (result.status === 'Success') {
      return result;
    }

    if (result.status === 'Fail') {
      throw new Error('MiniMax Video: geracao falhou');
    }

    // Aguarda antes da proxima consulta
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error('MiniMax Video: timeout (video demorou demais para gerar)');
}

// Baixa o video gerado
async function downloadVideo(fileId) {
  if (!isConfigured()) {
    throw new Error('MINIMAX_API_KEY nao configurada');
  }

  const res = await fetch(`${API_BASE}/files/retrieve?file_id=${fileId}`, {
    headers: {
      'Authorization': `Bearer ${config.MINIMAX_API_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`MiniMax download video falhou: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Fluxo completo: gera video a partir de imagem e espera resultado
// Retorna: Buffer (mp4)
async function generateVideoFromImage(imagePath, {
  prompt = 'Smooth cinematic camera movement with gentle zoom',
  model = 'MiniMax-Hailuo-2.3',
  resolution = '1080P',
  duration = 6,
  cameraControl,
} = {}) {
  // 1. Faz upload da imagem
  console.log(`[MiniMax Video] Fazendo upload da imagem...`);
  const imageUrl = await uploadFile(imagePath);

  // 2. Inicia geracao
  const taskId = await createVideoGeneration({
    prompt,
    imageUrl,
    model,
    resolution,
    duration,
    cameraControl,
  });

  // 3. Aguarda conclusao
  const result = await waitForVideo(taskId);

  // 4. Baixa o video
  console.log(`[MiniMax Video] Baixando video gerado...`);
  const videoBuffer = await downloadVideo(result.fileId);
  console.log(`[MiniMax Video] Video baixado: ${(videoBuffer.length / (1024 * 1024)).toFixed(1)} MB`);

  return videoBuffer;
}

// Gera video a partir de texto (text-to-video)
// Retorna: Buffer (mp4)
async function generateVideoFromText(prompt, {
  model = 'MiniMax-Hailuo-2.3',
  resolution = '1080P',
  duration = 6,
} = {}) {
  // 1. Inicia geracao
  const taskId = await createVideoGeneration({
    prompt,
    model,
    resolution,
    duration,
  });

  // 2. Aguarda conclusao
  const result = await waitForVideo(taskId);

  // 3. Baixa o video
  console.log(`[MiniMax Video] Baixando video gerado...`);
  const videoBuffer = await downloadVideo(result.fileId);
  console.log(`[MiniMax Video] Video baixado: ${(videoBuffer.length / (1024 * 1024)).toFixed(1)} MB`);

  return videoBuffer;
}

// Gera clips de video para cada cena (image-to-video)
// Cada imagem de cena vira um clip de video com movimento
async function generateSceneVideos(sceneImages, {
  model = 'MiniMax-Hailuo-2.3',
  resolution = '1080P',
  duration = 6,
  prompt = 'Smooth cinematic camera movement',
} = {}) {
  const results = [];

  for (let i = 0; i < sceneImages.length; i++) {
    const scene = sceneImages[i];
    console.log(`[MiniMax Video] Gerando video da cena ${i + 1}/${sceneImages.length}...`);

    try {
      const videoBuffer = await generateVideoFromImage(scene.filePath, {
        prompt: scene.prompt || prompt,
        model,
        resolution,
        duration,
      });

      results.push({
        sceneIndex: i,
        buffer: videoBuffer,
        success: true,
      });
    } catch (err) {
      console.error(`[MiniMax Video] Erro na cena ${i + 1}:`, err.message);
      results.push({
        sceneIndex: i,
        error: err.message,
        success: false,
      });
    }
  }

  return results;
}

// Estimativa de duracao do audio baseado em texto
function estimateDuration(text) {
  const words = text.split(/\s+/).length;
  return (words / 150) * 60; // ~150 palavras por minuto em portugues
}

module.exports = {
  isConfigured,

  // TTS
  listVoices,
  generateSpeech,
  estimateDuration,
  MINIMAX_VOICES,

  // Imagens
  generateImage,
  downloadImage,
  generateSceneImages,
  IMAGE_MODELS,

  // Video
  createVideoGeneration,
  queryVideoGeneration,
  waitForVideo,
  downloadVideo,
  generateVideoFromImage,
  generateVideoFromText,
  generateSceneVideos,
  uploadFile,
  VIDEO_MODELS,
};
