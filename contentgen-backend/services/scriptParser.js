// Servico de parsing local de roteiros - substitui OpenAI para geracao de cenas
// Converte roteiros escritos manualmente (com marcadores [CENA X]) em sceneData JSON

// Padroes de marcadores de cena aceitos (case-insensitive)
const SCENE_PATTERNS = [
  /\[CENA\s*(\d+)\]/i,
  /\[SCENE\s*(\d+)\]/i,
  /\[CENA\s*(\d+)\s*[:—-]\s*(.*?)\]/i,
  /\*\*CENA\s*(\d+)\*\*/i,
  /^CENA\s*(\d+)\s*[:—-]?\s*/im,
  /\[GANCHO\]/i,
  /\[INTRODUCAO\]/i,
  /\[DESENVOLVIMENTO\]/i,
  /\[CONCLUSAO\]/i,
];

// Verifica se uma linha eh um marcador de cena
function isSceneMarker(line) {
  const trimmed = line.trim();
  return SCENE_PATTERNS.some(p => p.test(trimmed));
}

// Remove o marcador de cena da linha, retornando so o texto
function removeSceneMarker(line) {
  let cleaned = line.trim();

  // Remove [CENA X: titulo] ou [CENA X]
  cleaned = cleaned.replace(/\[CENA\s*\d+\s*(?:[:—-]\s*.*?)?\]/gi, '');
  cleaned = cleaned.replace(/\[SCENE\s*\d+\s*(?:[:—-]\s*.*?)?\]/gi, '');
  cleaned = cleaned.replace(/\*\*CENA\s*\d+\*\*/gi, '');
  cleaned = cleaned.replace(/^CENA\s*\d+\s*[:—-]?\s*/i, '');
  cleaned = cleaned.replace(/\[GANCHO\]/gi, '');
  cleaned = cleaned.replace(/\[INTRODUCAO\]/gi, '');
  cleaned = cleaned.replace(/\[DESENVOLVIMENTO\]/gi, '');
  cleaned = cleaned.replace(/\[CONCLUSAO\]/gi, '');

  return cleaned.trim();
}

// Gera uma descricao visual simples a partir do texto da narracao
function generateVisualDescription(narration, sceneNumber) {
  // Extrai palavras-chave relevantes (substantivos, conceitos)
  const text = narration.toLowerCase();

  // Palavras a ignorar
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'que', 'se', 'eh',
    'nao', 'mas', 'ou', 'e', 'ao', 'esse', 'essa', 'isso', 'este', 'esta', 'isto',
    'ele', 'ela', 'eles', 'elas', 'voce', 'eu', 'nos', 'meu', 'seu', 'sua',
    'como', 'quando', 'onde', 'porque', 'mais', 'muito', 'bem', 'ja', 'ainda',
    'vai', 'vou', 'ser', 'ter', 'fazer', 'pode', 'esta', 'sao', 'tem', 'foi',
    'sobre', 'entre', 'ate', 'depois', 'antes', 'aqui', 'ali', 'la', 'agora',
    'tambem', 'entao', 'assim', 'apenas', 'mesmo', 'cada', 'todo', 'toda',
    'todos', 'todas', 'outro', 'outra', 'outros', 'outras', 'qual', 'quais',
    'tipo', 'coisa', 'gente', 'parte', 'forma', 'vez', 'vezes', 'dia', 'dias',
  ]);

  // Extrai palavras significativas (> 4 chars, nao stop words)
  const words = text.split(/\s+/)
    .map(w => w.replace(/[^a-záàâãéèêíïóôõöúç]/gi, ''))
    .filter(w => w.length > 4 && !stopWords.has(w));

  const keywords = [...new Set(words)].slice(0, 5);

  if (keywords.length === 0) {
    return `Abstract background with dynamic elements, scene ${sceneNumber}`;
  }

  // Cria descricao visual baseada nas palavras-chave
  return `Visual representation of ${keywords.join(', ')}, cinematic style, high quality`;
}

// Parse principal: converte texto de roteiro em sceneData
function parseScript(scriptText, options = {}) {
  const { title = 'Video', contentType = 'long' } = options;

  if (!scriptText || scriptText.trim().length < 10) {
    throw new Error('Roteiro muito curto para parsing');
  }

  const lines = scriptText.split('\n');
  const scenes = [];
  let currentNarration = [];
  let sceneCount = 0;
  let hasMarkers = false;

  // Detecta se o roteiro tem marcadores de cena
  for (const line of lines) {
    if (isSceneMarker(line)) {
      hasMarkers = true;
      break;
    }
  }

  if (hasMarkers) {
    // Modo com marcadores: divide por [CENA X]
    for (const line of lines) {
      if (isSceneMarker(line)) {
        // Salva cena anterior
        if (currentNarration.length > 0) {
          sceneCount++;
          const narrationText = currentNarration.join(' ').trim();
          scenes.push({
            sceneNumber: sceneCount,
            narration: narrationText,
            visualDescription: generateVisualDescription(narrationText, sceneCount),
          });
          currentNarration = [];
        }

        // Adiciona texto restante da linha do marcador
        const remainder = removeSceneMarker(line);
        if (remainder) {
          currentNarration.push(remainder);
        }
      } else {
        const trimmed = line.trim();
        if (trimmed) {
          currentNarration.push(trimmed);
        }
      }
    }

    // Ultima cena
    if (currentNarration.length > 0) {
      sceneCount++;
      const narrationText = currentNarration.join(' ').trim();
      scenes.push({
        sceneNumber: sceneCount,
        narration: narrationText,
        visualDescription: generateVisualDescription(narrationText, sceneCount),
      });
    }
  } else {
    // Modo sem marcadores: divide por paragrafos (linhas em branco)
    const paragraphs = scriptText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    // Se poucos paragrafos, divide por sentencas
    if (paragraphs.length <= 2) {
      const sentences = scriptText
        .replace(/\n/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 10);

      // Agrupa sentencas em cenas (2-3 sentencas por cena)
      const isShort = contentType === 'short';
      const sentencesPerScene = isShort ? 1 : 2;
      const maxScenes = isShort ? 5 : 12;

      for (let i = 0; i < sentences.length && scenes.length < maxScenes; i += sentencesPerScene) {
        const chunk = sentences.slice(i, i + sentencesPerScene);
        const narrationText = chunk.join(' ').trim();
        if (narrationText.length > 10) {
          sceneCount++;
          scenes.push({
            sceneNumber: sceneCount,
            narration: narrationText,
            visualDescription: generateVisualDescription(narrationText, sceneCount),
          });
        }
      }
    } else {
      // Usa paragrafos como cenas
      const isShort = contentType === 'short';
      const maxScenes = isShort ? 5 : 15;

      for (const para of paragraphs) {
        if (scenes.length >= maxScenes) break;
        const narrationText = para.replace(/\n/g, ' ').trim();
        if (narrationText.length > 10) {
          sceneCount++;
          scenes.push({
            sceneNumber: sceneCount,
            narration: narrationText,
            visualDescription: generateVisualDescription(narrationText, sceneCount),
          });
        }
      }
    }
  }

  // Garantir pelo menos 1 cena
  if (scenes.length === 0) {
    scenes.push({
      sceneNumber: 1,
      narration: scriptText.replace(/\n/g, ' ').trim(),
      visualDescription: generateVisualDescription(scriptText, 1),
    });
  }

  const sceneData = { title, scenes };
  const fullScript = scenes.map(s => s.narration).join('\n\n');

  return {
    sceneData,
    fullScript,
    model: 'local-parser',
    tokensUsed: 0,
  };
}

module.exports = {
  parseScript,
  generateVisualDescription,
};
