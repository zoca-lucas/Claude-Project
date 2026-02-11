// Servico de Text-to-Speech com ElevenLabs API
const config = require('../config/env');

const API_BASE = 'https://api.elevenlabs.io/v1';

// Vozes padrao disponiveis (ElevenLabs pre-made voices)
const DEFAULT_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Feminina, calma, narracao' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Feminina, suave, storytelling' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Masculina, equilibrada' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Masculina, grave, narrador' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Masculina, profunda, profissional' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Masculina, jovem, dinamica' },
  { id: 'jBpfAFnaylXS3bHsNXPn', name: 'Callum', description: 'Masculina, intensa, videos' },
];

function getHeaders() {
  return {
    'xi-api-key': config.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  };
}

// Verifica se a API esta configurada
function isConfigured() {
  return !!config.ELEVENLABS_API_KEY;
}

// Lista vozes disponiveis (pre-made + custom)
async function listVoices() {
  if (!isConfigured()) {
    return DEFAULT_VOICES;
  }

  try {
    const res = await fetch(`${API_BASE}/voices`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      console.error('[ElevenLabs] Erro ao listar vozes:', res.status);
      return DEFAULT_VOICES;
    }

    const data = await res.json();
    return data.voices.map(v => ({
      id: v.voice_id,
      name: v.name,
      description: v.labels?.description || v.labels?.accent || '',
      preview: v.preview_url,
    }));
  } catch (err) {
    console.error('[ElevenLabs] Erro ao listar vozes:', err.message);
    return DEFAULT_VOICES;
  }
}

// Gera audio TTS a partir de texto
// Retorna: Buffer (mp3)
async function generateSpeech(text, { voiceId, modelId = 'eleven_multilingual_v2' } = {}) {
  if (!isConfigured()) {
    throw new Error('ELEVENLABS_API_KEY nao configurada. Adicione no arquivo .env');
  }

  const voice = voiceId || DEFAULT_VOICES[4].id; // Adam por padrao

  const res = await fetch(`${API_BASE}/text-to-speech/${voice}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs TTS falhou (${res.status}): ${error}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Retorna duracao estimada do audio (baseado em velocidade media de fala)
function estimateDuration(text) {
  // ~150 palavras por minuto em portugues
  const words = text.split(/\s+/).length;
  return (words / 150) * 60; // segundos
}

module.exports = {
  isConfigured,
  listVoices,
  generateSpeech,
  estimateDuration,
  DEFAULT_VOICES,
};
