# 🚀 Como Executar o Sistema de Emails

## 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter:
- **Node.js** versão 14 ou superior instalado
- **npm** ou **yarn** como gerenciador de pacotes
- Conta no **Supabase** (já configurada)
- Conta no **SendGrid** (já configurada)

## 🔧 1. Configuração Inicial

### Verificar as Credenciais
As credenciais já estão configuradas no arquivo `.env`:
- ✅ SendGrid API Key configurada
- ✅ Supabase URL e chaves configuradas
- ✅ Banco de dados Supabase já criado com tabelas

### Instalar Dependências (se necessário)
```bash
# Na pasta raiz do projeto
npm install

# Na pasta do frontend
cd frontend
npm install
cd ..
```

## 🖥️ 2. Executar o Backend (Servidor Node.js)

```bash
# Na pasta raiz do projeto
npm start
```

**O backend estará rodando em:** `http://localhost:3000`

### Verificar se o Backend está funcionando:
```bash
# Testar health check
curl http://localhost:3000/health

# Deve retornar: {"status":"OK","timestamp":"..."}
```

## 🌐 3. Executar o Frontend (React)

**Em um novo terminal:**

```bash
# Entrar na pasta do frontend
cd frontend

# Iniciar o servidor de desenvolvimento
npm start
```

**O frontend estará rodando em:** `http://localhost:3001`

## 📱 4. Acessar o Sistema

1. **Abra seu navegador** em: `http://localhost:3001`

2. **Cadastre-se** ou **faça login**:
   - Crie uma nova conta com seu email
   - Confirme o email (se necessário)
   - Faça login no sistema

3. **Use as funcionalidades**:
   - 📧 **Enviar Email**: Envio individual direto
   - 📢 **Campanhas**: Criar e enviar campanhas em massa
   - 📝 **Templates**: Gerenciar templates HTML
   - 👥 **Contatos**: Adicionar e gerenciar contatos
   - 🚫 **Supressões**: Ver emails bloqueados
   - 📅 **Agendamentos**: Agendar envios
   - 📊 **Dashboard**: Ver estatísticas e métricas

## 🧪 5. Executar Testes (Opcional)

```bash
# Executar todos os testes
npm test

# Executar testes with coverage
npm run test:coverage

# Ver relatório de testes (já gerado)
open test-report.html
```

## 🔍 6. Verificar Logs

### Logs do Backend:
- O servidor mostra logs detalhados no terminal
- Logs de segurança aparecem com prefixos `[AUTH]`, `[SECURITY]`, etc.

### Logs do Frontend:
- Abra o DevTools do navegador (F12)
- Vá na aba **Console** para ver logs do React

## 📊 7. Monitoramento

### Endpoints de Monitoramento:
- **Health Check**: `GET http://localhost:3000/health`
- **Relatório de Segurança**: `GET http://localhost:3000/api/security/report`
- **Status do Sistema**: `GET http://localhost:3000/api/security/health`

## 🛠️ 8. Solução de Problemas

### Problema: "Port 3000 already in use"
```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9

# Ou usar porta diferente
PORT=3001 npm start
```

### Problema: "Port 3001 already in use" (Frontend)
```bash
# Matar processo na porta 3001
lsof -ti:3001 | xargs kill -9

# Ou usar porta diferente
PORT=3002 npm start
```

### Problema: Erro de Supabase Connection
- Verificar se as credenciais estão corretas no `.env`
- Verificar se o projeto Supabase está ativo
- Verificar conectividade com internet

### Problema: Erro do SendGrid
- Verificar se a API key está válida
- Verificar se o domínio está verificado no SendGrid
- Verificar limits de envio da conta

## 🎯 9. Funcionalidades Disponíveis

### ✅ **Funcionalidades Implementadas:**
- ✅ Sistema completo de autenticação
- ✅ Envio de emails individuais
- ✅ Campanhas em massa com personalização
- ✅ Gerenciamento de templates HTML
- ✅ Gerenciamento de contatos e tags
- ✅ Sistema de supressões automático
- ✅ Agendamento de campanhas
- ✅ Dashboard com estatísticas em tempo real
- ✅ Validações robustas client/server-side
- ✅ Segurança com rate limiting e proteções
- ✅ Monitoramento e logs de segurança
- ✅ Integração completa SendGrid + Supabase

### 🔒 **Recursos de Segurança:**
- ✅ Autenticação JWT obrigatória
- ✅ Rate limiting (10 emails/min, 5 campanhas/5min)
- ✅ Proteção XSS e SQL Injection
- ✅ Validação rigorosa de emails
- ✅ Bloqueio de domínios suspeitos
- ✅ Logs de segurança detalhados
- ✅ Limites diários por usuário (100 emails/dia)
- ✅ Monitoramento de atividade suspeita

## 🚀 10. Primeiro Uso

1. **Acesse** `http://localhost:3001`
2. **Registre-se** com seu email
3. **Confirme** o email se solicitado
4. **Faça login**
5. **Crie um template** na seção Templates
6. **Adicione contatos** na seção Contatos
7. **Envie seu primeiro email** na seção "Enviar Email"
8. **Veja as estatísticas** no Dashboard

## 📞 Suporte

Se encontrar problemas:
1. Verificar os logs no terminal do backend
2. Verificar o console do navegador
3. Verificar se todos os serviços estão rodando
4. Verificar conectividade de rede
5. Verificar credenciais das APIs

---

## ⚡ Comandos Rápidos

```bash
# Iniciar tudo de uma vez (em terminais separados):

# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend  
cd frontend && npm start

# Terminal 3 - Testes (opcional)
npm test
```

**URLs do Sistema:**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Relatório de Testes**: Abrir arquivo `test-report.html`

---

**🎉 Sistema pronto para uso! Boa sorte com seus envios de email! 📧**