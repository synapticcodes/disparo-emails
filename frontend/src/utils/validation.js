// Utilitários de validação client-side

/**
 * Valida se um email está em formato válido
 * @param {string} email - Email a ser validado
 * @returns {boolean} - True se válido, false caso contrário
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  
  // Regex RFC 5322 compliant (versão simplificada)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  // Validações básicas
  if (email.length > 254) return false // RFC 5321 limit
  if (email.includes('..')) return false // Não permitir pontos consecutivos
  if (email.startsWith('.') || email.endsWith('.')) return false
  
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return false
  if (localPart.length > 64) return false // RFC 5321 limit
  
  return emailRegex.test(email)
}

/**
 * Valida lista de emails separados por vírgula
 * @param {string} emailList - Lista de emails
 * @returns {object} - { valid: boolean, invalidEmails: string[] }
 */
export const validateEmailList = (emailList) => {
  if (!emailList || typeof emailList !== 'string') {
    return { valid: false, invalidEmails: [] }
  }
  
  const emails = emailList.split(',').map(email => email.trim()).filter(email => email)
  const invalidEmails = emails.filter(email => !isValidEmail(email))
  
  return {
    valid: invalidEmails.length === 0,
    invalidEmails,
    totalEmails: emails.length
  }
}

/**
 * Valida se um assunto de email é válido
 * @param {string} subject - Assunto do email
 * @returns {object} - { valid: boolean, error?: string }
 */
export const validateSubject = (subject) => {
  if (!subject || typeof subject !== 'string') {
    return { valid: false, error: 'Assunto é obrigatório' }
  }
  
  const trimmedSubject = subject.trim()
  
  if (trimmedSubject.length === 0) {
    return { valid: false, error: 'Assunto não pode estar vazio' }
  }
  
  if (trimmedSubject.length > 998) {
    return { valid: false, error: 'Assunto muito longo (máximo 998 caracteres)' }
  }
  
  // Verificar caracteres de controle
  if (/[\x00-\x1F\x7F]/.test(trimmedSubject)) {
    return { valid: false, error: 'Assunto contém caracteres inválidos' }
  }
  
  return { valid: true }
}

/**
 * Valida conteúdo HTML de email
 * @param {string} html - Conteúdo HTML
 * @returns {object} - { valid: boolean, error?: string, warnings?: string[] }
 */
export const validateEmailContent = (html) => {
  if (!html || typeof html !== 'string') {
    return { valid: false, error: 'Conteúdo é obrigatório' }
  }
  
  const warnings = []
  
  // Verificar tamanho
  if (html.length > 1024 * 1024) { // 1MB
    return { valid: false, error: 'Conteúdo muito longo (máximo 1MB)' }
  }
  
  // Verificar scripts maliciosos
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /document\./gi,
    /window\./gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>/gi
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(html)) {
      return { valid: false, error: 'Conteúdo contém elementos potencialmente perigosos' }
    }
  }
  
  // Verificar se há conteúdo visível
  const textContent = html.replace(/<[^>]*>/g, '').trim()
  if (textContent.length === 0) {
    warnings.push('Email parece não ter conteúdo visível')
  }
  
  // Verificar links externos
  const externalLinks = html.match(/href=["']https?:\/\/[^"']+["']/gi)
  if (externalLinks && externalLinks.length > 50) {
    warnings.push('Muitos links externos detectados (pode afetar deliverability)')
  }
  
  // Verificar imagens sem alt text
  const imagesWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/gi)
  if (imagesWithoutAlt && imagesWithoutAlt.length > 0) {
    warnings.push('Algumas imagens não possuem texto alternativo')
  }
  
  return { valid: true, warnings }
}

/**
 * Valida nome de template/campanha
 * @param {string} name - Nome
 * @returns {object} - { valid: boolean, error?: string }
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Nome é obrigatório' }
  }
  
  const trimmedName = name.trim()
  
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Nome não pode estar vazio' }
  }
  
  if (trimmedName.length > 100) {
    return { valid: false, error: 'Nome muito longo (máximo 100 caracteres)' }
  }
  
  // Verificar caracteres especiais problemáticos
  if (/[<>'"&]/.test(trimmedName)) {
    return { valid: false, error: 'Nome contém caracteres não permitidos' }
  }
  
  return { valid: true }
}

/**
 * Valida ID de campanha
 * @param {string} id - ID da campanha
 * @returns {object} - { valid: boolean, error?: string }
 */
export const validateCampaignId = (id) => {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID da campanha é obrigatório' }
  }
  
  // Permitir apenas caracteres alfanuméricos, hífens e underscores
  if (!/^[a-zA-Z0-9-_]{1,50}$/.test(id)) {
    return { valid: false, error: 'ID da campanha deve conter apenas letras, números, hífens e underscores (máximo 50 caracteres)' }
  }
  
  return { valid: true }
}

/**
 * Valida tags de contato
 * @param {string} tags - Tags separadas por vírgula
 * @returns {object} - { valid: boolean, error?: string, sanitizedTags: string[] }
 */
export const validateTags = (tags) => {
  if (!tags || typeof tags !== 'string') {
    return { valid: true, sanitizedTags: [] }
  }
  
  const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag)
  const sanitizedTags = []
  
  for (const tag of tagArray) {
    if (tag.length > 50) {
      return { valid: false, error: 'Tag muito longa (máximo 50 caracteres)' }
    }
    
    if (!/^[a-zA-Z0-9\s_-]+$/.test(tag)) {
      return { valid: false, error: 'Tags devem conter apenas letras, números, espaços, hífens e underscores' }
    }
    
    sanitizedTags.push(tag)
  }
  
  if (sanitizedTags.length > 20) {
    return { valid: false, error: 'Máximo 20 tags por contato' }
  }
  
  return { valid: true, sanitizedTags }
}

/**
 * Valida data de agendamento
 * @param {string|Date} scheduledAt - Data de agendamento
 * @returns {object} - { valid: boolean, error?: string }
 */
export const validateScheduledDate = (scheduledAt) => {
  if (!scheduledAt) {
    return { valid: true } // Agendamento é opcional
  }
  
  const date = new Date(scheduledAt)
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Data de agendamento inválida' }
  }
  
  const now = new Date()
  const minDate = new Date(now.getTime() + 5 * 60 * 1000) // Mínimo 5 minutos no futuro
  const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // Máximo 1 ano no futuro
  
  if (date < minDate) {
    return { valid: false, error: 'Data de agendamento deve ser pelo menos 5 minutos no futuro' }
  }
  
  if (date > maxDate) {
    return { valid: false, error: 'Data de agendamento não pode ser mais de 1 ano no futuro' }
  }
  
  return { valid: true }
}

/**
 * Valida formulário de envio de email
 * @param {object} formData - Dados do formulário
 * @returns {object} - { valid: boolean, errors: object }
 */
export const validateEmailForm = (formData) => {
  const errors = {}
  
  // Validar destinatário
  const emailValidation = isValidEmail(formData.to)
  if (!emailValidation) {
    errors.to = 'Email do destinatário inválido'
  }
  
  // Validar assunto
  const subjectValidation = validateSubject(formData.subject)
  if (!subjectValidation.valid) {
    errors.subject = subjectValidation.error
  }
  
  // Validar conteúdo
  const contentValidation = validateEmailContent(formData.html)
  if (!contentValidation.valid) {
    errors.html = contentValidation.error
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Valida formulário de campanha
 * @param {object} formData - Dados do formulário
 * @returns {object} - { valid: boolean, errors: object }
 */
export const validateCampaignForm = (formData) => {
  const errors = {}
  
  // Validar nome
  const nameValidation = validateName(formData.name)
  if (!nameValidation.valid) {
    errors.name = nameValidation.error
  }
  
  // Validar assunto
  const subjectValidation = validateSubject(formData.subject)
  if (!subjectValidation.valid) {
    errors.subject = subjectValidation.error
  }
  
  // Validar template
  if (!formData.template_id) {
    errors.template_id = 'Template é obrigatório'
  }
  
  // Validar data de agendamento
  if (formData.scheduled_at) {
    const scheduleValidation = validateScheduledDate(formData.scheduled_at)
    if (!scheduleValidation.valid) {
      errors.scheduled_at = scheduleValidation.error
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Sanitiza entrada de texto removendo caracteres perigosos
 * @param {string} input - Texto de entrada
 * @returns {string} - Texto sanitizado
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remover < e >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+\s*=/gi, '') // Remover event handlers
    .trim()
}

/**
 * Verifica se o conteúdo contém spam patterns
 * @param {string} content - Conteúdo a verificar
 * @returns {object} - { isSpam: boolean, patterns: string[] }
 */
export const checkSpamPatterns = (content) => {
  if (!content || typeof content !== 'string') {
    return { isSpam: false, patterns: [] }
  }
  
  const spamPatterns = [
    /\$\$\$/g, // Múltiplos símbolos de dólar
    /URGENT|URGENTE/gi,
    /FREE|GRÁTIS|GRATUITO/gi,
    /WIN NOW|GANHE AGORA/gi,
    /CLICK HERE|CLIQUE AQUI/gi,
    /100% FREE|100% GRÁTIS/gi,
    /MAKE MONEY|GANHE DINHEIRO/gi,
    /ACT NOW|AJA AGORA/gi
  ]
  
  const foundPatterns = []
  
  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      foundPatterns.push(pattern.source)
    }
  }
  
  return {
    isSpam: foundPatterns.length >= 3, // Considerar spam se 3+ patterns
    patterns: foundPatterns
  }
}