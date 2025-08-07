import React, { useState, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement)

const Statistics = () => {
  const [stats, setStats] = useState(null)
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatistics()
  }, [timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      // Converter período para número de dias
      const periodDays = timeRange === '24h' ? 1 : 
                        timeRange === '7d' ? 7 : 
                        timeRange === '30d' ? 30 : 90
      const response = await api.get(`/api/stats/dashboard?period=${periodDays}`)
      setStats(response.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  const timeRangeOptions = [
    { value: '24h', label: 'Últimas 24 horas' },
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Dados não disponíveis</h3>
        <p className="mt-1 text-sm text-gray-500">
          Não há dados estatísticos para o período selecionado.
        </p>
      </div>
    )
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  }

  const performanceData = {
    labels: ['Enviados', 'Entregues', 'Abertos', 'Clicados', 'Bounces', 'Spam'],
    datasets: [{
      label: 'Emails',
      data: [
        stats.overview?.total_emails_sent || 0,
        stats.email_events?.delivered || 0,
        stats.email_events?.open || 0,
        stats.email_events?.click || 0,
        stats.email_events?.bounce || 0,
        stats.email_events?.spamreport || 0
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 113, 133, 0.8)'
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(251, 113, 133, 1)'
      ],
      borderWidth: 1
    }]
  }

  const engagementData = {
    labels: ['Abertos', 'Não Abertos'],
    datasets: [{
      data: [
        stats.email_events?.open || 0, 
        (stats.overview?.total_emails_sent || 0) - (stats.email_events?.open || 0)
      ],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(156, 163, 175, 1)'
      ],
      borderWidth: 2
    }]
  }

  // Processar dados diários para o gráfico
  const dailyStatsArray = Object.entries(stats.daily_stats || {}).map(([date, events]) => ({
    date,
    sent: events.sent || 0,
    opened: events.open || 0,
    delivered: events.delivered || 0
  })).sort((a, b) => new Date(a.date) - new Date(b.date))

  const timeSeriesData = {
    labels: dailyStatsArray.map(item => new Date(item.date).toLocaleDateString('pt-BR')),
    datasets: [
      {
        label: 'Emails Enviados',
        data: dailyStatsArray.map(item => item.sent),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4
      },
      {
        label: 'Emails Abertos',
        data: dailyStatsArray.map(item => item.opened),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.4
      }
    ]
  }


  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Estatísticas Detalhadas</h1>
          <p className="dashboard-subtitle">
            Análise completa do desempenho das campanhas
          </p>
        </div>
        <div className="dashboard-controls">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="dashboard-select"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchStatistics}
            className="dashboard-refresh-btn"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-icon">📢</div>
            <div className="metric-card-menu">⋯</div>
          </div>
          <div className="metric-card-value">{stats?.overview?.total_campaigns || 0}</div>
          <div className="metric-card-title">Total de Campanhas</div>
          <div className="metric-card-subtitle">campanhas criadas</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-icon">📧</div>
            <div className="metric-card-menu">⋯</div>
          </div>
          <div className="metric-card-value">{stats?.overview?.total_emails_sent || 0}</div>
          <div className="metric-card-title">Emails Enviados</div>
          <div className="metric-card-subtitle">emails processados</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-icon">📝</div>
            <div className="metric-card-menu">⋯</div>
          </div>
          <div className="metric-card-value">{stats?.overview?.total_templates || 0}</div>
          <div className="metric-card-title">Templates</div>
          <div className="metric-card-subtitle">templates disponíveis</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <div className="metric-card-icon">👥</div>
            <div className="metric-card-menu">⋯</div>
          </div>
          <div className="metric-card-value">{stats?.overview?.total_contacts || 0}</div>
          <div className="metric-card-title">Contatos</div>
          <div className="metric-card-subtitle">contatos cadastrados</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Performance Geral</h3>
          </div>
          <div className="chart-content">
            <Bar data={performanceData} options={chartOptions} />
          </div>
        </div>
        
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Engajamento</h3>
          </div>
          <div className="chart-content">
            <Doughnut data={engagementData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Gráfico de Linha Temporal */}
      {dailyStatsArray.length > 0 && (
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Tendência ao Longo do Tempo</h3>
          </div>
          <div className="chart-content">
            <Line data={timeSeriesData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Atividade Recente */}
      {stats?.recent_activity && stats.recent_activity.length > 0 && (
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Atividade Recente</h3>
            <p className="chart-subtitle">
              Últimas ações realizadas no sistema
            </p>
          </div>
          <div className="activity-list">
            {stats.recent_activity.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-info">
                  <span className={`activity-badge ${activity.status === 'sucesso' ? 'success' : 'error'}`}>
                    {activity.status}
                  </span>
                  <span className="activity-action">
                    {activity.action}
                  </span>
                </div>
                <span className="activity-time">
                  {new Date(activity.timestamp || activity.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Statistics