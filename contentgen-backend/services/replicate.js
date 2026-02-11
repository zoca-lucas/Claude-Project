// Servico de geracao de imagens com Replicate API (modelos FLUX)
const config = require('../config/env');

const API_BASE = 'https://api.replicate.com/v1';

// Modelos disponiveis
const MODELS = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-dev': 'black-forest-labs/flux-dev',
  'flux-pro': 'black-forest-labs/flux-1.1-pro',
};

function getHeaders() {
  return {
    Authorization: `Bearer ${config.REPLICATE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

function isConfigured() {
  return !!config.REPLICATE_API_TOKEN;
}

// Gera uma imagem com FLUX
// Retorna: URL da imagem gerada
async function generateImage(prompt, {
  model = 'flux-schnell',
  width = 1280,
  height = 720,
  aspectRatio,
  numOutputs = 1,
} = {}) {
  if (!isConfigured()) {
    throw new Error('REPLICATE_API_TOKEN nao configurado. Adicione no arquivo .env');
  }

  const modelId = MODELS[model] || MODELS['flux-schnell'];

  // Flux-schnell usa predictions diretamente
  const res = await fetch(`${API_BASE}/models/${modelId}/predictions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      input: {
        prompt,
        num_outputs: numOutputs,
        aspect_ratio: aspectRatio || `${width}:${height}`,
        output_format: 'png',
        output_quality: 90,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Replicate falhou (${res.status}): ${error}`);
  }

  const prediction = await res.json();

  // Aguarda o resultado (polling)
  return await waitForPrediction(prediction.id);
}

// Polling para aguardar resultado da predicao
async function waitForPrediction(predictionId, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Replicate polling falhou: ${res.status}`);
    }

    const data = await res.json();

    if (data.status === 'succeeded') {
      // Retorna array de URLs das imagens
      return data.output;
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Replicate falhou: ${data.error || 'Erro desconhecido'}`);
    }

    // Aguarda 2 segundos antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Replicate timeout: geracao de imagem demorou demais');
}

// Baixa uma imagem de URL e retorna Buffer
async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao baixar imagem: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Gera multiplas imagens para cenas do video
async function generateSceneImages(scenes, {
  model = 'flux-schnell',
  width = 1280,
  height = 720,
  style = 'cinematic',
} = {}) {
  const results = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const enhancedPrompt = `${scene.imagePrompt}. Style: ${style}, high quality, 4k, detailed`;

    console.log(`[Replicate] Gerando imagem ${i + 1}/${scenes.length}: ${scene.imagePrompt.substring(0, 60)}...`);

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
      console.error(`[Replicate] Erro na cena ${i + 1}:`, err.message);
      results.push({
        sceneIndex: i,
        error: err.message,
        prompt: scene.imagePrompt,
      });
    }
  }

  return results;
}

module.exports = {
  isConfigured,
  generateImage,
  downloadImage,
  generateSceneImages,
  MODELS,
};
