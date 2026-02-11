// Servico de construcao de prompts de imagem - substitui OpenAI para geracao de prompts
// Converte descricoes visuais em portugues para prompts otimizados em ingles

// Dicionario basico de traducao de termos comuns pt-BR → en
const TRANSLATIONS = {
  // Natureza
  'floresta': 'forest', 'oceano': 'ocean', 'montanha': 'mountain', 'montanhas': 'mountains',
  'praia': 'beach', 'rio': 'river', 'lago': 'lake', 'ceu': 'sky', 'sol': 'sun',
  'lua': 'moon', 'estrelas': 'stars', 'nuvens': 'clouds', 'arvore': 'tree', 'arvores': 'trees',
  'jardim': 'garden', 'flores': 'flowers', 'campo': 'field', 'deserto': 'desert',
  'cachoeira': 'waterfall', 'vulcao': 'volcano', 'neve': 'snow', 'gelo': 'ice',
  'aurora': 'aurora', 'tempestade': 'storm', 'arco-iris': 'rainbow',

  // Espaco
  'universo': 'universe', 'galaxia': 'galaxy', 'galaxias': 'galaxies', 'planeta': 'planet',
  'planetas': 'planets', 'espaco': 'space', 'nebulosa': 'nebula', 'buraco negro': 'black hole',
  'sistema solar': 'solar system', 'constelacao': 'constellation', 'asteroide': 'asteroid',
  'cometa': 'comet', 'supernova': 'supernova', 'via lactea': 'milky way',

  // Tecnologia
  'tecnologia': 'technology', 'computador': 'computer', 'inteligencia artificial': 'artificial intelligence',
  'robo': 'robot', 'futuro': 'future', 'digital': 'digital', 'dados': 'data',
  'codigo': 'code', 'rede': 'network', 'internet': 'internet', 'celular': 'smartphone',
  'tela': 'screen', 'servidor': 'server', 'chip': 'microchip', 'circuito': 'circuit',

  // Ciencia
  'ciencia': 'science', 'atomo': 'atom', 'molecula': 'molecule', 'dna': 'DNA',
  'celula': 'cell', 'cerebro': 'brain', 'laboratorio': 'laboratory', 'microscopio': 'microscope',
  'experimento': 'experiment', 'pesquisa': 'research', 'descoberta': 'discovery',
  'energia': 'energy', 'fisica': 'physics', 'quimica': 'chemistry', 'biologia': 'biology',

  // Negocios
  'dinheiro': 'money', 'negocio': 'business', 'empresa': 'company', 'escritorio': 'office',
  'grafico': 'graph', 'crescimento': 'growth', 'sucesso': 'success', 'investimento': 'investment',
  'mercado': 'market', 'lucro': 'profit', 'economia': 'economy', 'financas': 'finance',

  // Saude
  'saude': 'health', 'exercicio': 'exercise', 'meditacao': 'meditation', 'comida': 'food',
  'dieta': 'diet', 'vitamina': 'vitamin', 'bem-estar': 'wellness', 'yoga': 'yoga',
  'corrida': 'running', 'academia': 'gym', 'nutricao': 'nutrition',

  // Estilo visual
  'cinematico': 'cinematic', 'escuro': 'dark', 'claro': 'bright', 'colorido': 'colorful',
  'abstrato': 'abstract', 'moderno': 'modern', 'futurista': 'futuristic', 'minimalista': 'minimalist',
  'dramatico': 'dramatic', 'misterioso': 'mysterious', 'vibrante': 'vibrant',

  // Geral
  'pessoa': 'person', 'pessoas': 'people', 'cidade': 'city', 'casa': 'house',
  'livro': 'book', 'livros': 'books', 'mundo': 'world', 'terra': 'earth',
  'historia': 'history', 'musica': 'music', 'arte': 'art', 'cultura': 'culture',
  'animal': 'animal', 'animais': 'animals', 'fogo': 'fire', 'agua': 'water',
  'luz': 'light', 'sombra': 'shadow', 'noite': 'night', 'dia': 'day',
  'mapa': 'map', 'relogio': 'clock', 'tempo': 'time', 'caminho': 'path',
};

// Estilos visuais predefinidos
const STYLE_SUFFIXES = {
  cinematic: ', cinematic lighting, dramatic composition, 8k, ultra detailed, professional photography',
  realistic: ', photorealistic, natural lighting, high resolution, detailed textures',
  illustration: ', digital illustration, vibrant colors, detailed artwork, concept art style',
  minimalist: ', minimalist design, clean composition, soft colors, elegant',
  abstract: ', abstract art, vibrant gradients, flowing shapes, artistic composition',
  dark: ', dark moody atmosphere, dramatic shadows, noir style, high contrast',
  futuristic: ', futuristic sci-fi aesthetic, neon lights, cyber style, holographic elements',
};

// Traduz termos do portugues para ingles usando o dicionario
function translateTerms(text) {
  let result = text.toLowerCase();

  // Ordena por comprimento descendente para evitar substituicoes parciais
  const entries = Object.entries(TRANSLATIONS).sort((a, b) => b[0].length - a[0].length);

  for (const [pt, en] of entries) {
    const regex = new RegExp(`\\b${escapeRegex(pt)}\\b`, 'gi');
    result = result.replace(regex, en);
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Gera um prompt de imagem otimizado a partir de uma descricao visual
function buildImagePrompt(visualDescription, options = {}) {
  const { style = 'cinematic', niche = '' } = options;

  // Traduz termos conhecidos
  let prompt = translateTerms(visualDescription);

  // Remove palavras muito comuns em portugues que sobram
  prompt = prompt.replace(/\b(de|do|da|dos|das|em|no|na|nos|nas|com|para|por|que|se|um|uma|o|a|os|as|e|ou)\b/gi, ' ');

  // Limpa espacos extras
  prompt = prompt.replace(/\s+/g, ' ').trim();

  // Capitaliza primeira letra
  prompt = prompt.charAt(0).toUpperCase() + prompt.slice(1);

  // Adiciona prefixo de qualidade
  const prefix = 'High quality image of';

  // Adiciona contexto de nicho se fornecido
  const nicheContext = niche ? `, ${translateTerms(niche)} theme` : '';

  // Adiciona sufixo de estilo
  const styleSuffix = STYLE_SUFFIXES[style] || STYLE_SUFFIXES.cinematic;

  // Garante que eh faceless (sem rosto)
  const facelessSuffix = ', no faces, no people facing camera, faceless content';

  return `${prefix} ${prompt}${nicheContext}${styleSuffix}${facelessSuffix}`;
}

// Converte array de cenas em array de prompts
function generateImagePrompts(scenes, options = {}) {
  const { style = 'cinematic', niche = '' } = options;

  const prompts = scenes.map((scene) => {
    const description = scene.visualDescription || scene.narration || '';
    return buildImagePrompt(description, { style, niche });
  });

  return {
    prompts,
    model: 'local-prompt-builder',
    tokensUsed: 0,
  };
}

module.exports = {
  buildImagePrompt,
  generateImagePrompts,
  translateTerms,
};
