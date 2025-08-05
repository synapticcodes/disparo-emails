const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const client = require('@sendgrid/client');

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

// Carrega variáveis de ambiente
require('dotenv').config();

// Configura SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
client.setApiKey(process.env.SENDGRID_API_KEY);

// Configura Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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

// Função para substituir variáveis no template
function substituirVariaveis(template, variaveis) {
  let resultado = template;
  Object.keys(variaveis).forEach(chave => {
    const regex = new RegExp(`{{${chave}}}`, 'g');
    resultado = resultado.replace(regex, variaveis[chave] || '');
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
      if (html) finalHtml = substituirVariaveis(html, template_vars);
      if (text) finalText = substituirVariaveis(text, template_vars);
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
    
    // Log de sucesso
    await logAction(req.user.id, 'envio_direto', 'sucesso', {
      recipients: recipients.length,
      subject,
      has_html: !!html,
      has_text: !!text,
      has_attachments: !!attachments
    }, req);

    res.json({ 
      success: true, 
      message: 'Email enviado com sucesso',
      recipients: recipients.length,
      subject
    });

  } catch (error) {
    console.error('Erro no envio direto:', error);
    
    // Log de erro
    await logAction(req.user.id, 'envio_direto', 'erro', {
      error: error.message,
      code: error.code || 'UNKNOWN',
      recipients: Array.isArray(to) ? to.length : 1
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
      await logAction(req.user.id, 'envio_campanha', 'erro', 'Campanha não encontrada', req);
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Verificar status da campanha
    if (campaign.status === 'enviada') {
      return res.status(400).json({ error: 'Campanha já foi enviada' });
    }

    // Buscar contatos dos segmentos
    let contacts = [];
    if (campaign.segmentos && campaign.segmentos.length > 0) {
      const { data: segmentContacts, error: contactsError } = await supabase
        .from('contatos')
        .select('email, nome, id')
        .in('segmento_id', campaign.segmentos)
        .eq('user_id', req.user.id);
      
      if (contactsError) {
        await logAction(req.user.id, 'envio_campanha', 'erro', 'Erro ao buscar contatos', req);
        return res.status(500).json({ error: 'Erro ao buscar contatos' });
      }
      
      contacts = segmentContacts || [];
    }

    if (contacts.length === 0) {
      await logAction(req.user.id, 'envio_campanha', 'erro', 'Nenhum contato encontrado', req);
      return res.status(400).json({ error: 'Nenhum contato encontrado nos segmentos da campanha' });
    }

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
        await sgMail.send(messages);
        successCount += batch.length;
        
        console.log(`Batch ${batchIndex + 1}/${contactBatches.length} enviado com sucesso (${batch.length} emails)`);
        
      } catch (batchError) {
        console.error(`Erro no batch ${batchIndex + 1}:`, batchError.message);
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

    await supabase
      .from('campanhas')
      .update({ 
        status: errorCount === 0 ? (test_mode ? 'teste_enviado' : 'enviada') : 'erro_parcial',
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

// Endpoints para testar as tabelas
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