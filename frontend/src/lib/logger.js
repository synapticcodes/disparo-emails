import { supabase } from './supabase'

/**
 * Sistema de logging universal para todas as ações do sistema
 * Usado para registrar ações de usuários, operações CRUD, envios de email, etc.
 */

// Helper para obter informações do usuário atual
const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Erro ao obter usuário atual para log:', error)
    return null
  }
}

// Helper para obter IP e User Agent do cliente
const getClientInfo = () => {
  return {
    userAgent: navigator.userAgent || 'Unknown',
    // IP será obtido do lado servidor, aqui usamos placeholder
    ipAddress: '127.0.0.1'
  }
}

/**
 * Registra uma ação no sistema de logs
 * @param {string} action - Tipo da ação (ex: 'criar_contato', 'envio_direto', 'deletar_template')
 * @param {string} status - Status da ação ('sucesso' ou 'erro')
 * @param {object} details - Detalhes específicos da ação
 * @param {object} options - Opções adicionais (user_id customizado, etc.)
 */
export const logAction = async (action, status, details = {}, options = {}) => {
  try {
    const user = options.user_id ? { id: options.user_id } : await getCurrentUser()
    const clientInfo = getClientInfo()
    
    const logEntry = {
      user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      action: action,
      status: status,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        client_info: {
          user_agent: clientInfo.userAgent,
          url: window.location.href,
          referrer: document.referrer || null
        }
      },
      ip_address: clientInfo.ipAddress,
      user_agent: clientInfo.userAgent
    }

    console.log(`📝 [Logger] Registrando ação:`, {
      action,
      status,
      user_id: user?.id,
      details_keys: Object.keys(details)
    })

    const { data, error } = await supabase
      .from('logs')
      .insert([logEntry])

    if (error) {
      console.error('❌ [Logger] Falha ao salvar log:', error)
      return false
    }

    console.log('✅ [Logger] Log salvo com sucesso:', data)
    return true
  } catch (error) {
    console.error('❌ [Logger] Erro crítico ao registrar ação:', error)
    return false
  }
}

/**
 * Wrapper para operações de sucesso
 */
export const logSuccess = async (action, details = {}, options = {}) => {
  return await logAction(action, 'sucesso', details, options)
}

/**
 * Wrapper para operações de erro
 */
export const logError = async (action, error, details = {}, options = {}) => {
  const errorDetails = {
    ...details,
    error_message: error?.message || error || 'Erro desconhecido',
    error_type: error?.name || 'Unknown Error',
    error_code: error?.code || null,
    stack_trace: error?.stack || null
  }
  return await logAction(action, 'erro', errorDetails, options)
}

/**
 * Helpers específicos para diferentes tipos de ações
 */

// CRUD de Contatos
export const logContactAction = {
  create: (contactData, success = true, error = null) => 
    success 
      ? logSuccess('criar_contato', { 
          contact_email: contactData.email,
          contact_name: contactData.nome,
          has_phone: !!contactData.telefone,
          has_company: !!contactData.empresa
        })
      : logError('criar_contato', error, { attempted_email: contactData.email }),
  
  update: (contactId, updateData, success = true, error = null) =>
    success
      ? logSuccess('atualizar_contato', {
          contact_id: contactId,
          updated_fields: Object.keys(updateData),
          field_count: Object.keys(updateData).length
        })
      : logError('atualizar_contato', error, { contact_id: contactId }),
  
  delete: (contactId, contactEmail, success = true, error = null) =>
    success
      ? logSuccess('deletar_contato', {
          contact_id: contactId,
          contact_email: contactEmail
        })
      : logError('deletar_contato', error, { contact_id: contactId })
}

// CRUD de Templates
export const logTemplateAction = {
  create: (templateData, success = true, error = null) =>
    success
      ? logSuccess('criar_template', {
          template_name: templateData.nome,
          has_variables: Object.keys(templateData.variaveis || {}).length > 0,
          content_length: templateData.html_content?.length || 0
        })
      : logError('criar_template', error, { attempted_name: templateData.nome }),
  
  update: (templateId, templateData, success = true, error = null) =>
    success
      ? logSuccess('atualizar_template', {
          template_id: templateId,
          template_name: templateData.nome
        })
      : logError('atualizar_template', error, { template_id: templateId }),
  
  delete: (templateId, templateName, success = true, error = null) =>
    success
      ? logSuccess('deletar_template', {
          template_id: templateId,
          template_name: templateName
        })
      : logError('deletar_template', error, { template_id: templateId })
}

// CRUD de Variáveis
export const logVariableAction = {
  create: (variableData, success = true, error = null) =>
    success
      ? logSuccess('criar_variavel', {
          variable_name: variableData.name,
          variable_display_name: variableData.display_name,
          data_type: variableData.data_type,
          is_required: variableData.is_required
        })
      : logError('criar_variavel', error, { attempted_name: variableData.name }),
  
  update: (variableId, variableData, success = true, error = null) =>
    success
      ? logSuccess('atualizar_variavel', {
          variable_id: variableId,
          variable_name: variableData.name
        })
      : logError('atualizar_variavel', error, { variable_id: variableId }),
  
  delete: (variableId, variableName, success = true, error = null) =>
    success
      ? logSuccess('deletar_variavel', {
          variable_id: variableId,
          variable_name: variableName
        })
      : logError('deletar_variavel', error, { variable_id: variableId })
}

// CRUD de Tags
export const logTagAction = {
  create: (tagData, success = true, error = null) =>
    success
      ? logSuccess('criar_tag', {
          tag_name: tagData.nome,
          tag_color: tagData.color,
          tag_icon: tagData.icon
        })
      : logError('criar_tag', error, { attempted_name: tagData.nome }),
  
  delete: (tagId, tagName, success = true, error = null) =>
    success
      ? logSuccess('deletar_tag', {
          tag_id: tagId,
          tag_name: tagName
        })
      : logError('deletar_tag', error, { tag_id: tagId })
}

// Ações de Campanha
export const logCampaignAction = {
  create: (campaignData, success = true, error = null) =>
    success
      ? logSuccess('criar_campanha', {
          campaign_name: campaignData.nome,
          campaign_subject: campaignData.assunto,
          recipients_count: campaignData.segmentos?.length || 0
        })
      : logError('criar_campanha', error, { attempted_name: campaignData.nome }),
  
  schedule: (campaignId, campaignName, scheduledAt, success = true, error = null) =>
    success
      ? logSuccess('agendar_campanha', {
          campaign_id: campaignId,
          campaign_name: campaignName,
          scheduled_at: scheduledAt
        })
      : logError('agendar_campanha', error, { campaign_id: campaignId }),
  
  send: (campaignId, campaignName, recipientCount, success = true, error = null) =>
    success
      ? logSuccess('envio_campanha', {
          campaign_id: campaignId,
          campaign_name: campaignName,
          recipients_count: recipientCount
        })
      : logError('envio_campanha', error, { campaign_id: campaignId })
}

// Operações em massa
export const logBulkAction = {
  tagContacts: (contactIds, tagName, success = true, error = null) =>
    success
      ? logSuccess('bulk_tag_contatos', {
          contacts_count: contactIds.length,
          tag_name: tagName,
          contact_ids: contactIds.slice(0, 10) // Primeiros 10 IDs para referência
        })
      : logError('bulk_tag_contatos', error, { contacts_count: contactIds.length }),
  
  removeTagContacts: (contactIds, tagName, success = true, error = null) =>
    success
      ? logSuccess('bulk_remove_tag_contatos', {
          contacts_count: contactIds.length,
          tag_name: tagName,
          contact_ids: contactIds.slice(0, 10)
        })
      : logError('bulk_remove_tag_contatos', error, { contacts_count: contactIds.length })
}

const logger = {
  logAction,
  logSuccess,
  logError,
  logContactAction,
  logTemplateAction,
  logVariableAction,
  logTagAction,
  logCampaignAction,
  logBulkAction
}

export default logger