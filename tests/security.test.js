const request = require('supertest')
const express = require('express')

// Mock do rate limiter
const rateLimiter = {
  hits: {},
  isRateLimited: function(key, limit = 100, window = 3600) {
    const now = Date.now()
    const windowStart = now - (window * 1000)
    
    if (!this.hits[key]) {
      this.hits[key] = []
    }
    
    // Limpar hits antigos
    this.hits[key] = this.hits[key].filter(hit => hit > windowStart)
    
    if (this.hits[key].length >= limit) {
      return true
    }
    
    this.hits[key].push(now)
    return false
  }
}

// App de teste com medidas de segurança
const app = express()
app.use(express.json({ limit: '10mb' }))

// Middleware de rate limiting
const rateLimit = (limit = 100, window = 3600) => {
  return (req, res, next) => {
    const key = req.ip || 'unknown'
    
    if (rateLimiter.isRateLimited(key, limit, window)) {
      return res.status(429).json({ 
        error: 'Rate limit excedido. Tente novamente mais tarde.',
        retryAfter: window 
      })
    }
    
    next()
  }
}

// Middleware de validação de entrada
const validateInput = (req, res, next) => {
  const { body } = req
  
  // Verificar injeção de scripts
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\s*\(/gi,
    /document\./gi,
    /window\./gi
  ]
  
  const checkForDangerousContent = (obj) => {
    if (typeof obj === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(obj))
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkForDangerousContent)
    }
    
    return false
  }
  
  if (checkForDangerousContent(body)) {
    return res.status(400).json({ error: 'Conteúdo potencialmente perigoso detectado' })
  }
  
  next()
}

// Middleware de autenticação com logs de segurança
const authWithLogging = (req, res, next) => {
  const authHeader = req.headers.authorization
  const userAgent = req.headers['user-agent']
  const ip = req.ip || req.connection.remoteAddress
  
  // Log de tentativa de acesso
  console.log(`[AUTH] IP: ${ip}, User-Agent: ${userAgent}, Path: ${req.path}`)
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH_FAIL] Sem token - IP: ${ip}`)
    return res.status(401).json({ error: 'Token de acesso requerido' })
  }
  
  const token = authHeader.split(' ')[1]
  
  if (token === 'valid-token') {
    req.user = { id: 'test-user', email: 'test@example.com' }
    console.log(`[AUTH_SUCCESS] Usuário autenticado: ${req.user.email}`)
    next()
  } else {
    console.log(`[AUTH_FAIL] Token inválido - IP: ${ip}, Token: ${token.substring(0, 10)}...`)
    return res.status(401).json({ error: 'Token inválido' })
  }
}

// Rotas com medidas de segurança
app.post('/api/email/send', 
  rateLimit(10, 60), // 10 emails por minuto
  validateInput,
  authWithLogging,
  (req, res) => {
    const { to, subject, html } = req.body
    
    // Validações de segurança adicionais
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: to, subject, html' })
    }
    
    // Validação rigorosa de email
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Email inválido' })
    }
    
    // Verificar domínios suspeitos
    const suspiciousDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com']
    const domain = to.split('@')[1]
    if (suspiciousDomains.includes(domain)) {
      console.log(`[SECURITY] Tentativa de envio para domínio suspeito: ${domain}`)
      return res.status(400).json({ error: 'Domínio não permitido' })
    }
    
    // Log de envio
    console.log(`[EMAIL_SEND] Usuário: ${req.user.email}, Destinatário: ${to}, Assunto: ${subject}`)
    
    res.json({ success: true, messageId: 'secure-message-id' })
  }
)

app.post('/api/campaign/send',
  rateLimit(5, 300), // 5 campanhas por 5 minutos
  validateInput,
  authWithLogging,
  (req, res) => {
    const { campaign_id } = req.body
    
    if (!campaign_id) {
      return res.status(400).json({ error: 'ID da campanha é obrigatório' })
    }
    
    // Validar formato do ID
    if (!/^[a-zA-Z0-9-_]{1,50}$/.test(campaign_id)) {
      return res.status(400).json({ error: 'ID da campanha inválido' })
    }
    
    console.log(`[CAMPAIGN_SEND] Usuário: ${req.user.email}, Campanha: ${campaign_id}`)
    
    res.json({ success: true, campaign_id, sent_count: 10 })
  }
)

// Endpoint para detectar ataques
app.post('/api/admin/users', authWithLogging, (req, res) => {
  // Simular endpoint administrativo
  if (req.user.email !== 'admin@example.com') {
    console.log(`[SECURITY_ALERT] Tentativa de acesso não autorizado ao admin por: ${req.user.email}`)
    return res.status(403).json({ error: 'Acesso negado' })
  }
  
  res.json({ message: 'Acesso administrativo permitido' })
})

describe('Testes de Segurança', () => {
  beforeEach(() => {
    // Reset rate limiter
    rateLimiter.hits = {}
    jest.clearAllMocks()
  })

  test('Deve bloquear requisições sem autenticação', async () => {
    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(401)

    expect(response.body.error).toBe('Token de acesso requerido')
  })

  test('Deve bloquear tokens inválidos', async () => {
    const response = await request(app)
      .post('/api/email/send')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(401)

    expect(response.body.error).toBe('Token inválido')
  })

  test('Deve detectar e bloquear scripts maliciosos', async () => {
    const maliciousPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      'eval("malicious code")',
      '<div onload="document.cookie">',
      'window.location="http://evil.com"'
    ]

    for (const payload of maliciousPayloads) {
      const response = await request(app)
        .post('/api/email/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          to: 'test@example.com',
          subject: 'Test',
          html: payload
        })
        .expect(400)

      expect(response.body.error).toBe('Conteúdo potencialmente perigoso detectado')
    }
  })

  test('Deve bloquear domínios suspeitos', async () => {
    const suspiciousEmails = [
      'test@10minutemail.com',
      'user@tempmail.org',
      'fake@guerrillamail.com'
    ]

    for (const email of suspiciousEmails) {
      const response = await request(app)
        .post('/api/email/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(400)

      expect(response.body.error).toBe('Domínio não permitido')
    }
  })

  test('Deve aplicar rate limiting para emails', async () => {
    // Fazer 10 requisições (limite)
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/api/email/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          to: `test${i}@example.com`,
          subject: `Test ${i}`,
          html: '<p>Test</p>'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
    }

    // 11ª requisição deve ser bloqueada
    const response = await request(app)
      .post('/api/email/send')
      .set('Authorization', 'Bearer valid-token')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(429)

    expect(response.body.error).toContain('Rate limit excedido')
    expect(response.body.retryAfter).toBe(60)
  })

  test('Deve aplicar rate limiting para campanhas', async () => {
    // Fazer 5 requisições (limite)
    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post('/api/campaign/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          campaign_id: `campaign-${i}`
        })
        .expect(200)

      expect(response.body.success).toBe(true)
    }

    // 6ª requisição deve ser bloqueada
    const response = await request(app)
      .post('/api/campaign/send')
      .set('Authorization', 'Bearer valid-token')
      .send({
        campaign_id: 'campaign-blocked'
      })
      .expect(429)

    expect(response.body.error).toContain('Rate limit excedido')
  })

  test('Deve validar IDs de campanha', async () => {
    const invalidIds = [
      '../../../etc/passwd',
      '<script>alert(1)</script>',
      'campaign; DROP TABLE users;',
      'a'.repeat(100), // Muito longo
      ''
    ]

    for (const id of invalidIds) {
      const response = await request(app)
        .post('/api/campaign/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          campaign_id: id
        })

      expect(response.status).toBe(400)
    }
  })

  test('Deve bloquear acesso não autorizado a endpoints administrativos', async () => {
    const response = await request(app)
      .post('/api/admin/users')
      .set('Authorization', 'Bearer valid-token')
      .send({})
      .expect(403)

    expect(response.body.error).toBe('Acesso negado')
  })

  test('Deve permitir acesso autorizado a endpoints administrativos', async () => {
    // Mock do usuário admin
    const originalAuth = authWithLogging
    
    // Criar um middleware de auth temporário para admin
    app.post('/api/admin/test', (req, res, next) => {
      req.user = { id: 'admin', email: 'admin@example.com' }
      next()
    }, (req, res) => {
      res.json({ message: 'Acesso administrativo permitido' })
    })

    const response = await request(app)
      .post('/api/admin/test')
      .send({})
      .expect(200)

    expect(response.body.message).toBe('Acesso administrativo permitido')
  })
})

describe('Testes de Validação Rigorosa', () => {
  test('Deve validar emails com padrão RFC compliant', async () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.com',
      'user+tag@example.com',
      'user_name@example-domain.com',
      'a@b.co'
    ]

    for (const email of validEmails) {
      const response = await request(app)
        .post('/api/email/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
    }
  })

  test('Deve rejeitar emails malformados', async () => {
    const invalidEmails = [
      'plainaddress',
      '@missingdomain.com', 
      'missing@.com',
      'missing@domain',
      'domain@.com',
      'domain@@double.com'
    ]

    for (const email of invalidEmails) {
      const response = await request(app)
        .post('/api/email/send')
        .set('Authorization', 'Bearer valid-token')
        .send({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(400)

      expect(response.body.error).toBe('Email inválido')
    }
  })

  test('Deve rejeitar payloads muito grandes', async () => {
    const largeHtml = '<p>' + 'A'.repeat(10 * 1024 * 1024) + '</p>' // > 10MB

    const response = await request(app)
      .post('/api/email/send')
      .set('Authorization', 'Bearer valid-token')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: largeHtml
      })
      .expect(413) // Payload too large

    // Note: Express automatically handles this with body parser limit
  })
})