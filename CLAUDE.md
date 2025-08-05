### Visão Geral do Sistema de Envio de Emails

Baseado na documentação fornecida ("contexto emails.docx"), elaborei uma engenharia de contexto para um sistema de envio de emails utilizando a API do SendGrid. Essa engenharia envolve a análise e estruturação do contexto descrito na documentação, identificando componentes chave, fluxos de dados, integrações e requisitos funcionais. O foco principal é no envio de emails (direto e em massa), integrando com SendGrid para o disparo, enquanto Supabase é usado para autenticação, armazenamento de dados (como contatos, templates e campanhas) e gerenciamento de sessões.

O sistema é projetado como uma aplicação full-stack:
- **Integrações Principais**:
  - SendGrid: Para envio de emails simples e campanhas em massa.
  - Supabase: Para auth, banco de dados (tabelas como contatos, templates, campanhas) e queries.
- **Princípios de Design**:
  - Modularidade: Cada funcionalidade (ex.: envio direto, gerenciamento de templates) é isolada.
  - Segurança: Autenticação obrigatória via Supabase; validações client-side e server-side.
  - Escalabilidade: Uso de segmentos para envios em massa; logs para debugging.

A seguir, detalho a estrutura do sistema, fluxos, componentes e exemplos de implementação.

### Componentes do Sistema

Usando a documentação como base, mapeei os títulos e funcionalidades para componentes lógicos:

1. **Autenticação de Usuário** (Base: Supabase Auth)
   - Responsável por signup, login e gerenciamento de sessões.
   - Integração: Todas as rotas de API requerem token de autenticação para envios de email.

2. **Gerenciamento de Contatos e Segmentos**
   - Armazenamento em Supabase (tabelas: contatos, segmentos).
   - Funcionalidades: Adicionar/editar/deletar contatos; criar segmentos (ex.: por tags ou filtros como "clientes ativos").

3. **Gerenciamento de Templates e Variáveis Personalizadas**
   - Templates HTML armazenados em Supabase.
   - Variáveis: Para personalização (ex.: {{nome}}, {{empresa}}).
   - Funcionalidades: Criar/editar/deletar templates; reset de variáveis.

4. **Gerenciamento de Campanhas**
   - Criação e agendamento de campanhas (armazenadas em Supabase).
   - Integração com SendGrid para envio em massa.

5. **Envio de Emails** (Foco Principal: SendGrid API)
   - **Envio Direto**: Emails simples para um ou poucos destinatários.
   - **Envio em Massa**: Campanhas personalizadas para segmentos.
   - Configurações: Remetente padrão, assunto, assinatura (editáveis via dashboard).

6. **Dashboard e Estatísticas**
   - Visualização de métricas (ex.: taxa de abertura, cliques) via SendGrid webhooks ou queries.
   - Charts: Usar bibliotecas como Chart.js no frontend.

7. **Outros Suportes**
   - Health Check: Endpoint /health para verificar API.
   - Notificações: Toasts para sucesso/erro.
   - Validações: Client-side (ex.: email válido) e server-side (ex.: limites de envio).
   - Logs: Detalhados para requests/erros.

### Fluxo de Funcionamento

#### Fluxo Geral de Envio de Emails
1. **Autenticação**: Usuário loga via Supabase; sessão é gerenciada.
2. **Preparação**:
   - Seleciona template e aplica variáveis personalizadas.
   - Escolhe contatos/segmentos do Supabase.
   - Configura remetente/assunto (de configurações padrão ou custom).
3. **Envio**:
   - Backend chama SendGrid API.
   - Para envios em massa: Usa batches ou personalizations do SendGrid.
4. **Pós-Envio**:
   - Atualiza estatísticas no dashboard.
   - Registra logs e notifica usuário via toast.
5. **Erro Handling**: Captura erros (ex.: API key inválida) e exibe feedback.

#### Fluxo Específico: Envio Direto
- Entrada: Email destinatário, assunto, corpo (HTML ou texto).
- Chamada SendGrid: Usa endpoint `/mail/send` com payload simples.

#### Fluxo Específico: Envio em Massa (Campanhas)
- Entrada: Segmento de contatos, template, agendamento (opcional).
- Chamada SendGrid: Usa Marketing Campaigns API para envios segmentados e personalizados.
- Agendamento: Usa cron jobs no backend ou SendGrid Scheduling.

### Integração com SendGrid API

SendGrid é o core para envios. Requisitos:
- **API Key**: Armazenada como env var no backend (nunca exposta). Defina no arquivo `.env` ou ambiente de deploy como `SENDGRID_API_KEY`.
- **Endpoints Principais**:
  - `/mail/send`: Para envios diretos e personalizados.
  - Marketing API: Para campanhas em massa, templates e contatos (mas usaremos Supabase para storage, sincronizando apenas para envio).
- **Personalizações**: Suporte a dynamic templates do SendGrid para variáveis.
- **Webhooks**: Para rastrear eventos (entregue, aberto, clicado) e atualizar dashboard.

Exemplo de Configuração:
- Instale SDK: `npm install @sendgrid/mail` (Node.js) ou `pip install sendgrid` (Python).
- Limites: Respeitar quotas do SendGrid (ex.: 100 emails/dia no plano free).

### Implementação Exemplo (Código)

A seguir, exemplos de código backend (Node.js com Express e Supabase SDK). Assuma que Supabase e SendGrid estão configurados.

#### Configuração Inicial
```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

const app = express();
app.use(express.json());

// Carrega variáveis de ambiente (use dotenv se necessário)
require('dotenv').config();

// Configura SendGrid com a chave de env
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Verificação inicial da chave (opcional, para debugging)
sgMail.send({ to: 'test@example.com', from: 'test@example.com', subject: 'Test', text: 'Test' })
  .then(() => console.log('SendGrid API key válida'))
  .catch(err => console.error('Erro na chave SendGrid:', err.message));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware de Autenticação
async function authMiddleware(req, res, next) {
  const { authorization } = req.headers;
  const { data: { user }, error } = await supabase.auth.getUser(authorization.split(' ')[1]);
  if (error) return res.status(401).json({ error: 'Não autorizado' });
  req.user = user;
  next();
}
```

#### Endpoint: Envio Direto de Email
```javascript
app.post('/api/email/send', authMiddleware, async (req, res) => {
  const { to, subject, html } = req.body;
  
  // Validação
  if (!to || !subject || !html) return res.status(400).json({ error: 'Parâmetros inválidos' });

  try {
    const msg = {
      to,
      from: 'seu@email.com', // De configurações
      subject,
      html,
    };
    await sgMail.send(msg);
    // Log no Supabase
    await supabase.from('logs').insert({ user_id: req.user.id, action: 'envio_direto', status: 'sucesso' });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    await supabase.from('logs').insert({ user_id: req.user.id, action: 'envio_direto', status: 'erro', details: error.message });
    res.status(500).json({ error: 'Falha no envio' });
  }
});
```

#### Endpoint: Envio de Campanha em Massa
```javascript
app.post('/api/campaign/send', authMiddleware, async (req, res) => {
  const { campaign_id } = req.body;
  
  // Busca campanha e segmentos no Supabase
  const { data: campaign, error } = await supabase.from('campanhas').select('*').eq('id', campaign_id).single();
  if (error || !campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  
  const { data: contacts } = await supabase.from('contatos').select('email, nome').in('segmento_id', campaign.segmentos);

  try {
    const personalizations = contacts.map(contact => ({
      to: [{ email: contact.email }],
      substitutions: { '{{nome}}': contact.nome }, // Variáveis personalizadas
    }));

    const msg = {
      personalizations,
      from: campaign.remetente,
      subject: campaign.assunto,
      html: campaign.template_html.replace(/{{nome}}/g, 'substituição'), // Aplicar vars
    };
    await sgMail.send(msg);
    // Atualiza stats
    await supabase.from('campanhas').update({ status: 'enviada' }).eq('id', campaign_id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha na campanha' });
  }
});
```

#### Integração com Supabase para Templates
```javascript
app.get('/api/templates', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('templates').select('*').eq('user_id', req.user.id);
  if (error) return res.status(500).json({ error });
  res.json(data);
});
```