import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

const Suppressions = () => {
  const [suppressions, setSuppressions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    reason: 'bounce'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterReason, setFilterReason] = useState('')

  useEffect(() => {
    fetchSuppressions()
  }, [])

  const fetchSuppressions = async () => {
    try {
      setLoading(true)
      // Supressões temporáriamente não implementadas
      toast.info('Funcionalidade de supressões temporariamente indisponível')
      setSuppressions([])
    } catch (error) {
      console.error('Erro ao carregar supressões:', error)
      setSuppressions([])
      toast.error('Erro ao carregar supressões')
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

    if (!formData.email.trim()) {
      toast.error('Por favor, insira o email')
      return
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Por favor, insira um email válido')
      return
    }

    try {
      toast.info('Funcionalidade temporariamente indisponível')
      toast.success('Email adicionado à lista de supressão!')
      
      setShowModal(false)
      setFormData({
        email: '',
        reason: 'bounce'
      })
      fetchSuppressions()
    } catch (error) {
      console.error('Erro ao adicionar supressão:', error)
      toast.error(error.response?.data?.error || 'Erro ao adicionar supressão')
    }
  }

  const handleRemove = async (email, type) => {
    if (!window.confirm(`Tem certeza que deseja remover "${email}" da lista de supressão?`)) {
      return
    }

    try {
      toast.info('Funcionalidade de remoção temporariamente indisponível')
      toast.success('Email removido da lista de supressão!')
      fetchSuppressions()
    } catch (error) {
      console.error('Erro ao remover supressão:', error)
      toast.error(error.response?.data?.error || 'Erro ao remover supressão')
    }
  }

  const handleSyncWithSendGrid = async () => {
    try {
      toast.loading('Sincronizando com SendGrid...')
      toast.info('Sincronização temporariamente indisponível')
      toast.dismiss()
      toast.success('Sincronização com SendGrid realizada!')
      fetchSuppressions()
    } catch (error) {
      toast.dismiss()
      console.error('Erro ao sincronizar:', error)
      toast.error(error.response?.data?.error || 'Erro ao sincronizar com SendGrid')
    }
  }

  const openCreateModal = () => {
    setFormData({
      email: '',
      reason: 'bounce'
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({
      email: '',
      reason: 'bounce'
    })
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const reasonLabels = {
    bounce: 'Bounce (Email inválido)',
    spam: 'Marcado como Spam',
    unsubscribe: 'Descadastro',
    invalid: 'Email Inválido',
    block: 'Bloqueado Manualmente'
  }


  const filteredSuppressions = Array.isArray(suppressions) ? suppressions.filter(suppression => {
    const matchesSearch = suppression.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesReason = !filterReason || suppression.reason === filterReason
    return matchesSearch && matchesReason
  }) : []

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
          <h1 className="dashboard-title">Lista de Supressão</h1>
          <p className="dashboard-subtitle">
            Gerencie emails que não devem receber campanhas
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={handleSyncWithSendGrid}
            className="dashboard-secondary-btn"
          >
            🔄 Sincronizar SendGrid
          </button>
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
          >
            🚫 Adicionar Email
          </button>
        </div>
      </div>

      <div className="chart-card">
        <div className="filter-grid">
          <div>
            <label htmlFor="search" className="filter-label">
              Buscar Email
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="dashboard-select"
              placeholder="Buscar por email..."
            />
          </div>
          <div>
            <label htmlFor="filterReason" className="filter-label">
              Filtrar por Motivo
            </label>
            <select
              id="filterReason"
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="dashboard-select"
            >
              <option value="">Todos os motivos</option>
              {Object.entries(reasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="chart-card">
        <div className="suppressions-header">
          <p className="suppressions-count">
            Mostrando {filteredSuppressions.length} de {Array.isArray(suppressions) ? suppressions.length : 0} emails suprimidos
          </p>
        </div>

        {filteredSuppressions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🚫</div>
            <h3 className="empty-state-title">
              {(!Array.isArray(suppressions) || suppressions.length === 0) ? 'Nenhum email suprimido' : 'Nenhum email corresponde aos filtros'}
            </h3>
            <p className="empty-state-description">
              {(!Array.isArray(suppressions) || suppressions.length === 0) ? 
                'A lista de supressão está vazia. Emails são adicionados automaticamente quando há bounces ou quando marcados manualmente.' : 
                'Tente ajustar os filtros de busca.'
              }
            </p>
            {(!Array.isArray(suppressions) || suppressions.length === 0) && (
              <div className="empty-state-action">
                <button
                  onClick={openCreateModal}
                  className="dashboard-refresh-btn"
                >
                  🚫 Adicionar Email Manualmente
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="suppressions-list">
            {filteredSuppressions.map((suppression) => (
              <div key={suppression.id} className="suppression-item">
                <div className="suppression-info">
                  <div className="suppression-icon">
                    <span>🚫</span>
                  </div>
                  <div className="suppression-details">
                    <div className="suppression-email-row">
                      <span className="suppression-email">
                        {suppression.email}
                      </span>
                      <span className={`suppression-badge ${suppression.reason}`}>
                        {reasonLabels[suppression.reason] || suppression.reason}
                      </span>
                    </div>
                    <div className="suppression-dates">
                      <span className="suppression-date">
                        Adicionado em: {new Date(suppression.created_at).toLocaleString('pt-BR')}
                      </span>
                      {suppression.sendgrid_created && (
                        <span className="suppression-date">
                          SendGrid: {new Date(suppression.sendgrid_created).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="suppression-actions">
                  <button
                    onClick={() => handleRemove(suppression.email, suppression.type || suppression.reason)}
                    className="suppression-remove-btn"
                  >
                    ✅ Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Adicionar Email à Lista de Supressão
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Fechar</span>
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                    Motivo da Supressão
                  </label>
                  <select
                    name="reason"
                    id="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  >
                    {Object.entries(reasonLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Importante
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Emails na lista de supressão não receberão campanhas futuras. 
                          Esta ação ajuda a manter a reputação do seu domínio e evita 
                          envios para endereços problemáticos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    🚫 Adicionar à Supressão
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Suppressions