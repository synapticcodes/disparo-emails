import React, { useState, useEffect } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { debugAuthState } from '../utils/authUtils'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmails: 0,
    emailsEnviados: 0,
    emailsEntregues: 0,
    emailsAbertos: 0,
    taxaAbertura: 0,
    emailsClicados: 0,
    taxaClique: 0,
    campanhasAtivas: 0,
    totalContatos: 0,
    totalTemplates: 0,
    totalSupressoes: 0
  })
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState('Carregando...')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Debug: verificar estado de autenticação antes da chamada
      await debugAuthState(supabase)
      
      // Buscar dados diretamente do Supabase (sem API backend)
      console.log('🔄 Buscando dados diretamente do Supabase...')
      
      // Buscar dados das tabelas principais
      const [
        { data: contatos, error: contatosError },
        { data: templates, error: templatesError },
        { data: campanhas, error: campanhasError },
        { data: emailLogs, error: emailLogsError }
      ] = await Promise.all([
        supabase.from('contatos').select('id'),
        supabase.from('templates').select('id'),
        supabase.from('campanhas').select('id, status'),
        supabase.from('email_logs').select('id, status')
      ])
      
      // Verificar erros
      if (contatosError) console.error('Erro contatos:', contatosError)
      if (templatesError) console.error('Erro templates:', templatesError)
      if (campanhasError) console.error('Erro campanhas:', campanhasError)
      if (emailLogsError) console.error('Erro email_logs:', emailLogsError)
      
      // Calcular métricas dos dados do Supabase
      const totalContatos = contatos?.length || 0
      const totalTemplates = templates?.length || 0
      const totalCampanhas = campanhas?.length || 0
      const campanhasAtivas = campanhas?.filter(c => c.status === 'ativa' || c.status === 'enviando').length || 0
      const emailsEnviados = emailLogs?.filter(e => e.status === 'sent').length || 0
      
      console.log('📊 Dados do Supabase:', {
        totalContatos,
        totalTemplates,
        totalCampanhas,
        campanhasAtivas,
        emailsEnviados
      })
      setDataSource('Supabase Database (Direto)')

      // Mapear dados do Supabase para o estado local
      const supabaseStats = {
        totalEmails: emailsEnviados,
        emailsEnviados: emailsEnviados,
        emailsEntregues: emailLogs?.filter(e => e.status === 'delivered').length || 0,
        emailsAbertos: emailLogs?.filter(e => e.status === 'opened').length || 0,
        taxaAbertura: emailsEnviados > 0 ? (emailLogs?.filter(e => e.status === 'opened').length || 0) / emailsEnviados : 0,
        emailsClicados: emailLogs?.filter(e => e.status === 'clicked').length || 0,
        taxaClique: emailsEnviados > 0 ? (emailLogs?.filter(e => e.status === 'clicked').length || 0) / emailsEnviados : 0,
        campanhasAtivas: campanhasAtivas,
        totalContatos: totalContatos,
        totalTemplates: totalTemplates,
        totalSupressoes: 0,
        totalBounces: emailLogs?.filter(e => e.status === 'bounced').length || 0,
        taxaEntrega: emailsEnviados > 0 ? (emailLogs?.filter(e => e.status === 'delivered').length || 0) / emailsEnviados : 0,
        taxaBounce: emailsEnviados > 0 ? (emailLogs?.filter(e => e.status === 'bounced').length || 0) / emailsEnviados : 0
      }

      setStats(supabaseStats)

      // Configurar dados do gráfico com dados do Supabase
      setChartData({
        emails: {
          labels: ['Enviados', 'Entregues', 'Abertos', 'Clicados', 'Bounces'],
          datasets: [{
            label: 'Métricas Supabase',
            data: [
              supabaseStats.emailsEnviados, 
              supabaseStats.emailsEntregues, 
              supabaseStats.emailsAbertos, 
              supabaseStats.emailsClicados,
              supabaseStats.totalBounces
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',   // Azul - Enviados
              'rgba(16, 185, 129, 0.8)',   // Verde - Entregues  
              'rgba(245, 158, 11, 0.8)',   // Amarelo - Abertos
              'rgba(139, 92, 246, 0.8)',   // Roxo - Clicados
              'rgba(239, 68, 68, 0.8)'     // Vermelho - Bounces
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 1
          }]
        },
        distribution: {
          labels: ['Campanhas', 'Contatos', 'Templates', 'Supressões'],
          datasets: [{
            data: [
              supabaseStats.campanhasAtivas, 
              supabaseStats.totalContatos, 
              supabaseStats.totalTemplates, 
              supabaseStats.totalSupressoes
            ],
            backgroundColor: [
              'rgba(139, 92, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)',
              'rgba(248, 113, 113, 0.8)'
            ],
            borderColor: [
              'rgba(139, 92, 246, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(251, 146, 60, 1)',
              'rgba(248, 113, 113, 1)'
            ],
            borderWidth: 2
          }]
        }
      })
    } catch (error) {
      console.error('❌ Erro ao carregar dados SendGrid:', error)
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message || 
                          error.message || 
                          'Erro desconhecido'
      
      // Fallback para dados mock se a API falhar
      console.log('🔄 Usando dados mock como fallback...')
      const mockFallbackData = {
        success: true,
        source: 'Mock Data (API Fallback)', 
        period_days: 30,
        overview: {
          total_campaigns: 4,
          total_templates: 8,
          total_contacts: 150,
          total_emails_sent: 38,
          total_delivered: 34,
          total_opens: 1,
          total_clicks: 3,
          total_bounces: 0,
          total_suppressions: 0
        },
        sendgrid_metrics: {
          requests: 38,
          delivered: 34,
          opens: 1,
          unique_opens: 1,
          clicks: 3,
          unique_clicks: 3,
          bounces: 0,
          spam_reports: 0,
          unsubscribes: 0
        },
        performance: {
          delivery_rate: '89.47',
          open_rate: '2.94', 
          click_rate: '8.82',
          bounce_rate: '0.00'
        },
        campaigns_by_status: {
          enviada: 2,
          agendada: 1,
          rascunho: 1
        }
      }

      const fallbackStats = {
        totalEmails: mockFallbackData.sendgrid_metrics?.requests || 0,
        emailsEnviados: mockFallbackData.sendgrid_metrics?.requests || 0,
        emailsEntregues: mockFallbackData.sendgrid_metrics?.delivered || 0,
        emailsAbertos: mockFallbackData.sendgrid_metrics?.unique_opens || 0,
        taxaAbertura: mockFallbackData.performance?.open_rate ? parseFloat(mockFallbackData.performance.open_rate) / 100 : 0,
        emailsClicados: mockFallbackData.sendgrid_metrics?.unique_clicks || 0,
        taxaClique: mockFallbackData.performance?.click_rate ? parseFloat(mockFallbackData.performance.click_rate) / 100 : 0,
        campanhasAtivas: mockFallbackData.overview?.total_campaigns || 0,
        totalContatos: mockFallbackData.overview?.total_contacts || 0,
        totalTemplates: mockFallbackData.overview?.total_templates || 0,
        totalSupressoes: mockFallbackData.overview?.total_suppressions || 0,
        totalBounces: mockFallbackData.sendgrid_metrics?.bounces || 0,
        taxaEntrega: mockFallbackData.performance?.delivery_rate ? parseFloat(mockFallbackData.performance.delivery_rate) / 100 : 0,
        taxaBounce: mockFallbackData.performance?.bounce_rate ? parseFloat(mockFallbackData.performance.bounce_rate) / 100 : 0
      }

      setStats(fallbackStats)
      setDataSource('Dados Mock (API Indisponível)')

      // Configurar gráficos com dados de fallback
      setChartData({
        emails: {
          labels: ['Enviados', 'Entregues', 'Abertos', 'Clicados', 'Bounces'],
          datasets: [{
            label: 'Métricas SendGrid (Fallback)',
            data: [
              fallbackStats.emailsEnviados, 
              fallbackStats.emailsEntregues, 
              fallbackStats.emailsAbertos, 
              fallbackStats.emailsClicados,
              fallbackStats.totalBounces
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(239, 68, 68, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(139, 92, 246, 1)',
              'rgba(239, 68, 68, 1)'
            ],
            borderWidth: 1
          }]
        },
        distribution: {
          labels: ['Campanhas', 'Contatos', 'Templates', 'Supressões'],
          datasets: [{
            data: [
              fallbackStats.campanhasAtivas, 
              fallbackStats.totalContatos, 
              fallbackStats.totalTemplates, 
              fallbackStats.totalSupressoes
            ],
            backgroundColor: [
              'rgba(139, 92, 246, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 146, 60, 0.8)',
              'rgba(248, 113, 113, 0.8)'
            ],
            borderColor: [
              'rgba(139, 92, 246, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(251, 146, 60, 1)',
              'rgba(248, 113, 113, 1)'
            ],
            borderWidth: 2
          }]
        }
      })
      
      toast.error(`Erro na API SendGrid (usando dados locais): ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend }) => {

    return (
      <div className="metric-card">
        <div className="metric-card-header">
          <div className={`metric-card-icon ${color}`}>
            {icon}
          </div>
          <button className="metric-card-menu">
            ⋯
          </button>
        </div>
        
        <h3 className="metric-card-value">{value}</h3>
        <p className="metric-card-title">{title}</p>
        {subtitle && (
          <p className="metric-card-subtitle">{subtitle}</p>
        )}
        
        {trend && (
          <div className="metric-card-trend">
            <span className={trend > 0 ? 'trend-up' : 'trend-down'}>
              {trend > 0 ? '↗' : '↘'}
            </span>
            {Math.abs(trend)}% vs último mês
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Estatísticas de Performance'
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Distribuição dos Recursos'
      },
    },
  }

  return (
    <>
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Visão geral das estatísticas do sistema de emails
          </p>
        </div>
        <div className="dashboard-controls">
          <select className="dashboard-select">
            <option>Mostrar por meses</option>
            <option>Mostrar por dias</option>
            <option>Mostrar por anos</option>
          </select>
          <button
            onClick={fetchDashboardData}
            className="dashboard-refresh-btn"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        <StatCard
          title="Total de Emails"
          value={stats.totalEmails.toLocaleString()}
          subtitle={`Taxa de entrega: ${(stats.taxaEntrega * 100).toFixed(1)}%`}
          icon="📧"
          color="purple"
          trend={12}
        />
        <StatCard
          title="Emails Entregues"
          value={stats.emailsEntregues.toLocaleString()}
          subtitle={`${stats.emailsEnviados > 0 ? ((stats.emailsEntregues / stats.emailsEnviados) * 100).toFixed(1) : 0}% dos enviados`}
          icon="✅"
          color="green"
          trend={8}
        />
        <StatCard
          title="Taxa de Abertura"
          value={`${(stats.taxaAbertura * 100).toFixed(1)}%`}
          subtitle={`${stats.emailsAbertos.toLocaleString()} aberturas únicas`}
          icon="👁️"
          color="orange"
          trend={-3}
        />
        <StatCard
          title="Taxa de Cliques"
          value={`${(stats.taxaClique * 100).toFixed(1)}%`}
          subtitle={`${stats.emailsClicados.toLocaleString()} cliques únicos`}
          icon="🖱️"
          color="blue"
          trend={15}
        />
      </div>

      {/* SendGrid Performance Cards */}
      <div className="sendgrid-metrics">
        <div className="sendgrid-header">
          <h2>📊 Métricas SendGrid (Últimos 30 dias)</h2>
          <div className="sendgrid-source">
            📡 Fonte: {dataSource}
          </div>
        </div>
        <div className="performance-grid">
          <StatCard
            title="Bounces"
            value={stats.totalBounces.toLocaleString()}
            subtitle={`Taxa: ${(stats.taxaBounce * 100).toFixed(2)}%`}
            icon="⚠️"
            color="red"
          />
          <StatCard
            title="Supressões"
            value={stats.totalSupressoes.toLocaleString()}
            subtitle="Emails bloqueados/spam"
            icon="🚫"
            color="gray"
          />
          <StatCard
            title="Campanhas"
            value={stats.campanhasAtivas}
            subtitle="Total de campanhas"
            icon="📢"
            color="purple"
          />
          <StatCard
            title="Contatos"
            value={stats.totalContatos.toLocaleString()}
            subtitle="Base de contatos"
            icon="👥"
            color="blue"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Main Chart */}
        <div className="chart-card" style={{ gridColumn: '1 / 3' }}>
          <div className="chart-header">
            <h3 className="chart-title">📈 Performance de Emails SendGrid</h3>
            <div className="chart-subtitle">
              Métricas detalhadas dos últimos 30 dias
            </div>
          </div>
          <div className="chart-container">
            {chartData && (
              <Bar data={chartData.emails} options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 20
                    }
                  }
                },
                scales: {
                  x: {
                    grid: {
                      display: false
                    }
                  },
                  y: {
                    grid: {
                      color: '#f3f4f6'
                    }
                  }
                }
              }} />
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="chart-title">Emails por Gênero</h3>
          </div>
          <div className="chart-container">
            {chartData && (
              <Doughnut data={chartData.distribution} options={{
                ...doughnutOptions,
                plugins: {
                  ...doughnutOptions.plugins,
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 15
                    }
                  }
                }
              }} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-grid">
        {/* Time Admitted Chart */}
        <div className="chart-card" style={{ gridColumn: '1 / 3' }}>
          <div className="chart-header">
            <h3 className="chart-title">Tempo de Admissão</h3>
            <select className="dashboard-select">
              <option>Hoje</option>
              <option>Esta semana</option>
              <option>Este mês</option>
            </select>
          </div>
          <div className="chart-container">
            <div style={{ 
              position: 'absolute', 
              inset: '0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
                <div style={{ fontSize: '14px' }}>Gráfico de tempo em desenvolvimento</div>
              </div>
            </div>
          </div>
        </div>

        {/* Emails by Division */}
        <div className="division-card">
          <div className="division-header">
            <h3 className="division-title">Emails por Divisão</h3>
          </div>
          <div className="division-list">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  background: '#7c3aed', 
                  borderRadius: '50%' 
                }}></div>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>DIVISÃO</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>PT.</span>
            </div>
            <div className="division-item">
              <div className="division-item-left">
                <span className="division-item-icon">❤️</span>
                <span className="division-item-name">Cardiologia</span>
              </div>
              <span className="division-item-value">{stats.emailsEnviados || 247}</span>
            </div>
            <div className="division-item">
              <div className="division-item-left">
                <span className="division-item-icon">🧠</span>
                <span className="division-item-name">Neurologia</span>
              </div>
              <span className="division-item-value">{stats.emailsEntregues || 164}</span>
            </div>
            <div className="division-item">
              <div className="division-item-left">
                <span className="division-item-icon">🏥</span>
                <span className="division-item-name">Cirurgia</span>
              </div>
              <span className="division-item-value">{stats.totalContatos || 86}</span>
            </div>
          </div>
        </div>

        {/* Large Purple Card */}
        <div className="purple-card">
          <div className="purple-card-content">
            <div>
              <h3 className="purple-card-value">
                {stats.totalEmails.toLocaleString() || '3,240'}
              </h3>
              <p className="purple-card-label">Emails este mês</p>
            </div>
            
            <div>
              <div className="purple-card-secondary">
                {stats.emailsAbertos || 232}
              </div>
              <div className="purple-card-dates">
                <span>14</span>
                <span>15</span>
                <span>16</span>
                <span>17</span>
                <span className="active">18</span>
                <span>19</span>
              </div>
            </div>

            <div className="purple-card-chart">
              {[40, 60, 30, 80, 50, 90, 70, 45].map((height, index) => (
                <div
                  key={index}
                  className="purple-card-bar"
                  style={{ height: `${height}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard