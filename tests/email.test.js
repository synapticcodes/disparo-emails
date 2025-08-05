const request = require('supertest')
const express = require('express')

// Mock do SendGrid
const mockSgMail = {
  setApiKey: jest.fn(),
  send: jest.fn()
}

jest.mock('@sendgrid/mail', () => mockSgMail)

// App de teste
const app = express()
app.use(express.json())

// Mock middleware de auth
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user', email: 'test@example.com' }
  next()
}

// Mock do endpoint de envio
app.post('/api/email/send', mockAuth, async (req, res) => {
  const { to, subject, html } = req.body
  
  try {
    // Validações
    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios: to, subject, html' })
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Email inválido' })
    }

    // Validação de tamanho
    if (subject.length > 998) {
      return res.status(400).json({ error: 'Assunto muito longo (máximo 998 caracteres)' })
    }

    if (html.length > 1000000) {
      return res.status(400).json({ error: 'Conteúdo muito longo (máximo 1MB)' })
    }

    // Mock do envio via SendGrid
    const msg = {
      to,
      from: 'avisos@lembretescredilly.com',
      subject,
      html,
    }

    await mockSgMail.send(msg)
    
    res.json({ success: true, messageId: 'mock-message-id' })
  } catch (error) {
    if (error.code === 403) {
      res.status(403).json({ error: 'API key do SendGrid inválida ou sem permissões' })
    } else if (error.code === 429) {
      res.status(429).json({ error: 'Limite de envios excedido' })
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
})

// Mock endpoint de campanha
app.post('/api/campaign/send', mockAuth, async (req, res) => {
  const { campaign_id } = req.body
  
  if (!campaign_id) {
    return res.status(400).json({ error: 'ID da campanha é obrigatório' })
  }

  // Simular busca da campanha (mock)
  const mockCampaign = {
    id: campaign_id,
    name: 'Test Campaign',
    subject: 'Test Subject',
    template_html: '<p>Hello {{name}}</p>',
    remetente: 'avisos@lembretescredilly.com'
  }

  // Simular contatos (mock)
  const mockContacts = [
    { email: 'contact1@test.com', nome: 'Contact 1' },
    { email: 'contact2@test.com', nome: 'Contact 2' }
  ]

  try {
    // Simular envio em lote
    const personalizations = mockContacts.map(contact => ({
      to: [{ email: contact.email }],
      substitutions: { '{{name}}': contact.nome }
    }))

    const msg = {
      personalizations,
      from: mockCampaign.remetente,
      subject: mockCampaign.subject,
      html: mockCampaign.template_html
    }

    await mockSgMail.send(msg)
    
    res.json({ 
      success: true, 
      sent_count: mockContacts.length,
      campaign_id 
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar campanha' })
  }
})

describe('Testes de Envio de Email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSgMail.send.mockResolvedValue([{ statusCode: 202 }])
  })

  test('Deve enviar email individual com sucesso', async () => {
    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>'
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.messageId).toBeDefined()
    expect(mockSgMail.send).toHaveBeenCalledWith({
      to: 'test@example.com',
      from: 'avisos@lembretescredilly.com',
      subject: 'Test Email',
      html: '<p>Hello World</p>'
    })
  })

  test('Deve rejeitar email com destinatário inválido', async () => {
    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(400)

    expect(response.body.error).toBe('Email inválido')
    expect(mockSgMail.send).not.toHaveBeenCalled()
  })

  test('Deve rejeitar email com assunto muito longo', async () => {
    const longSubject = 'A'.repeat(999)
    
    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: longSubject,
        html: '<p>Test</p>'
      })
      .expect(400)

    expect(response.body.error).toBe('Assunto muito longo (máximo 998 caracteres)')
  })

  test('Deve rejeitar email com conteúdo muito longo', async () => {
    const longHtml = '<p>' + 'A'.repeat(1000001) + '</p>'
    
    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: longHtml
      })
      .expect(400)

    expect(response.body.error).toBe('Conteúdo muito longo (máximo 1MB)')
  })

  test('Deve tratar erro de API key inválida', async () => {
    mockSgMail.send.mockRejectedValue({ code: 403, message: 'Forbidden' })

    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(403)

    expect(response.body.error).toBe('API key do SendGrid inválida ou sem permissões')
  })

  test('Deve tratar limite de envios excedido', async () => {
    mockSgMail.send.mockRejectedValue({ code: 429, message: 'Too Many Requests' })

    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(429)

    expect(response.body.error).toBe('Limite de envios excedido')
  })

  test('Deve tratar erros gerais do servidor', async () => {
    mockSgMail.send.mockRejectedValue(new Error('Generic error'))

    const response = await request(app)
      .post('/api/email/send')
      .send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      })
      .expect(500)

    expect(response.body.error).toBe('Erro interno do servidor')
  })
})

describe('Testes de Envio de Campanha', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSgMail.send.mockResolvedValue([{ statusCode: 202 }])
  })

  test('Deve enviar campanha com sucesso', async () => {
    const response = await request(app)
      .post('/api/campaign/send')
      .send({
        campaign_id: 'test-campaign-123'
      })
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.sent_count).toBe(2)
    expect(response.body.campaign_id).toBe('test-campaign-123')
    expect(mockSgMail.send).toHaveBeenCalled()
  })

  test('Deve rejeitar campanha sem ID', async () => {
    const response = await request(app)
      .post('/api/campaign/send')
      .send({})
      .expect(400)

    expect(response.body.error).toBe('ID da campanha é obrigatório')
    expect(mockSgMail.send).not.toHaveBeenCalled()
  })

  test('Deve tratar erro no envio de campanha', async () => {
    mockSgMail.send.mockRejectedValue(new Error('SendGrid error'))

    const response = await request(app)
      .post('/api/campaign/send')
      .send({
        campaign_id: 'test-campaign-123'
      })
      .expect(500)

    expect(response.body.error).toBe('Erro ao enviar campanha')
  })
})

describe('Testes de Performance e Limites', () => {
  test('Deve processar múltiplos emails simultâneos', async () => {
    const promises = []
    
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/email/send')
          .send({
            to: `test${i}@example.com`,
            subject: `Test ${i}`,
            html: `<p>Test email ${i}</p>`
          })
      )
    }

    const responses = await Promise.all(promises)
    
    responses.forEach(response => {
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    expect(mockSgMail.send).toHaveBeenCalledTimes(5)
  })

  test('Deve validar caracteres especiais em emails', async () => {
    const specialChars = [
      'user+tag@example.com',
      'user.name@example.com',
      'user_name@example.com',
      'user-name@example.com'
    ]

    for (const email of specialChars) {
      const response = await request(app)
        .post('/api/email/send')
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
      'invalid.email',
      '@example.com',
      'user@',
      'user@@example.com',
      'user@.com',
      'user@example.',
      ''
    ]

    for (const email of invalidEmails) {
      const response = await request(app)
        .post('/api/email/send')
        .send({
          to: email,
          subject: 'Test',
          html: '<p>Test</p>'
        })
        .expect(400)

      expect(response.body.error).toBe('Email inválido')
    }
  })
})