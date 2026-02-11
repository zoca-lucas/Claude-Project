# Por que os comandos claude-ultra funcionam globalmente?

## Conceito de Comando Global
Um comando é considerado "global" quando pode ser executado de **qualquer diretório** no sistema, sem precisar especificar o caminho completo.

## Como foi implementado

### 1. Scripts Executáveis
Os scripts foram criados em `/Users/2a/.claude/`:
- `claude-ultra-c` - Continue (continua última conversa)
- `claude-ultra-r` - Resume (retoma conversa específica)

Com permissão de execução:
```bash
chmod +x /Users/2a/.claude/claude-ultra-*
```

### 2. Aliases no Shell
Adicionados ao `~/.zshrc`:
```bash
alias claude-ultra-c="/Users/2a/.claude/claude-ultra-c"
alias claude-ultra-r="/Users/2a/.claude/claude-ultra-r"
```

### 3. PATH Atualizado
Diretório adicionado ao PATH em `~/.zshrc`:
```bash
export PATH="/Users/2a/.claude:$PATH"
```

## Por que funciona globalmente?

### Método 1: Via Alias (Principal)
- O arquivo `~/.zshrc` é carregado **automaticamente** em cada nova sessão do terminal
- Os aliases criam "atalhos" que apontam para os scripts
- Funciona em qualquer diretório porque o shell resolve o alias primeiro

### Método 2: Via PATH (Alternativo)
- O PATH é uma variável que lista diretórios onde o sistema procura comandos
- Ao adicionar `/Users/2a/.claude` ao PATH, qualquer script executável lá se torna global
- O sistema procura comandos na ordem dos diretórios no PATH

## Fluxo de Execução

1. **Você digita**: `claude-ultra-c`
2. **Shell verifica**: Existe um alias para isso?
3. **Encontra alias**: Traduz para `/Users/2a/.claude/claude-ultra-c`
4. **Executa script**: Com as configurações avançadas predefinidas
5. **Claude inicia**: Com modo permissivo + modelo Opus + continuação

## Persistência

- **Novos terminais**: Automaticamente têm acesso (via ~/.zshrc)
- **Após reinicialização**: Continua funcionando (configurações persistem)
- **Múltiplos usuários**: Específico para seu usuário (em ~/.zshrc pessoal)

## Verificação

Para confirmar que está global:
```bash
# Ver aliases
alias | grep claude-ultra

# Ver PATH
echo $PATH | grep .claude

# Testar de qualquer lugar
cd /tmp && claude-ultra-c --help
```

## Vantagens desta Abordagem

✅ **Sem sudo**: Não precisa permissões de administrador
✅ **Portátil**: Fácil de backup (tudo em ~/.claude)
✅ **Personalizável**: Pode editar scripts sem afetar sistema
✅ **Isolado**: Não interfere com comandos do sistema
✅ **Versionável**: Pode adicionar ao git se quiser