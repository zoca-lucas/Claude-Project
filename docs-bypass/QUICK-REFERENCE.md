# ⚡ Claude Bypass - Referência Rápida

## 🎯 Comando Mais Usado
```bash
claude-safe "seu comando aqui"
```

---

## 🚀 Setup em 10 Segundos
```bash
# Copie e cole tudo isso:
chmod +x /Users/2a/.claude/claude-* && \
echo 'export PATH="/Users/2a/.claude:$PATH"' >> ~/.zshrc && \
echo 'alias c="claude-safe"' >> ~/.zshrc && \
exec zsh
```

Pronto! Use `c "comando"` ou `claude-safe "comando"`

---

## 📊 Quando Usar Cada Método

| Situação | Use | Comando |
|----------|-----|---------|
| 🔨 Dev normal | claude-safe | `claude-safe "tarefa"` |
| ⚡ Super rápido | Alias c | `c "tarefa"` |
| 🔧 Com sudo/root | claude-safe | `sudo claude-safe "tarefa"` |
| 📜 Em scripts | Flag direta | `claude --dangerously-skip-permissions "tarefa"` |
| 🎮 Interativo | Claude normal | `claude "tarefa"` |

---

## 💡 Exemplos Comuns

### Criar Projeto
```bash
c "crie um projeto Django com autenticação JWT"
```

### Refatorar Código
```bash
c "adicione docstrings em todos os métodos"
```

### Commit Inteligente
```bash
c "faça commit com mensagem descritiva"
```

### Testes Automáticos
```bash
c "crie e execute testes para este arquivo"
```

### Documentação
```bash
c "gere README.md baseado no código"
```

---

## 🔧 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "command not found" | `exec zsh` |
| "permission denied" | `chmod +x /Users/2a/.claude/claude-*` |
| "ainda pede confirmação" | Use `claude-safe` não `claude` |
| "erro com sudo" | Use `sudo claude-safe` não flag direta |

---

## ⚠️ Lembre-se

✅ **SEGURO**: Desenvolvimento local, containers, VMs
❌ **EVITE**: Produção, dados sensíveis, sistema principal

---

## 🎉 Dica Pro

Crie seu próprio alias super curto:
```bash
echo 'alias ai="claude-safe"' >> ~/.zshrc
exec zsh

# Agora use:
ai "sua tarefa"
```

---

**Comando de emergência** (se nada funcionar):
```bash
/usr/local/bin/claude --dangerously-skip-permissions "sua tarefa"
```