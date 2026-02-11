# 🚀 Configuração Claude Bypass no Mac - COMPLETA

## ⚠️ ATUALIZAÇÃO IMPORTANTE
**Variáveis de ambiente NÃO funcionam como bypass no Claude!**
- `CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS` não é reconhecida pelo CLI
- Apenas flags diretas funcionam

## ✅ O que foi configurado

### 1. **Scripts Wrapper FUNCIONAIS** (em `/Users/2a/.claude/`)

- **`claude-safe`**: Detecta se está rodando como root e ajusta comportamento
  - Como root: NÃO usa a flag (evita bloqueio)
  - Como usuário: USA --dangerously-skip-permissions

- **`claude-ultra`**: Sempre força a flag (bypass)
  - Simples e direto
  - Não funciona como root

### 2. **Funções no ~/.zshrc**

```bash
claude-ultra()   # Usa --dangerously-skip-permissions (força bypass)
claude-danger()  # Usa --dangerously-skip-permissions (mesmo que ultra)
```

### 3. **Configuração de PATH**

- PATH inclui `/Users/2a/.claude` para acesso aos scripts

## 🎯 Como usar

### Opção 1: Scripts funcionais
```bash
claude-safe "seu comando"   # Inteligente - detecta root
claude-ultra "seu comando"  # Força flag (só usuário normal)
```

### Opção 2: Funções diretas
```bash
claude-ultra "seu comando"  # Força bypass total
claude-danger "seu comando" # Mesmo que ultra
```

## ⚠️ Importante

- **Bloqueio do Claude**: A flag --dangerously-skip-permissions é bloqueada quando rodando como root/sudo
- **Solução**: Use `claude-safe` quando precisar de root
- **Segurança**: Essas configurações removem TODAS as proteções de segurança

## 🔍 Scripts que FUNCIONAM

Apenas 2 métodos confirmados funcionando:
1. ✅ **claude-safe** - Detecta EUID e ajusta comportamento
2. ✅ **claude-ultra** - Força flag (apenas usuário normal)
3. ✅ **Funções/alias** - claude-ultra, claude-danger (usuário normal)

## ❌ O que NÃO funciona
- Variáveis de ambiente (`CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS`)
- Arquivo de configuração JSON com `--settings`
- Scripts com `sudo -u` (problemas de autenticação no Mac)
- Alias global para `claude` (não persiste no shell)