// Configuração global para testes
global.console = {
  ...console,
  // Silenciar logs durante testes, exceto erros
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error
}

// Mock das variáveis de ambiente para testes
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'http://localhost:54321'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.SENDGRID_API_KEY = 'SG.test-key'

// Configurar timeout padrão para requisições
jest.setTimeout(10000)