// Servico de estimativa de timestamps - substitui OpenAI Whisper
// Gera word-level timestamps estimados a partir da duracao do audio e do texto do roteiro
// Usa distribuicao proporcional ao tamanho das palavras

const ffmpegService = require('./ffmpeg');

// Estima timestamps de palavras baseado na duracao do audio
function estimateWordTimestamps(text, audioDuration) {
  if (!text || !audioDuration || audioDuration <= 0) {
    return { text: text || '', words: [], segments: [], duration: audioDuration || 0 };
  }

  // Tokeniza o texto em palavras
  const rawWords = text
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 0);

  if (rawWords.length === 0) {
    return { text, words: [], segments: [], duration: audioDuration };
  }

  // Calcula peso de cada palavra (baseado no tamanho — palavras maiores levam mais tempo)
  // Adiciona um peso base para cada palavra (pausa natural entre palavras)
  const BASE_WEIGHT = 2; // Peso base por palavra (simula pausa entre palavras)
  const CHAR_WEIGHT = 1; // Peso por caractere

  const weights = rawWords.map(w => BASE_WEIGHT + (w.length * CHAR_WEIGHT));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Distribui o tempo proporcionalmente
  // Deixa uma pequena margem no inicio e fim
  const startMargin = 0.1; // 100ms de margem inicial
  const endMargin = 0.2; // 200ms de margem final
  const effectiveDuration = audioDuration - startMargin - endMargin;

  const words = [];
  let currentTime = startMargin;

  for (let i = 0; i < rawWords.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * effectiveDuration;
    const start = currentTime;
    const end = currentTime + wordDuration;

    words.push({
      word: rawWords[i],
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
    });

    currentTime = end;
  }

  // Gera segmentos (agrupamentos de ~10 palavras, similar ao Whisper)
  const segments = [];
  const WORDS_PER_SEGMENT = 10;

  for (let i = 0; i < words.length; i += WORDS_PER_SEGMENT) {
    const chunk = words.slice(i, i + WORDS_PER_SEGMENT);
    if (chunk.length === 0) continue;

    segments.push({
      id: segments.length,
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
      text: chunk.map(w => w.word).join(' '),
    });
  }

  return {
    text: rawWords.join(' '),
    words,
    segments,
    duration: audioDuration,
  };
}

// Versao async que le a duracao do audio automaticamente (compativel com a interface do Whisper)
async function transcribeWithTimestamps(audioFilePath) {
  // Obtem duracao do audio via FFprobe
  const duration = ffmpegService.getAudioDuration(audioFilePath);

  if (!duration || duration <= 0) {
    throw new Error('Nao foi possivel obter a duracao do audio para estimar timestamps');
  }

  // Le o roteiro do video (precisamos do texto)
  // Como nao temos acesso direto ao texto aqui, retornamos um placeholder
  // O pipeline deve passar o texto diretamente
  return {
    text: '',
    words: [],
    segments: [],
    duration,
  };
}

// Versao principal usada pelo pipeline: recebe texto + arquivo de audio
async function estimateFromAudio(audioFilePath, scriptText) {
  const duration = ffmpegService.getAudioDuration(audioFilePath);

  if (!duration || duration <= 0) {
    throw new Error('Nao foi possivel obter a duracao do audio para estimar timestamps');
  }

  return estimateWordTimestamps(scriptText, duration);
}

module.exports = {
  estimateWordTimestamps,
  transcribeWithTimestamps,
  estimateFromAudio,
};
