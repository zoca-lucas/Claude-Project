# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o Projeto

Coleção de scripts utilitários para otimização e configuração de macOS.

## Scripts

- **aplicar-configuracoes-mac.sh** — Aplica configurações de performance no macOS (reduz animações, transparência, ajustes no Dock). Requer reinício do Mac após execução.

## Como Executar

```bash
chmod +x aplicar-configuracoes-mac.sh
./aplicar-configuracoes-mac.sh
```

## Convenções

- Scripts em Bash com `set -e` (falha rápida)
- Comentários e mensagens ao usuário em português (pt-BR)
- Comandos que podem falhar usam `2>/dev/null || true` para não interromper a execução
