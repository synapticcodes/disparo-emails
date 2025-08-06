const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const client = require('@sendgrid/client');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();

// Configurar CORS para permitir requisições do frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Configurar multer para upload de arquivos CSV
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Criar diretório uploads se não existir
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Middleware para permitir CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Log todas as requisições
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.path.includes('campaign')) {
    console.log('🎯 REQUISIÇÃO DE CAMPANHA DETECTADA!', req.body);
  }
  next();
});

// Carrega variáveis de ambiente
require('dotenv').config();

// Configura SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
client.setApiKey(process.env.SENDGRID_API_KEY);

// Configura Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Função para criar cliente Supabase autenticado
function getAuthenticatedSupabase(accessToken) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

// Função auxiliar para logs
async function logAction(userId, action, status, details = {}, req = null) {
  try {
    const logData = {
      user_id: userId,
      action,
      status,
      details: typeof details === 'object' ? details : { message: details },
      ip_address: req?.ip || req?.connection?.remoteAddress || null,
      user_agent: req?.get('User-Agent') || null
    };
    
    await supabase.from('logs').insert(logData);
  } catch (error) {
    console.error('Erro ao registrar log:', error.message);
  }
}

// Função para formatar valor de moeda
function formatarMoeda(valor) {
  if (!valor && valor !== 0) return '';
  
  // Converter para número se for string
  const numero = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;
  
  // Verificar se é um número válido
  if (isNaN(numero)) return valor;
  
  // Formatar como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numero);
}

// Função para substituir variáveis no template
function substituirVariaveis(template, variaveis, variaveisInfo = {}) {
  let resultado = template;
  Object.keys(variaveis).forEach(chave => {
    const regex = new RegExp(`{{${chave}}}`, 'g');
    let valorFormatado = variaveis[chave] || '';
    
    // Aplicar formatação baseada no tipo da variável
    if (variaveisInfo[chave] && variaveisInfo[chave].data_type === 'currency') {
      valorFormatado = formatarMoeda(valorFormatado);
    }
    
    resultado = resultado.replace(regex, valorFormatado);
  });
  return resultado;
}

// Função para dividir array em chunks para batching
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ========== SISTEMA DE VARIÁVEIS UNIVERSAIS ==========

// Função para extrair primeiro nome de um nome completo
function extrairPrimeiroNome(nomeCompleto) {
  if (!nomeCompleto || typeof nomeCompleto !== 'string') return '';
  return nomeCompleto.trim().split(' ')[0];
}

// Função para processar variáveis universais baseadas em contatos
async function processarVariaveisUniversais(template, userId, contactId = null) {
  try {
    let resultado = template;

    // Se não há um contato específico, retornar template sem alterações nas universais
    if (!contactId) {
      // Substituir por placeholders para preview
      resultado = resultado.replace(/\{\{nome\}\}/g, '[Nome]');
      resultado = resultado.replace(/\{\{nome_completo\}\}/g, '[Nome Completo]');
      return resultado;
    }

    // Buscar dados do contato específico
    const { data: contato, error } = await supabase
      .from('contatos')
      .select('nome, email')
      .eq('id', contactId)
      .eq('user_id', userId)
      .single();

    if (error || !contato) {
      console.error('Erro ao buscar contato para variáveis universais:', error);
      // Manter placeholders se não encontrar o contato
      resultado = resultado.replace(/\{\{nome\}\}/g, '[Nome]');
      resultado = resultado.replace(/\{\{nome_completo\}\}/g, '[Nome Completo]');
      return resultado;
    }

    // Processar {{nome}} - primeiro nome
    const primeiroNome = extrairPrimeiroNome(contato.nome);
    resultado = resultado.replace(/\{\{nome\}\}/g, primeiroNome || '[Nome]');

    // Processar {{nome_completo}} - nome completo
    resultado = resultado.replace(/\{\{nome_completo\}\}/g, contato.nome || '[Nome Completo]');

    return resultado;

  } catch (error) {
    console.error('Erro ao processar variáveis universais:', error);
    return template; // Retornar template original em caso de erro
  }
}

// Função para processar todas as variáveis (universais + customizadas)
async function processarTodasVariaveis(template, userId, contactId = null, customVariables = {}) {
  try {
    let resultado = template;

    // 1. Primeiro processar variáveis universais
    resultado = await processarVariaveisUniversais(resultado, userId, contactId);

    // 2. Depois processar variáveis customizadas
    Object.keys(customVariables).forEach(variableName => {
      const value = customVariables[variableName] || '';
      const regex = new RegExp(variableName.replace(/[{}]/g, '\\$&'), 'g');
      resultado = resultado.replace(regex, value);
    });

    return resultado;

  } catch (error) {
    console.error('Erro ao processar todas as variáveis:', error);
    return template;
  }
}

// Middleware de Autenticação
async function authMiddleware(req, res, next) {
  try {
    const { authorization } = req.headers;
    
    if (!authorization) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    req.user = user;
    req.accessToken = token; // Armazenar o token para uso posterior
    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(401).json({ error: 'Erro de autenticação' });
  }
}

// Rota de teste para verificar se o servidor está funcionando
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de teste para verificar logs
app.post('/api/test-logs', (req, res) => {
  console.log('🧪 ENDPOINT DE TESTE CHAMADO!');
  console.log('Dados recebidos:', req.body);
  res.json({ message: 'Logs funcionando!', timestamp: new Date().toISOString() });
});

// Rota de teste protegida
app.get('/api/protected', authMiddleware, (req, res) => {
  res.json({ 
    message: 'Acesso autorizado!', 
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// ========== ENDPOINTS DE ENVIO DE EMAIL ==========

// Endpoint: Envio Direto de Email
app.post('/api/email/send', authMiddleware, async (req, res) => {
  const { to, subject, html, text, cc, bcc, attachments, template_vars } = req.body;
  
  try {
    // Validação
    if (!to || !subject || (!html && !text)) {
      await logAction(req.user.id, 'envio_direto', 'erro', 'Parâmetros inválidos', req);
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios: to, subject e (html ou text)' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(to) ? to : [to];
    
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        await logAction(req.user.id, 'envio_direto', 'erro', `Email inválido: ${email}`, req);
        return res.status(400).json({ error: `Email inválido: ${email}` });
      }
    }

    // Preparar conteúdo do email
    let finalHtml = html;
    let finalText = text;
    
    // Aplicar variáveis se fornecidas
    if (template_vars && typeof template_vars === 'object') {
      // Buscar informações sobre os tipos das variáveis
      const variableNames = Object.keys(template_vars);
      let variableInfo = {};
      
      if (variableNames.length > 0) {
        try {
          const { data: variables } = await supabase
            .from('custom_variables')
            .select('name, data_type')
            .eq('user_id', req.user.id)
            .in('name', variableNames.map(name => name.replace('{{', '').replace('}}', '')));
          
          if (variables) {
            variables.forEach(variable => {
              variableInfo[variable.name] = variable;
            });
          }
        } catch (error) {
          console.error('Erro ao buscar info das variáveis:', error);
        }
      }
      
      if (html) finalHtml = substituirVariaveis(html, template_vars, variableInfo);
      if (text) finalText = substituirVariaveis(text, template_vars, variableInfo);
    }

    // Configurar mensagem
    const msg = {
      to: recipients,
      from: 'avisos@lembretescredilly.com', // Sender verificado
      subject,
      html: finalHtml,
      text: finalText
    };

    // Adicionar campos opcionais
    if (cc) msg.cc = cc;
    if (bcc) msg.bcc = bcc;
    if (attachments) msg.attachments = attachments;

    // Enviar email
    await sgMail.send(msg);
    
    // Log de sucesso com detalhes completos
    await logAction(req.user.id, 'envio_direto', 'sucesso', {
      recipients_count: recipients.length,
      recipients_list: recipients.join(', '),
      subject,
      has_html: !!html,
      has_text: !!text,
      has_attachments: !!attachments,
      template_vars_used: !!template_vars,
      sent_at: new Date().toISOString()
    }, req);

    res.json({ 
      success: true, 
      message: 'Email enviado com sucesso',
      recipients: recipients.length,
      subject
    });

  } catch (error) {
    console.error('Erro no envio direto:', error);
    
    // Log de erro com detalhes completos
    await logAction(req.user.id, 'envio_direto', 'erro', {
      error_message: error.message,
      error_code: error.code || 'UNKNOWN',
      recipients_count: Array.isArray(to) ? to.length : 1,
      recipients_list: Array.isArray(to) ? to.join(', ') : to,
      subject: subject || 'N/A',
      attempted_at: new Date().toISOString()
    }, req);

    res.status(500).json({ 
      error: 'Falha no envio do email',
      details: error.message,
      code: error.code
    });
  }
});

// Endpoint: Envio de Campanha em Massa
app.post('/api/campaign/send', authMiddleware, async (req, res) => {
  console.log('🚀 ENDPOINT /api/campaign/send chamado - VERSÃO ATUALIZADA');
  console.log('📋 Dados recebidos:', req.body);
  console.log('👤 Usuário:', req.user?.id);
  const { campaign_id, test_mode = false } = req.body;
  
  try {
    // Validação
    if (!campaign_id) {
      await logAction(req.user.id, 'envio_campanha', 'erro', 'ID da campanha é obrigatório', req);
      return res.status(400).json({ error: 'ID da campanha é obrigatório' });
    }

    // Buscar campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', req.user.id)
      .single();
    
    if (campaignError || !campaign) {
      console.error('❌ Erro ao buscar campanha:', campaignError);
      await logAction(req.user.id, 'envio_campanha', 'erro', 'Campanha não encontrada', req);
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    
    console.log('📊 Campanha encontrada:', { 
      nome: campaign.nome, 
      status: campaign.status, 
      tag_filter: campaign.tag_filter,
      segmentos: campaign.segmentos 
    });

    // Verificar status da campanha
    if (campaign.status === 'enviada') {
      return res.status(400).json({ error: 'Campanha já foi enviada' });
    }

    // Buscar contatos baseado no filtro de tags ou segmentos
    let contacts = [];
    
    if (campaign.tag_filter) {
      // Novo sistema de tags
      console.log('Buscando contatos com tag:', campaign.tag_filter);
      const { data: taggedContacts, error: contactsError } = await supabase
        .from('contatos')
        .select('email, nome, id, tags')
        .eq('user_id', req.user.id);
      
      if (contactsError) {
        console.error('Erro ao buscar contatos:', contactsError);
        await logAction(req.user.id, 'envio_campanha', 'erro', 'Erro ao buscar contatos', req);
        return res.status(500).json({ error: 'Erro ao buscar contatos' });
      }
      
      // Filtrar contatos que possuem a tag especificada
      contacts = (taggedContacts || []).filter(contact => {
        if (!contact.tags) {
          console.log(`❌ Contato ${contact.email} não tem tags`);
          return false;
        }
        
        let contactTags = contact.tags;
        if (!Array.isArray(contactTags)) {
          // Se tags não for array, tentar converter
          if (typeof contactTags === 'string') {
            contactTags = contactTags.split(',').map(t => t.trim());
          } else {
            console.log(`❌ Contato ${contact.email} tem tags em formato inválido:`, typeof contactTags);
            return false;
          }
        }
        
        const hasTag = contactTags.includes(campaign.tag_filter);
        console.log(`🏷️ Contato ${contact.email} tags:`, contactTags, `- Tem tag "${campaign.tag_filter}":`, hasTag);
        return hasTag;
      });
      
      console.log(`Encontrados ${contacts.length} contatos com tag "${campaign.tag_filter}"`);
      
    } else if (campaign.segmentos && campaign.segmentos.length > 0) {
      // Sistema antigo de segmentos (compatibilidade)
      console.log('Buscando contatos por segmentos:', campaign.segmentos);
      const { data: segmentContacts, error: contactsError } = await supabase
        .from('contatos')
        .select('email, nome, id')
        .in('segmento_id', campaign.segmentos)
        .eq('user_id', req.user.id);
      
      if (contactsError) {
        console.error('Erro ao buscar contatos por segmento:', contactsError);
        await logAction(req.user.id, 'envio_campanha', 'erro', 'Erro ao buscar contatos', req);
        return res.status(500).json({ error: 'Erro ao buscar contatos' });
      }
      
      contacts = segmentContacts || [];
      console.log(`Encontrados ${contacts.length} contatos por segmentos`);
      
    } else {
      // Se não há filtro específico, buscar todos os contatos do usuário
      console.log('Nenhum filtro especificado, buscando todos os contatos');
      const { data: allContacts, error: contactsError } = await supabase
        .from('contatos')
        .select('email, nome, id')
        .eq('user_id', req.user.id);
      
      if (contactsError) {
        console.error('Erro ao buscar todos os contatos:', contactsError);
        await logAction(req.user.id, 'envio_campanha', 'erro', 'Erro ao buscar contatos', req);
        return res.status(500).json({ error: 'Erro ao buscar contatos' });
      }
      
      contacts = allContacts || [];
      console.log(`Encontrados ${contacts.length} contatos (todos)`);
    }

    if (contacts.length === 0) {
      console.log('❌ Nenhum contato encontrado para a campanha');
      await logAction(req.user.id, 'envio_campanha', 'erro', 'Nenhum contato encontrado', req);
      return res.status(400).json({ error: 'Nenhum contato encontrado nos segmentos da campanha' });
    }
    
    console.log(`✅ Iniciando envio para ${contacts.length} contatos`);
    console.log('Contatos encontrados:', contacts.map(c => `${c.nome} <${c.email}>`));

    // Verificar limites do SendGrid (1000 recipients máximo)
    const maxRecipientsPerBatch = 1000;
    const totalContacts = contacts.length;
    
    if (test_mode) {
      // Em modo de teste, enviar apenas para os primeiros 3 contatos
      contacts = contacts.slice(0, 3);
    }

    // Atualizar status da campanha
    await supabase
      .from('campanhas')
      .update({ 
        status: test_mode ? 'teste_enviado' : 'enviando',
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Dividir contatos em batches se necessário
    const contactBatches = chunkArray(contacts, maxRecipientsPerBatch);
    
    for (let batchIndex = 0; batchIndex < contactBatches.length; batchIndex++) {
      const batch = contactBatches[batchIndex];
      
      try {
        // Preparar personalizations para o batch
        const personalizations = batch.map(contact => ({
          to: [{ email: contact.email, name: contact.nome }],
          substitutions: {
            '{{nome}}': contact.nome || contact.email.split('@')[0],
            '{{email}}': contact.email
          }
        }));

        // Aplicar substituições no template
        let finalHtml = campaign.template_html;
        
        // Para cada contato, criar uma mensagem personalizada
        const messages = batch.map(contact => {
          const personalizedHtml = substituirVariaveis(campaign.template_html, {
            nome: contact.nome || contact.email.split('@')[0],
            email: contact.email
          });

          return {
            to: contact.email,
            from: campaign.remetente,
            subject: campaign.assunto,
            html: personalizedHtml,
            // Adicionar headers de rastreamento opcionais
            custom_args: {
              campaign_id: campaign_id,
              contact_id: contact.id,
              batch_index: batchIndex.toString()
            }
          };
        });

        // Enviar batch
        console.log(`📧 Enviando batch ${batchIndex + 1} com ${batch.length} emails...`);
        await sgMail.send(messages);
        successCount += batch.length;
        
        console.log(`✅ Batch ${batchIndex + 1}/${contactBatches.length} enviado com sucesso (${batch.length} emails)`);
        
      } catch (batchError) {
        console.error(`❌ Erro no batch ${batchIndex + 1}:`, batchError.message);
        console.error('📋 Detalhes do erro SendGrid:', JSON.stringify(batchError.response?.body || batchError, null, 2));
        console.error('🔍 Status code:', batchError.code);
        console.error('📧 Dados do batch que falhou:', messages.map(m => ({ to: m.to, from: m.from, subject: m.subject })));
        errorCount += batch.length;
        errors.push({
          batch: batchIndex + 1,
          error: batchError.message,
          contacts: batch.length
        });
      }
    }

    // Atualizar estatísticas da campanha
    const statistics = {
      total_contacts: totalContacts,
      sent_successfully: successCount,
      failed: errorCount,
      sent_at: new Date().toISOString(),
      test_mode,
      batches_sent: contactBatches.length
    };

    const finalStatus = errorCount === 0 ? (test_mode ? 'teste_enviado' : 'enviada') : 'erro_parcial';
    console.log(`🏁 Finalizando campanha - Status: ${finalStatus}, Sucessos: ${successCount}, Erros: ${errorCount}`);
    
    await supabase
      .from('campanhas')
      .update({ 
        status: finalStatus,
        estatisticas: statistics,
        updated_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    // Log da operação
    await logAction(req.user.id, 'envio_campanha', 
      errorCount === 0 ? 'sucesso' : 'erro_parcial', 
      {
        campaign_id,
        campaign_name: campaign.nome,
        ...statistics,
        errors: errors.length > 0 ? errors : undefined
      }, req);

    res.json({
      success: true,
      message: `Campanha ${test_mode ? 'testada' : 'enviada'} com sucesso`,
      campaign: {
        id: campaign_id,
        name: campaign.nome,
        subject: campaign.assunto
      },
      results: {
        total_contacts: totalContacts,
        processed_contacts: contacts.length,
        sent_successfully: successCount,
        failed: errorCount,
        batches: contactBatches.length,
        test_mode
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Erro no envio de campanha:', error);
    
    // Atualizar status da campanha para erro
    if (campaign_id) {
      await supabase
        .from('campanhas')
        .update({ 
          status: 'erro',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign_id);
    }
    
    // Log de erro
    await logAction(req.user.id, 'envio_campanha', 'erro', {
      campaign_id,
      error: error.message,
      code: error.code || 'UNKNOWN'
    }, req);

    res.status(500).json({ 
      error: 'Falha no envio da campanha',
      details: error.message,
      code: error.code
    });
  }
});

// Endpoint para visualizar template com dados de amostra
app.post('/api/template/preview', authMiddleware, async (req, res) => {
  const { template_id, sample_data } = req.body;
  
  try {
    if (!template_id) {
      return res.status(400).json({ error: 'ID do template é obrigatório' });
    }

    // Buscar template
    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', template_id)
      .eq('user_id', req.user.id)
      .single();
    
    if (error || !template) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    // Aplicar dados de amostra ou usar dados padrão
    const defaultData = {
      nome: 'Auto Credilhe',
      email: 'teste@exemplo.com',
      empresa: 'Empresa Exemplo'
    };
    
    const dataToUse = { ...defaultData, ...sample_data };
    const previewHtml = substituirVariaveis(template.html, dataToUse);
    
    res.json({
      success: true,
      template: {
        id: template.id,
        name: template.nome,
        variables: template.variaveis
      },
      preview: {
        html: previewHtml,
        sample_data: dataToUse
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obter estatísticas de envios
app.get('/api/stats/overview', authMiddleware, async (req, res) => {
  try {
    const [
      { data: totalContacts },
      { data: totalTemplates },
      { data: totalCampaigns },
      { data: recentLogs }
    ] = await Promise.all([
      supabase.from('contatos').select('id', { count: 'exact' }).eq('user_id', req.user.id),
      supabase.from('templates').select('id', { count: 'exact' }).eq('user_id', req.user.id),
      supabase.from('campanhas').select('id, status', { count: 'exact' }).eq('user_id', req.user.id),
      supabase.from('logs').select('action, status, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    // Contar campanhas por status
    const campaignStats = {};
    totalCampaigns?.forEach(campaign => {
      campaignStats[campaign.status] = (campaignStats[campaign.status] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        total_contacts: totalContacts?.length || 0,
        total_templates: totalTemplates?.length || 0,
        total_campaigns: totalCampaigns?.length || 0,
        campaign_by_status: campaignStats,
        recent_activity: recentLogs || []
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ENDPOINTS AVANÇADOS DE TEMPLATES ==========

// Criar template
app.post('/api/templates', authMiddleware, async (req, res) => {
  const { nome, html, variaveis = {}, categoria } = req.body;
  
  try {
    if (!nome || !html) {
      return res.status(400).json({ error: 'Nome e HTML são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({
        nome,
        html,
        variaveis,
        categoria,
        user_id: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logAction(req.user.id, 'criar_template', 'sucesso', {
      template_id: data.id,
      nome
    }, req);

    res.json({ success: true, data });
  } catch (error) {
    await logAction(req.user.id, 'criar_template', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar template
app.put('/api/templates/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nome, html, variaveis, categoria } = req.body;
  
  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (nome) updateData.nome = nome;
    if (html) updateData.html = html;
    if (variaveis) updateData.variaveis = variaveis;
    if (categoria !== undefined) updateData.categoria = categoria;

    const { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Template não encontrado' });

    await logAction(req.user.id, 'atualizar_template', 'sucesso', {
      template_id: id,
      nome: data.nome
    }, req);

    res.json({ success: true, data });
  } catch (error) {
    await logAction(req.user.id, 'atualizar_template', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Deletar template
app.delete('/api/templates/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Template não encontrado' });

    await logAction(req.user.id, 'deletar_template', 'sucesso', {
      template_id: id,
      nome: data.nome
    }, req);

    res.json({ success: true, message: 'Template deletado com sucesso' });
  } catch (error) {
    await logAction(req.user.id, 'deletar_template', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Clonar template
app.post('/api/templates/:id/clone', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;
  
  try {
    // Buscar template original
    const { data: original, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!original) return res.status(404).json({ error: 'Template não encontrado' });

    // Criar cópia
    const { data: cloned, error: cloneError } = await supabase
      .from('templates')
      .insert({
        nome: nome || `${original.nome} (Cópia)`,
        html: original.html,
        variaveis: original.variaveis,
        categoria: original.categoria,
        user_id: req.user.id
      })
      .select()
      .single();

    if (cloneError) throw cloneError;

    await logAction(req.user.id, 'clonar_template', 'sucesso', {
      original_id: id,
      cloned_id: cloned.id,
      nome: cloned.nome
    }, req);

    res.json({ success: true, data: cloned });
  } catch (error) {
    await logAction(req.user.id, 'clonar_template', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// ========== WEBHOOKS E ESTATÍSTICAS ==========

// Webhook para receber eventos do SendGrid
app.post('/webhook/sendgrid', async (req, res) => {
  try {
    const events = req.body;
    
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Formato inválido' });
    }

    for (const event of events) {
      try {
        // Extrair informações do evento
        const {
          sg_message_id,
          email,
          timestamp,
          event: eventType,
          campaign_id,
          contact_id,
          url,
          reason,
          ...eventData
        } = event;

        // Determinar user_id (pode vir dos custom_args)
        let userId = event.custom_args?.user_id;
        
        // Se não tiver user_id, tentar buscar pela campanha
        if (!userId && campaign_id) {
          const { data: campaign } = await supabase
            .from('campanhas')
            .select('user_id')
            .eq('id', campaign_id)
            .single();
          
          if (campaign) userId = campaign.user_id;
        }

        // Se ainda não tiver user_id, pular este evento
        if (!userId) {
          console.log('Evento ignorado - sem user_id:', eventType, email);
          continue;
        }

        // Inserir estatística
        await supabase.from('email_statistics').insert({
          message_id: sg_message_id,
          campaign_id: campaign_id || null,
          contact_id: contact_id || null,
          email,
          event_type: eventType,
          event_data: {
            url: url || null,
            reason: reason || null,
            ...eventData
          },
          timestamp: new Date(timestamp * 1000).toISOString(),
          user_id: userId
        });

        // Processar supressões automáticas
        if (['bounce', 'spam', 'unsubscribe', 'dropped'].includes(eventType)) {
          await supabase.from('suppressions').upsert({
            email,
            type: eventType === 'dropped' ? 'block' : eventType,
            reason: reason || `Automático via webhook - ${eventType}`,
            user_id: userId
          }, { onConflict: 'email,type' });
        }

        console.log(`Evento processado: ${eventType} para ${email}`);
      } catch (eventError) {
        console.error('Erro ao processar evento:', eventError);
      }
    }

    res.status(200).json({ success: true, processed: events.length });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ========== GERENCIAMENTO DE SUPRESSÕES ==========

// Listar supressões
app.get('/api/suppressions', authMiddleware, async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('suppressions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data, total: data.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adicionar supressão manual
app.post('/api/suppressions', authMiddleware, async (req, res) => {
  const { email, type, reason } = req.body;
  
  try {
    if (!email || !type) {
      return res.status(400).json({ error: 'Email e tipo são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('suppressions')
      .upsert({
        email: email.toLowerCase(),
        type,
        reason: reason || 'Adicionado manualmente',
        user_id: req.user.id
      }, { onConflict: 'email,type' })
      .select()
      .single();

    if (error) throw error;

    await logAction(req.user.id, 'adicionar_supressao', 'sucesso', {
      email,
      type,
      reason
    }, req);

    res.json({ success: true, data });
  } catch (error) {
    await logAction(req.user.id, 'adicionar_supressao', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Remover supressão
app.delete('/api/suppressions/:email/:type', authMiddleware, async (req, res) => {
  const { email, type } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('suppressions')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('type', type)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Supressão não encontrada' });

    await logAction(req.user.id, 'remover_supressao', 'sucesso', {
      email,
      type
    }, req);

    res.json({ success: true, message: 'Supressão removida' });
  } catch (error) {
    await logAction(req.user.id, 'remover_supressao', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Sincronizar supressões do SendGrid
app.post('/api/suppressions/sync', authMiddleware, async (req, res) => {
  try {
    let totalSynced = 0;
    const errors = [];

    // Sincronizar bounces
    try {
      const bounceRequest = {
        url: '/v3/suppression/bounces',
        method: 'GET',
        qs: { limit: 500 }
      };

      const [bounceResponse] = await client.request(bounceRequest);
      if (bounceResponse.body && Array.isArray(bounceResponse.body)) {
        for (const bounce of bounceResponse.body) {
          try {
            await supabase.from('suppressions').upsert({
              email: bounce.email.toLowerCase(),
              type: 'bounce',
              reason: bounce.reason || 'Bounce do SendGrid',
              user_id: req.user.id
            }, { onConflict: 'email,type' });
            totalSynced++;
          } catch (upsertError) {
            console.error('Erro ao inserir bounce:', upsertError);
          }
        }
      }
    } catch (bounceError) {
      errors.push({ type: 'bounces', error: bounceError.message });
    }

    // Sincronizar spam reports
    try {
      const spamRequest = {
        url: '/v3/suppression/spam_reports',
        method: 'GET',
        qs: { limit: 500 }
      };

      const [spamResponse] = await client.request(spamRequest);
      if (spamResponse.body && Array.isArray(spamResponse.body)) {
        for (const spam of spamResponse.body) {
          try {
            await supabase.from('suppressions').upsert({
              email: spam.email.toLowerCase(),
              type: 'spam',
              reason: 'Spam report do SendGrid',
              user_id: req.user.id
            }, { onConflict: 'email,type' });
            totalSynced++;
          } catch (upsertError) {
            console.error('Erro ao inserir spam:', upsertError);
          }
        }
      }
    } catch (spamError) {
      errors.push({ type: 'spam', error: spamError.message });
    }

    // Sincronizar unsubscribes
    try {
      const unsubRequest = {
        url: '/v3/suppression/unsubscribes',
        method: 'GET',
        qs: { limit: 500 }
      };

      const [unsubResponse] = await client.request(unsubRequest);
      if (unsubResponse.body && Array.isArray(unsubResponse.body)) {
        for (const unsub of unsubResponse.body) {
          try {
            await supabase.from('suppressions').upsert({
              email: unsub.email.toLowerCase(),
              type: 'unsubscribe',
              reason: 'Unsubscribe do SendGrid',
              user_id: req.user.id
            }, { onConflict: 'email,type' });
            totalSynced++;
          } catch (upsertError) {
            console.error('Erro ao inserir unsubscribe:', upsertError);
          }
        }
      }
    } catch (unsubError) {
      errors.push({ type: 'unsubscribes', error: unsubError.message });
    }

    await logAction(req.user.id, 'sincronizar_supressoes', 'sucesso', {
      total_synced: totalSynced,
      errors: errors.length
    }, req);

    res.json({
      success: true,
      message: 'Sincronização concluída',
      synced: totalSynced,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await logAction(req.user.id, 'sincronizar_supressoes', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// ========== SISTEMA DE AGENDAMENTO ==========

// Agendar campanha
app.post('/api/campaigns/:id/schedule', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { scheduled_at } = req.body;
  
  try {
    if (!scheduled_at) {
      return res.status(400).json({ error: 'Data de agendamento é obrigatória' });
    }

    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Data deve ser no futuro' });
    }

    // Verificar se a campanha existe
    const { data: campaign, error: campaignError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Criar agendamento
    const { data: schedule, error: scheduleError } = await supabase
      .from('campaign_schedules')
      .insert({
        campaign_id: id,
        scheduled_at: scheduledDate.toISOString(),
        user_id: req.user.id
      })
      .select()
      .single();

    if (scheduleError) throw scheduleError;

    // Atualizar status da campanha
    await supabase
      .from('campanhas')
      .update({ 
        status: 'agendada',
        agendamento: scheduledDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    await logAction(req.user.id, 'agendar_campanha', 'sucesso', {
      campaign_id: id,
      campaign_name: campaign.nome,
      scheduled_at: scheduledDate.toISOString()
    }, req);

    res.json({
      success: true,
      message: 'Campanha agendada com sucesso',
      schedule: {
        id: schedule.id,
        campaign_id: id,
        scheduled_at: scheduledDate.toISOString(),
        status: 'agendado'
      }
    });

  } catch (error) {
    await logAction(req.user.id, 'agendar_campanha', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Cancelar agendamento
app.delete('/api/campaigns/:id/schedule', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Cancelar agendamento
    const { data: schedule, error: scheduleError } = await supabase
      .from('campaign_schedules')
      .update({ status: 'cancelado' })
      .eq('campaign_id', id)
      .eq('user_id', req.user.id)
      .eq('status', 'agendado')
      .select()
      .single();

    if (scheduleError) throw scheduleError;
    if (!schedule) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // Atualizar status da campanha
    await supabase
      .from('campanhas')
      .update({ 
        status: 'rascunho',
        agendamento: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    await logAction(req.user.id, 'cancelar_agendamento', 'sucesso', {
      campaign_id: id,
      schedule_id: schedule.id
    }, req);

    res.json({ success: true, message: 'Agendamento cancelado' });
  } catch (error) {
    await logAction(req.user.id, 'cancelar_agendamento', 'erro', error.message, req);
    res.status(500).json({ error: error.message });
  }
});

// Processar campanhas agendadas (chamado por cron job)
app.post('/api/cron/process-scheduled', async (req, res) => {
  try {
    // Buscar campanhas agendadas para execução
    const now = new Date().toISOString();
    const { data: schedules, error: schedulesError } = await supabase
      .from('campaign_schedules')
      .select(`
        *,
        campanhas!inner(*)
      `)
      .eq('status', 'agendado')
      .lte('scheduled_at', now);

    if (schedulesError) throw schedulesError;

    let processed = 0;
    let errors = 0;

    for (const schedule of schedules || []) {
      try {
        // Marcar como executando
        await supabase
          .from('campaign_schedules')
          .update({ status: 'executando' })
          .eq('id', schedule.id);

        // Executar campanha usando a mesma lógica do endpoint manual
        const campaign = schedule.campanhas;
        
        // Buscar contatos dos segmentos
        const { data: contacts } = await supabase
          .from('contatos')
          .select('email, nome, id')
          .in('segmento_id', campaign.segmentos || [])
          .eq('user_id', campaign.user_id);

        if (contacts && contacts.length > 0) {
          // Dividir contatos em batches
          const contactBatches = chunkArray(contacts, 1000);
          
          for (const batch of contactBatches) {
            const messages = batch.map(contact => ({
              to: contact.email,
              from: campaign.remetente,
              subject: campaign.assunto,
              html: substituirVariaveis(campaign.template_html, {
                nome: contact.nome || contact.email.split('@')[0],
                email: contact.email
              }),
              custom_args: {
                campaign_id: campaign.id,
                contact_id: contact.id,
                user_id: campaign.user_id
              }
            }));

            await sgMail.send(messages);
          }

          // Atualizar campanhas
          await supabase
            .from('campanhas')
            .update({ 
              status: 'enviada',
              estatisticas: {
                sent_at: new Date().toISOString(),
                total_contacts: contacts.length,
                scheduled: true
              }
            })
            .eq('id', campaign.id);
        }

        // Marcar agendamento como executado
        await supabase
          .from('campaign_schedules')
          .update({ 
            status: 'executado',
            executed_at: new Date().toISOString()
          })
          .eq('id', schedule.id);

        processed++;

      } catch (scheduleError) {
        console.error('Erro ao processar agendamento:', scheduleError);
        
        // Marcar como erro
        await supabase
          .from('campaign_schedules')
          .update({ 
            status: 'erro',
            error_message: scheduleError.message
          })
          .eq('id', schedule.id);

        errors++;
      }
    }

    res.json({
      success: true,
      message: 'Processamento de agendamentos concluído',
      processed,
      errors,
      total: schedules?.length || 0
    });

  } catch (error) {
    console.error('Erro no processamento de agendamentos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar agendamentos
app.get('/api/schedules', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaign_schedules')
      .select(`
        *,
        campanhas!inner(nome, assunto, status)
      `)
      .eq('user_id', req.user.id)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== DASHBOARD E ESTATÍSTICAS AVANÇADAS ==========

// Endpoint específico para o Dashboard frontend
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    // Buscar dados do dashboard usando consultas paralelas
    const [
      { data: campaigns },
      { data: templates },
      { data: contacts },
      { data: suppressions },
      { data: recentStats },
      { data: logs }
    ] = await Promise.all([
      supabase.from('campanhas').select('status, created_at, estatisticas').eq('user_id', req.user.id),
      supabase.from('templates').select('id').eq('user_id', req.user.id),
      supabase.from('contatos').select('id').eq('user_id', req.user.id),
      supabase.from('suppressions').select('type').eq('user_id', req.user.id),
      supabase.from('email_statistics').select('event_type, timestamp').eq('user_id', req.user.id).order('timestamp', { ascending: false }).limit(1000),
      supabase.from('logs').select('action, status, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    // Calcular estatísticas baseadas nos dados
    let totalEmails = 0;
    let emailsEnviados = 0;
    let campanhasAtivas = 0;
    
    (campaigns || []).forEach(campaign => {
      if (campaign.status === 'enviada' || campaign.status === 'enviando') {
        campanhasAtivas++;
      }
      if (campaign.estatisticas?.sent_successfully) {
        const sent = campaign.estatisticas.sent_successfully;
        emailsEnviados += sent;
        totalEmails += sent;
      }
    });

    // Agrupar estatísticas de email por tipo
    const eventCounts = {};
    (recentStats || []).forEach(stat => {
      eventCounts[stat.event_type] = (eventCounts[stat.event_type] || 0) + 1;
    });

    const emailsEntregues = eventCounts.delivered || 0;
    const emailsAbertos = eventCounts.open || 0;
    const emailsClicados = eventCounts.click || 0;

    // Calcular taxas
    const taxaAbertura = emailsEntregues > 0 ? (emailsAbertos / emailsEntregues) * 100 : 0;
    const taxaClique = emailsEntregues > 0 ? (emailsClicados / emailsEntregues) * 100 : 0;

    // Resposta no formato esperado pelo frontend
    const dashboardStats = {
      totalEmails,
      emailsEnviados,
      emailsEntregues,
      emailsAbertos,
      taxaAbertura,
      emailsClicados,
      taxaClique,
      campanhasAtivas,
      totalContatos: contacts?.length || 0,
      totalTemplates: templates?.length || 0,
      totalSupressoes: suppressions?.length || 0
    };

    res.json(dashboardStats);

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar dados do dashboard',
      details: error.message 
    });
  }
});

// Estatísticas detalhadas de campanhas
app.get('/api/stats/campaigns/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Buscar campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Buscar estatísticas da campanha
    const { data: stats, error: statsError } = await supabase
      .from('email_statistics')
      .select('event_type, event_data, timestamp, email')
      .eq('campaign_id', id)
      .eq('user_id', req.user.id);

    if (statsError) throw statsError;

    // Agrupar estatísticas por tipo de evento
    const eventCounts = {};
    const eventsByEmail = {};
    const timelineData = [];

    (stats || []).forEach(stat => {
      // Contar eventos por tipo
      eventCounts[stat.event_type] = (eventCounts[stat.event_type] || 0) + 1;
      
      // Agrupar por email
      if (!eventsByEmail[stat.email]) {
        eventsByEmail[stat.email] = {};
      }
      eventsByEmail[stat.email][stat.event_type] = true;
      
      // Timeline
      timelineData.push({
        timestamp: stat.timestamp,
        event_type: stat.event_type,
        email: stat.email,
        data: stat.event_data
      });
    });

    // Calcular métricas
    const totalSent = campaign.estatisticas?.sent_successfully || 0;
    const delivered = eventCounts.delivered || 0;
    const opened = eventCounts.open || 0;
    const clicked = eventCounts.click || 0;
    const bounced = eventCounts.bounce || 0;
    const unsubscribed = eventCounts.unsubscribe || 0;

    const metrics = {
      total_sent: totalSent,
      delivered: delivered,
      opened: opened,
      clicked: clicked,
      bounced: bounced,
      unsubscribed: unsubscribed,
      delivery_rate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(2) : 0,
      open_rate: delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : 0,
      click_rate: delivered > 0 ? ((clicked / delivered) * 100).toFixed(2) : 0,
      bounce_rate: totalSent > 0 ? ((bounced / totalSent) * 100).toFixed(2) : 0,
      unsubscribe_rate: delivered > 0 ? ((unsubscribed / delivered) * 100).toFixed(2) : 0
    };

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.nome,
        subject: campaign.assunto,
        status: campaign.status,
        sent_at: campaign.estatisticas?.sent_at,
        scheduled: campaign.estatisticas?.scheduled || false
      },
      metrics,
      event_counts: eventCounts,
      timeline: timelineData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      unique_recipients: Object.keys(eventsByEmail).length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas gerais do usuário
app.get('/api/stats/dashboard', authMiddleware, async (req, res) => {
  try {
    const { period = '30' } = req.query; // período em dias
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Estatísticas gerais
    const [
      { data: campaigns },
      { data: templates },
      { data: contacts },
      { data: suppressions },
      { data: recentStats },
      { data: logs }
    ] = await Promise.all([
      supabase.from('campanhas').select('status, created_at, estatisticas').eq('user_id', req.user.id),
      supabase.from('templates').select('id').eq('user_id', req.user.id),
      supabase.from('contatos').select('id').eq('user_id', req.user.id),
      supabase.from('suppressions').select('type').eq('user_id', req.user.id),
      supabase.from('email_statistics').select('event_type, timestamp').eq('user_id', req.user.id).gte('timestamp', startDate.toISOString()),
      supabase.from('logs').select('action, status, created_at').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    // Agrupar campanhas por status
    const campaignsByStatus = {};
    let totalEmailsSent = 0;
    (campaigns || []).forEach(campaign => {
      campaignsByStatus[campaign.status] = (campaignsByStatus[campaign.status] || 0) + 1;
      if (campaign.estatisticas?.sent_successfully) {
        totalEmailsSent += campaign.estatisticas.sent_successfully;
      }
    });

    // Agrupar supressões por tipo
    const suppressionsByType = {};
    (suppressions || []).forEach(suppression => {
      suppressionsByType[suppression.type] = (suppressionsByType[suppression.type] || 0) + 1;
    });

    // Agrupar estatísticas de email por tipo
    const eventsByType = {};
    const dailyStats = {};
    (recentStats || []).forEach(stat => {
      eventsByType[stat.event_type] = (eventsByType[stat.event_type] || 0) + 1;
      
      const date = new Date(stat.timestamp).toISOString().split('T')[0];
      if (!dailyStats[date]) dailyStats[date] = {};
      dailyStats[date][stat.event_type] = (dailyStats[date][stat.event_type] || 0) + 1;
    });

    // Atividade recente
    const recentActivity = (logs || []).map(log => ({
      action: log.action,
      status: log.status,
      timestamp: log.created_at
    }));

    res.json({
      success: true,
      period_days: periodDays,
      overview: {
        total_campaigns: campaigns?.length || 0,
        total_templates: templates?.length || 0,
        total_contacts: contacts?.length || 0,
        total_emails_sent: totalEmailsSent,
        total_suppressions: suppressions?.length || 0
      },
      campaigns_by_status: campaignsByStatus,
      suppressions_by_type: suppressionsByType,
      email_events: eventsByType,
      daily_stats: dailyStats,
      recent_activity: recentActivity
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Relatório de performance por período
app.get('/api/stats/performance', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date e end_date são obrigatórios' });
    }

    // Buscar estatísticas no período
    const { data: stats, error } = await supabase
      .from('email_statistics')
      .select('event_type, timestamp, campaign_id')
      .eq('user_id', req.user.id)
      .gte('timestamp', start_date)
      .lte('timestamp', end_date);

    if (error) throw error;

    // Buscar campanhas do período
    const { data: campaigns } = await supabase
      .from('campanhas')
      .select('id, nome, estatisticas')
      .eq('user_id', req.user.id)
      .gte('created_at', start_date)
      .lte('created_at', end_date);

    // Agrupar por campanha
    const campaignStats = {};
    let totalSent = 0;

    (campaigns || []).forEach(campaign => {
      campaignStats[campaign.id] = {
        name: campaign.nome,
        sent: campaign.estatisticas?.sent_successfully || 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0
      };
      totalSent += campaign.estatisticas?.sent_successfully || 0;
    });

    (stats || []).forEach(stat => {
      if (campaignStats[stat.campaign_id]) {
        if (stat.event_type === 'delivered') campaignStats[stat.campaign_id].delivered++;
        else if (stat.event_type === 'open') campaignStats[stat.campaign_id].opened++;
        else if (stat.event_type === 'click') campaignStats[stat.campaign_id].clicked++;
        else if (stat.event_type === 'bounce') campaignStats[stat.campaign_id].bounced++;
      }
    });

    // Calcular métricas por campanha
    Object.values(campaignStats).forEach(campaign => {
      campaign.delivery_rate = campaign.sent > 0 ? ((campaign.delivered / campaign.sent) * 100).toFixed(2) : 0;
      campaign.open_rate = campaign.delivered > 0 ? ((campaign.opened / campaign.delivered) * 100).toFixed(2) : 0;
      campaign.click_rate = campaign.delivered > 0 ? ((campaign.clicked / campaign.delivered) * 100).toFixed(2) : 0;
    });

    res.json({
      success: true,
      period: { start_date, end_date },
      summary: {
        total_campaigns: Object.keys(campaignStats).length,
        total_sent: totalSent,
        total_events: stats?.length || 0
      },
      campaigns: campaignStats
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ENDPOINTS DE LOGS ==========

// Listar logs de ações do usuário
app.get('/api/logs', authMiddleware, async (req, res) => {
  try {
    const { action, status, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('logs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      data: data || [], 
      total: data?.length || 0,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: data?.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Erro ao listar logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter estatísticas de logs
app.get('/api/logs/stats', authMiddleware, async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('logs')
      .select('action, status, created_at')
      .eq('user_id', req.user.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 30 dias

    if (error) throw error;

    // Agrupar por ação
    const actionStats = {};
    const statusStats = { sucesso: 0, erro: 0 };
    
    logs.forEach(log => {
      actionStats[log.action] = (actionStats[log.action] || 0) + 1;
      statusStats[log.status] = (statusStats[log.status] || 0) + 1;
    });

    // Estatísticas por dia (últimos 7 dias)
    const last7Days = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = 0;
    }

    logs.forEach(log => {
      const dateStr = new Date(log.created_at).toISOString().split('T')[0];
      if (last7Days.hasOwnProperty(dateStr)) {
        last7Days[dateStr]++;
      }
    });

    res.json({
      success: true,
      stats: {
        total_logs: logs.length,
        by_action: actionStats,
        by_status: statusStats,
        daily_activity: last7Days
      }
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ENDPOINTS DE TAGS ==========

// Listar tags
app.get('/api/tags', authMiddleware, async (req, res) => {
  try {
    const authenticatedSupabase = getAuthenticatedSupabase(req.accessToken);
    const { data, error } = await authenticatedSupabase
      .from('tags')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Erro ao listar tags:', error);
    res.status(500).json({ error: 'Erro ao carregar tags: ' + error.message });
  }
});

// Criar tag
app.post('/api/tags', authMiddleware, async (req, res) => {
  const { name, color, icon, description } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req.accessToken);

    // Verificar se já existe uma tag com este nome para este usuário
    const { data: existing, error: existingError } = await authenticatedSupabase
      .from('tags')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Já existe uma tag com este nome' });
    }

    const { data, error } = await authenticatedSupabase
      .from('tags')
      .insert({
        name: name.trim(),
        color: color || '#7c3aed',
        icon: icon || '🏷️',
        description: description || null,
        user_id: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logAction(req.user.id, 'criar_tag', 'sucesso', {
      tag_id: data.id,
      name: data.name
    }, req);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao criar tag:', error);
    await logAction(req.user.id, 'criar_tag', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao criar tag: ' + error.message });
  }
});

// Atualizar tag
app.put('/api/tags/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, color, icon, description } = req.body;
  
  try {
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }

    const authenticatedSupabase = getAuthenticatedSupabase(req.accessToken);

    // Verificar se já existe outra tag com este nome para este usuário
    const { data: existing, error: existingError } = await authenticatedSupabase
      .from('tags')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', req.user.id)
      .neq('id', id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Já existe uma tag com este nome' });
    }

    const { data, error } = await authenticatedSupabase
      .from('tags')
      .update({
        name: name.trim(),
        color: color || '#7c3aed',
        icon: icon || '🏷️',
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Tag não encontrada' });

    await logAction(req.user.id, 'atualizar_tag', 'sucesso', {
      tag_id: id,
      name: data.name
    }, req);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao atualizar tag:', error);
    await logAction(req.user.id, 'atualizar_tag', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao atualizar tag: ' + error.message });
  }
});

// Deletar tag
app.delete('/api/tags/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar se a tag existe
    const { data: tag, error: fetchError } = await supabase
      .from('tags')
      .select('name')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !tag) {
      return res.status(404).json({ error: 'Tag não encontrada' });
    }

    // Remover a tag dos contatos que a possuem
    const { data: contacts, error: contactsError } = await supabase
      .from('contatos')
      .select('id, tags')
      .eq('user_id', req.user.id);

    if (!contactsError && contacts) {
      for (const contact of contacts) {
        if (contact.tags && Array.isArray(contact.tags)) {
          const updatedTags = contact.tags.filter(tagId => tagId !== id && tagId !== tag.name);
          if (updatedTags.length !== contact.tags.length) {
            await supabase
              .from('contatos')
              .update({ tags: updatedTags })
              .eq('id', contact.id);
          }
        }
      }
    }

    // Deletar a tag
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) throw deleteError;

    await logAction(req.user.id, 'deletar_tag', 'sucesso', {
      tag_id: id,
      name: tag.name
    }, req);

    res.json({ success: true, message: 'Tag excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tag:', error);
    await logAction(req.user.id, 'deletar_tag', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao excluir tag: ' + error.message });
  }
});

// Aplicar tag em massa aos contatos
app.post('/api/contacts/bulk-tag', authMiddleware, async (req, res) => {
  const { contact_ids, tag_id } = req.body;
  
  try {
    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }

    if (!tag_id) {
      return res.status(400).json({ error: 'ID da tag é obrigatório' });
    }

    // Verificar se a tag existe
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, name')
      .eq('id', tag_id)
      .eq('user_id', req.user.id)
      .single();

    if (tagError || !tag) {
      return res.status(404).json({ error: 'Tag não encontrada' });
    }

    // Buscar contatos selecionados
    const { data: contacts, error: contactsError } = await supabase
      .from('contatos')
      .select('id, tags, email')
      .in('id', contact_ids)
      .eq('user_id', req.user.id);

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({ error: 'Nenhum contato encontrado' });
    }

    let updatedCount = 0;
    const errors = [];

    // Atualizar cada contato
    for (const contact of contacts) {
      try {
        let currentTags = contact.tags || [];
        
        // Garantir que tags seja um array
        if (!Array.isArray(currentTags)) {
          currentTags = [];
        }

        // Adicionar a tag se ela não estiver presente (evitar duplicatas)
        if (!currentTags.includes(tag_id) && !currentTags.includes(tag.name)) {
          currentTags.push(tag.name);

          const { error: updateError } = await supabase
            .from('contatos')
            .update({ 
              tags: currentTags,
              updated_at: new Date().toISOString()
            })
            .eq('id', contact.id);

          if (updateError) {
            errors.push({ contact_id: contact.id, error: updateError.message });
          } else {
            updatedCount++;
          }
        } else {
          // Tag já existe no contato
          updatedCount++;
        }
      } catch (contactError) {
        errors.push({ contact_id: contact.id, error: contactError.message });
      }
    }

    await logAction(req.user.id, 'bulk_tag_contatos', 'sucesso', {
      tag_id: tag_id,
      tag_name: tag.name,
      contacts_updated: updatedCount,
      total_contacts: contact_ids.length,
      errors: errors.length
    }, req);

    res.json({
      success: true,
      message: `Tag "${tag.name}" aplicada com sucesso`,
      results: {
        total_requested: contact_ids.length,
        updated: updatedCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Erro ao aplicar tags em massa:', error);
    await logAction(req.user.id, 'bulk_tag_contatos', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao aplicar tags em massa: ' + error.message });
  }
});

// Remover tag de um contato específico
app.post('/api/contacts/:id/remove-tag', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { tag_name } = req.body;
  
  console.log(`[DEBUG] Removendo tag "${tag_name}" do contato ${id} para usuário ${req.user.id}`);
  
  try {
    if (!tag_name) {
      console.log('[DEBUG] Erro: Nome da tag não fornecido');
      return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }

    // Buscar contato
    const { data: contact, error: contactError } = await supabase
      .from('contatos')
      .select('id, tags, email, nome')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ error: 'Contato não encontrado' });
    }

    let currentTags = contact.tags || [];
    
    // Garantir que tags seja um array
    if (!Array.isArray(currentTags)) {
      currentTags = typeof currentTags === 'string' ? currentTags.split(',').map(t => t.trim()) : [];
    }

    // Remover a tag se ela estiver presente
    const initialLength = currentTags.length;
    currentTags = currentTags.filter(tag => tag !== tag_name);

    if (currentTags.length === initialLength) {
      return res.status(400).json({ error: 'Tag não encontrada no contato' });
    }

    // Atualizar contato
    const { error: updateError } = await supabase
      .from('contatos')
      .update({ 
        tags: currentTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', contact.id);

    if (updateError) throw updateError;

    // Log da ação (não crítico)
    try {
      await logAction(req.user.id, 'remover_tag_contato', 'sucesso', {
        contact_id: id,
        contact_email: contact.email,
        tag_name: tag_name,
        tags_remaining: currentTags.length
      }, req);
    } catch (logError) {
      console.error('Erro no log (não crítico):', logError.message);
    }

    res.json({
      success: true,
      message: `Tag "${tag_name}" removida do contato com sucesso`,
      contact: {
        id: contact.id,
        email: contact.email,
        nome: contact.nome,
        tags: currentTags
      }
    });

  } catch (error) {
    console.error('Erro ao remover tag do contato:', error);
    // Log de erro (não crítico)
    try {
      await logAction(req.user.id, 'remover_tag_contato', 'erro', error.message, req);
    } catch (logError) {
      console.error('Erro no log de erro (não crítico):', logError.message);
    }
    res.status(500).json({ error: 'Erro ao remover tag do contato: ' + error.message });
  }
});

// Remover tag de múltiplos contatos (remoção em massa)
app.post('/api/contacts/bulk-remove-tag', authMiddleware, async (req, res) => {
  const { contact_ids, tag_name } = req.body;
  
  console.log(`[DEBUG] Removendo tag "${tag_name}" de ${contact_ids?.length || 0} contatos para usuário ${req.user.id}`);
  
  try {
    if (!contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      console.log('[DEBUG] Erro: Lista de contatos inválida');
      return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }

    if (!tag_name) {
      console.log('[DEBUG] Erro: Nome da tag não fornecido');
      return res.status(400).json({ error: 'Nome da tag é obrigatório' });
    }

    // Buscar contatos selecionados
    const { data: contacts, error: contactsError } = await supabase
      .from('contatos')
      .select('id, tags, email, nome')
      .in('id', contact_ids)
      .eq('user_id', req.user.id);

    if (contactsError) throw contactsError;

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({ error: 'Nenhum contato encontrado' });
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    const errors = [];

    // Processar cada contato
    for (const contact of contacts) {
      try {
        let currentTags = contact.tags || [];
        
        // Garantir que tags seja um array
        if (!Array.isArray(currentTags)) {
          currentTags = typeof currentTags === 'string' ? currentTags.split(',').map(t => t.trim()) : [];
        }

        const initialLength = currentTags.length;
        currentTags = currentTags.filter(tag => tag !== tag_name);

        if (currentTags.length < initialLength) {
          // Tag foi removida, atualizar contato
          const { error: updateError } = await supabase
            .from('contatos')
            .update({ 
              tags: currentTags,
              updated_at: new Date().toISOString()
            })
            .eq('id', contact.id);

          if (updateError) {
            errors.push({ contact_id: contact.id, error: updateError.message });
          } else {
            updatedCount++;
          }
        } else {
          // Tag não foi encontrada no contato
          notFoundCount++;
        }
      } catch (contactError) {
        errors.push({ contact_id: contact.id, error: contactError.message });
      }
    }

    // Log da ação (não crítico)
    try {
      await logAction(req.user.id, 'bulk_remove_tag_contatos', 'sucesso', {
        tag_name: tag_name,
        contacts_updated: updatedCount,
        contacts_not_found: notFoundCount,
        total_contacts: contact_ids.length,
        errors: errors.length
      }, req);
    } catch (logError) {
      console.error('Erro no log (não crítico):', logError.message);
    }

    res.json({
      success: true,
      message: `Tag "${tag_name}" removida com sucesso`,
      results: {
        total_requested: contact_ids.length,
        updated: updatedCount,
        tag_not_found: notFoundCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Erro ao remover tags em massa:', error);
    // Log de erro (não crítico)
    try {
      await logAction(req.user.id, 'bulk_remove_tag_contatos', 'erro', error.message, req);
    } catch (logError) {
      console.error('Erro no log de erro (não crítico):', logError.message);
    }
    res.status(500).json({ error: 'Erro ao remover tags em massa: ' + error.message });
  }
});

// ========== SISTEMA DE VARIÁVEIS CUSTOMIZADAS ==========

// Listar variáveis customizadas + universais
app.get('/api/variables', authMiddleware, async (req, res) => {
  try {
    // Primeiro tentar usar a view otimizada, se não existir usar tabela simples
    let { data, error } = await supabase
      .from('variables_with_stats')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Se a view não existir, usar a tabela básica
    if (error && error.message.includes('does not exist')) {
      console.log('View variables_with_stats não existe, usando tabela básica');
      const { data: basicData, error: basicError } = await supabase
        .from('custom_variables')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
      
      if (basicError) throw basicError;
      
      // Adicionar campos de stats vazios para compatibilidade
      data = basicData?.map(variable => ({
        ...variable,
        datasets_count: 0,
        total_values: 0,
        last_used: null
      })) || [];
    } else if (error) {
      throw error;
    }

    // Adicionar variáveis universais no início da lista
    const variaveisUniversais = [
      {
        id: 'universal_nome',
        user_id: req.user.id,
        name: '{{nome}}',
        display_name: 'Nome (primeiro nome)',
        description: 'Primeiro nome do contato (extraído automaticamente do campo nome completo)',
        data_type: 'text',
        default_value: '[Nome]',
        is_required: false,
        is_universal: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        datasets_count: 0,
        total_values: 'Baseado em contatos',
        last_used: null
      },
      {
        id: 'universal_nome_completo',
        user_id: req.user.id,
        name: '{{nome_completo}}',
        display_name: 'Nome Completo',
        description: 'Nome completo do contato (puxado diretamente da lista de contatos)',
        data_type: 'text',
        default_value: '[Nome Completo]',
        is_required: false,
        is_universal: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        datasets_count: 0,
        total_values: 'Baseado em contatos',
        last_used: null
      }
    ];

    // Combinar variáveis universais com customizadas
    const todasVariaveis = [...variaveisUniversais, ...(data || [])];

    res.json({ success: true, data: todasVariaveis });
  } catch (error) {
    console.error('Erro ao listar variáveis:', error);
    res.status(500).json({ error: 'Erro ao listar variáveis: ' + error.message });
  }
});

// Testar variáveis universais com um contato específico
app.post('/api/variables/test-universal', authMiddleware, async (req, res) => {
  const { template, contact_id } = req.body;
  
  try {
    if (!template) {
      return res.status(400).json({ error: 'Template é obrigatório' });
    }

    // Processar o template com variáveis universais
    const resultado = await processarVariaveisUniversais(template, req.user.id, contact_id);

    res.json({ 
      success: true, 
      original: template,
      processed: resultado,
      contact_id: contact_id || null
    });
  } catch (error) {
    console.error('Erro ao testar variáveis universais:', error);
    res.status(500).json({ error: 'Erro ao processar variáveis: ' + error.message });
  }
});

// Criar nova variável customizada
app.post('/api/variables', authMiddleware, async (req, res) => {
  const { name, display_name, description, data_type, default_value, is_required } = req.body;
  
  try {
    if (!name || !display_name) {
      return res.status(400).json({ error: 'Nome e nome de exibição são obrigatórios' });
    }

    // Garantir que o nome está no formato correto {{variavel}}
    let formattedName = name.trim();
    if (!formattedName.startsWith('{{') || !formattedName.endsWith('}}')) {
      formattedName = `{{${formattedName.replace(/[{}]/g, '')}}}`;
    }

    const { data, error } = await supabase
      .from('custom_variables')
      .insert({
        user_id: req.user.id,
        name: formattedName,
        display_name: display_name.trim(),
        description: description?.trim() || null,
        data_type: data_type || 'text',
        default_value: default_value?.trim() || null,
        is_required: is_required || false
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Já existe uma variável com este nome' });
      }
      throw error;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao criar variável:', error);
    res.status(500).json({ error: 'Erro ao criar variável: ' + error.message });
  }
});

// Atualizar variável customizada
app.put('/api/variables/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { display_name, description, data_type, default_value, is_required } = req.body;
  
  try {
    if (!display_name) {
      return res.status(400).json({ error: 'Nome de exibição é obrigatório' });
    }

    const { data, error } = await supabase
      .from('custom_variables')
      .update({
        display_name: display_name.trim(),
        description: description?.trim() || null,
        data_type: data_type || 'text',
        default_value: default_value?.trim() || null,
        is_required: is_required || false
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Variável não encontrada' });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Erro ao atualizar variável:', error);
    res.status(500).json({ error: 'Erro ao atualizar variável: ' + error.message });
  }
});

// Deletar variável customizada
app.delete('/api/variables/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verificar se a variável tem dados associados
    const { data: valueCount } = await supabase
      .from('variable_values')
      .select('id')
      .eq('variable_id', id);

    if (valueCount && valueCount.length > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar variável que possui dados. Delete os datasets primeiro.' 
      });
    }

    const { data, error } = await supabase
      .from('custom_variables')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Variável não encontrada' });

    res.json({ success: true, message: 'Variável deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar variável:', error);
    res.status(500).json({ error: 'Erro ao deletar variável: ' + error.message });
  }
});

// Download CSV de exemplo
app.get('/api/datasets/exemplo.csv', (req, res) => {
  const csvContent = `email,nome,empresa,cargo,cidade,telefone,produto_interesse,data_cadastro,valor_contrato,status_cliente
joao.silva@techcorp.com,João Silva,TechCorp Ltda,Gerente de TI,São Paulo,(11) 99999-1234,Software de Gestão,2024-01-15,R$ 15000,Ativo
maria.santos@startupx.com,Maria Santos,StartupX,CEO,Rio de Janeiro,(21) 98888-5678,Consultoria Digital,2024-02-20,R$ 25000,Prospect
carlos.oliveira@inovacorp.com,Carlos Oliveira,InovaCorp,Diretor Comercial,Belo Horizonte,(31) 97777-9012,Automação,2024-03-10,R$ 30000,Negociação
ana.costa@digitalplus.com,Ana Costa,DigitalPlus,Coordenadora de Marketing,Brasília,(61) 96666-3456,Marketing Digital,2024-01-30,R$ 8000,Ativo
pedro.almeida@techsol.com,Pedro Almeida,TechSolutions,CTO,Curitiba,(41) 95555-7890,Desenvolvimento,2024-02-14,R$ 45000,Fechado
lucia.ferreira@comercialx.com,Lúcia Ferreira,ComercialX,Gerente de Vendas,Fortaleza,(85) 94444-2345,CRM,2024-03-05,R$ 12000,Prospect
roberto.lima@industria.com,Roberto Lima,Indústria ABC,Diretor de Operações,Porto Alegre,(51) 93333-6789,ERP,2024-01-20,R$ 35000,Ativo
fernanda.rocha@servicos.com,Fernanda Rocha,Serviços Mais,Supervisora,Recife,(81) 92222-0123,Automação,2024-02-28,R$ 18000,Negociação`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="exemplo.csv"');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Adicionar BOM para UTF-8 (melhora compatibilidade com Excel)
  res.write('\uFEFF');
  res.end(csvContent);
});

// Listar datasets
app.get('/api/datasets', authMiddleware, async (req, res) => {
  try {
    // Primeiro tentar usar a view otimizada, se não existir usar tabela simples
    let { data, error } = await supabase
      .from('datasets_with_stats')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Se a view não existir, usar a tabela básica
    if (error && error.message.includes('does not exist')) {
      console.log('View datasets_with_stats não existe, usando tabela básica');
      const { data: basicData, error: basicError } = await supabase
        .from('variable_datasets')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
      
      if (basicError) throw basicError;
      
      // Adicionar campos de stats vazios para compatibilidade
      data = basicData?.map(dataset => ({
        ...dataset,
        variables_count: 0,
        total_values: 0,
        usage_count: 0
      })) || [];
    } else if (error) {
      throw error;
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Erro ao listar datasets:', error);
    res.status(500).json({ error: 'Erro ao listar datasets: ' + error.message });
  }
});

// Upload e processamento de CSV
app.post('/api/datasets/upload', authMiddleware, upload.single('csv'), async (req, res) => {
  const { name, description, variable_mapping } = req.body;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Nome do dataset é obrigatório' });
    }

    const filePath = req.file.path;
    const headers = [];
    const rows = [];
    
    // Ler CSV e extrair headers e dados
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (rows.length === 0) {
      fs.unlinkSync(filePath); // Limpar arquivo
      return res.status(400).json({ error: 'CSV não contém dados válidos' });
    }

    // Criar dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('variable_datasets')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        file_name: req.file.originalname,
        total_rows: rows.length,
        csv_headers: headers,
        mapping_config: variable_mapping ? JSON.parse(variable_mapping) : {}
      })
      .select()
      .single();

    if (datasetError) throw datasetError;

    // Processar mapeamento de variáveis se fornecido
    if (variable_mapping) {
      const mapping = JSON.parse(variable_mapping);
      const variableValues = [];

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        
        for (const [variableId, csvColumn] of Object.entries(mapping)) {
          if (csvColumn && row[csvColumn] !== undefined) {
            variableValues.push({
              dataset_id: dataset.id,
              variable_id: variableId,
              row_index: rowIndex,
              value: row[csvColumn],
              row_identifier: row[Object.keys(row)[0]] || null // Usar primeira coluna como identificador
            });
          }
        }
      }

      // Inserir valores em lotes
      if (variableValues.length > 0) {
        const batchSize = 1000;
        for (let i = 0; i < variableValues.length; i += batchSize) {
          const batch = variableValues.slice(i, i + batchSize);
          const { error: valuesError } = await supabase
            .from('variable_values')
            .insert(batch);

          if (valuesError) throw valuesError;
        }
      }
    }

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({ 
      success: true, 
      data: dataset,
      stats: {
        headers_found: headers.length,
        rows_processed: rows.length,
        values_inserted: variable_mapping ? Object.keys(JSON.parse(variable_mapping)).length * rows.length : 0
      }
    });

  } catch (error) {
    console.error('Erro ao processar CSV:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erro ao processar CSV: ' + error.message });
  }
});

// Preview de CSV antes do upload
app.post('/api/datasets/preview', authMiddleware, upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
    }

    const filePath = req.file.path;
    const headers = [];
    const sampleRows = [];
    let rowCount = 0;
    
    // Ler apenas as primeiras 5 linhas para preview
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers.push(...headerList);
        })
        .on('data', (row) => {
          if (rowCount < 5) {
            sampleRows.push(row);
          }
          rowCount++;
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Buscar variáveis disponíveis para mapeamento
    const { data: variables, error: varsError } = await supabase
      .from('custom_variables')
      .select('id, name, display_name, data_type')
      .eq('user_id', req.user.id)
      .order('display_name');

    if (varsError) throw varsError;

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      preview: {
        headers,
        sample_rows: sampleRows,
        total_rows: rowCount,
        available_variables: variables || []
      }
    });

  } catch (error) {
    console.error('Erro ao fazer preview do CSV:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Erro ao fazer preview do CSV: ' + error.message });
  }
});

// Deletar dataset
app.delete('/api/datasets/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('variable_datasets')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Dataset não encontrado' });

    res.json({ success: true, message: 'Dataset deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar dataset:', error);
    res.status(500).json({ error: 'Erro ao deletar dataset: ' + error.message });
  }
});

// Obter valores de um dataset específico
app.get('/api/datasets/:id/values', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  
  try {
    // Verificar se o dataset pertence ao usuário
    const { data: dataset, error: datasetError } = await supabase
      .from('variable_datasets')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (datasetError) throw datasetError;
    if (!dataset) return res.status(404).json({ error: 'Dataset não encontrado' });

    // Buscar valores com paginação
    const offset = (page - 1) * limit;
    
    const { data: values, error: valuesError } = await supabase
      .from('variable_values')
      .select(`
        *,
        custom_variables!inner(name, display_name, data_type)
      `)
      .eq('dataset_id', id)
      .range(offset, offset + limit - 1)
      .order('row_index');

    if (valuesError) throw valuesError;

    // Organizar dados por linha
    const organizedData = {};
    values.forEach(value => {
      if (!organizedData[value.row_index]) {
        organizedData[value.row_index] = {
          row_index: value.row_index,
          row_identifier: value.row_identifier,
          variables: {}
        };
      }
      organizedData[value.row_index].variables[value.custom_variables.name] = {
        value: value.value,
        display_name: value.custom_variables.display_name,
        data_type: value.custom_variables.data_type
      };
    });

    res.json({
      success: true,
      data: {
        dataset,
        rows: Object.values(organizedData),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_rows: dataset.total_rows
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar valores do dataset:', error);
    res.status(500).json({ error: 'Erro ao buscar valores do dataset: ' + error.message });
  }
});

// ========== ENDPOINTS DE CONTATOS ==========

// Listar contatos
app.get('/api/contacts', authMiddleware, async (req, res) => {
  try {
    console.log('Listando contatos para usuário:', req.user.id);
    const { data, error } = await supabase
      .from('contatos')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro do Supabase ao listar contatos:', error);
      throw error;
    }
    
    console.log(`Encontrados ${data.length} contatos para o usuário`);
    res.json(data);
  } catch (error) {
    console.error('Erro ao listar contatos:', error);
    res.status(500).json({ error: 'Erro ao carregar contatos: ' + error.message });
  }
});

// Criar contato
app.post('/api/contacts', authMiddleware, async (req, res) => {
  const { email, nome, telefone, empresa, tags } = req.body;
  
  try {
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Verificar se email já existe para este usuário
    const { data: existing, error: existingError } = await supabase
      .from('contatos')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Email já existe na sua lista de contatos' });
    }

    const { data, error } = await supabase
      .from('contatos')
      .insert({
        email: email.toLowerCase(),
        nome: nome || null,
        telefone: telefone || null,
        empresa: empresa || null,
        tags: tags || [],
        user_id: req.user.id
      })
      .select()
      .single();

    if (error) throw error;

    await logAction(req.user.id, 'criar_contato', 'sucesso', {
      contato_id: data.id,
      email: data.email
    }, req);

    res.json(data);
  } catch (error) {
    console.error('Erro ao criar contato:', error);
    await logAction(req.user.id, 'criar_contato', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao criar contato' });
  }
});

// Atualizar contato
app.put('/api/contacts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { email, nome, telefone, empresa, tags } = req.body;
  
  try {
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    // Verificar se email já existe para outro contato deste usuário
    const { data: existing, error: existingError } = await supabase
      .from('contatos')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('user_id', req.user.id)
      .neq('id', id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Email já existe em outro contato' });
    }

    const { data, error } = await supabase
      .from('contatos')
      .update({
        email: email.toLowerCase(),
        nome: nome || null,
        telefone: telefone || null,
        empresa: empresa || null,
        tags: tags || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contato não encontrado' });

    await logAction(req.user.id, 'atualizar_contato', 'sucesso', {
      contato_id: id,
      email: data.email
    }, req);

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar contato:', error);
    await logAction(req.user.id, 'atualizar_contato', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao atualizar contato' });
  }
});

// Deletar contato
app.delete('/api/contacts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('contatos')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Contato não encontrado' });

    await logAction(req.user.id, 'deletar_contato', 'sucesso', {
      contato_id: id,
      email: data.email
    }, req);

    res.json({ success: true, message: 'Contato excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar contato:', error);
    await logAction(req.user.id, 'deletar_contato', 'erro', error.message, req);
    res.status(500).json({ error: 'Erro ao excluir contato' });
  }
});

// Endpoints para testar as tabelas (mantido para compatibilidade)
app.get('/api/contatos', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contatos')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/campanhas', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para compatibilidade com o frontend (campaigns)
app.get('/api/campaigns', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Erro ao listar campanhas:', error);
    res.status(500).json({ error: 'Erro ao carregar campanhas: ' + error.message });
  }
});

// Create campaign
app.post('/api/campaigns', authMiddleware, async (req, res) => {
  console.log('🚀 ENDPOINT /api/campaigns chamado - VERSÃO ATUALIZADA');
  try {
    const { name, subject, template_id, tag_filter, segment_filter, scheduled_at } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Nome e assunto são obrigatórios' });
    }

    // Fetch template HTML if template_id is provided
    let template_html = '';
    console.log('Criando campanha - template_id:', template_id);
    
    if (template_id) {
      console.log('Buscando template com ID:', template_id);
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('html')
        .eq('id', template_id)
        .eq('user_id', req.user.id)
        .single();
      
      if (templateError) {
        console.error('Erro ao buscar template:', templateError);
        return res.status(404).json({ error: 'Template não encontrado' });
      }
      
      template_html = templateData.html || '';
      
      // Se o template HTML estiver vazio, usar template padrão
      if (!template_html || template_html.trim() === '') {
        template_html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>${subject}</h1>
            <p>Conteúdo da campanha</p>
          </div>
        `;
        console.log('Template estava vazio, usando template padrão');
      }
      console.log('Template HTML encontrado, tamanho:', template_html.length);
    } else {
      // Default basic template if no template is selected
      template_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>${subject}</h1>
          <p>Conteúdo da campanha</p>
        </div>
      `;
      console.log('Usando template padrão, tamanho:', template_html.length);
    }
    
    // Garantir que template_html nunca seja null ou vazio
    if (!template_html || template_html.trim() === '') {
      template_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>${subject}</h1>
          <p>Conteúdo da campanha</p>
        </div>
      `;
      console.log('ATENÇÃO: template_html estava vazio, forçando template padrão');
    }
    
    console.log('template_html final:', template_html ? 'PREENCHIDO' : 'VAZIO');
    console.log('template_html length:', template_html.length);

    // Support both tag_filter (new) and segment_filter (backward compatibility)
    const filter = tag_filter || segment_filter;

    const campaignData = {
      nome: name,
      assunto: subject,
      template_id,
      template_html,
      segmentos: filter ? [filter] : [],
      tag_filter: tag_filter || null,
      remetente: 'avisos@lembretescredilly.com', // Default sender (verified in SendGrid)
      status: scheduled_at ? 'agendada' : 'rascunho',
      agendamento: scheduled_at || null,
      user_id: req.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Dados da campanha a serem inseridos:', {
      nome: campaignData.nome,
      template_id: campaignData.template_id,
      template_html_length: campaignData.template_html ? campaignData.template_html.length : 'NULL'
    });

    const { data, error } = await supabase
      .from('campanhas')
      .insert([campaignData])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ error: 'Erro ao criar campanha: ' + error.message });
  }
});

// Update campaign
app.put('/api/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, template_id, tag_filter, segment_filter, scheduled_at } = req.body;

    // Support both tag_filter (new) and segment_filter (backward compatibility)
    const filter = tag_filter || segment_filter;

    const updateData = {
      nome: name,
      assunto: subject,
      template_id,
      segmentos: filter ? [filter] : [],
      tag_filter: tag_filter || null,
      status: scheduled_at ? 'agendada' : 'rascunho',
      agendamento: scheduled_at || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('campanhas')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ error: 'Erro ao atualizar campanha: ' + error.message });
  }
});

// Delete campaign
app.delete('/api/campaigns/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Primeiro, verificar se a campanha existe e pertence ao usuário
    const { data: existingCampaign, error: checkError } = await supabase
      .from('campanhas')
      .select('id, nome')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !existingCampaign) {
      return res.status(404).json({ error: 'Campanha não encontrada ou não autorizada' });
    }

    // Excluir registros dependentes primeiro (para evitar violação de chave estrangeira)
    console.log(`Iniciando exclusão da campanha "${existingCampaign.nome}" e seus dados relacionados...`);

    // 1. Excluir estatísticas de email relacionadas
    const { error: statsError } = await supabase
      .from('email_statistics')
      .delete()
      .eq('campaign_id', id);
    
    if (statsError) {
      console.log('Aviso ao excluir estatísticas:', statsError.message);
    }

    // 2. Excluir agendamentos relacionados
    const { error: scheduleError } = await supabase
      .from('schedules')
      .delete()
      .eq('campaign_id', id);
    
    if (scheduleError) {
      console.log('Aviso ao excluir agendamentos:', scheduleError.message);
    }

    // 3. Excluir agendamentos de campanha relacionados
    const { error: campaignScheduleError } = await supabase
      .from('campaign_schedules')
      .delete()
      .eq('campaign_id', id);
    
    if (campaignScheduleError) {
      console.log('Aviso ao excluir agendamentos de campanha:', campaignScheduleError.message);
    }

    // 4. Agora excluir a campanha principal
    const { error: deleteError } = await supabase
      .from('campanhas')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) throw deleteError;

    console.log(`Campanha "${existingCampaign.nome}" e todos os dados relacionados excluídos com sucesso pelo usuário ${req.user.id}`);
    res.json({ success: true, message: 'Campanha excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir campanha:', error);
    res.status(500).json({ error: 'Erro ao excluir campanha: ' + error.message });
  }
});

app.get('/api/segmentos', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('segmentos')
      .select('*')
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota de teste para verificar estrutura das tabelas
app.get('/api/test-data', async (req, res) => {
  try {
    // Usar uma consulta SQL direta para contar registros
    const { data: tableInfo, error } = await supabase.rpc('get_table_counts');
    
    if (error) {
      // Fallback: resposta com estrutura das tabelas
      res.json({
        success: true,
        message: 'Tabelas criadas com sucesso',
        tables: {
          contatos: { columns: ['id', 'email', 'nome', 'segmento_id', 'user_id', 'created_at', 'updated_at'] },
          templates: { columns: ['id', 'nome', 'html', 'variaveis', 'user_id', 'created_at', 'updated_at'] },
          campanhas: { columns: ['id', 'nome', 'assunto', 'template_html', 'segmentos', 'remetente', 'status', 'agendamento', 'estatisticas', 'user_id', 'created_at', 'updated_at'] },
          segmentos: { columns: ['id', 'nome', 'descricao', 'criterios', 'user_id', 'created_at', 'updated_at'] },
          logs: { columns: ['id', 'user_id', 'action', 'status', 'details', 'ip_address', 'user_agent', 'created_at'] }
        },
        status: 'Database estruturado e funcionando',
        rls_enabled: true,
        authentication_required: 'Para acessar dados específicos, use os endpoints com autenticação'
      });
    } else {
      res.json({
        success: true,
        message: 'Dados de teste do banco',
        data: tableInfo
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});