// Servico de integracao com OpenAI para geracao de roteiros
const OpenAI = require('openai');
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

// Gera roteiro de video usando GPT
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

// Verifica se a API key esta configurada
function isConfigured() {
  return !!config.OPENAI_API_KEY;
}

module.exports = { generateScript, isConfigured };
