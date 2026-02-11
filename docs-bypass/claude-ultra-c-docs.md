# Claude Ultra Continue - Documentação

## O que foi criado
Um comando personalizado `claude-ultra-c` que continua a última conversa do Claude com configurações avançadas.

## Como foi implementado

### 1. Script Bash
Criado em `/Users/2a/.claude/claude-ultra-c`:

```bash
#!/bin/bash

# Executa claude com:
# -c: continua última conversa
# --permission-mode bypassPermissions: modo permissivo
# --model opus: usa o modelo mais poderoso
claude -c \
  --permission-mode bypassPermissions \
  --model opus \
  "$@"
```

### 2. Permissões de execução
```bash
chmod +x /Users/2a/.claude/claude-ultra-c
```

### 3. Alias global
Adicionado ao `~/.zshrc`:
```bash
alias claude-ultra-c="/Users/2a/.claude/claude-ultra-c"
```

## Funcionalidades

- **Continua última sessão**: Flag `-c` retoma automaticamente a conversa mais recente
- **Modo permissivo**: Flag `--permission-mode bypassPermissions` pula confirmações
- **Modelo Opus**: Flag `--model opus` usa o modelo mais poderoso disponível
- **Parâmetros extras**: `"$@"` permite adicionar flags adicionais se necessário

## Como usar

```bash
# Após recarregar o shell
source ~/.zshrc
claude-ultra-c

# Ou diretamente
/Users/2a/.claude/claude-ultra-c

# Com parâmetros extras
claude-ultra-c --add-dir /algum/diretorio
```

## Vantagens
- Um comando rápido para retomar trabalho
- Configurações otimizadas pré-definidas
- Extensível com parâmetros adicionais
- Cores no output para melhor visualização