import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logTagAction, logBulkAction } from '../lib/logger'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

const Tags = () => {
  const [tags, setTags] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showBulkRemoveModal, setShowBulkRemoveModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [selectedTagForBulk, setSelectedTagForBulk] = useState('')
  const [selectedTagForRemoval, setSelectedTagForRemoval] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    color: '#7c3aed',
    icon: '🏷️',
    description: ''
  })

  const availableIcons = [
    '🏷️', '⭐', '🎯', '💎', '🔥', '💼', '👑', '🚀', 
    '🎨', '📌', '💰', '🌟', '🎪', '🎭', '🎨', '🎵',
    '🔖', '📍', '🎈', '🎉', '💫', '✨', '🌈', '🦄'
  ]

  const availableColors = [
    '#7c3aed', '#2563eb', '#059669', '#dc2626', '#ea580c',
    '#ca8a04', '#7c2d12', '#be185d', '#9333ea', '#4338ca',
    '#0891b2', '#065f46', '#991b1b', '#9a3412', '#92400e'
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [
        { data: tagsData, error: tagsError },
        { data: contactsData, error: contactsError }
      ] = await Promise.all([
        supabase.from('tags').select('*'),
        supabase.from('contatos').select('*')
      ])
      
      if (tagsError) console.error('Erro tags:', tagsError)
      if (contactsError) console.error('Erro contatos:', contactsError)
      
      setTags(tagsData || [])
      setContacts(contactsData || [])
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setTags([])
      setContacts([])
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
      toast.error('Por favor, insira o nome da tag')
      return
    }

    try {
      if (editingTag) {
        const { error } = await supabase
          .from('tags')
          .update(formData)
          .eq('id', editingTag.id)
        
        if (error) throw error
        toast.success('Tag atualizada com sucesso!')
        
        // Log da atualização (usando create pois não há update específico)
        await logTagAction.create(formData, true)
      } else {
        const { error } = await supabase
          .from('tags')
          .insert([formData])
        
        if (error) throw error
        toast.success('Tag criada com sucesso!')
        
        // Log da criação
        await logTagAction.create(formData, true)
      }

      setShowModal(false)
      setEditingTag(null)
      setFormData({ name: '', color: '#7c3aed', icon: '🏷️', description: '' })
      fetchData()
    } catch (error) {
      console.error('Erro ao salvar tag:', error)
      toast.error(error.message || 'Erro ao salvar tag')
      
      // Log do erro
      await logTagAction.create(formData, false, error)
    }
  }

  const handleEdit = (tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      description: tag.description || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (tagId, tagName) => {
    if (!window.confirm(`Tem certeza que deseja excluir a tag "${tagName}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
      
      if (error) throw error
      toast.success('Tag excluída com sucesso!')
      
      // Log da exclusão
      await logTagAction.delete(tagId, tagName, true)
      
      fetchData()
    } catch (error) {
      console.error('Erro ao excluir tag:', error)
      toast.error(error.message || 'Erro ao excluir tag')
      
      // Log do erro
      await logTagAction.delete(tagId, tagName, false, error)
    }
  }

  const handleBulkTag = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione pelo menos um contato')
      return
    }

    if (!selectedTagForBulk) {
      toast.error('Selecione uma tag')
      return
    }

    // Temporary: Bulk operations not implemented yet
    toast.info('Função de tag em lote temporariamente indisponível')
    
    // Log da operação em massa (mesmo sendo temporária)
    const selectedTag = tags.find(tag => tag.id === selectedTagForBulk)
    await logBulkAction.tagContacts(
      selectedContacts,
      selectedTag?.nome || 'Tag desconhecida',
      true
    )
    
    setShowBulkModal(false)
    setSelectedContacts([])
    setSelectedTagForBulk('')
  }

  const handleBulkRemoveTag = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Selecione pelo menos um contato')
      return
    }

    if (!selectedTagForRemoval) {
      toast.error('Selecione uma tag para remover')
      return
    }

    // Temporary: Bulk operations not implemented yet
    toast.info('Função de remoção de tag em lote temporariamente indisponível')
    
    // Log da operação em massa de remoção (mesmo sendo temporária)
    const selectedTag = tags.find(tag => tag.nome === selectedTagForRemoval)
    await logBulkAction.removeTagContacts(
      selectedContacts,
      selectedTag?.nome || selectedTagForRemoval,
      true
    )
    
    setShowBulkRemoveModal(false)
    setSelectedContacts([])
    setSelectedTagForRemoval('')
  }

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const getContactTags = (contact) => {
    if (!contact.tags) return []
    return Array.isArray(contact.tags) ? contact.tags : contact.tags.split(',').map(t => t.trim())
  }

  const getTagById = (tagId) => {
    return tags.find(tag => tag.id === tagId || tag.name === tagId)
  }

  const handleRemoveTagFromContact = async (contactId, tagName, contactEmail) => {
    if (!window.confirm(`Tem certeza que deseja remover a tag "${tagName}" do contato "${contactEmail}"?`)) {
      return
    }

    // Temporary: Individual tag removal not implemented yet
    toast.info('Funcionalidade de remoção de tag individual temporariamente indisponível')
  }

  const filteredContacts = contacts.filter(contact => {
    if (!filterTag) return true
    const contactTags = getContactTags(contact)
    return contactTags.some(tagName => {
      const tag = getTagById(tagName)
      return tag && (tag.id === filterTag || tag.name === filterTag)
    })
  })

  const openCreateModal = () => {
    setEditingTag(null)
    setFormData({ name: '', color: '#7c3aed', icon: '🏷️', description: '' })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTag(null)
    setFormData({ name: '', color: '#7c3aed', icon: '🏷️', description: '' })
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Gerenciamento de Tags</h1>
          <p className="dashboard-subtitle">
            Organize seus contatos com tags personalizadas
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={() => setShowBulkModal(true)}
            className="dashboard-secondary-btn"
            disabled={contacts.length === 0}
          >
            🏷️ Tagear em Massa
          </button>
          <button
            onClick={() => setShowBulkRemoveModal(true)}
            className="dashboard-secondary-btn"
            disabled={contacts.length === 0}
            style={{ background: '#fecaca', color: '#dc2626' }}
          >
            🗑️ Remover em Massa
          </button>
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
          >
            ➕ Nova Tag
          </button>
        </div>
      </div>

      {/* Seção de Tags */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Tags Disponíveis</h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {tags.length} tag(s) criada(s)
          </p>
        </div>
        
        {tags.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <h3 className="empty-state-title">Nenhuma tag encontrada</h3>
            <p className="empty-state-description">
              Crie sua primeira tag para organizar seus contatos.
            </p>
            <div className="empty-state-action">
              <button onClick={openCreateModal} className="dashboard-refresh-btn">
                ➕ Criar Primeira Tag
              </button>
            </div>
          </div>
        ) : (
          <div className="metrics-grid">
            {tags.map((tag) => (
              <div key={tag.id} className="metric-card">
                <div className="metric-card-header">
                  <div 
                    className="metric-card-icon"
                    style={{ background: tag.color }}
                  >
                    {tag.icon}
                  </div>
                  <button className="metric-card-menu">⋯</button>
                </div>
                
                <h3 className="metric-card-value" style={{ fontSize: '18px', marginBottom: '8px' }}>
                  {tag.name}
                </h3>
                
                {tag.description && (
                  <p className="metric-card-title" style={{ marginBottom: '8px' }}>
                    {tag.description}
                  </p>
                )}
                
                <p className="metric-card-subtitle">
                  {contacts.filter(c => getContactTags(c).includes(tag.name)).length} contato(s)
                </p>

                <div style={{ 
                  marginTop: '16px', 
                  display: 'flex', 
                  gap: '6px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f3f4f6'
                }}>
                  <button
                    onClick={() => handleEdit(tag)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#ede9fe',
                      color: '#7c3aed',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id, tag.name)}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      background: '#fecaca',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção de Contatos com Tags */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Contatos por Tags</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="dashboard-select"
              style={{ minWidth: '200px' }}
            >
              <option value="">Todas as tags</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.icon} {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3 className="empty-state-title">
              {filterTag ? 'Nenhum contato com esta tag' : 'Nenhum contato encontrado'}
            </h3>
            <p className="empty-state-description">
              {filterTag ? 'Tente selecionar uma tag diferente ou remover o filtro.' : 'Adicione contatos para poder aplicar tags.'}
            </p>
          </div>
        ) : (
          <div className="contacts-tags-grid">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="contact-tag-item">
                <div className="contact-tag-info">
                  <div className="contact-tag-avatar">
                    {(contact.nome || contact.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-tag-details">
                    <h4 className="contact-tag-name">
                      {contact.nome || 'Sem nome'}
                    </h4>
                    <p className="contact-tag-email">{contact.email}</p>
                    <div className="contact-tag-tags">
                      {getContactTags(contact).map((tagName, index) => {
                        const tag = getTagById(tagName)
                        return tag ? (
                          <span 
                            key={index}
                            className="contact-tag-badge"
                            style={{ 
                              background: tag.color + '20', 
                              color: tag.color,
                              border: `1px solid ${tag.color}40`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {tag.icon} {tag.name}
                            <button
                              onClick={() => handleRemoveTagFromContact(contact.id, tag.name, contact.email)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: tag.color,
                                cursor: 'pointer',
                                fontSize: '10px',
                                padding: '0',
                                marginLeft: '4px',
                                fontWeight: 'bold',
                                opacity: 0.7
                              }}
                              onMouseOver={(e) => e.target.style.opacity = '1'}
                              onMouseOut={(e) => e.target.style.opacity = '0.7'}
                              title={`Remover tag "${tag.name}" deste contato`}
                            >
                              ✕
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição de Tag */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTag ? 'Editar Tag' : 'Nova Tag'}
              </h3>
              <button onClick={closeModal} className="modal-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-field">
                <label htmlFor="name" className="form-label">Nome da Tag</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  placeholder="Ex: Cliente VIP"
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="description" className="form-label">Descrição (Opcional)</label>
                <input
                  type="text"
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  placeholder="Descreva o propósito desta tag"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Ícone</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', marginTop: '8px' }}>
                  {availableIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                      style={{
                        padding: '12px',
                        border: formData.icon === icon ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: formData.icon === icon ? '#f3f4f6' : 'white',
                        fontSize: '20px',
                        cursor: 'pointer'
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Cor</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '8px' }}>
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      style={{
                        width: '40px',
                        height: '40px',
                        border: formData.color === color ? '3px solid #000' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        background: color,
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-field" style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                <label className="form-label">Preview</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <div 
                    style={{
                      padding: '8px 16px',
                      background: formData.color + '20',
                      color: formData.color,
                      border: `1px solid ${formData.color}40`,
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {formData.icon} {formData.name || 'Nome da Tag'}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="dashboard-secondary-btn">
                  Cancelar
                </button>
                <button type="submit" className="dashboard-refresh-btn">
                  {editingTag ? 'Atualizar' : 'Criar'} Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Tagear em Massa */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Tagear Contatos em Massa</h3>
              <button onClick={() => setShowBulkModal(false)} className="modal-close">×</button>
            </div>

            <div className="modal-form">
              <div className="form-field">
                <label className="form-label">Selecionar Tag</label>
                <select
                  value={selectedTagForBulk}
                  onChange={(e) => setSelectedTagForBulk(e.target.value)}
                  className="dashboard-select"
                >
                  <option value="">Escolha uma tag</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.icon} {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">
                  Selecionar Contatos ({selectedContacts.length} selecionados)
                </label>
                <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: selectedContacts.includes(contact.id) ? '#f0f9ff' : 'white'
                      }}
                      onClick={() => toggleContactSelection(contact.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        style={{ margin: 0 }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: '500' }}>
                          {contact.nome || 'Sem nome'}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowBulkModal(false)} 
                  className="dashboard-secondary-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleBulkTag}
                  className="dashboard-refresh-btn"
                >
                  Aplicar Tag a {selectedContacts.length} Contato(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Remoção em Massa */}
      {showBulkRemoveModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Remover Tags em Massa</h3>
              <button onClick={() => setShowBulkRemoveModal(false)} className="modal-close">×</button>
            </div>

            <div className="modal-form">
              <div className="form-field">
                <label className="form-label">Selecionar Tag para Remover</label>
                <select
                  value={selectedTagForRemoval}
                  onChange={(e) => setSelectedTagForRemoval(e.target.value)}
                  className="dashboard-select"
                >
                  <option value="">Escolha uma tag para remover</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.name}>
                      {tag.icon} {tag.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">
                  Selecionar Contatos ({selectedContacts.length} selecionados)
                </label>
                <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  {/* Mostrar apenas contatos que têm a tag selecionada */}
                  {selectedTagForRemoval ? (
                    contacts.filter(contact => {
                      const contactTags = getContactTags(contact)
                      return contactTags.includes(selectedTagForRemoval)
                    }).length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                        <p>Nenhum contato possui a tag "{selectedTagForRemoval}"</p>
                      </div>
                    ) : (
                      contacts.filter(contact => {
                        const contactTags = getContactTags(contact)
                        return contactTags.includes(selectedTagForRemoval)
                      }).map((contact) => (
                        <div
                          key={contact.id}
                          style={{
                            padding: '12px',
                            borderBottom: '1px solid #f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            background: selectedContacts.includes(contact.id) ? '#fef2f2' : 'white'
                          }}
                          onClick={() => toggleContactSelection(contact.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleContactSelection(contact.id)}
                            style={{ margin: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: '500' }}>
                              {contact.nome || 'Sem nome'}
                            </p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                              {contact.email}
                            </p>
                            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {getContactTags(contact)
                                .filter(tagName => tagName === selectedTagForRemoval)
                                .map((tagName, index) => {
                                  const tag = getTagById(tagName)
                                  return tag ? (
                                    <span 
                                      key={index}
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        background: tag.color + '20',
                                        color: tag.color,
                                        border: `1px solid ${tag.color}40`,
                                        borderRadius: '10px'
                                      }}
                                    >
                                      {tag.icon} {tag.name}
                                    </span>
                                  ) : null
                                })}
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                      <p>Selecione uma tag para ver os contatos que a possuem</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTagForRemoval && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  background: '#fef2f2', 
                  border: '1px solid #fecaca', 
                  borderRadius: '8px' 
                }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>
                    ⚠️ Atenção: A tag "{selectedTagForRemoval}" será removida de todos os contatos selecionados.
                  </p>
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowBulkRemoveModal(false)
                    setSelectedContacts([])
                    setSelectedTagForRemoval('')
                  }} 
                  className="dashboard-secondary-btn"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={handleBulkRemoveTag}
                  className="dashboard-refresh-btn"
                  style={{ 
                    background: '#dc2626',
                    borderColor: '#dc2626'
                  }}
                  disabled={selectedContacts.length === 0 || !selectedTagForRemoval}
                >
                  Remover Tag de {selectedContacts.length} Contato(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Tags