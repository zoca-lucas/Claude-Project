# Como configurar MCP Neo4j globalmente no Claude

## O Problema Inicial

Quando executava `claude mcp list` em diferentes diretórios:
- ✅ Funcionava em `/Users/2a/.claude/mcp-neo4j-py`
- ❌ Não funcionava em `/Users/2a/Desktop`
- ❌ Mostrava: `uv --directory ... - ✗ Failed to connect`

## Por que não funcionava?

### 1. Configuração por Projeto
O MCP estava configurado **apenas localmente** no projeto `.claude`, não globalmente. Cada diretório pode ter sua própria configuração MCP.

### 2. Comando Incorreto
Estava usando:
```bash
uv --directory /Users/2a/.claude/mcp-neo4j-py run python -m mcp_neo4j
```

Deveria usar o caminho direto do venv:
```bash
/Users/2a/.claude/mcp-neo4j-py/.venv/bin/python /Users/2a/.claude/mcp-neo4j-py/src/mcp_neo4j/server.py
```

## Solução Implementada

### Passo 1: Remover Configuração Local
```bash
claude mcp remove neo4j-memory
```
Remove a configuração do projeto atual.

### Passo 2: Adicionar Configuração Global
```bash
cd ~
claude mcp add neo4j-memory \
  "/Users/2a/.claude/mcp-neo4j-py/.venv/bin/python" \
  "/Users/2a/.claude/mcp-neo4j-py/src/mcp_neo4j/server.py"
```

Isso adiciona ao arquivo `~/.claude.json` na seção global `mcpServers`.

### Passo 3: Script de Inicialização
Criado `/Users/2a/.claude/start-neo4j-mcp.sh`:
```bash
#!/bin/bash
# Mata processos antigos
pkill -f "python.*mcp_neo4j" 2>/dev/null

# Inicia servidor MCP com caminho correto
cd /Users/2a/.claude/mcp-neo4j-py
NEO4J_URI="bolt://127.0.0.1:7687" \
NEO4J_USERNAME="neo4j" \
NEO4J_PASSWORD="password" \
NEO4J_DATABASE="neo4j" \
.venv/bin/python src/mcp_neo4j/server.py > /tmp/mcp-neo4j.log 2>&1 &

# Testa conexão
claude mcp list
```

### Passo 4: Auto-start no Terminal
Adicionado ao `~/.zshrc`:
```bash
# Auto-start Neo4j MCP
/Users/2a/.claude/start-neo4j-mcp.sh > /dev/null 2>&1
```

## Estrutura Final no ~/.claude.json

### Antes (Local por Projeto):
```json
{
  "projects": {
    "/Users/2a/.claude": {
      "mcpServers": {
        "neo4j-memory": {...}
      }
    }
  }
}
```

### Depois (Global):
```json
{
  "mcpServers": {
    "neo4j-memory": {
      "type": "stdio",
      "command": "/Users/2a/.claude/mcp-neo4j-py/.venv/bin/python",
      "args": ["/Users/2a/.claude/mcp-neo4j-py/src/mcp_neo4j/server.py"],
      "env": {}
    }
  }
}
```

## Verificação de Funcionamento

### Teste 1: Do Desktop
```bash
cd ~/Desktop
claude mcp list
# Resultado: ✓ Connected
```

### Teste 2: Da Raiz
```bash
cd /
claude mcp list
# Resultado: ✓ Connected
```

### Teste 3: De Qualquer Lugar
```bash
cd /tmp
claude mcp list
# Resultado: ✓ Connected
```

## Por que Agora Funciona Globalmente?

1. **Configuração no nível raiz** do `~/.claude.json`
2. **Caminho absoluto** para o Python do venv
3. **Processo MCP rodando** em background
4. **Auto-inicialização** em cada terminal

## Comandos Úteis

```bash
# Verificar status
claude mcp list

# Reiniciar MCP
/Users/2a/.claude/start-neo4j-mcp.sh

# Ver logs
tail -f /tmp/mcp-neo4j.log

# Matar processo MCP
pkill -f "python.*mcp_neo4j"
```

## Resumo

A chave foi mover a configuração de **projeto local** para **global** no arquivo `~/.claude.json` e usar o **caminho completo do venv** ao invés de depender do `uv`. Agora funciona de qualquer diretório na máquina!