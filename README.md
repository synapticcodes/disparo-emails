# Sistema de Envio de Emails

Sistema completo para envio de emails diretos e campanhas em massa usando SendGrid e Supabase.

## 🚀 Como usar

### 1. Instalar dependências
```bash
npm install
```

### 2. Iniciar servidor
```bash
npm start
# ou
node server.js
```

O servidor rodará em `http://localhost:3000`

## 📋 Endpoints disponíveis

### Públicos (sem autenticação)
- `GET /health` - Health check do servidor
- `GET /api/test-data` - Informações sobre as tabelas
- `POST /webhook/sendgrid` - Webhook para eventos do SendGrid

### Protegidos (requerem autenticação)

#### Envio de Emails
- `POST /api/email/send` - Envio direto de email
- `POST /api/campaign/send` - Envio de campanha em massa

#### Gerenciamento de Templates
- `GET /api/templates` - Listar templates
- `POST /api/templates` - Criar template
- `PUT /api/templates/:id` - Atualizar template
- `DELETE /api/templates/:id` - Deletar template
- `POST /api/templates/:id/clone` - Clonar template
- `POST /api/template/preview` - Preview de template

#### Gerenciamento de Dados
- `GET /api/contatos` - Listar contatos
- `GET /api/campanhas` - Listar campanhas
- `GET /api/segmentos` - Listar segmentos

#### Supressões
- `GET /api/suppressions` - Listar supressões
- `POST /api/suppressions` - Adicionar supressão
- `DELETE /api/suppressions/:email/:type` - Remover supressão
- `POST /api/suppressions/sync` - Sincronizar com SendGrid

#### Agendamento
- `POST /api/campaigns/:id/schedule` - Agendar campanha
- `DELETE /api/campaigns/:id/schedule` - Cancelar agendamento
- `GET /api/schedules` - Listar agendamentos
- `POST /api/cron/process-scheduled` - Processar agendados (cron)

#### Estatísticas Avançadas
- `GET /api/stats/overview` - Estatísticas gerais
- `GET /api/stats/dashboard` - Dashboard completo
- `GET /api/stats/campaigns/:id` - Estatísticas de campanha
- `GET /api/stats/performance` - Relatório de performance

## 🔐 Autenticação

Todos os endpoints protegidos requerem um token Bearer no header:
```
Authorization: Bearer SEU_TOKEN_AQUI
```

Para obter um token, use o Supabase Auth:
```javascript
const { data } = await supabase.auth.signInWithPassword({
  email: 'seu@email.com',
  password: 'suasenha'
});
const token = data.session.access_token;
```

## 📧 Exemplos de uso

### Envio direto
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "to": "destinatario@exemplo.com",
    "subject": "Assunto do email",
    "html": "<h1>Olá, {{nome}}!</h1><p>Mensagem personalizada.</p>",
    "template_vars": {
      "nome": "João"
    }
  }'
```

### Envio de campanha
```bash
curl -X POST http://localhost:3000/api/campaign/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "campaign_id": "uuid-da-campanha",
    "test_mode": true
  }'
```

### Preview de template
```bash
curl -X POST http://localhost:3000/api/template/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "template_id": "uuid-do-template",
    "sample_data": {
      "nome": "Maria",
      "empresa": "Empresa XYZ"
    }
  }'
```

## 🏗️ Estrutura do banco

### Tabelas principais:
- **contatos** - Lista de contatos para envio
- **templates** - Templates de email com variáveis
- **campanhas** - Campanhas de email configuradas
- **segmentos** - Segmentação de contatos
- **logs** - Histórico de ações e envios

## ⚙️ Configurações

### Variáveis de ambiente (.env):
```
SENDGRID_API_KEY=SG.xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=xxxxx
SUPABASE_PROJECT_REF=xxxxx
```

## 🛡️ Segurança

- Row Level Security (RLS) ativado em todas as tabelas
- Autenticação obrigatória via Supabase
- Logs detalhados de todas as operações
- Validação de emails e parâmetros

## 📊 Recursos implementados

### Core Features
✅ Envio direto de emails  
✅ Campanhas em massa com personalização  
✅ Sistema de templates com variáveis  
✅ Segmentação de contatos  
✅ Logs detalhados de envios  
✅ Controle de limites (1000 recipients/batch)  
✅ Error handling robusto  

### Templates Avançados
✅ CRUD completo de templates  
✅ Preview de templates com dados de amostra  
✅ Clonagem de templates  
✅ Categorização de templates  
✅ Variáveis personalizadas  

### Webhooks e Estatísticas
✅ Webhook do SendGrid para eventos em tempo real  
✅ Rastreamento de aberturas, cliques, bounces  
✅ Dashboard de estatísticas avançado  
✅ Relatórios de performance por período  
✅ Timeline de eventos por campanha  
✅ Métricas de entrega, abertura e cliques  

### Gerenciamento de Supressões
✅ Lista de supressões automática  
✅ Sincronização com bounces/spam do SendGrid  
✅ Adição/remoção manual de supressões  
✅ Proteção automática contra emails inválidos  

### Sistema de Agendamento
✅ Agendamento de campanhas  
✅ Processamento automático via cron  
✅ Cancelamento de agendamentos  
✅ Histórico de execuções  

## 🕐 Configuração do Cron

### Automatizar campanhas agendadas
```bash
# Adicionar ao crontab (executa a cada 5 minutos)
crontab -e

# Adicionar linha:
*/5 * * * * /usr/bin/node /caminho/para/projeto/cron-scheduler.js

# Ou usar PM2:
pm2 start cron-scheduler.js --cron "*/5 * * * *"
```

## 🔗 Webhooks

Configure webhooks no SendGrid Dashboard:
- URL: `https://seu-dominio.com/webhook/sendgrid`
- Eventos: delivered, open, click, bounce, spam, unsubscribe
- Veja `WEBHOOK_SETUP.md` para instruções detalhadas

## 🔄 Sender Identity

O sistema usa o sender verificado: `avisos@lembretescredilly.com`

Para usar outro sender, configure no SendGrid Dashboard e atualize o código.