// Pipeline orchestrator - Coordena todas as etapas de geracao de video
// Etapas: Script → Audio → Image Prompts → Images → Timestamps → Assembly → Captions
// Suporta multiplos providers: ElevenLabs/MiniMax (TTS), Replicate/MiniMax (imagens), FFmpeg/MiniMax (video)
const path = require('path');
const Video = require('../models/Video');
const GenerationJob = require('../models/GenerationJob');
const VideoAsset = require('../models/VideoAsset');
const ProjectSettings = require('../models/ProjectSettings');
const Project = require('../models/Project');
const openaiService = require('./openai');
const elevenlabsService = require('./elevenlabs');
const replicateService = require('./replicate');
const minimaxService = require('./minimax');
const ffmpegService = require('./ffmpeg');
const storageService = require('./storage');

// Retorna o servico de TTS correto baseado nas settings
function getTTSService(settings) {
  if (settings.ttsProvider === 'minimax' && minimaxService.isConfigured()) {
    return { service: minimaxService, provider: 'minimax' };
  }
  return { service: elevenlabsService, provider: 'elevenlabs' };
}

// Retorna o servico de imagem correto baseado nas settings
function getImageService(settings) {
  if (settings.imageProvider === 'minimax' && minimaxService.isConfigured()) {
    return { service: minimaxService, provider: 'minimax' };
  }
  return { service: replicateService, provider: 'replicate' };
}

// Executa o pipeline completo de geracao de video
async function runPipeline(videoId) {
  const video = Video.findById(videoId);
  if (!video) throw new Error('Video nao encontrado');

  const project = Project.findById(video.projectId);
  if (!project) throw new Error('Projeto nao encontrado');

  const settings = ProjectSettings.findByProjectId(project.id);

  // Cria job de geracao
  const job = GenerationJob.create(videoId);

  const tts = getTTSService(settings);
  const img = getImageService(settings);
  console.log(`[Pipeline] Iniciando geracao do video #${videoId} (job #${job.id})`);
  console.log(`[Pipeline] Providers: TTS=${tts.provider}, Image=${img.provider}, Video=${settings.videoProvider || 'ffmpeg'}`);

  // Cria diretorios de storage
  storageService.createVideoDirectories(videoId);

  try {
    // STEP 1: Gerar roteiro com cenas
    await stepScript(videoId, job.id, project, settings);

    // STEP 2: Gerar audio (TTS)
    await stepAudio(videoId, job.id, settings);

    // STEP 3: Gerar prompts de imagem
    await stepImagePrompts(videoId, job.id, project, settings);

    // STEP 4: Gerar imagens
    await stepImages(videoId, job.id, settings);

    // STEP 5: Extrair timestamps (Whisper)
    await stepTimestamps(videoId, job.id);

    // STEP 6: Montar video (FFmpeg ou MiniMax image-to-video)
    await stepAssembly(videoId, job.id, project, settings);

    // STEP 7: Queimar legendas
    await stepCaptions(videoId, job.id, settings);

    // Marcar como concluido
    GenerationJob.updateStatus(job.id, {
      status: 'completed',
      currentStep: 'done',
      progress: 100,
    });

    Video.update(videoId, { status: 'done' });
    console.log(`[Pipeline] Video #${videoId} concluido com sucesso!`);

    return { success: true, videoId, jobId: job.id };
  } catch (err) {
    console.error(`[Pipeline] Erro no video #${videoId}:`, err.message);

    GenerationJob.updateStatus(job.id, {
      status: 'failed',
      errorMessage: err.message,
    });

    Video.update(videoId, {
      status: 'error',
      errorMessage: err.message,
    });

    return { success: false, videoId, jobId: job.id, error: err.message };
  }
}

// STEP 1: Gerar roteiro com cenas
async function stepScript(videoId, jobId, project, settings) {
  console.log(`[Pipeline] Step 1/7: Gerando roteiro com cenas...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'script',
    progress: GenerationJob.getProgressForStep('script'),
  });

  const video = Video.findById(videoId);

  // Se ja tem sceneData, pula
  if (video.sceneData && video.sceneData.scenes) {
    console.log(`[Pipeline] Roteiro ja existe, pulando.`);
    return;
  }

  const result = await openaiService.generateScriptWithScenes({
    title: video.title,
    niche: project.niche,
    platform: project.targetPlatform,
    description: project.description,
    context: settings.contextText,
    contentType: video.contentType || 'long',
  });

  Video.update(videoId, {
    script: result.fullScript,
    sceneData: result.sceneData,
    status: 'script_generated',
  });

  console.log(`[Pipeline] Roteiro gerado: ${result.sceneData.scenes.length} cenas (${result.tokensUsed} tokens)`);
}

// STEP 2: Gerar audio TTS (ElevenLabs ou MiniMax)
async function stepAudio(videoId, jobId, settings) {
  console.log(`[Pipeline] Step 2/7: Gerando audio (TTS)...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'audio',
    progress: GenerationJob.getProgressForStep('audio'),
  });

  const video = Video.findById(videoId);
  if (!video.script) throw new Error('Video sem roteiro para gerar audio');

  const { service: ttsService, provider } = getTTSService(settings);
  console.log(`[Pipeline] TTS Provider: ${provider}`);

  let audioBuffer;

  if (provider === 'minimax') {
    audioBuffer = await ttsService.generateSpeech(video.script, {
      voiceId: settings.minimaxVoiceId || 'presenter_male',
    });
  } else {
    audioBuffer = await ttsService.generateSpeech(video.script, {
      voiceId: settings.narrationVoiceId || undefined,
    });
  }

  // Salva o arquivo
  const audioPath = await storageService.saveFile(videoId, 'audio', 'narration.mp3', audioBuffer);

  // Registra asset
  VideoAsset.create({
    videoId,
    assetType: 'audio',
    filePath: audioPath,
    fileName: 'narration.mp3',
    fileSize: audioBuffer.length,
    mimeType: 'audio/mpeg',
  });

  Video.update(videoId, { status: 'audio_generating' });
  console.log(`[Pipeline] Audio gerado (${provider}): ${(audioBuffer.length / 1024).toFixed(0)} KB`);
}

// STEP 3: Gerar prompts de imagem
async function stepImagePrompts(videoId, jobId, project, settings) {
  console.log(`[Pipeline] Step 3/7: Gerando prompts de imagem...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'image_prompts',
    progress: GenerationJob.getProgressForStep('image_prompts'),
  });

  const video = Video.findById(videoId);
  if (!video.sceneData || !video.sceneData.scenes) {
    throw new Error('Video sem dados de cenas');
  }

  const result = await openaiService.generateImagePrompts(video.sceneData.scenes, {
    style: settings.imageStyle || 'cinematic',
    niche: project.niche,
  });

  // Adiciona prompts ao sceneData
  const updatedSceneData = { ...video.sceneData };
  updatedSceneData.scenes = updatedSceneData.scenes.map((scene, i) => ({
    ...scene,
    imagePrompt: result.prompts[i] || scene.visualDescription,
  }));

  Video.update(videoId, { sceneData: updatedSceneData });
  console.log(`[Pipeline] ${result.prompts.length} prompts de imagem gerados`);
}

// STEP 4: Gerar imagens (Replicate/FLUX ou MiniMax)
async function stepImages(videoId, jobId, settings) {
  console.log(`[Pipeline] Step 4/7: Gerando imagens...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'images',
    progress: GenerationJob.getProgressForStep('images'),
  });

  const video = Video.findById(videoId);
  const scenes = video.sceneData.scenes;

  Video.update(videoId, { status: 'images_generating' });

  const { service: imageService, provider } = getImageService(settings);
  console.log(`[Pipeline] Image Provider: ${provider}`);

  const isShort = video.contentType === 'short';
  const width = isShort ? 720 : 1280;
  const height = isShort ? 1280 : 720;

  let results;

  if (provider === 'minimax') {
    results = await imageService.generateSceneImages(scenes, {
      model: 'image-01',
      width,
      height,
      style: settings.imageStyle || 'cinematic',
    });
  } else {
    const imageModel = settings.imageModel || 'flux-schnell';
    results = await imageService.generateSceneImages(scenes, {
      model: imageModel,
      width,
      height,
      style: settings.imageStyle || 'cinematic',
    });
  }

  // Salva cada imagem
  for (const result of results) {
    if (result.error) {
      console.warn(`[Pipeline] Imagem cena ${result.sceneIndex + 1} falhou: ${result.error}`);
      continue;
    }

    const filename = `scene_${String(result.sceneIndex + 1).padStart(3, '0')}.png`;
    const filePath = await storageService.saveFile(videoId, 'images', filename, result.buffer);

    VideoAsset.create({
      videoId,
      assetType: 'image',
      filePath,
      fileName: filename,
      fileSize: result.buffer.length,
      mimeType: 'image/png',
      sortOrder: result.sceneIndex,
      metadata: { prompt: result.prompt },
    });
  }

  const successCount = results.filter(r => !r.error).length;
  console.log(`[Pipeline] ${successCount}/${scenes.length} imagens geradas (${provider})`);

  if (successCount === 0) {
    throw new Error('Nenhuma imagem foi gerada com sucesso');
  }

  Video.update(videoId, { status: 'images_done' });
}

// STEP 5: Extrair timestamps com Whisper
async function stepTimestamps(videoId, jobId) {
  console.log(`[Pipeline] Step 5/7: Extraindo timestamps (Whisper)...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'timestamps',
    progress: GenerationJob.getProgressForStep('timestamps'),
  });

  const audioAssets = VideoAsset.findByVideoId(videoId, 'audio');
  if (audioAssets.length === 0) throw new Error('Audio nao encontrado');

  const audioPath = audioAssets[0].filePath;
  const transcript = await openaiService.transcribeWithTimestamps(audioPath);

  // Salva arquivo de transcricao com timestamps
  const transcriptPath = await storageService.saveFile(
    videoId, 'subtitles', 'transcript.json',
    JSON.stringify(transcript, null, 2)
  );

  // Gera SRT
  if (transcript.words && transcript.words.length > 0) {
    const srt = ffmpegService.generateSRT(transcript.words, { wordsPerCaption: 4 });
    const srtPath = await storageService.saveFile(videoId, 'subtitles', 'captions.srt', srt);

    VideoAsset.create({
      videoId,
      assetType: 'subtitle',
      filePath: srtPath,
      fileName: 'captions.srt',
      fileSize: Buffer.byteLength(srt),
      mimeType: 'text/srt',
      durationSeconds: transcript.duration,
    });
  }

  // Atualiza duracao do audio asset
  if (transcript.duration) {
    GenerationJob.updateStatus(jobId, {
      metadata: { audioDuration: transcript.duration, wordCount: transcript.words?.length || 0 },
    });
  }

  console.log(`[Pipeline] Timestamps extraidos: ${transcript.words?.length || 0} palavras, ${transcript.duration?.toFixed(1)}s`);
}

// STEP 6: Montar video (FFmpeg slideshow OU MiniMax image-to-video)
async function stepAssembly(videoId, jobId, project, settings) {
  console.log(`[Pipeline] Step 6/7: Montando video...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'assembly',
    progress: GenerationJob.getProgressForStep('assembly'),
  });

  Video.update(videoId, { status: 'video_assembling' });

  const videoProvider = settings.videoProvider || 'ffmpeg';
  console.log(`[Pipeline] Video Provider: ${videoProvider}`);

  if (videoProvider === 'minimax' && minimaxService.isConfigured()) {
    await stepAssemblyMiniMax(videoId, settings);
  } else {
    await stepAssemblyFFmpeg(videoId);
  }
}

// Assembly via FFmpeg (slideshow classico: audio + imagens + Ken Burns)
async function stepAssemblyFFmpeg(videoId) {
  if (!ffmpegService.isInstalled()) {
    throw new Error('FFmpeg nao esta instalado. Execute: brew install ffmpeg');
  }

  const audioAssets = VideoAsset.findByVideoId(videoId, 'audio');
  const imageAssets = VideoAsset.findByVideoId(videoId, 'image');

  if (audioAssets.length === 0) throw new Error('Audio nao encontrado para montagem');
  if (imageAssets.length === 0) throw new Error('Imagens nao encontradas para montagem');

  const audioPath = audioAssets[0].filePath;
  const imagePaths = imageAssets.map(a => a.filePath);

  const video = Video.findById(videoId);
  const isShort = video.contentType === 'short';
  const width = isShort ? 720 : 1280;
  const height = isShort ? 1280 : 720;

  const rawVideoPath = storageService.getAssetPath(videoId, 'video', 'raw.mp4');

  await ffmpegService.assembleSlideshow({
    audioPath,
    imagePaths,
    outputPath: rawVideoPath,
    width,
    height,
  });

  VideoAsset.create({
    videoId,
    assetType: 'video',
    filePath: rawVideoPath,
    fileName: 'raw.mp4',
    fileSize: storageService.getFileSize(rawVideoPath),
    mimeType: 'video/mp4',
  });

  console.log(`[Pipeline] Video montado via FFmpeg: raw.mp4`);
}

// Assembly via MiniMax (image-to-video: cada imagem gera um clip com movimento)
async function stepAssemblyMiniMax(videoId, settings) {
  const imageAssets = VideoAsset.findByVideoId(videoId, 'image');
  const audioAssets = VideoAsset.findByVideoId(videoId, 'audio');

  if (imageAssets.length === 0) throw new Error('Imagens nao encontradas para montagem');

  const video = Video.findById(videoId);
  const resolution = settings.videoResolution || '1080P';
  const clipDuration = settings.videoDuration || 6;

  // Gera clips de video para cada cena via MiniMax
  const sceneImages = imageAssets.map(a => ({
    filePath: a.filePath,
    prompt: 'Smooth cinematic camera movement with subtle zoom and pan',
  }));

  console.log(`[Pipeline] Gerando ${sceneImages.length} clips de video via MiniMax...`);
  const clipResults = await minimaxService.generateSceneVideos(sceneImages, {
    resolution,
    duration: clipDuration,
  });

  // Salva cada clip
  const clipPaths = [];
  for (const result of clipResults) {
    if (!result.success) {
      console.warn(`[Pipeline] Clip cena ${result.sceneIndex + 1} falhou: ${result.error}`);
      continue;
    }

    const filename = `clip_${String(result.sceneIndex + 1).padStart(3, '0')}.mp4`;
    const filePath = await storageService.saveFile(videoId, 'video', filename, result.buffer);
    clipPaths.push(filePath);
  }

  if (clipPaths.length === 0) {
    throw new Error('Nenhum clip de video foi gerado com sucesso');
  }

  // Concatena clips + audio com FFmpeg
  if (!ffmpegService.isInstalled()) {
    throw new Error('FFmpeg necessario para concatenar clips. Execute: brew install ffmpeg');
  }

  const rawVideoPath = storageService.getAssetPath(videoId, 'video', 'raw.mp4');

  // Cria arquivo de lista para concat
  const concatListPath = storageService.getAssetPath(videoId, 'video', 'concat_list.txt');
  const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');
  const fs = require('fs');
  fs.writeFileSync(concatListPath, concatContent);

  // Concatena clips
  const concatVideoPath = storageService.getAssetPath(videoId, 'video', 'concat.mp4');
  await ffmpegService.concatenateVideos(concatListPath, concatVideoPath);

  // Substitui audio do video concatenado pelo audio de narracao
  if (audioAssets.length > 0) {
    const audioPath = audioAssets[0].filePath;
    await ffmpegService.replaceAudio(concatVideoPath, audioPath, rawVideoPath);
  } else {
    fs.copyFileSync(concatVideoPath, rawVideoPath);
  }

  VideoAsset.create({
    videoId,
    assetType: 'video',
    filePath: rawVideoPath,
    fileName: 'raw.mp4',
    fileSize: storageService.getFileSize(rawVideoPath),
    mimeType: 'video/mp4',
  });

  console.log(`[Pipeline] Video montado via MiniMax (${clipPaths.length} clips): raw.mp4`);
}

// STEP 7: Queimar legendas
async function stepCaptions(videoId, jobId, settings) {
  console.log(`[Pipeline] Step 7/7: Adicionando legendas...`);
  GenerationJob.updateStatus(jobId, {
    currentStep: 'captions',
    progress: GenerationJob.getProgressForStep('captions'),
  });

  const subtitleAssets = VideoAsset.findByVideoId(videoId, 'subtitle');
  const videoAssets = VideoAsset.findByVideoId(videoId, 'video');

  if (videoAssets.length === 0) throw new Error('Video nao encontrado para legendas');

  const rawVideoPath = videoAssets[0].filePath;
  const finalVideoPath = storageService.getAssetPath(videoId, 'video', 'final.mp4');

  if (subtitleAssets.length === 0) {
    // Se nao tem legendas, copia raw como final
    const fs = require('fs');
    fs.copyFileSync(rawVideoPath, finalVideoPath);
  } else {
    const srtPath = subtitleAssets[0].filePath;

    await ffmpegService.burnSubtitles({
      videoPath: rawVideoPath,
      subtitlePath: srtPath,
      outputPath: finalVideoPath,
      captionStyle: {
        fontColor: settings.captionColor || 'white',
        bgColor: settings.captionBgColor ? `&H80${settings.captionBgColor.replace('#', '')}` : '&H80000000',
        position: settings.captionPosition || 'bottom',
        fontSize: 28,
        bold: true,
      },
    });
  }

  // Registra video final
  VideoAsset.create({
    videoId,
    assetType: 'video',
    filePath: finalVideoPath,
    fileName: 'final.mp4',
    fileSize: storageService.getFileSize(finalVideoPath),
    mimeType: 'video/mp4',
    sortOrder: 1,
  });

  // Gera thumbnail
  try {
    const thumbnailPath = storageService.getAssetPath(videoId, 'thumbnails', 'thumb.jpg');
    await ffmpegService.generateThumbnail(finalVideoPath, thumbnailPath);
    VideoAsset.create({
      videoId,
      assetType: 'thumbnail',
      filePath: thumbnailPath,
      fileName: 'thumb.jpg',
      fileSize: storageService.getFileSize(thumbnailPath),
      mimeType: 'image/jpeg',
    });
  } catch (err) {
    console.warn(`[Pipeline] Thumbnail falhou:`, err.message);
  }

  // Atualiza video com URL do arquivo final
  const relPath = storageService.getRelativePath(finalVideoPath);
  Video.update(videoId, {
    videoUrl: `/storage/${relPath}`,
    status: 'done',
  });

  console.log(`[Pipeline] Legendas adicionadas e video final salvo`);
}

// Retorna status detalhado do pipeline
function getStatus(videoId) {
  const video = Video.findById(videoId);
  const job = GenerationJob.findByVideoId(videoId);
  const assets = VideoAsset.findByVideoId(videoId);

  return {
    video,
    job,
    assets: {
      audio: assets.filter(a => a.assetType === 'audio'),
      images: assets.filter(a => a.assetType === 'image'),
      videos: assets.filter(a => a.assetType === 'video'),
      subtitles: assets.filter(a => a.assetType === 'subtitle'),
      thumbnails: assets.filter(a => a.assetType === 'thumbnail'),
    },
    totalAssets: assets.length,
  };
}

module.exports = {
  runPipeline,
  getStatus,
};
