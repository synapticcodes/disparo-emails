const { createClient } = require('@supabase/supabase-js')

// Configuração do Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * Sistema de monitoramento e alertas
 */
class SecurityMonitor {
  constructor() {
    this.alertThresholds = {
      failedLogins: 5, // por minuto
      suspiciousEmails: 10, // por hora
      errorRate: 0.1, // 10% de taxa de erro
      responseTime: 5000 // 5 segundos
    }
    
    this.metrics = {
      requests: 0,
      errors: 0,
      failedLogins: 0,
      lastReset: Date.now()
    }
  }

  /**
   * Log de evento de segurança
   * @param {string} type - Tipo do evento
   * @param {string} message - Mensagem
   * @param {object} data - Dados adicionais
   * @param {string} severity - Severidade (low, medium, high, critical)
   */
  async logSecurityEvent(type, message, data = {}, severity = 'medium') {
    const event = {
      type,
      message,
      data: JSON.stringify(data),
      severity,
      timestamp: new Date().toISOString(),
      ip: data.ip || 'unknown',
      user_id: data.userId || null,
      user_agent: data.userAgent || null
    }

    try {
      // Salvar no banco
      await supabase.from('security_events').insert(event)
      
      // Log no console
      console.log(`[SECURITY_${severity.toUpperCase()}] ${type}: ${message}`, data)
      
      // Enviar alerta se crítico
      if (severity === 'critical') {
        await this.sendCriticalAlert(event)
      }
    } catch (error) {
      console.error(`[MONITOR_ERROR] Failed to log security event: ${error.message}`)
    }
  }

  /**
   * Monitorar tentativas de login falhadas
   * @param {string} email - Email do usuário
   * @param {string} ip - IP da requisição
   * @param {string} userAgent - User agent
   */
  async trackFailedLogin(email, ip, userAgent) {
    this.metrics.failedLogins++
    
    await this.logSecurityEvent('FAILED_LOGIN', `Login failed for ${email}`, {
      email,
      ip,
      userAgent
    }, 'medium')

    // Verificar se excedeu threshold
    if (this.metrics.failedLogins > this.alertThresholds.failedLogins) {
      await this.logSecurityEvent('BRUTE_FORCE_ALERT', 
        `Possible brute force attack detected: ${this.metrics.failedLogins} failed logins in 1 minute`,
        { ip, userAgent },
        'high'
      )
    }
  }

  /**
   * Monitorar envios suspeitos
   * @param {string} userId - ID do usuário
   * @param {string} to - Destinatário
   * @param {string} reason - Motivo da suspeita
   */
  async trackSuspiciousEmail(userId, to, reason) {
    await this.logSecurityEvent('SUSPICIOUS_EMAIL', 
      `Suspicious email detected: ${reason}`,
      { userId, to, reason },
      'high'
    )
  }

  /**
   * Monitorar taxa de erro
   * @param {number} statusCode - Código de status HTTP
   * @param {string} path - Path da requisição
   * @param {string} userId - ID do usuário
   */
  async trackRequest(statusCode, path, userId = null) {
    this.metrics.requests++
    
    if (statusCode >= 400) {
      this.metrics.errors++
    }

    // Verificar taxa de erro a cada 100 requests
    if (this.metrics.requests % 100 === 0) {
      const errorRate = this.metrics.errors / this.metrics.requests
      
      if (errorRate > this.alertThresholds.errorRate) {
        await this.logSecurityEvent('HIGH_ERROR_RATE',
          `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
          { errorRate, totalRequests: this.metrics.requests, totalErrors: this.metrics.errors },
          'high'
        )
      }
    }
  }

  /**
   * Detectar padrões de ataque
   * @param {string} ip - IP da requisição
   * @param {string} path - Path da requisição
   * @param {object} payload - Payload da requisição
   */
  async detectAttackPatterns(ip, path, payload) {
    const patterns = {
      sqlInjection: [
        /('|(\\')|(;)|(\\;))/i,
        /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
        /UNION.*SELECT/i,
        /DROP.*TABLE/i
      ],
      xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ],
      pathTraversal: [
        /\.\.\//g,
        /\.\.\\/g,
        /etc\/passwd/i,
        /proc\/self/i
      ]
    }

    const payloadStr = JSON.stringify(payload)
    
    for (const [attackType, attackPatterns] of Object.entries(patterns)) {
      for (const pattern of attackPatterns) {
        if (pattern.test(payloadStr) || pattern.test(path)) {
          await this.logSecurityEvent('ATTACK_DETECTED',
            `${attackType.toUpperCase()} attack detected`,
            { ip, path, pattern: pattern.source, payload: payloadStr.substring(0, 200) },
            'critical'
          )
          return true
        }
      }
    }

    return false
  }

  /**
   * Enviar alerta crítico
   * @param {object} event - Evento de segurança
   */
  async sendCriticalAlert(event) {
    // Em produção, integrar com serviços como Slack, Discord, email, etc.
    console.error(`🚨 CRITICAL SECURITY ALERT 🚨`)
    console.error(`Type: ${event.type}`)
    console.error(`Message: ${event.message}`)
    console.error(`Time: ${event.timestamp}`)
    console.error(`IP: ${event.ip}`)
    console.error(`Data: ${event.data}`)
    console.error(`=====================================`)
    
    // Salvar alerta crítico separadamente para investigação
    try {
      await supabase.from('critical_alerts').insert({
        event_type: event.type,
        message: event.message,
        event_data: event.data,
        ip: event.ip,
        timestamp: event.timestamp,
        investigated: false
      })
    } catch (error) {
      console.error(`[ALERT_ERROR] Failed to save critical alert: ${error.message}`)
    }
  }

  /**
   * Reset de métricas (executar a cada minuto)
   */
  resetMetrics() {
    const now = Date.now()
    const timeSinceReset = now - this.metrics.lastReset
    
    // Reset a cada minuto
    if (timeSinceReset >= 60000) {
      this.metrics = {
        requests: 0,
        errors: 0,
        failedLogins: 0,
        lastReset: now
      }
    }
  }

  /**
   * Gerar relatório de segurança
   * @param {string} period - Período (24h, 7d, 30d)
   * @returns {object} - Relatório
   */
  async generateSecurityReport(period = '24h') {
    const hours = period === '24h' ? 24 : period === '7d' ? 168 : 720
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    try {
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })

      if (error) throw error

      const report = {
        period,
        totalEvents: events?.length || 0,
        eventsByType: {},
        eventsBySeverity: {},
        topIPs: {},
        timeline: {}
      }

      if (events) {
        events.forEach(event => {
          // Por tipo
          report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1
          
          // Por severidade
          report.eventsBySeverity[event.severity] = (report.eventsBySeverity[event.severity] || 0) + 1
          
          // Por IP
          if (event.ip !== 'unknown') {
            report.topIPs[event.ip] = (report.topIPs[event.ip] || 0) + 1
          }
          
          // Timeline (por hora)
          const hour = event.timestamp.substring(0, 13) // YYYY-MM-DDTHH
          report.timeline[hour] = (report.timeline[hour] || 0) + 1
        })
      }

      return report
    } catch (error) {
      console.error(`[REPORT_ERROR] Failed to generate security report: ${error.message}`)
      return null
    }
  }

  /**
   * Verificar integridade do sistema
   * @returns {object} - Status do sistema
   */
  async healthCheck() {
    const checks = {
      database: false,
      sendgrid: false,
      security: false
    }

    try {
      // Verificar conexão com banco
      const { data, error } = await supabase.from('logs').select('count').limit(1)
      checks.database = !error

      // Verificar se há eventos críticos recentes
      const { data: criticalEvents } = await supabase
        .from('security_events')
        .select('*')
        .eq('severity', 'critical')
        .gte('timestamp', new Date(Date.now() - 60000).toISOString()) // Último minuto

      checks.security = !criticalEvents || criticalEvents.length === 0

      // Em produção, verificar SendGrid status
      checks.sendgrid = true // Assumir OK por enquanto

      const overallHealth = Object.values(checks).every(check => check)

      return {
        status: overallHealth ? 'healthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error(`[HEALTH_CHECK] Error: ${error.message}`)
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Middleware de monitoramento
 * @param {SecurityMonitor} monitor - Instância do monitor
 */
const monitoringMiddleware = (monitor) => {
  return async (req, res, next) => {
    const startTime = Date.now()
    
    // Reset métricas se necessário
    monitor.resetMetrics()
    
    // Detectar padrões de ataque
    const isAttack = await monitor.detectAttackPatterns(req.ip, req.path, req.body)
    
    if (isAttack) {
      return res.status(400).json({ 
        error: 'Requisição bloqueada por motivos de segurança',
        code: 'SECURITY_BLOCKED'
      })
    }
    
    // Interceptar resposta para monitoramento
    const originalSend = res.send
    res.send = function(data) {
      const responseTime = Date.now() - startTime
      
      // Trackear requisição
      monitor.trackRequest(res.statusCode, req.path, req.user?.id)
      
      // Alerta para tempo de resposta alto
      if (responseTime > monitor.alertThresholds.responseTime) {
        monitor.logSecurityEvent('SLOW_RESPONSE',
          `Slow response detected: ${responseTime}ms`,
          { path: req.path, responseTime, userId: req.user?.id },
          'low'
        )
      }
      
      originalSend.call(this, data)
    }
    
    next()
  }
}

// Instância global do monitor
const securityMonitor = new SecurityMonitor()

// Endpoint para relatórios de segurança (apenas admin)
const setupMonitoringRoutes = (app) => {
  app.get('/api/security/report', async (req, res) => {
    // Verificar se é admin (implementar verificação adequada)
    const period = req.query.period || '24h'
    const report = await securityMonitor.generateSecurityReport(period)
    
    if (!report) {
      return res.status(500).json({ error: 'Erro ao gerar relatório' })
    }
    
    res.json(report)
  })
  
  app.get('/api/security/health', async (req, res) => {
    const health = await securityMonitor.healthCheck()
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 500
    res.status(statusCode).json(health)
  })
}

module.exports = {
  SecurityMonitor,
  securityMonitor,
  monitoringMiddleware,
  setupMonitoringRoutes
}