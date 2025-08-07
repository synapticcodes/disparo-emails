import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { logContactAction } from '../lib/logger'
import '../styles/dashboard.css'

const Contacts = () => {
  const [contacts, setContacts] = useState([])
  const [availableTags, setAvailableTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    nome: '',
    tags: []
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [showCreateTag, setShowCreateTag] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Buscar dados diretamente do Supabase
      const [
        { data: contactsData, error: contactsError },
        { data: tagsData, error: tagsError }
      ] = await Promise.all([
        supabase.from('contatos').select('*'),
        supabase.from('tags').select('*')
      ])
      
      if (contactsError) console.error('Erro contatos:', contactsError)
      if (tagsError) console.error('Erro tags:', tagsError)
      
      setContacts(contactsData || [])
      setAvailableTags(tagsData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      if (error.response?.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.')
      } else {
        toast.error(error.response?.data?.error || 'Erro ao carregar dados')
      }
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

  const handleTagToggle = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }))
  }

  const handleCreateNewTag = async () => {
    if (!newTagInput.trim()) {
      toast.error('Digite o nome da nova tag')
      return
    }

    try {
      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser()
      
      const newTag = {
        nome: newTagInput.trim(),
        color: '#7c3aed',
        icon: '🏷️',
        description: `Criado via contatos`,
        user_id: user?.id
      }

      const { data: createdTag, error } = await supabase
        .from('tags')
        .insert([newTag])
        .select()
        .single()

      if (error) throw error

      // Adicionar nova tag à lista
      setAvailableTags(prev => [...prev, createdTag])
      
      // Adicionar automaticamente ao contato
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, createdTag.nome]
      }))

      setNewTagInput('')
      setShowCreateTag(false)
      toast.success(`Tag "${createdTag.nome}" criada e adicionada!`)
    } catch (error) {
      console.error('Erro ao criar tag:', error)
      toast.error(error.response?.data?.error || 'Erro ao criar tag')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email.trim()) {
      toast.error('Por favor, insira o email do contato')
      return
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Por favor, insira um email válido')
      return
    }

    try {
      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser()
      
      const contactData = {
        ...formData,
        tags: formData.tags, // já é um array
        user_id: user?.id
      }

      if (editingContact) {
        const { error } = await supabase
          .from('contatos')
          .update(contactData)
          .eq('id', editingContact.id)
        
        if (error) throw error
        toast.success('Contato atualizado com sucesso!')
        
        // Log da atualização
        await logContactAction.update(editingContact.id, contactData, true)
      } else {
        const { error } = await supabase
          .from('contatos')
          .insert([contactData])
        
        if (error) throw error
        toast.success('Contato criado com sucesso!')
        
        // Log da criação
        await logContactAction.create(contactData, true)
      }

      setShowModal(false)
      setEditingContact(null)
      setFormData({
        email: '',
        nome: '',
        tags: []
      })
      fetchData() // recarregar dados e tags
    } catch (error) {
      console.error('Erro ao salvar contato:', error)
      toast.error(error.response?.data?.error || 'Erro ao salvar contato')
      
      // Log do erro
      if (editingContact) {
        await logContactAction.update(editingContact.id, formData, false, error)
      } else {
        await logContactAction.create(formData, false, error)
      }
    }
  }

  const handleEdit = (contact) => {
    setEditingContact(contact)
    setFormData({
      email: contact.email,
      nome: contact.nome || '',
      tags: Array.isArray(contact.tags) ? contact.tags : 
            (contact.tags ? contact.tags.split(',').map(t => t.trim()).filter(t => t) : [])
    })
    setShowModal(true)
  }

  const handleDelete = async (contactId, contactEmail) => {
    if (!window.confirm(`Tem certeza que deseja excluir o contato "${contactEmail}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contatos')
        .delete()
        .eq('id', contactId)
      
      if (error) throw error
      toast.success('Contato excluído com sucesso!')
      
      // Log da exclusão
      await logContactAction.delete(contactId, contactEmail, true)
      
      fetchData()
    } catch (error) {
      console.error('Erro ao excluir contato:', error)
      toast.error(error.message || 'Erro ao excluir contato')
      
      // Log do erro
      await logContactAction.delete(contactId, contactEmail, false, error)
    }
  }

  const openCreateModal = () => {
    setEditingContact(null)
    setFormData({
      email: '',
      nome: '',
      tags: []
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingContact(null)
    setFormData({
      email: '',
      nome: '',
      tags: []
    })
    setNewTagInput('')
    setShowCreateTag(false)
  }

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTag = !filterTag || 
                      (Array.isArray(contact.tags) ? contact.tags.includes(filterTag) : 
                       contact.tags?.includes(filterTag))
    
    return matchesSearch && matchesTag
  })

  const getTagDisplay = (tagName) => {
    const tag = availableTags.find(t => t.nome === tagName)
    return tag ? `${tag.icon} ${tag.nome}` : `🏷️ ${tagName}`
  }

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      padding: '2rem',
      marginBottom: '2rem',
      maxWidth: '1200px',
      margin: '0 auto 2rem'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#1a202c',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    subtitle: {
      color: '#666',
      fontSize: '1.1rem',
      margin: '0.5rem 0 0 0'
    },
    button: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '1rem'
    },
    filterGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '1.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      transition: 'border-color 0.2s',
      outline: 'none'
    },
    label: {
      display: 'block',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    contactsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '1.5rem',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    contactCard: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      transition: 'transform 0.2s, box-shadow 0.2s'
    },
    contactHeader: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    avatar: {
      width: '3rem',
      height: '3rem',
      borderRadius: '50%',
      backgroundColor: 'rgba(255,255,255,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
      fontWeight: 'bold',
      marginRight: '1rem'
    },
    contactInfo: {
      flex: 1
    },
    contactName: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      margin: 0
    },
    contactEmail: {
      fontSize: '0.9rem',
      opacity: 0.9,
      margin: '0.25rem 0 0 0'
    },
    actionButtons: {
      display: 'flex',
      gap: '0.5rem'
    },
    iconButton: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      borderRadius: '0.5rem',
      width: '2rem',
      height: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    contactBody: {
      padding: '1.5rem'
    },
    contactDetail: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.75rem',
      color: '#4a5568'
    },
    icon: {
      marginRight: '0.75rem',
      fontSize: '1rem'
    },
    tagsContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginTop: '1rem'
    },
    tag: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '0.25rem 0.75rem',
      borderRadius: '1rem',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      padding: '2rem',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflowY: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem'
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#666'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    formButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1.5rem'
    },
    cancelButton: {
      flex: 1,
      background: '#f7fafc',
      color: '#4a5568',
      border: '2px solid #e2e8f0',
      padding: '0.75rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      cursor: 'pointer'
    },
    submitButton: {
      flex: 1,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      padding: '0.75rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      cursor: 'pointer'
    },
    emptyState: {
      textAlign: 'center',
      padding: '4rem 2rem',
      color: '#666'
    },
    emptyIcon: {
      fontSize: '4rem',
      marginBottom: '1rem',
      display: 'block'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    spinner: {
      width: '3rem',
      height: '3rem',
      border: '4px solid rgba(255,255,255,0.3)',
      borderTop: '4px solid white',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem'
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Contatos</h1>
          <p className="dashboard-subtitle">
            Gerencie sua lista de contatos com tags personalizadas
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
          >
            ➕ Novo Contato
          </button>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Filtros</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {filteredContacts.length} de {contacts.length} contatos
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div>
            <label className="form-label">Buscar Contatos</label>
            <input
              type="text"
              className="dashboard-select"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por email ou nome..."
            />
          </div>
          <div>
            <label className="form-label">Filtrar por Tag</label>
            <select
              className="dashboard-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">Todas as tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.nome}>
                  {tag.icon} {tag.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {(searchTerm || filterTag) && (
          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button 
              onClick={() => { setSearchTerm(''); setFilterTag('') }}
              className="dashboard-secondary-btn"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Contatos */}
      {filteredContacts.length === 0 ? (
        <div style={styles.card}>
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>👥</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
              {contacts.length === 0 ? 'Nenhum contato encontrado' : 'Nenhum contato corresponde aos filtros'}
            </h3>
            <p style={{ marginBottom: '2rem' }}>
              {contacts.length === 0 ? 
                'Comece adicionando seu primeiro contato para gerenciar sua lista de campanhas.' : 
                'Tente ajustar os filtros de busca para encontrar o que procura.'
              }
            </p>
            {contacts.length === 0 && (
              <button
                style={styles.button}
                onClick={openCreateModal}
                onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.target.style.transform = 'translateY(0px)'}
              >
                ➕ Adicionar Primeiro Contato
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={styles.contactsGrid}>
          {filteredContacts.map((contact) => (
            <div 
              key={contact.id} 
              style={styles.contactCard}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
              }}
            >
              {/* Card Header */}
              <div style={styles.contactHeader}>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={styles.avatar}>
                    {(contact.nome || contact.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={styles.contactInfo}>
                    <h3 style={styles.contactName}>
                      {contact.nome || 'Sem nome'}
                    </h3>
                    <p style={styles.contactEmail}>
                      {contact.email}
                    </p>
                  </div>
                </div>
                <div style={styles.actionButtons}>
                  <button
                    style={styles.iconButton}
                    onClick={() => handleEdit(contact)}
                    title="Editar contato"
                    onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                  >
                    ✏️
                  </button>
                  <button
                    style={styles.iconButton}
                    onClick={() => handleDelete(contact.id, contact.email)}
                    title="Excluir contato"
                    onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {/* Card Content */}
              <div style={styles.contactBody}>
                <div style={styles.contactDetail}>
                  <span style={styles.icon}>📅</span>
                  <span>Adicionado em: {new Date(contact.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {contact.tags && contact.tags.length > 0 && (
                  <div style={styles.tagsContainer}>
                    {(Array.isArray(contact.tags) ? contact.tags : contact.tags.split(',')).map((tagName, index) => {
                      const tag = availableTags.find(t => t.nome === tagName.trim())
                      return (
                        <span 
                          key={index} 
                          style={{
                            ...styles.tag,
                            backgroundColor: tag?.color || '#667eea'
                          }}
                        >
                          {tag?.icon || '🏷️'} {tagName.trim()}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.modal} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  {editingContact ? '✏️ Editar Contato' : '➕ Novo Contato'}
                </h3>
                <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                  {editingContact ? 'Edite as informações do contato' : 'Preencha as informações para adicionar'}
                </p>
              </div>
              <button style={styles.closeButton} onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div>
                <label style={styles.label}>📧 Email *</label>
                <input
                  type="email"
                  name="email"
                  style={styles.input}
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contato@exemplo.com"
                  required
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div>
                <label style={styles.label}>👤 Nome Completo</label>
                <input
                  type="text"
                  name="nome"
                  style={styles.input}
                  value={formData.nome}
                  onChange={handleInputChange}
                  placeholder="Nome do contato"
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>


              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={styles.label}>🏷️ Tags</label>
                  <button
                    type="button"
                    onClick={() => setShowCreateTag(!showCreateTag)}
                    style={{
                      background: 'none',
                      border: '1px solid #667eea',
                      color: '#667eea',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {showCreateTag ? 'Cancelar' : '+ Nova Tag'}
                  </button>
                </div>

                {/* Criar Nova Tag */}
                {showCreateTag && (
                  <div style={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#f8fafc'
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem', display: 'block' }}>
                          Nome da nova tag
                        </label>
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          placeholder="Ex: Cliente Premium"
                          style={{
                            ...styles.input,
                            fontSize: '0.9rem',
                            padding: '0.5rem'
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateNewTag()}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateNewTag}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Criar & Usar
                      </button>
                    </div>
                  </div>
                )}

                {/* Seleção de Tags Existentes */}
                <div style={{
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {availableTags.length === 0 ? (
                    <p style={{ color: '#666', textAlign: 'center', margin: 0, fontSize: '0.9rem' }}>
                      Nenhuma tag disponível. Crie uma nova tag acima.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {availableTags.map((tag) => (
                        <label
                          key={tag.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            backgroundColor: formData.tags.includes(tag.nome) ? '#f0f9ff' : 'transparent',
                            border: formData.tags.includes(tag.nome) ? '1px solid #0ea5e9' : '1px solid transparent'
                          }}
                          onMouseOver={(e) => {
                            if (!formData.tags.includes(tag.nome)) {
                              e.currentTarget.style.backgroundColor = '#f9fafb'
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!formData.tags.includes(tag.nome)) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.tags.includes(tag.nome)}
                            onChange={() => handleTagToggle(tag.nome)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '1rem' }}>{tag.icon}</span>
                          <span style={{ 
                            flex: 1, 
                            fontSize: '0.9rem',
                            color: formData.tags.includes(tag.nome) ? '#0ea5e9' : '#374151'
                          }}>
                            {tag.nome}
                          </span>
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: tag.color || '#667eea'
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags Selecionadas */}
                {formData.tags.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                      Tags selecionadas ({formData.tags.length}):
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {formData.tags.map((tagName, index) => (
                        <span
                          key={index}
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '1rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {getTagDisplay(tagName)}
                          <button
                            type="button"
                            onClick={() => handleTagToggle(tagName)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              padding: '0',
                              marginLeft: '0.25rem'
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.formButtons}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={closeModal}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#edf2f7'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#f7fafc'}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={styles.submitButton}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0px)'}
                >
                  {editingContact ? 'Atualizar' : 'Criar'} Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Contacts