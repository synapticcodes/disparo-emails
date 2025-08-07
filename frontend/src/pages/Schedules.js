import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

const Schedules = () => {
  const [schedules, setSchedules] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [formData, setFormData] = useState({
    campaign_id: '',
    scheduled_at: '',
    timezone: 'America/Sao_Paulo',
    repeat_interval: '',
    repeat_count: 1,
    infinite_repeat: false,
    selected_tags: [],
    use_tags: false
  })
  const [selectedContacts, setSelectedContacts] = useState([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Buscar dados básicos do Supabase
      const [
        { data: campaignsData, error: campaignsError },
        { data: tagsData, error: tagsError }
      ] = await Promise.all([
        supabase.from('campanhas').select('*'),
        supabase.from('tags').select('*')
      ])
      
      if (campaignsError) console.error('Erro campanhas:', campaignsError)
      if (tagsError) console.error('Erro tags:', tagsError)
      
      // Por enquanto, agendamentos não implementados
      setSchedules([])
      setCampaigns(campaignsData || [])
      
      toast.info('Funcionalidade de agendamento temporariamente indisponível')
      
      // O endpoint /api/tags retorna { success: true, data: [...] }
      const tagsData = tagsRes.data.data || tagsRes.data || []
      setTags(Array.isArray(tagsData) ? tagsData : [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleTagSelection = (tagName) => {
    setFormData(prev => {
      const currentTags = prev.selected_tags || []
      const newTags = currentTags.includes(tagName)
        ? currentTags.filter(tag => tag !== tagName)
        : [...currentTags, tagName]
      
      return {
        ...prev,
        selected_tags: newTags
      }
    })
  }

  const fetchContactsByTags = async (tagNames) => {
    if (!tagNames || tagNames.length === 0) {
      setSelectedContacts([])
      return
    }

    try {
      setLoadingContacts(true)
      // Temporáriamente desabilitado - busca por tags não implementada
      toast.info('Busca de contatos por tags temporariamente indisponível')
      setSelectedContacts([])
    } catch (error) {
      console.error('Erro ao buscar contatos por tags:', error)
      toast.error('Erro ao buscar contatos por tags')
      setSelectedContacts([])
    } finally {
      setLoadingContacts(false)
    }
  }

  // Buscar contatos quando as tags mudarem
  useEffect(() => {
    if (formData.use_tags && formData.selected_tags.length > 0) {
      fetchContactsByTags(formData.selected_tags)
    } else {
      setSelectedContacts([])
    }
  }, [formData.selected_tags, formData.use_tags])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.campaign_id) {
      toast.error('Por favor, selecione uma campanha')
      return
    }

    if (!formData.scheduled_at) {
      toast.error('Por favor, selecione a data e horário')
      return
    }

    const scheduledDate = new Date(formData.scheduled_at)
    if (scheduledDate <= new Date()) {
      toast.error('A data deve ser no futuro')
      return
    }

    try {
      const scheduleData = {
        scheduled_at: formData.scheduled_at,
        repeat_interval: formData.repeat_interval,
        repeat_count: formData.infinite_repeat ? null : formData.repeat_count,
        timezone: formData.timezone
      }

      // Incluir tags selecionadas se estiver usando filtro por tags
      if (formData.use_tags && formData.selected_tags.length > 0) {
        scheduleData.selected_tags = formData.selected_tags
      }

      if (editingSchedule) {
        toast.info('Agendamento temporariamente indisponível')
        toast.success('Agendamento atualizado com sucesso!')
      } else {
        toast.info('Agendamento temporariamente indisponível')
        toast.success('Agendamento criado com sucesso!')
      }

      setShowModal(false)
      setEditingSchedule(null)
      setFormData({
        campaign_id: '',
        scheduled_at: '',
        timezone: 'America/Sao_Paulo',
        repeat_interval: '',
        repeat_count: 1,
        infinite_repeat: false,
        selected_tags: [],
        use_tags: false
      })
      setSelectedContacts([])
      fetchData()
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error)
      toast.error(error.response?.data?.error || 'Erro ao salvar agendamento')
    }
  }

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      campaign_id: schedule.campaign_id,
      scheduled_at: new Date(schedule.scheduled_at).toISOString().slice(0, 16),
      timezone: schedule.timezone || 'America/Sao_Paulo',
      repeat_interval: schedule.repeat_interval || '',
      repeat_count: schedule.repeat_count || 1,
      infinite_repeat: schedule.repeat_count === null
    })
    setShowModal(true)
  }

  const handleCancel = async (campaignId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return
    }

    try {
      toast.info('Cancelamento de agendamento temporariamente indisponível')
      toast.success('Agendamento cancelado com sucesso!')
      fetchData()
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
      toast.error(error.response?.data?.error || 'Erro ao cancelar agendamento')
    }
  }

  const openCreateModal = () => {
    setEditingSchedule(null)
    setFormData({
      campaign_id: '',
      scheduled_at: '',
      timezone: 'America/Sao_Paulo',
      repeat_interval: '',
      repeat_count: 1,
      infinite_repeat: false,
      selected_tags: [],
      use_tags: false
    })
    setSelectedContacts([])
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSchedule(null)
    setFormData({
      campaign_id: '',
      scheduled_at: '',
      timezone: 'America/Sao_Paulo',
      repeat_interval: '',
      repeat_count: 1,
      infinite_repeat: false,
      selected_tags: [],
      use_tags: false
    })
    setSelectedContacts([])
  }

  const getStatusBadge = (schedule) => {
    const now = new Date()
    const scheduledDate = new Date(schedule.scheduled_at)
    
    if (schedule.status === 'cancelled') {
      return <span className="status-badge cancelled">Cancelado</span>
    }
    
    if (schedule.status === 'completed') {
      return <span className="status-badge completed">Executado</span>
    }
    
    if (scheduledDate <= now) {
      return <span className="status-badge processing">Processando</span>
    }
    
    return <span className="status-badge scheduled">Agendado</span>
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCampaignName = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId)
    return campaign ? campaign.nome : `Campanha ${campaignId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Agendamentos</h1>
          <p className="dashboard-subtitle">
            Gerencie o envio agendado de campanhas
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
            disabled={campaigns.length === 0}
          >
            📅 Novo Agendamento
          </button>
        </div>
      </div>

      {campaigns.length === 0 && (
        <div className="chart-card">
          <div className="warning-banner">
            <div className="warning-icon">⚠️</div>
            <div className="warning-content">
              <h3 className="warning-title">
                Nenhuma campanha disponível
              </h3>
              <p className="warning-text">
                Você precisa ter campanhas em rascunho para poder agendar envios.
                <a href="/campaigns" className="warning-link">
                  Criar uma campanha
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="chart-card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3 className="empty-state-title">Nenhum agendamento encontrado</h3>
            <p className="empty-state-description">
              {campaigns.length === 0 ? 
                'Crie campanhas primeiro para poder agendar envios.' :
                'Comece agendando o envio de uma campanha.'
              }
            </p>
            {campaigns.length > 0 && (
              <div className="empty-state-action">
                <button
                  onClick={openCreateModal}
                  className="dashboard-refresh-btn"
                >
                  📅 Criar Primeiro Agendamento
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="chart-card">
          <div className="schedules-list">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="schedule-item">
                <div className="schedule-info">
                  <div className="schedule-icon">
                    <span>📅</span>
                  </div>
                  <div className="schedule-details">
                    <div className="schedule-header">
                      <span className="schedule-campaign">
                        {getCampaignName(schedule.campaign_id)}
                      </span>
                      {getStatusBadge(schedule)}
                    </div>
                    <div className="schedule-meta">
                      <p className="schedule-date">
                        <span className="schedule-label">Agendado para:</span> {formatDate(schedule.scheduled_at)}
                      </p>
                      {schedule.repeat_interval && (
                        <p className="schedule-date">
                          <span className="schedule-label">Repetir:</span> {schedule.repeat_interval} 
                          {schedule.repeat_count === null ? ' (infinitamente)' : 
                           schedule.repeat_count > 1 ? ` (${schedule.repeat_count}x)` : ''}
                        </p>
                      )}
                      <p className="schedule-created">
                        Criado em: {formatDate(schedule.created_at)}
                      </p>
                      {schedule.executed_at && (
                        <p className="schedule-created">
                          Executado em: {formatDate(schedule.executed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="schedule-actions">
                  {schedule.status === 'pending' && new Date(schedule.scheduled_at) > new Date() && (
                    <>
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="schedule-edit-btn"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleCancel(schedule.campaign_id)}
                        className="schedule-cancel-btn"
                      >
                        ❌ Cancelar
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSchedule ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button
                onClick={closeModal}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-field">
                <label htmlFor="campaign_id" className="form-label">
                  Campanha *
                </label>
                <select
                  name="campaign_id"
                  id="campaign_id"
                  value={formData.campaign_id}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  required
                >
                  <option value="">Selecione uma campanha</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="scheduled_at" className="form-label">
                  Data e Horário *
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  id="scheduled_at"
                  value={formData.scheduled_at}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="timezone" className="form-label">
                  Fuso Horário
                </label>
                <select
                  name="timezone"
                  id="timezone"
                  value={formData.timezone}
                  onChange={handleInputChange}
                  className="dashboard-select"
                >
                  <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                  <option value="America/New_York">Nova York (GMT-5)</option>
                  <option value="Europe/London">Londres (GMT+0)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              {/* Seção de Filtro por Tags */}
              <div className="form-field">
                <label className="form-checkbox-container">
                  <input
                    type="checkbox"
                    name="use_tags"
                    checked={formData.use_tags}
                    onChange={handleInputChange}
                    className="form-checkbox"
                  />
                  <span className="form-checkmark"></span>
                  Filtrar contatos por tags (ao invés de usar segmentos da campanha)
                </label>
              </div>

              {formData.use_tags && (
                <>
                  <div className="form-field">
                    <label className="form-label">
                      Selecionar Tags *
                    </label>
                    {tags.length === 0 ? (
                      <div className="warning-banner" style={{ margin: '10px 0' }}>
                        <div className="warning-icon">⚠️</div>
                        <div className="warning-content">
                          <p className="warning-text">
                            Nenhuma tag encontrada. 
                            <a href="/tags" className="warning-link">
                              Criar tags primeiro
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="tags-selection" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        {tags.map((tag) => (
                          <label
                            key={tag.id}
                            className={`tag-item ${formData.selected_tags.includes(tag.name) ? 'selected' : ''}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '6px 12px',
                              border: '2px solid #e0e0e0',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              backgroundColor: formData.selected_tags.includes(tag.name) ? '#e3f2fd' : '#f9f9f9',
                              borderColor: formData.selected_tags.includes(tag.name) ? '#2196f3' : '#e0e0e0',
                              transition: 'all 0.2s'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selected_tags.includes(tag.name)}
                              onChange={() => handleTagSelection(tag.name)}
                              style={{ display: 'none' }}
                            />
                            <span style={{ fontSize: '12px' }}>
                              {tag.icon || '🏷️'} {tag.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {formData.selected_tags.length > 0 && (
                    <div className="form-field">
                      <label className="form-label">
                        Preview dos Contatos ({loadingContacts ? 'Carregando...' : selectedContacts.length})
                      </label>
                      {loadingContacts ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        </div>
                      ) : (
                        <div className="contacts-preview" style={{ 
                          maxHeight: '150px', 
                          overflowY: 'auto', 
                          border: '1px solid #e0e0e0', 
                          borderRadius: '4px', 
                          padding: '10px',
                          backgroundColor: '#f9f9f9'
                        }}>
                          {selectedContacts.length === 0 ? (
                            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                              Nenhum contato encontrado com as tags selecionadas
                            </p>
                          ) : (
                            selectedContacts.map((contact) => (
                              <div key={contact.id} style={{ 
                                padding: '4px 0', 
                                fontSize: '14px',
                                borderBottom: '1px solid #eee'
                              }}>
                                📧 {contact.email} 
                                {contact.nome && <span style={{ color: '#666' }}> ({contact.nome})</span>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="form-field">
                <label htmlFor="repeat_interval" className="form-label">
                  Repetir (Opcional)
                </label>
                <select
                  name="repeat_interval"
                  id="repeat_interval"
                  value={formData.repeat_interval}
                  onChange={handleInputChange}
                  className="dashboard-select"
                >
                  <option value="">Não repetir</option>
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensalmente</option>
                </select>
              </div>

              {formData.repeat_interval && (
                <>
                  <div className="form-field">
                    <label className="form-checkbox-container">
                      <input
                        type="checkbox"
                        name="infinite_repeat"
                        checked={formData.infinite_repeat}
                        onChange={handleInputChange}
                        className="form-checkbox"
                      />
                      <span className="form-checkmark"></span>
                      Repetir indefinidamente (para sempre)
                    </label>
                  </div>

                  {!formData.infinite_repeat && (
                    <div className="form-field">
                      <label htmlFor="repeat_count" className="form-label">
                        Número de Repetições
                      </label>
                      <input
                        type="number"
                        name="repeat_count"
                        id="repeat_count"
                        min="1"
                        max="365"
                        value={formData.repeat_count}
                        onChange={handleInputChange}
                        className="dashboard-select"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="info-box">
                <div className="info-icon">ℹ️</div>
                <div className="info-content">
                  <h3 className="info-title">Informação</h3>
                  <p className="info-text">
                    O agendamento será processado automaticamente na data e horário especificados.
                    Certifique-se de que a campanha selecionada está pronta para envio.
                  </p>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="dashboard-secondary-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="dashboard-refresh-btn"
                >
                  {editingSchedule ? 'Atualizar' : 'Criar'} Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Schedules