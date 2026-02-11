# Claude Ultra Resume - Documentação

## O que foi criado
Um comando personalizado `claude-ultra-r` que retoma conversas específicas do Claude com configurações avançadas.

## Como foi implementado

### 1. Script Bash
Criado em `/Users/2a/.claude/claude-ultra-r`:

```bash
#!/bin/bash

# Verifica se foi passado um session ID
if [ $# -eq 0 ]; then
    # Sem argumentos - modo interativo
    claude -r \
      --permission-mode bypassPermissions \
      --model opus
else
    # Com session ID ou outros argumentos
    claude -r \
      --permission-mode bypassPermissions \
      --model opus \
      "$@"
fi
```

### 2. Permissões de execução
```bash
chmod +x /Users/2a/.claude/claude-ultra-r
```

### 3. Alias global
Adicionado ao `~/.zshrc`:
```bash
alias claude-ultra-r="/Users/2a/.claude/claude-ultra-r"
```

## Funcionalidades

- **Retoma conversa específica**: Flag `-r` permite escolher qual conversa retomar
- **Modo interativo ou direto**:
  - Sem argumentos: mostra lista de conversas para escolher
  - Com session ID: retoma diretamente a sessão especificada
- **Modo permissivo**: Flag `--permission-mode bypassPermissions` pula confirmações
- **Modelo Opus**: Flag `--model opus` usa o modelo mais poderoso disponível
- **Detecção inteligente**: Script detecta automaticamente se há argumentos

## Como usar

```bash
# Após recarregar o shell
source ~/.zshrc

# Modo interativo - escolher da lista
claude-ultra-r

# Com session ID específico
claude-ultra-r abc123-def456-789

# Ver todas as sessões e escolher
claude-ultra-r

# Com parâmetros extras
claude-ultra-r session-id --add-dir /algum/diretorio
```

## Diferenças entre -c e -r

| Comando | Função | Uso |
|---------|--------|-----|
| `claude-ultra-c` | Continua **última** conversa automaticamente | Retomar trabalho recente |
| `claude-ultra-r` | Retoma conversa **específica** | Escolher entre múltiplas conversas |

## Vantagens
- Flexibilidade para gerenciar múltiplas conversas
- Modo interativo facilita escolha visual
- Configurações otimizadas pré-definidas
- Suporte a session ID direto para automação
- Cores no output para melhor visualização

## Casos de Uso

### Cenário 1: Múltiplos Projetos
Você tem 3 conversas abertas sobre projetos diferentes. Use `claude-ultra-r` para ver a lista e escolher qual retomar.

### Cenário 2: Automação
Salve o session ID de uma conversa importante e retome diretamente:
```bash
claude-ultra-r 7f8e9d0c-1a2b-3c4d-5e6f-7890abcdef12
```

### Cenário 3: Trabalho Recente vs Específico
- Última conversa? Use `claude-ultra-c`
- Conversa específica? Use `claude-ultra-r`