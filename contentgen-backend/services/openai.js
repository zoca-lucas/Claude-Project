// Servico de integracao com OpenAI para geracao de roteiros, prompts de imagem e transcricao
const OpenAI = require('openai');
const fs = require('fs');
const config = require('../config/env');

let client = null;

function getClient() {
  if (!client) {
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY nao configurada. Adicione no arquivo .env');
    }
    client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }
  return client;
}

// Verifica se a API key esta configurada
function isConfigured() {
  return !!config.OPENAI_API_KEY;
}

// ==========================================
// GERACAO DE ROTEIRO (original)
// ==========================================
async function generateScript({ title, niche, platform, description }) {
  const openai = getClient();

  const platformInfo = platform === 'tiktok'
    ? 'TikTok (video curto de 30-60 segundos, linguagem jovem e dinamica, gancho forte nos primeiros 3 segundos)'
    : 'YouTube (video de 8-12 minutos, com introducao, desenvolvimento e conclusao, tom educativo e envolvente)';

  const systemPrompt = `Voce eh um roteirista profissional de videos para redes sociais.
Voce cria roteiros otimizados para engajamento, com linguagem natural em portugues do Brasil.
Seus roteiros sempre incluem:
- GANCHO: Uma abertura impactante para prender a atencao
- DESENVOLVIMENTO: Conteudo principal com informacoes valiosas
- CTA: Chamada para acao no final (curtir, comentar, seguir, se inscrever)

Formate o roteiro de forma clara com secoes marcadas.`;

  const userPrompt = `Crie um roteiro completo para o seguinte video:

**Titulo:** ${title}
**Plataforma:** ${platformInfo}
${niche ? `**Nicho:** ${niche}` : ''}
${description ? `**Contexto do projeto:** ${description}` : ''}

Inclua:
1. [GANCHO] - Primeiras palavras para captar atencao (5-10 segundos)
2. [INTRODUCAO] - Apresentacao do tema
3. [DESENVOLVIMENTO] - Conteudo principal dividido em topicos
4. [CONCLUSAO] - Resumo e CTA

O roteiro deve ser natural, como se estivesse falando diretamente com o espectador.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.8,
  });

  const script = response.choices[0]?.message?.content;
  if (!script) {
    throw new Error('OpenAI nao retornou um roteiro. Tente novamente.');
  }

  return {
    script,
    model: response.model,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

// ==========================================
// ROTEIRO COM CENAS (para pipeline de video)
// ==========================================
async function generateScriptWithScenes({ title, niche, platform, description, context, contentType }) {
  const openai = getClient();

  const isShort = contentType === 'short';
  const platformInfo = platform === 'tiktok'
    ? 'TikTok (video curto, vertical 9:16)'
    : 'YouTube';

  const durationGuide = isShort
    ? 'O video tera 30-60 segundos. Crie entre 3 e 5 cenas curtas.'
    : 'O video tera 8-12 minutos. Crie entre 8 e 15 cenas.';

  const systemPrompt = `Voce eh um roteirista profissional de videos faceless (sem rosto) para ${platformInfo}.
Voce cria roteiros estruturados em CENAS, onde cada cena tera:
- Uma narracao (texto que sera lido em voz alta por TTS)
- Uma descricao visual (para gerar imagem com IA)

REGRAS:
- Linguagem natural em portugues do Brasil
- ${durationGuide}
- Cada cena deve ter narracao de 1-3 frases (facil de ler em voz alta)
- A descricao visual deve descrever a IMAGEM que aparecera (nao o video)
- Use linguagem engajante com gancho forte no inicio

FORMATO DE RESPOSTA (JSON OBRIGATORIO):
Responda APENAS com um JSON valido, sem texto adicional, no formato:
{
  "title": "titulo do video",
  "scenes": [
    {
      "sceneNumber": 1,
      "narration": "Texto da narracao para TTS",
      "visualDescription": "Descricao da imagem que sera gerada"
    }
  ]
}`;

  const userPrompt = `Crie um roteiro com cenas para:

**Titulo:** ${title}
**Plataforma:** ${platformInfo}
**Tipo:** ${isShort ? 'Video curto (30-60s)' : 'Video longo (8-12 min)'}
${niche ? `**Nicho:** ${niche}` : ''}
${description ? `**Sobre o projeto:** ${description}` : ''}
${context ? `**Contexto adicional:** ${context}` : ''}

Lembre-se: responda APENAS com JSON valido.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 4000,
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI nao retornou o roteiro com cenas.');
  }

  let sceneData;
  try {
    sceneData = JSON.parse(content);
  } catch {
    throw new Error('OpenAI retornou JSON invalido para o roteiro com cenas.');
  }

  // Gera o script completo (narracao concatenada)
  const fullScript = sceneData.scenes.map(s => s.narration).join('\n\n');

  return {
    sceneData,
    fullScript,
    model: response.model,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

// ==========================================
// PROMPTS DE IMAGEM (refina descricoes visuais)
// ==========================================
async function generateImagePrompts(scenes, { style = 'cinematic', niche }) {
  const openai = getClient();

  const systemPrompt = `Voce eh um especialista em criar prompts de imagem para IA generativa (FLUX/Stable Diffusion).
Converta descricoes visuais em prompts otimizados para geracao de imagens.

REGRAS:
- Prompts em ingles (melhor para modelos de imagem)
- Inclua estilo, iluminacao, composicao
- Estilo visual: ${style}
- Nao inclua texto/letras na imagem
- Nao inclua pessoas de frente (faceless content)
- Mantenha consistencia visual entre as cenas

FORMATO: Responda com JSON: { "prompts": ["prompt1", "prompt2", ...] }`;

  const descriptions = scenes.map((s, i) =>
    `Cena ${i + 1}: ${s.visualDescription}`
  ).join('\n');

  const userPrompt = `Converta estas descricoes de cena em prompts de imagem IA otimizados:

${descriptions}
${niche ? `\nNicho do conteudo: ${niche}` : ''}

Gere ${scenes.length} prompts, um para cada cena. Mantenha coerencia visual.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  let result;
  try {
    result = JSON.parse(content);
  } catch {
    throw new Error('OpenAI retornou JSON invalido para prompts de imagem.');
  }

  return {
    prompts: result.prompts,
    model: response.model,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

// ==========================================
// WHISPER - Transcricao com timestamps
// ==========================================
async function transcribeWithTimestamps(audioFilePath) {
  const openai = getClient();

  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioFilePath),
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
    language: 'pt',
  });

  return {
    text: response.text,
    words: response.words || [],
    segments: response.segments || [],
    duration: response.duration,
  };
}

module.exports = {
  isConfigured,
  generateScript,
  generateScriptWithScenes,
  generateImagePrompts,
  transcribeWithTimestamps,
};
