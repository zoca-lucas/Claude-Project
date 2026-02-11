// Servico de montagem de video com FFmpeg
// Monta slideshow (audio + imagens + Ken Burns) e grava legendas
const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verifica se FFmpeg esta instalado
function isInstalled() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Retorna duracao de um arquivo de audio em segundos
function getAudioDuration(audioPath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`,
      { encoding: 'utf-8' }
    );
    return parseFloat(result.trim());
  } catch {
    return 0;
  }
}

// Monta video slideshow: audio + imagens com Ken Burns effect
// Cada imagem dura (totalDuration / numImages) segundos
async function assembleSlideshow({
  audioPath,
  imagePaths,
  outputPath,
  width = 1280,
  height = 720,
  fps = 30,
}) {
  if (!isInstalled()) {
    throw new Error('FFmpeg nao esta instalado. Execute: brew install ffmpeg');
  }

  const duration = getAudioDuration(audioPath);
  if (!duration || duration <= 0) {
    throw new Error('Nao foi possivel obter a duracao do audio');
  }

  const numImages = imagePaths.length;
  const durationPerImage = duration / numImages;

  // Cria um arquivo de input para o filtro complex
  // Cada imagem ganha zoom-in suave (Ken Burns) por sua duracao
  const inputArgs = imagePaths.map(p => `-loop 1 -t ${durationPerImage} -i "${p}"`).join(' ');

  // Filtro: escala cada imagem + aplica zoom suave + concatena
  const filterParts = [];
  const concatInputs = [];

  for (let i = 0; i < numImages; i++) {
    // Ken Burns: zoom de 1.0 para 1.1 (zoom lento)
    filterParts.push(
      `[${i}:v]scale=${width * 2}:${height * 2},` +
      `zoompan=z='min(zoom+0.0005,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(durationPerImage * fps)}:s=${width}x${height}:fps=${fps}` +
      `[v${i}]`
    );
    concatInputs.push(`[v${i}]`);
  }

  // Concatena todos os segmentos
  const filterComplex = [
    ...filterParts,
    `${concatInputs.join('')}concat=n=${numImages}:v=1:a=0[outv]`,
  ].join('; ');

  const cmd = `ffmpeg -y ${inputArgs} -i "${audioPath}" ` +
    `-filter_complex "${filterComplex}" ` +
    `-map "[outv]" -map ${numImages}:a ` +
    `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 192k -shortest ` +
    `"${outputPath}"`;

  return execPromise(cmd);
}

// Grava legendas estilizadas no video (burn subtitles)
async function burnSubtitles({
  videoPath,
  subtitlePath,
  outputPath,
  captionStyle = {},
}) {
  if (!isInstalled()) {
    throw new Error('FFmpeg nao esta instalado. Execute: brew install ffmpeg');
  }

  const {
    fontColor = 'white',
    fontSize = 24,
    bgColor = '&H80000000',  // Preto semi-transparente (ASS format)
    position = 'bottom',
    fontName = 'Arial',
    bold = true,
  } = captionStyle;

  // Margem vertical baseada na posicao
  const marginV = position === 'top' ? 40 : position === 'center' ? 200 : 30;

  // Estilo ASS para subtitles
  const forceStyle = [
    `FontName=${fontName}`,
    `FontSize=${fontSize}`,
    `PrimaryColour=&H00FFFFFF`,
    `BackColour=${bgColor}`,
    `BorderStyle=4`,
    `Outline=0`,
    `Shadow=0`,
    `MarginV=${marginV}`,
    `Alignment=${position === 'top' ? 8 : position === 'center' ? 5 : 2}`,
    bold ? 'Bold=1' : 'Bold=0',
  ].join(',');

  const cmd = `ffmpeg -y -i "${videoPath}" ` +
    `-vf "subtitles='${subtitlePath.replace(/'/g, "'\\''")}':force_style='${forceStyle}'" ` +
    `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
    `-c:a copy ` +
    `"${outputPath}"`;

  return execPromise(cmd);
}

// Gera arquivo SRT a partir de word-level timestamps
function generateSRT(words, { wordsPerCaption = 4 } = {}) {
  const lines = [];
  let index = 1;

  for (let i = 0; i < words.length; i += wordsPerCaption) {
    const chunk = words.slice(i, i + wordsPerCaption);
    if (chunk.length === 0) continue;

    const start = formatSRTTime(chunk[0].start);
    const end = formatSRTTime(chunk[chunk.length - 1].end);
    const text = chunk.map(w => w.word).join(' ');

    lines.push(`${index}`);
    lines.push(`${start} --> ${end}`);
    lines.push(text);
    lines.push('');
    index++;
  }

  return lines.join('\n');
}

// Gera arquivo ASS (Advanced SubStation Alpha) com estilizacao
function generateASS(words, {
  wordsPerCaption = 4,
  fontName = 'Arial',
  fontSize = 28,
  primaryColor = '&H00FFFFFF',
  bgColor = '&H80000000',
  position = 'bottom',
  bold = true,
  videoWidth = 1280,
  videoHeight = 720,
} = {}) {
  const marginV = position === 'top' ? 40 : position === 'center' ? 200 : 30;
  const alignment = position === 'top' ? 8 : position === 'center' ? 5 : 2;

  let ass = `[Script Info]
Title: ContentGen Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},${primaryColor},&H000000FF,&H00000000,${bgColor},${bold ? -1 : 0},0,0,0,100,100,0,0,4,0,0,${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (let i = 0; i < words.length; i += wordsPerCaption) {
    const chunk = words.slice(i, i + wordsPerCaption);
    if (chunk.length === 0) continue;

    const start = formatASSTime(chunk[0].start);
    const end = formatASSTime(chunk[chunk.length - 1].end);
    const text = chunk.map(w => w.word).join(' ');

    ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
  }

  return ass;
}

// Concatena multiplos videos usando arquivo de lista (para MiniMax clips)
async function concatenateVideos(concatListPath, outputPath) {
  if (!isInstalled()) {
    throw new Error('FFmpeg nao esta instalado. Execute: brew install ffmpeg');
  }

  const cmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" ` +
    `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 192k ` +
    `"${outputPath}"`;

  return execPromise(cmd);
}

// Substitui a faixa de audio de um video por outro arquivo de audio
async function replaceAudio(videoPath, audioPath, outputPath) {
  if (!isInstalled()) {
    throw new Error('FFmpeg nao esta instalado. Execute: brew install ffmpeg');
  }

  const cmd = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" ` +
    `-map 0:v -map 1:a ` +
    `-c:v copy -c:a aac -b:a 192k -shortest ` +
    `"${outputPath}"`;

  return execPromise(cmd);
}

// Gera thumbnail a partir de um frame do video
async function generateThumbnail(videoPath, outputPath, atSeconds = 2) {
  const cmd = `ffmpeg -y -i "${videoPath}" -ss ${atSeconds} -frames:v 1 -q:v 2 "${outputPath}"`;
  return execPromise(cmd);
}

// Helpers de formatacao de tempo
function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function formatASSTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function pad(num, len = 2) {
  return String(num).padStart(len, '0');
}

// Wrapper para exec com promise
function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Executando: ${cmd.substring(0, 120)}...`);
    exec(cmd, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[FFmpeg] Erro:', stderr);
        reject(new Error(`FFmpeg falhou: ${stderr || error.message}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

module.exports = {
  isInstalled,
  getAudioDuration,
  assembleSlideshow,
  burnSubtitles,
  concatenateVideos,
  replaceAudio,
  generateSRT,
  generateASS,
  generateThumbnail,
  execPromise,
};
