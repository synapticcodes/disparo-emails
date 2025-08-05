const rateLimit = require('express-rate-limit')
const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * Middleware de autenticação robusta
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const userAgent = req.headers['user-agent']
    const ip = req.ip || req.connection.remoteAddress
    
    // Log de tentativa de acesso
    console.log(`[AUTH_ATTEMPT] IP: ${ip}, User-Agent: ${userAgent}, Path: ${req.path}, Method: ${req.method}`)
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[AUTH_FAIL] Missing token - IP: ${ip}`)
      return res.status(401).json({ 
        error: 'Token de acesso requerido',
        code: 'MISSING_TOKEN'
      })
    }
    
    const token = authHeader.split(' ')[1]
    
    if (!token || token.length < 10) {
      console.log(`[AUTH_FAIL] Invalid token format - IP: ${ip}`)
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN_FORMAT'
      })
    }
    
    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.log(`[AUTH_FAIL] Token verification failed - IP: ${ip}, Error: ${error?.message}`)
      return res.status(401).json({ 
        error: 'Token inválido ou expirado',
        code: 'TOKEN_VERIFICATION_FAILED'
      })
    }
    
    // Verificar se usuário está ativo
    if (user.email_confirmed_at === null) {
      console.log(`[AUTH_FAIL] Unconfirmed user - Email: ${user.email}`)
      return res.status(401).json({ 
        error: 'Email não confirmado',
        code: 'EMAIL_NOT_CONFIRMED'
      })
    }
    
    req.user = user
    req.authToken = token
    
    console.log(`[AUTH_SUCCESS] User authenticated: ${user.email}, ID: ${user.id}`)
    next()
  } catch (error) {
    console.error(`[AUTH_ERROR] ${error.message}`)
    res.status(500).json({ 
      error: 'Erro interno de autenticação',
      code: 'AUTH_INTERNAL_ERROR'
    })
  }
}

/**
 * Middleware de validação de entrada
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware
 */
const inputValidationMiddleware = (req, res, next) => {
  const { body, params, query } = req
  
  // Verificar tamanho do payload
  const payloadSize = JSON.stringify(body).length
  if (payloadSize > 10 * 1024 * 1024) { // 10MB
    console.log(`[SECURITY] Large payload detected: ${payloadSize} bytes`)
    return res.status(413).json({ 
      error: 'Payload muito grande',
      code: 'PAYLOAD_TOO_LARGE'
    })
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
    /<embed[^>]*>/gi
  ]
  
  const checkForDangerousContent = (obj, path = '') => {
    if (typeof obj === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(obj)) {
          console.log(`[SECURITY] Dangerous content detected in ${path}: ${pattern}`)
          return true
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (checkForDangerousContent(value, `${path}.${key}`)) {
          return true
        }
      }
    }
    return false
  }
  
  if (checkForDangerousContent(body, 'body') || 
      checkForDangerousContent(params, 'params') || 
      checkForDangerousContent(query, 'query')) {
    return res.status(400).json({ 
      error: 'Conteúdo potencialmente perigoso detectado',
      code: 'DANGEROUS_CONTENT'
    })
  }
  
  // Verificar SQL injection patterns
  const sqlPatterns = [
    /('|(\\')|(;)|(\\;))/i,
    /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /UNION.*SELECT/i,
    /SELECT.*FROM/i,
    /INSERT.*INTO/i,
    /DELETE.*FROM/i,
    /UPDATE.*SET/i,
    /DROP.*TABLE/i
  ]
  
  const checkForSQLInjection = (obj) => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj))
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkForSQLInjection)
    }
    return false
  }
  
  if (checkForSQLInjection(body) || checkForSQLInjection(params) || checkForSQLInjection(query)) {
    console.log(`[SECURITY] SQL injection attempt detected`)
    return res.status(400).json({ 
      error: 'Tentativa de injeção SQL detectada',
      code: 'SQL_INJECTION_ATTEMPT'
    })
  }
  
  next()
}

/**
 * Rate limiter para emails individuais
 */
const emailRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 emails por minuto
  message: {
    error: 'Limite de envios excedido. Tente novamente em 1 minuto.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `email_${req.user?.id || req.ip}`,
  onLimitReached: (req) => {
    console.log(`[RATE_LIMIT] Email rate limit exceeded for user: ${req.user?.email || req.ip}`)
  }
})

/**
 * Rate limiter para campanhas
 */
const campaignRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // 5 campanhas por 5 minutos
  message: {
    error: 'Limite de campanhas excedido. Tente novamente em 5 minutos.',
    code: 'CAMPAIGN_RATE_LIMIT_EXCEEDED',
    retryAfter: 300
  },
  keyGenerator: (req) => `campaign_${req.user?.id || req.ip}`,
  onLimitReached: (req) => {
    console.log(`[RATE_LIMIT] Campaign rate limit exceeded for user: ${req.user?.email || req.ip}`)
  }
})

/**
 * Rate limiter global para API
 */
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por 15 minutos
  message: {
    error: 'Muitas requisições. Tente novamente mais tarde.',
    code: 'GLOBAL_RATE_LIMIT_EXCEEDED',
    retryAfter: 900
  },
  keyGenerator: (req) => req.ip,
  onLimitReached: (req) => {
    console.log(`[RATE_LIMIT] Global rate limit exceeded for IP: ${req.ip}`)
  }
})

/**
 * Middleware para verificar domínios suspeitos
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware
 */
const checkSuspiciousDomains = (req, res, next) => {
  const { to } = req.body
  
  if (!to) return next()
  
  const suspiciousDomains = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'temp-mail.org',
    'yopmail.com',
    'throwaway.email',
    'maildrop.cc'
  ]
  
  const emails = Array.isArray(to) ? to : [to]
  
  for (const email of emails) {
    if (typeof email === 'string') {
      const domain = email.split('@')[1]?.toLowerCase()
      if (suspiciousDomains.includes(domain)) {
        console.log(`[SECURITY] Suspicious domain detected: ${domain} for user: ${req.user?.email}`)
        return res.status(400).json({ 
          error: 'Domínio não permitido',
          code: 'SUSPICIOUS_DOMAIN',
          domain
        })
      }
    }
  }
  
  next()
}

/**
 * Middleware de log de segurança
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware
 */
const securityLogger = (req, res, next) => {
  const start = Date.now()
  
  // Interceptar a resposta
  const originalSend = res.send
  res.send = function(data) {
    const duration = Date.now() - start
    const statusCode = res.statusCode
    
    // Log detalhado para eventos de segurança
    if (statusCode >= 400) {
      console.log(`[SECURITY_EVENT] ${statusCode} ${req.method} ${req.path} - User: ${req.user?.email || 'Anonymous'} - IP: ${req.ip} - Duration: ${duration}ms - UA: ${req.headers['user-agent']}`)
      
      // Log payload para erros 400 (possíveis ataques)
      if (statusCode === 400 && req.body) {
        console.log(`[SECURITY_PAYLOAD] ${JSON.stringify(req.body)}`)
      }
    }
    
    // Log de ações críticas
    if (req.path.includes('/email/send') || req.path.includes('/campaign/send')) {
      console.log(`[EMAIL_ACTION] ${statusCode} ${req.method} ${req.path} - User: ${req.user?.email} - Duration: ${duration}ms`)
    }
    
    originalSend.call(this, data)
  }
  
  next()
}

/**
 * Validação rigorosa para emails
 * @param {string} email - Email para validar
 * @returns {boolean} - True se válido
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  
  // RFC 5322 regex (versão mais rigorosa)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  // Validações adicionais
  if (email.length > 254) return false
  if (email.includes('..')) return false
  if (email.startsWith('.') || email.endsWith('.')) return false
  
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return false
  if (localPart.length > 64) return false
  
  return emailRegex.test(email)
}

/**
 * Middleware para validar emails
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {function} next - Next middleware
 */
const emailValidation = (req, res, next) => {
  const { to } = req.body
  
  if (!to) {
    return res.status(400).json({ 
      error: 'Email do destinatário é obrigatório',
      code: 'MISSING_RECIPIENT'
    })
  }
  
  if (!isValidEmail(to)) {
    return res.status(400).json({ 
      error: 'Email do destinatário inválido',
      code: 'INVALID_EMAIL'
    })
  }
  
  next()
}

/**
 * Verificar limite diário de envios por usuário
 */
const checkDailyLimit = async (req, res, next) => {
  try {
    const userId = req.user.id
    const today = new Date().toISOString().split('T')[0]
    
    // Buscar logs de envio do dia
    const { data: logs, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .eq('action', 'envio_direto')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
    
    if (error) {
      console.error(`[DAILY_LIMIT] Error checking daily limit: ${error.message}`)
      // Permitir continuar em caso de erro do banco
      return next()
    }
    
    const dailyLimit = 100 // Limite diário por usuário
    if (logs && logs.length >= dailyLimit) {
      console.log(`[DAILY_LIMIT] Daily limit exceeded for user: ${req.user.email}`)
      return res.status(429).json({ 
        error: 'Limite diário de envios excedido',
        code: 'DAILY_LIMIT_EXCEEDED',
        limit: dailyLimit,
        used: logs.length
      })
    }
    
    next()
  } catch (error) {
    console.error(`[DAILY_LIMIT] Error: ${error.message}`)
    next() // Permitir continuar em caso de erro
  }
}

/**
 * Middleware para detectar comportamento suspeito
 */
const suspiciousBehaviorDetection = async (req, res, next) => {
  try {
    const userId = req.user.id
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    
    // Verificar atividade recente
    const { data: recentActivity, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', fiveMinutesAgo.toISOString())
    
    if (error) {
      console.error(`[SUSPICIOUS] Error checking recent activity: ${error.message}`)
      return next()
    }
    
    // Detectar padrões suspeitos
    const emailsSentRecently = recentActivity?.filter(log => log.action === 'envio_direto').length || 0
    const campaignsSentRecently = recentActivity?.filter(log => log.action === 'envio_campanha').length || 0
    
    // Alerta para atividade anômala
    if (emailsSentRecently > 50 || campaignsSentRecently > 10) {
      console.log(`[SUSPICIOUS] Anomalous activity detected for user: ${req.user.email} - Emails: ${emailsSentRecently}, Campaigns: ${campaignsSentRecently}`)
      
      // Notificar mas não bloquear (pode ser legítimo)
      // Em produção, implementar sistema de alertas
    }
    
    next()
  } catch (error) {
    console.error(`[SUSPICIOUS] Error: ${error.message}`)
    next()
  }
}

module.exports = {
  authMiddleware,
  inputValidationMiddleware,
  emailRateLimit,
  campaignRateLimit,
  globalRateLimit,
  checkSuspiciousDomains,
  securityLogger,
  emailValidation,
  checkDailyLimit,
  suspiciousBehaviorDetection,
  isValidEmail
}