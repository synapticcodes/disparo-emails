import axios from 'axios'
import { supabase } from './supabase'

// Configuração da URL da API baseada no ambiente
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'

console.log('🔧 API Base URL:', API_BASE_URL)

// Criar instância do axios com configuração base
const api = axios.create({
  baseURL: API_BASE_URL,
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

// Funções da API

// Autenticação
export const auth = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signUp: (email, password) => supabase.auth.signUp({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  getUser: () => supabase.auth.getUser(),
}

// Envio de emails
export const emails = {
  sendDirect: (data) => api.post('/api/email/send', data),
  sendCampaign: (data) => api.post('/api/campaign/send', data),
}

// Templates
export const templates = {
  list: () => api.get('/api/templates'),
  create: (data) => api.post('/api/templates', data),
  update: (id, data) => api.put(`/api/templates/${id}`, data),
  delete: (id) => api.delete(`/api/templates/${id}`),
  clone: (id, name) => api.post(`/api/templates/${id}/clone`, { nome: name }),
  preview: (data) => api.post('/api/template/preview', data),
}

// Campanhas
export const campaigns = {
  list: () => api.get('/api/campaigns'),
  create: (data) => api.post('/api/campaigns', data),
  update: (id, data) => api.put(`/api/campaigns/${id}`, data),
  delete: (id) => api.delete(`/api/campaigns/${id}`),
  send: (campaignId) => api.post('/api/campaign/send', { campaign_id: campaignId }),
  schedule: (id, scheduledAt) => api.post(`/api/campaigns/${id}/schedule`, { scheduled_at: scheduledAt }),
  cancelSchedule: (id) => api.delete(`/api/campaigns/${id}/schedule`),
}

// Contatos
export const contacts = {
  list: () => api.get('/api/contacts'),
  create: (data) => api.post('/api/contacts', data),
  update: (id, data) => api.put(`/api/contacts/${id}`, data),
  delete: (id) => api.delete(`/api/contacts/${id}`),
  bulkTag: (data) => api.post('/api/contacts/bulk-tag', data),
}

// Tags
export const tags = {
  list: () => api.get('/api/tags'),
  create: (data) => api.post('/api/tags', data),
  update: (id, data) => api.put(`/api/tags/${id}`, data),
  delete: (id) => api.delete(`/api/tags/${id}`),
}

// Variáveis Customizadas
export const variables = {
  list: () => api.get('/api/variables'),
  create: (data) => api.post('/api/variables', data),
  update: (id, data) => api.put(`/api/variables/${id}`, data),
  delete: (id) => api.delete(`/api/variables/${id}`),
  testUniversal: (data) => api.post('/api/variables/test-universal', data),
}

// Datasets
export const datasets = {
  list: () => api.get('/api/datasets'),
  upload: (data) => api.post('/api/datasets/upload', data),
  preview: (data) => api.post('/api/datasets/preview', data),
  delete: (id) => api.delete(`/api/datasets/${id}`),
  getValues: (id, params) => api.get(`/api/datasets/${id}/values`, { params }),
}

// Segmentos
export const segments = {
  list: () => api.get('/api/segmentos'),
}

// Supressões
export const suppressions = {
  list: (params) => api.get('/api/suppressions', { params }),
  add: (data) => api.post('/api/suppressions', data),
  remove: (email, type) => api.delete(`/api/suppressions/${email}/${type}`),
  sync: () => api.post('/api/suppressions/sync'),
}

// Estatísticas
export const stats = {
  overview: () => api.get('/api/stats/overview'),
  dashboard: (period = 30) => api.get(`/api/stats/dashboard?period=${period}`),
  campaign: (id) => api.get(`/api/stats/campaigns/${id}`),
  performance: (startDate, endDate) => api.get('/api/stats/performance', {
    params: { start_date: startDate, end_date: endDate }
  }),
}

// Rastreamento de eventos de email
export const tracking = {
  // Consultar todos os eventos de uma campanha
  events: (campaignId, params = {}) => api.get(`/api/tracking/events/${campaignId}`, { params }),
  // Consultar especificamente quem abriu emails de uma campanha
  opens: (campaignId) => api.get(`/api/tracking/opens/${campaignId}`),
  // Estatísticas gerais de eventos do usuário
  stats: (period = 30) => api.get(`/api/tracking/stats?period=${period}`),
}

// Agendamentos
export const schedules = {
  list: () => api.get('/api/schedules'),
}

// Logs
export const logs = {
  list: (params) => api.get('/api/logs', { params }),
  stats: () => api.get('/api/logs/stats'),
}

// Exportar instância principal do axios também
export { api }

export default api