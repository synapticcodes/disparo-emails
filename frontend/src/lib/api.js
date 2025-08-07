import axios from 'axios'
import { supabase } from './supabase'

// Configuração para uso apenas com Supabase (sem backend Node.js)
console.log('🔧 Modo: Supabase apenas (sem API backend)')

// Criar instância do axios para chamadas externas (se necessário)
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Erro ao buscar sessão:', error)
        // Continuar sem token se houver erro
        return config
      }
      
      if (session?.access_token) {
        // Verificar se o token não expirou
        try {
          const tokenParts = session.access_token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Date.now() / 1000;
            
            if (payload.exp < now) {
              console.warn('Token expirado, tentando renovar...');
              // Tentar renovar o token
              const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
              
              if (!refreshError && refreshData.session?.access_token) {
                config.headers.Authorization = `Bearer ${refreshData.session.access_token}`;
              }
            } else {
              config.headers.Authorization = `Bearer ${session.access_token}`;
            }
          } else {
            config.headers.Authorization = `Bearer ${session.access_token}`;
          }
        } catch (tokenError) {
          // Se não conseguir decodificar, usar token original
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      }
      
      return config
    } catch (interceptorError) {
      console.error('Erro no interceptor:', interceptorError);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Verificar se realmente não há sessão antes de fazer logout
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Só fazer logout se realmente não houver sessão
        console.log('Token inválido, redirecionando para login')
        await supabase.auth.signOut()
        
        // Evitar redirecionamento se já estiver na página de login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ========== FUNÇÕES DA API USANDO APENAS SUPABASE ==========

// Autenticação
export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  getUser: () => supabase.auth.getUser(),
}

// Envio de emails (usando Edge Functions do Supabase)
export const emails = {
  sendDirect: async (data) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`https://ixroiuhpvsljxeynfrqz.supabase.co/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        to: data.to,
        subject: data.subject,
        html: data.html,
        type: 'direct'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    return { data: result };
  },
  sendCampaign: async (data) => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`https://ixroiuhpvsljxeynfrqz.supabase.co/functions/v1/send-campaign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        campaign_id: data.campaign_id
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send campaign');
    }

    const result = await response.json();
    return { data: result };
  },
}

// Templates (usando Supabase diretamente)
export const templates = {
  list: async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data };
  },
  create: async (templateData) => {
    const { data, error } = await supabase
      .from('templates')
      .insert({
        nome: templateData.nome,
        html_content: templateData.html_content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, templateData) => {
    const { data, error } = await supabase
      .from('templates')
      .update({
        nome: templateData.nome,
        html_content: templateData.html_content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  },
  clone: async (id, name) => {
    // Buscar template original
    const { data: original, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    
    // Criar cópia
    const { data, error } = await supabase
      .from('templates')
      .insert({
        nome: name,
        html_content: original.html_content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  preview: async (templateData) => {
    // Simular preview - pode ser implementado com processamento local
    return { data: { html: templateData.html_content } };
  },
}

// Campanhas (usando Supabase diretamente)
export const campaigns = {
  list: async () => {
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data };
  },
  create: async (campaignData) => {
    const { data, error } = await supabase
      .from('campanhas')
      .insert({
        nome: campaignData.nome,
        assunto: campaignData.assunto,
        template_html: campaignData.template_html,
        status: 'rascunho',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, campaignData) => {
    const { data, error } = await supabase
      .from('campanhas')
      .update({
        nome: campaignData.nome,
        assunto: campaignData.assunto,
        template_html: campaignData.template_html,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('campanhas')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  },
  send: async (campaignId) => {
    // Marcar como enviada - SendGrid precisa de Edge Function
    const { data, error } = await supabase
      .from('campanhas')
      .update({ 
        status: 'enviada',
        sent_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  schedule: async (id, scheduledAt) => {
    const { data, error } = await supabase
      .from('campanhas')
      .update({ 
        status: 'agendada',
        scheduled_at: scheduledAt
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  cancelSchedule: async (id) => {
    const { data, error } = await supabase
      .from('campanhas')
      .update({ 
        status: 'rascunho',
        scheduled_at: null
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
}

// Contatos (usando Supabase diretamente)
export const contacts = {
  list: async () => {
    const { data, error } = await supabase
      .from('contatos')
      .select('*, tags(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data };
  },
  create: async (contactData) => {
    const { data, error } = await supabase
      .from('contatos')
      .insert({
        nome: contactData.nome,
        email: contactData.email,
        telefone: contactData.telefone,
        empresa: contactData.empresa,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, contactData) => {
    const { data, error } = await supabase
      .from('contatos')
      .update({
        nome: contactData.nome,
        email: contactData.email,
        telefone: contactData.telefone,
        empresa: contactData.empresa,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('contatos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  },
  bulkTag: async (data) => {
    try {
      const { contactIds, tagId } = data;
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw new Error('Lista de contatos é obrigatória');
      }

      if (!tagId) {
        throw new Error('ID da tag é obrigatório');
      }

      // Verificar se a tag existe
      const { data: tag, error: tagError } = await supabase
        .from('tags')
        .select('id, nome')
        .eq('id', tagId)
        .single();

      if (tagError || !tag) {
        throw new Error('Tag não encontrada');
      }

      // Buscar contatos selecionados
      const { data: contacts, error: contactsError } = await supabase
        .from('contatos')
        .select('id, tags, email')
        .in('id', contactIds);

      if (contactsError) {
        throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
      }

      if (!contacts || contacts.length === 0) {
        throw new Error('Nenhum contato encontrado');
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
          if (!currentTags.includes(tagId) && !currentTags.includes(tag.nome)) {
            currentTags.push(tag.nome);

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

      return {
        data: {
          success: true,
          message: `Tag "${tag.nome}" aplicada com sucesso`,
          results: {
            total_requested: contactIds.length,
            updated: updatedCount,
            errors: errors.length
          },
          errors: errors.length > 0 ? errors : undefined
        }
      };

    } catch (error) {
      throw new Error(error.message || 'Erro ao aplicar tags em massa');
    }
  },
  bulkRemoveTag: async (data) => {
    try {
      const { contactIds, tagName } = data;
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        throw new Error('Lista de contatos é obrigatória');
      }

      if (!tagName) {
        throw new Error('Nome da tag é obrigatório');
      }

      // Buscar contatos selecionados
      const { data: contacts, error: contactsError } = await supabase
        .from('contatos')
        .select('id, tags, email')
        .in('id', contactIds);

      if (contactsError) {
        throw new Error(`Erro ao buscar contatos: ${contactsError.message}`);
      }

      if (!contacts || contacts.length === 0) {
        throw new Error('Nenhum contato encontrado');
      }

      let updatedCount = 0;
      let notFoundCount = 0;
      const errors = [];

      // Atualizar cada contato
      for (const contact of contacts) {
        try {
          let currentTags = contact.tags || [];
          
          // Garantir que tags seja um array
          if (!Array.isArray(currentTags)) {
            currentTags = typeof currentTags === 'string' ? currentTags.split(',').map(t => t.trim()) : [];
          }

          // Remover a tag se ela estiver presente
          const initialLength = currentTags.length;
          currentTags = currentTags.filter(tag => tag !== tagName);

          if (currentTags.length === initialLength) {
            notFoundCount++;
          } else {
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
          }
        } catch (contactError) {
          errors.push({ contact_id: contact.id, error: contactError.message });
        }
      }

      return {
        data: {
          success: true,
          message: `Tag "${tagName}" removida com sucesso`,
          results: {
            total_requested: contactIds.length,
            updated: updatedCount,
            not_found: notFoundCount,
            errors: errors.length
          },
          errors: errors.length > 0 ? errors : undefined
        }
      };

    } catch (error) {
      throw new Error(error.message || 'Erro ao remover tags em massa');
    }
  },
}

// Tags (usando Supabase diretamente)
export const tags = {
  list: async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('nome', { ascending: true });
    if (error) throw error;
    return { data };
  },
  create: async (tagData) => {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        nome: tagData.nome,
        cor: tagData.cor,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, tagData) => {
    const { data, error } = await supabase
      .from('tags')
      .update({
        nome: tagData.nome,
        cor: tagData.cor,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  },
}

// Variáveis Customizadas (usando Supabase diretamente)
export const variables = {
  list: async () => {
    const { data, error } = await supabase
      .from('variaveis_customizadas')
      .select('*')
      .order('nome', { ascending: true });
    if (error) throw error;
    return { data };
  },
  create: async (variableData) => {
    const { data, error } = await supabase
      .from('variaveis_customizadas')
      .insert({
        nome: variableData.nome,
        valor_padrao: variableData.valor_padrao,
        descricao: variableData.descricao,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  update: async (id, variableData) => {
    const { data, error } = await supabase
      .from('variaveis_customizadas')
      .update({
        nome: variableData.nome,
        valor_padrao: variableData.valor_padrao,
        descricao: variableData.descricao,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('variaveis_customizadas')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  },
  testUniversal: async (data) => {
    // Simulação de teste de variáveis - pode ser feito no frontend
    const processedText = data.text.replace(/{{(\w+)}}/g, (match, varName) => {
      return data.variables[varName] || match;
    });
    return { data: { processedText } };
  },
}

// Datasets (usando Supabase diretamente)
export const datasets = {
  list: async () => {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data };
  },
  upload: async (datasetData) => {
    const { data, error } = await supabase
      .from('datasets')
      .insert({
        nome: datasetData.nome,
        dados: datasetData.dados, // JSON com os dados
        colunas: datasetData.colunas, // Array com nomes das colunas
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  preview: async (data) => {
    // Preview pode ser feito no frontend
    return { data: { preview: data.dados.slice(0, 5) } };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('datasets')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { data: { success: true } };
  },
  getValues: async (id, params = {}) => {
    let query = supabase
      .from('datasets')
      .select('dados')
      .eq('id', id)
      .single();
    
    const { data, error } = await query;
    if (error) throw error;
    
    let valores = data.dados;
    
    // Aplicar filtros se necessário
    if (params.limit) {
      valores = valores.slice(0, params.limit);
    }
    
    return { data: { values: valores } };
  },
}

// Segmentos (usando Supabase diretamente)
export const segments = {
  list: async () => {
    const { data, error } = await supabase
      .from('segmentos')
      .select('*')
      .order('nome', { ascending: true });
    if (error) throw error;
    return { data };
  },
}

// Supressões (usando Supabase diretamente - dados locais)
export const suppressions = {
  list: async (params = {}) => {
    let query = supabase
      .from('email_suppressions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (params.type) {
      query = query.eq('type', params.type);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },
  add: async (suppressionData) => {
    const { data, error } = await supabase
      .from('email_suppressions')
      .insert({
        email: suppressionData.email,
        type: suppressionData.type, // bounce, block, spam, etc
        reason: suppressionData.reason,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { data };
  },
  remove: async (email, type) => {
    const { error } = await supabase
      .from('email_suppressions')
      .delete()
      .eq('email', email)
      .eq('type', type);
    if (error) throw error;
    return { data: { success: true } };
  },
  sync: async () => {
    // Sem backend, sync precisa ser implementado via Edge Function
    // Por enquanto, apenas retorna sucesso
    return { data: { message: 'Sync via Edge Function necessário' } };
  },
}

// Estatísticas (usando Supabase diretamente - dados locais)
export const stats = {
  overview: async () => {
    // Agregações básicas dos dados locais
    const [emailLogs, campaigns, contacts] = await Promise.all([
      supabase.from('email_logs').select('status').neq('status', null),
      supabase.from('campanhas').select('status'),
      supabase.from('contatos').select('id')
    ]);
    
    const totalEmails = emailLogs.data?.length || 0;
    const totalCampaigns = campaigns.data?.length || 0;
    const totalContacts = contacts.data?.length || 0;
    
    return {
      data: {
        totalEmails,
        totalCampaigns,
        totalContacts,
        emailsEnviados: emailLogs.data?.filter(e => e.status === 'sent').length || 0,
        emailsPendentes: emailLogs.data?.filter(e => e.status === 'queued').length || 0
      }
    };
  },
  dashboard: async (period = 30) => {
    // Dados do dashboard usando registros locais
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);
    
    const { data: emailLogs, error } = await supabase
      .from('email_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (error) throw error;
    
    const stats = {
      totalEmails: emailLogs.length,
      emailsEnviados: emailLogs.filter(e => e.status === 'sent').length,
      emailsPendentes: emailLogs.filter(e => e.status === 'queued').length,
      emailsComErro: emailLogs.filter(e => e.status === 'failed').length
    };
    
    return { data: stats };
  },
  campaign: async (id) => {
    const { data, error } = await supabase
      .from('campanhas')
      .select('*, email_logs(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { data };
  },
  performance: async (startDate, endDate) => {
    const { data: emailLogs, error } = await supabase
      .from('email_logs')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error) throw error;
    
    const performance = {
      totalEmails: emailLogs.length,
      delivered: emailLogs.filter(e => e.status === 'sent').length,
      bounced: emailLogs.filter(e => e.status === 'bounced').length,
      opens: emailLogs.filter(e => e.opened_at).length,
      clicks: emailLogs.filter(e => e.clicked_at).length
    };
    
    return { data: performance };
  },
}

// Rastreamento de eventos de email (usando Supabase diretamente)
export const tracking = {
  // Consultar todos os eventos de uma campanha
  events: async (campaignId, params = {}) => {
    let query = supabase
      .from('email_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('timestamp', { ascending: false });
    
    if (params.event_type) {
      query = query.eq('event_type', params.event_type);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },
  // Consultar especificamente quem abriu emails de uma campanha
  opens: async (campaignId) => {
    const { data, error } = await supabase
      .from('email_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('event_type', 'open')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return { data };
  },
  // Estatísticas gerais de eventos do usuário
  stats: async (period = 30) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);
    
    const { data: events, error } = await supabase
      .from('email_events')
      .select('event_type')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString());
    
    if (error) throw error;
    
    const stats = {
      total_events: events.length,
      opens: events.filter(e => e.event_type === 'open').length,
      clicks: events.filter(e => e.event_type === 'click').length,
      bounces: events.filter(e => e.event_type === 'bounce').length,
      spam_reports: events.filter(e => e.event_type === 'spamreport').length
    };
    
    return { data: stats };
  },
}

// Agendamentos (usando Supabase diretamente)
export const schedules = {
  list: async () => {
    const { data, error } = await supabase
      .from('campanhas')
      .select('*')
      .eq('status', 'agendada')
      .not('scheduled_at', 'is', null)
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    return { data };
  },
}

// Logs (usando Supabase diretamente)
export const logs = {
  list: async (params = {}) => {
    let query = supabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (params.level) {
      query = query.eq('level', params.level);
    }
    
    if (params.limit) {
      query = query.limit(params.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return { data };
  },
  stats: async () => {
    const { data: logs, error } = await supabase
      .from('system_logs')
      .select('level');
    
    if (error) throw error;
    
    const stats = {
      total: logs.length,
      info: logs.filter(l => l.level === 'info').length,
      warning: logs.filter(l => l.level === 'warning').length,
      error: logs.filter(l => l.level === 'error').length
    };
    
    return { data: stats };
  },
}

// Exportar instância principal do axios também
export { api }

export default api