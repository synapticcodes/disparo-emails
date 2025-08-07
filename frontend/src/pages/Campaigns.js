import React, { useState, useEffect } from 'react'
import { campaigns, templates, tags } from '../lib/api'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

const Campaigns = () => {
  const [campaignsList, setCampaignsList] = useState([])
  const [templatesList, setTemplatesList] = useState([])
  const [tagsList, setTagsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    template_id: '',
    tag_filter: '',
    scheduled_at: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [campaignsRes, templatesRes, tagsRes] = await Promise.all([
        campaigns.list(),
        templates.list(),
        tags.list()
      ])
      
      // Handle different response formats
      const campaignsData = campaignsRes.data.data || campaignsRes.data
      const templatesData = templatesRes.data.data || templatesRes.data
      const tagsData = tagsRes.data.data || tagsRes.data
      
      setCampaignsList(Array.isArray(campaignsData) ? campaignsData : [])
      setTemplatesList(Array.isArray(templatesData) ? templatesData : [])
      setTagsList(Array.isArray(tagsData) ? tagsData : [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Por favor, insira o nome da campanha')
      return
    }

    if (!formData.subject.trim()) {
      toast.error('Por favor, insira o assunto da campanha')
      return
    }

    if (!formData.template_id) {
      toast.error('Por favor, selecione um template')
      return
    }

    try {
      if (editingCampaign) {
        await campaigns.update(editingCampaign.id, formData)
        toast.success('Campanha atualizada com sucesso!')
      } else {
        await campaigns.create(formData)
        toast.success('Campanha criada com sucesso!')
      }

      setShowModal(false)
      setEditingCampaign(null)
      setFormData({
        name: '',
        subject: '',
        template_id: '',
        tag_filter: '',
        scheduled_at: ''
      })
      fetchData()
    } catch (error) {
      console.error('Erro ao salvar campanha:', error)
      toast.error(error.response?.data?.error || 'Erro ao salvar campanha')
    }
  }

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign)
    setFormData({
      name: campaign.nome || campaign.name,
      subject: campaign.assunto || campaign.subject,
      template_id: campaign.template_id || '',
      tag_filter: campaign.tag_filter || campaign.segment_filter || '',
      scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : ''
    })
    setShowModal(true)
  }

  const handleDelete = async (campaignId, campaignName) => {
    if (!window.confirm(`Tem certeza que deseja excluir a campanha "${campaignName}"?`)) {
      return
    }

    try {
      await campaigns.delete(campaignId)
      toast.success('Campanha excluída com sucesso!')
      fetchData()
    } catch (error) {
      console.error('Erro ao excluir campanha:', error)
      toast.error(error.response?.data?.error || 'Erro ao excluir campanha')
    }
  }

  const handleSendCampaign = async (campaignId) => {
    if (!window.confirm('Tem certeza que deseja enviar esta campanha?')) {
      return
    }

    try {
      await campaigns.send(campaignId)
      toast.success('Campanha enviada com sucesso!')
      fetchData()
    } catch (error) {
      console.error('Erro ao enviar campanha:', error)
      toast.error(error.response?.data?.error || 'Erro ao enviar campanha')
    }
  }

  const openCreateModal = () => {
    setEditingCampaign(null)
    setFormData({
      name: '',
      subject: '',
      template_id: '',
      tag_filter: '',
      scheduled_at: ''
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCampaign(null)
    setFormData({
      name: '',
      subject: '',
      template_id: '',
      tag_filter: '',
      scheduled_at: ''
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      'rascunho': { className: 'status-badge draft', text: 'Rascunho' },
      'agendada': { className: 'status-badge scheduled', text: 'Agendada' },
      'enviando': { className: 'status-badge sending', text: 'Enviando' },
      'enviada': { className: 'status-badge sent', text: 'Enviada' },
      'erro': { className: 'status-badge error', text: 'Erro' }
    }

    const config = statusConfig[status] || statusConfig['rascunho']
    return <span className={config.className}>{config.text}</span>
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Campanhas de Email</h1>
          <p className="dashboard-subtitle">
            Gerencie suas campanhas de email em massa
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
          >
            📢 Nova Campanha
          </button>
        </div>
      </div>

      {campaignsList.length === 0 ? (
        <div className="chart-card">
          <div className="empty-state">
            <div className="empty-state-icon">📢</div>
            <h3 className="empty-state-title">Nenhuma campanha encontrada</h3>
            <p className="empty-state-description">
              Comece criando sua primeira campanha de email.
            </p>
            <div className="empty-state-action">
              <button
                onClick={openCreateModal}
                className="dashboard-refresh-btn"
              >
                📢 Criar Primeira Campanha
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="chart-card">
          <div className="campaigns-list">
            {campaignsList.map((campaign) => (
              <div key={campaign.id} className="campaign-item">
                <div className="campaign-info">
                  <div className="campaign-icon">
                    <span>📢</span>
                  </div>
                  <div className="campaign-details">
                    <div className="campaign-header">
                      <span className="campaign-name">
                        {campaign.nome || campaign.name}
                      </span>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="campaign-meta">
                      <p className="campaign-subject">
                        <span className="campaign-label">Assunto:</span> {campaign.assunto || campaign.subject}
                      </p>
                      {campaign.agendamento && (
                        <p className="campaign-scheduled">
                          <span className="campaign-label">Agendado para:</span> {new Date(campaign.agendamento).toLocaleString('pt-BR')}
                        </p>
                      )}
                      <p className="campaign-created">
                        Criado em: {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="campaign-actions">
                  {campaign.status === 'rascunho' && (
                    <button
                      onClick={() => handleSendCampaign(campaign.id)}
                      className="campaign-send-btn"
                    >
                      🚀 Enviar
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(campaign)}
                    className="campaign-edit-btn"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id, campaign.nome || campaign.name)}
                    className="campaign-delete-btn"
                  >
                    🗑️ Excluir
                  </button>
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
                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
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
                <label htmlFor="name" className="form-label">
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  placeholder="Ex: Newsletter Janeiro 2024"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="subject" className="form-label">
                  Assunto do Email
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  placeholder="Assunto que aparecerá no email"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="template_id" className="form-label">
                  Template
                </label>
                <select
                  name="template_id"
                  id="template_id"
                  value={formData.template_id}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  required
                >
                  <option value="">Selecione um template</option>
                  {templatesList.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nome || template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="tag_filter" className="form-label">
                  Tags para Enviar (Opcional)
                </label>
                <select
                  name="tag_filter"
                  id="tag_filter"
                  value={formData.tag_filter}
                  onChange={handleInputChange}
                  className="dashboard-select"
                >
                  <option value="">Enviar para todos os contatos</option>
                  {tagsList.map((tag) => (
                    <option key={tag.id} value={tag.name}>
                      {tag.icon} {tag.name}
                    </option>
                  ))}
                </select>
                <p className="form-help">
                  Selecione uma tag para enviar apenas para contatos que possuem essa tag
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="scheduled_at" className="form-label">
                  Agendar Envio (Opcional)
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  id="scheduled_at"
                  value={formData.scheduled_at}
                  onChange={handleInputChange}
                  className="dashboard-select"
                />
                <p className="form-help">
                  Deixe em branco para enviar imediatamente
                </p>
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
                  {editingCampaign ? 'Atualizar' : 'Criar'} Campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Campaigns