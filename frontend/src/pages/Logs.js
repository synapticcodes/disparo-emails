import React, { useState, useEffect } from 'react'
import { logs as logsAPI } from '../lib/api'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

const Logs = () => {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: '',
    status: ''
  })

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [filters, fetchLogs])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = {
        limit: 100, // Mostrar mais logs
        ...(filters.action && { action: filters.action }),
        ...(filters.status && { status: filters.status })
      }
      
      const response = await logsAPI.list(params)
      const data = response.data.data || response.data
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar logs:', error)
      toast.error('Erro ao carregar logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await logsAPI.stats()
      setStats(response.data.stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas de logs:', error)
    }
  }

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      action: '',
      status: ''
    })
  }

  const getActionIcon = (action) => {
    const icons = {
      'envio_direto': '📧',
      'envio_campanha': '📢',
      'criar_template': '📝',
      'atualizar_template': '✏️',
      'deletar_template': '🗑️',
      'criar_contato': '👤',
      'atualizar_contato': '👤',
      'deletar_contato': '👤',
      'adicionar_supressao': '🚫',
      'remover_supressao': '✅',
      'sincronizar_supressoes': '🔄',
      'agendar_campanha': '📅',
      'cancelar_agendamento': '❌'
    }
    return icons[action] || '📋'
  }

  const getActionLabel = (action) => {
    const labels = {
      'envio_direto': 'Envio Direto',
      'envio_campanha': 'Envio de Campanha',
      'criar_template': 'Criar Template',
      'atualizar_template': 'Atualizar Template',
      'deletar_template': 'Deletar Template',
      'criar_contato': 'Criar Contato',
      'atualizar_contato': 'Atualizar Contato',
      'deletar_contato': 'Deletar Contato',
      'adicionar_supressao': 'Adicionar Supressão',
      'remover_supressao': 'Remover Supressão',
      'sincronizar_supressoes': 'Sincronizar Supressões',
      'agendar_campanha': 'Agendar Campanha',
      'cancelar_agendamento': 'Cancelar Agendamento'
    }
    return labels[action] || action
  }

  const formatLogDetails = (details) => {
    if (!details || typeof details !== 'object') {
      return typeof details === 'string' ? details : JSON.stringify(details)
    }

    // Formatação específica para envio direto (sucesso)
    if (details.recipients_count !== undefined || details.recipients_list !== undefined) {
      const parts = []
      if (details.recipients_count) {
        parts.push(`${details.recipients_count} destinatário(s)`)
      }
      if (details.recipients_list) {
        parts.push(`Para: ${details.recipients_list}`)
      }
      if (details.subject) {
        parts.push(`Assunto: "${details.subject}"`)
      }
      
      const format = []
      if (details.has_html) format.push('HTML')
      if (details.has_text) format.push('Texto')
      if (details.has_attachments) format.push('Anexos')
      if (format.length > 0) {
        parts.push(`Formato: ${format.join(', ')}`)
      }
      
      if (details.template_vars_used) {
        parts.push('Variáveis utilizadas')
      }
      
      return parts.join(' • ')
    }

    // Formatação específica para envio direto (erro)
    if (details.error_message) {
      const parts = []
      parts.push(`Erro: ${details.error_message}`)
      if (details.error_code) {
        parts.push(`Código: ${details.error_code}`)
      }
      if (details.recipients_list) {
        parts.push(`Destinatários: ${details.recipients_list}`)
      }
      if (details.subject) {
        parts.push(`Assunto: "${details.subject}"`)
      }
      return parts.join(' • ')
    }

    // Formatação para outros tipos de log
    const formatted = []
    Object.entries(details).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'sent_at' && key !== 'attempted_at') {
        formatted.push(`${key}: ${value}`)
      }
    })
    return formatted.join(' • ')
  }

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-spinner">Carregando logs...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Logs do Sistema</h1>
          <p className="dashboard-subtitle">
            Histórico de ações e envios de email
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={fetchLogs}
            className="dashboard-refresh-btn"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-card-icon">📊</div>
            </div>
            <div className="metric-card-value">{stats.total_logs}</div>
            <div className="metric-card-title">Total de Logs</div>
            <div className="metric-card-subtitle">últimos 30 dias</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-card-icon">✅</div>
            </div>
            <div className="metric-card-value">{stats.by_status.sucesso || 0}</div>
            <div className="metric-card-title">Sucessos</div>
            <div className="metric-card-subtitle">ações bem-sucedidas</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-card-icon">❌</div>
            </div>
            <div className="metric-card-value">{stats.by_status.erro || 0}</div>
            <div className="metric-card-title">Erros</div>
            <div className="metric-card-subtitle">ações com falha</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <div className="metric-card-icon">📧</div>
            </div>
            <div className="metric-card-value">{stats.by_action.envio_direto || 0}</div>
            <div className="metric-card-title">Envios Diretos</div>
            <div className="metric-card-subtitle">emails enviados</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="chart-card">
        <div className="filter-grid">
          <div>
            <label htmlFor="action-filter" className="filter-label">
              Filtrar por Ação
            </label>
            <select
              id="action-filter"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="dashboard-select"
            >
              <option value="">Todas as ações</option>
              <option value="envio_direto">Envio Direto</option>
              <option value="envio_campanha">Envio de Campanha</option>
              <option value="criar_template">Criar Template</option>
              <option value="atualizar_template">Atualizar Template</option>
              <option value="deletar_template">Deletar Template</option>
              <option value="criar_contato">Criar Contato</option>
              <option value="adicionar_supressao">Adicionar Supressão</option>
              <option value="agendar_campanha">Agendar Campanha</option>
            </select>
          </div>
          <div>
            <label htmlFor="status-filter" className="filter-label">
              Filtrar por Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="dashboard-select"
            >
              <option value="">Todos os status</option>
              <option value="sucesso">Sucesso</option>
              <option value="erro">Erro</option>
            </select>
          </div>
        </div>
        {(filters.action || filters.status) && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={clearFilters}
              className="dashboard-secondary-btn"
            >
              🗑️ Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Logs */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Histórico de Ações</h3>
          <p className="chart-subtitle">
            Mostrando {logs.length} logs
          </p>
        </div>

        {logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">Nenhum log encontrado</h3>
            <p className="empty-state-description">
              {filters.action || filters.status ? 
                'Nenhum log corresponde aos filtros aplicados.' :
                'Ainda não há logs registrados no sistema.'
              }
            </p>
          </div>
        ) : (
          <div className="logs-list">
            {logs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-info">
                  <div className="log-icon">
                    <span>{getActionIcon(log.action)}</span>
                  </div>
                  <div className="log-details">
                    <div className="log-header">
                      <span className="log-action">
                        {getActionLabel(log.action)}
                      </span>
                      <span className={`log-status ${log.status}`}>
                        {log.status === 'sucesso' ? '✅ Sucesso' : '❌ Erro'}
                      </span>
                    </div>
                    <div className="log-description">
                      {formatLogDetails(log.details)}
                    </div>
                    <div className="log-timestamp">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </div>
                    {log.ip_address && (
                      <div className="log-metadata">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Logs