import React, { useState, useEffect } from 'react'
import { tracking, campaigns } from '../lib/api'
import toast from 'react-hot-toast'

const EmailTracking = () => {
  const [campaignsList, setCampaignsList] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [trackingData, setTrackingData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('opens')

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await campaigns.list()
      setCampaignsList(response.data)
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error)
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }

  const fetchTrackingData = async (campaignId, type = 'opens') => {
    try {
      setTrackingLoading(true)
      let response
      
      if (type === 'opens') {
        response = await tracking.opens(campaignId)
      } else {
        response = await tracking.events(campaignId, { event_type: type })
      }
      
      setTrackingData(response.data)
    } catch (error) {
      console.error('Erro ao carregar dados de rastreamento:', error)
      toast.error('Erro ao carregar dados de rastreamento')
    } finally {
      setTrackingLoading(false)
    }
  }

  const handleCampaignSelect = (campaign) => {
    setSelectedCampaign(campaign)
    setTrackingData(null)
    fetchTrackingData(campaign.id, activeTab)
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (selectedCampaign) {
      fetchTrackingData(selectedCampaign.id, tab)
    }
  }

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getEventIcon = (eventType) => {
    const icons = {
      open: '👁️',
      click: '🖱️',
      delivered: '✅',
      bounce: '⚠️',
      blocked: '🚫',
      deferred: '⏳',
      dropped: '❌',
      spam_report: '🛡️',
      unsubscribe: '📤'
    }
    return icons[eventType] || '📧'
  }

  const getEventColor = (eventType) => {
    const colors = {
      open: 'text-blue-600',
      click: 'text-green-600',
      delivered: 'text-green-500',
      bounce: 'text-red-600',
      blocked: 'text-red-500',
      deferred: 'text-yellow-600',
      dropped: 'text-red-700',
      spam_report: 'text-orange-600',
      unsubscribe: 'text-purple-600'
    }
    return colors[eventType] || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
        <span className="ml-2">Carregando campanhas...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">📊 Rastreamento de Emails</h1>
          <p className="dashboard-subtitle">
            Visualize quem abriu, clicou e interagiu com suas campanhas em tempo real
          </p>
        </div>
      </div>

      {/* Seleção de Campanha */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Selecionar Campanha</h2>
        
        {campaignsList.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-gray-600">Crie uma campanha para começar a rastrear emails</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignsList.map((campaign) => (
              <div
                key={campaign.id}
                onClick={() => handleCampaignSelect(campaign)}
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  selectedCampaign?.id === campaign.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h3 className="font-medium truncate">{campaign.nome}</h3>
                <p className="text-sm text-gray-600 truncate">{campaign.assunto}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    campaign.status === 'enviada' 
                      ? 'bg-green-100 text-green-800'
                      : campaign.status === 'rascunho'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {campaign.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {campaign.created_at ? formatDateTime(campaign.created_at) : 'Data não disponível'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dados de Rastreamento */}
      {selectedCampaign && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">📈 {selectedCampaign.nome}</h2>
              <p className="text-gray-600">{selectedCampaign.assunto}</p>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-2">
              {[
                { key: 'opens', label: '👁️ Aberturas', },
                { key: 'click', label: '🖱️ Cliques' },
                { key: 'all', label: '📊 Todos Eventos' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {trackingLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="loading-spinner"></div>
              <span className="ml-2">Carregando dados...</span>
            </div>
          ) : trackingData ? (
            <div>
              {/* Resumo */}
              {activeTab === 'opens' && trackingData.unique_openers && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {trackingData.unique_opens}
                    </div>
                    <div className="text-sm text-blue-800">Contatos Únicos que Abriram</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {trackingData.total_opens}
                    </div>
                    <div className="text-sm text-green-800">Total de Aberturas</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {trackingData.total_opens > 0 ? 
                        ((trackingData.total_opens / trackingData.unique_opens) || 1).toFixed(1) : 0}
                    </div>
                    <div className="text-sm text-purple-800">Média de Aberturas por Contato</div>
                  </div>
                </div>
              )}

              {/* Lista de Eventos */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">
                  {activeTab === 'opens' ? 'Contatos que Abriram' : 
                   activeTab === 'click' ? 'Eventos de Clique' : 'Todos os Eventos'}
                </h3>
                
                <div className="max-h-96 overflow-y-auto">
                  {activeTab === 'opens' && trackingData.unique_openers ? (
                    <div className="space-y-2">
                      {trackingData.unique_openers.map((opener, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">👁️</div>
                            <div>
                              <div className="font-medium">{opener.email}</div>
                              <div className="text-sm text-gray-600">
                                Primeira abertura: {formatDateTime(opener.first_open)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">{opener.open_count}</div>
                            <div className="text-xs text-gray-500">
                              {opener.open_count === 1 ? 'abertura' : 'aberturas'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : trackingData.events ? (
                    <div className="space-y-2">
                      {trackingData.events.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{getEventIcon(event.event_type)}</div>
                            <div>
                              <div className="font-medium">{event.contact_email}</div>
                              <div className="text-sm text-gray-600">
                                <span className={`font-medium ${getEventColor(event.event_type)}`}>
                                  {event.event_type.toUpperCase()}
                                </span>
                                {' • '}
                                {formatDateTime(event.event_timestamp)}
                              </div>
                            </div>
                          </div>
                          {event.url && (
                            <div className="text-right">
                              <a 
                                href={event.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Ver URL
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum evento encontrado</h3>
                      <p className="text-gray-600">
                        {activeTab === 'opens' 
                          ? 'Ainda não há aberturas registradas para esta campanha'
                          : 'Ainda não há eventos registrados para esta campanha'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Carregue os dados de rastreamento</h3>
              <p className="text-gray-600">Selecione uma aba para visualizar os eventos</p>
            </div>
          )}
        </div>
      )}

      {/* Informações sobre o Webhook */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Como funciona o rastreamento</h3>
            <div className="text-blue-800 space-y-2 text-sm">
              <p>• Os dados são recebidos em tempo real via webhook do SendGrid</p>
              <p>• Eventos incluem: aberturas, cliques, entregas, bounces e mais</p>
              <p>• Cada interação é registrada automaticamente no banco de dados</p>
              <p>• Configure o webhook no SendGrid apontando para: <code className="bg-blue-100 px-2 py-1 rounded">sua-url.com/api/sendgrid-events</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailTracking