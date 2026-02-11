# Por que o MCP Neo4j não funcionava globalmente?

## O Problema

Quando você tentava executar o MCP Neo4j da raiz (`/`) ou de qualquer outro diretório, ele não funcionava. Apenas funcionava quando executado de dentro da pasta `/Users/2a/.claude/mcp-neo4j-py`.

## A Causa

### 1. Virtual Environment Local
- O MCP Neo4j está instalado em um **ambiente virtual Python** (venv)
- Localização: `/Users/2a/.claude/mcp-neo4j-py/.venv/`
- As dependências (`neo4j`, `mcp`) existem **apenas** neste venv

### 2. UV precisa de contexto
O comando `uv run` precisa:
- Estar na pasta do projeto, OU
- Usar a flag `--directory` para especificar onde está o projeto

### 3. Python Path
Quando executado fora da pasta:
- Python não encontra os módulos instalados no venv
- O `sys.path` não inclui as dependências do projeto

## Diferença entre os comandos

### ❌ Não funciona (da raiz):
```bash
cd /
uv run python src/mcp_neo4j/server.py
# Erro: UV não sabe onde está o projeto
```

### ✅ Funciona (na pasta):
```bash
cd /Users/2a/.claude/mcp-neo4j-py
uv run python src/mcp_neo4j/server.py
# UV encontra pyproject.toml e .venv
```

### ✅ Funciona (com --directory):
```bash
cd /
uv --directory /Users/2a/.claude/mcp-neo4j-py run python src/mcp_neo4j/server.py
# UV sabe onde procurar o projeto
```

## A Solução

### Script Wrapper Global
Criado `/Users/2a/.claude/mcp-neo4j`:
```bash
#!/bin/bash
MCP_DIR="/Users/2a/.claude/mcp-neo4j-py"
uv --directory "$MCP_DIR" run python src/mcp_neo4j/server.py "$@"
```

### Alias Global
Adicionado ao `~/.zshrc`:
```bash
alias mcp-neo4j="/Users/2a/.claude/mcp-neo4j"
```

## Como usar agora

De qualquer lugar na máquina:
```bash
# Recarregar configurações
source ~/.zshrc

# Executar de qualquer diretório
cd /
mcp-neo4j

cd ~/Desktop
mcp-neo4j

cd /tmp
mcp-neo4j
```

## Por que esta abordagem?

### ✅ Vantagens
1. **Isolamento**: Mantém dependências isoladas no venv
2. **Portabilidade**: Fácil de mover/backup do projeto
3. **Sem conflitos**: Não interfere com Python global
4. **Gerenciável**: UV continua gerenciando dependências

### ❌ Alternativas evitadas
1. **Instalar globalmente**: Poderia conflitar com outras versões
2. **Modificar PYTHONPATH**: Complexo e propenso a erros
3. **Links simbólicos do venv**: Quebrariam se o venv fosse recriado

## Resumo

O problema era que o MCP Neo4j estava em um ambiente virtual Python local, não global. A solução foi criar um wrapper script que sempre especifica o diretório correto para o UV, tornando o comando acessível de qualquer lugar na máquina.