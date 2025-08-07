import React, { useState, useEffect } from 'react'
import { api, variables as variablesApi, datasets as datasetsApi } from '../lib/api'
import toast from 'react-hot-toast'
import SimpleVariableEditor from '../components/SimpleVariableEditor'
import '../styles/dashboard.css'

const Templates = () => {
  const [templates, setTemplates] = useState([])
  const [variables, setVariables] = useState([])
  const [datasets, setDatasets] = useState([])
  // const [selectedDataset, setSelectedDataset] = useState(null) // Unused variables
  const [previewRowIndex, setPreviewRowIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showVariablesPanel, setShowVariablesPanel] = useState(false)
  const [previewingTemplate, setPreviewingTemplate] = useState(null)
  const [activeTab, setActiveTab] = useState('editor') // 'editor' ou 'preview'
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    subject: '',
    html: '',
    dataset_id: null
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Carregar templates, variáveis e datasets em paralelo
      const [templatesRes, variablesRes, datasetsRes] = await Promise.all([
        api.get('/api/templates'),
        variablesApi.list().catch(() => ({ data: { data: [] } })),
        datasetsApi.list().catch(() => ({ data: { data: [] } }))
      ])
      
      const templatesData = templatesRes.data.data || templatesRes.data
      const variablesData = variablesRes.data.data || []
      const datasetsData = datasetsRes.data.data || []
      
      setTemplates(Array.isArray(templatesData) ? templatesData : [])
      setVariables(Array.isArray(variablesData) ? variablesData : [])
      setDatasets(Array.isArray(datasetsData) ? datasetsData : [])
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setTemplates([])
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = fetchData // Manter compatibilidade

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Inserir variável no cursor do textarea
  const insertVariableAtCursor = (variableName) => {
    const textarea = document.querySelector('textarea[name="html"]')
    if (!textarea) return

    // Salvar posição atual do cursor
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = formData.html || ''
    
    // Criar novo valor com a variável inserida
    const newValue = currentValue.substring(0, start) + variableName + currentValue.substring(end)
    
    // Atualizar o estado
    setFormData(prev => ({ ...prev, html: newValue }))
    
    // Aguardar um pouco mais para garantir que o React atualizou o DOM
    setTimeout(() => {
      // Refocar no textarea
      textarea.focus()
      
      // Calcular nova posição do cursor (após a variável inserida)
      const newPosition = start + variableName.length
      
      // Definir nova posição do cursor
      textarea.setSelectionRange(newPosition, newPosition)
      
      // Trigger scroll para garantir que o cursor seja visível
      textarea.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 10)
  }

  // Substituir variáveis com dados reais para preview
  const replaceVariablesWithData = async (template, datasetId, rowIndex = 0) => {
    try {
      let processedTemplate = template

      // 1. Primeiro processar variáveis universais (sempre disponíveis)
      // Para preview, usar placeholders visuais
      processedTemplate = processedTemplate.replace(/\{\{nome\}\}/g, '[João]')
      processedTemplate = processedTemplate.replace(/\{\{nome_completo\}\}/g, '[João Silva Santos]')

      // 2. Depois processar variáveis customizadas do CSV (se houver dataset)
      if (datasetId) {
        const response = await datasetsApi.getValues(datasetId, { page: 1, limit: 50 })
        const rows = response.data.data.rows || []
        
        if (rows.length > 0 && rows[rowIndex]) {
          const rowData = rows[rowIndex].variables || {}

          // Substituir cada variável customizada encontrada
          Object.keys(rowData).forEach(variableName => {
            const value = rowData[variableName].value || ''
            const regex = new RegExp(variableName.replace(/[{}]/g, '\\\\$&'), 'g')
            processedTemplate = processedTemplate.replace(regex, value)
          })
        }
      }

      return processedTemplate
    } catch (error) {
      console.error('Erro ao processar variáveis:', error)
      return template
    }
  }

  // Detectar variáveis no template atual
  const detectVariablesInTemplate = (htmlContent) => {
    const variableRegex = /\{\{[^}]+\}\}/g
    const matches = htmlContent.match(variableRegex) || []
    return [...new Set(matches)] // Remove duplicatas
  }

  // Componente de Preview
  const PreviewContent = () => {
    const [previewHtml, setPreviewHtml] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
      const generatePreview = async () => {
        setLoading(true)
        try {
          if (formData.dataset_id) {
            // Preview com dados reais
            const processedHtml = await replaceVariablesWithData(
              formData.html, 
              formData.dataset_id, 
              previewRowIndex
            )
            setPreviewHtml(processedHtml)
          } else {
            // Preview estático
            setPreviewHtml(formData.html)
          }
        } catch (error) {
          console.error('Erro no preview:', error)
          setPreviewHtml(formData.html)
        } finally {
          setLoading(false)
        }
      }

      generatePreview()
    }, []) // Removed unnecessary dependencies to fix eslint warning

    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        background: 'white',
        minHeight: '400px',
        position: 'relative'
      }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              🔄 Processando variáveis...
            </div>
          </div>
        )}
        
        {/* Email Header Simulation */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          borderRadius: '8px 8px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              📧
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                Seu Email
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                contato@empresa.com
              </p>
            </div>
          </div>
          <p style={{ 
            margin: 0, 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#111827',
            padding: '8px 0' 
          }}>
            {formData.subject || 'Assunto do Email'}
          </p>
        </div>
        
        {/* Email Content */}
        <div style={{
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          lineHeight: '1.6',
          color: '#374151'
        }}>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Por favor, insira o nome do template')
      return
    }

    if (!formData.html.trim()) {
      toast.error('Por favor, insira o conteúdo HTML')
      return
    }

    try {
      if (editingTemplate) {
        await api.put(`/api/templates/${editingTemplate.id}`, formData)
        toast.success('Template atualizado com sucesso!')
      } else {
        await api.post('/api/templates', formData)
        toast.success('Template criado com sucesso!')
      }

      setShowModal(false)
      setEditingTemplate(null)
      setFormData({ nome: '', subject: '', html: '' })
      fetchTemplates()
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      toast.error(error.response?.data?.error || 'Erro ao salvar template')
    }
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setFormData({
      nome: template.nome || '',
      subject: template.subject || '',
      html: template.html || '',
      dataset_id: template.dataset_id || null
    })
    setShowModal(true)
  }

  const handleDelete = async (templateId, templateName) => {
    if (!window.confirm(`Tem certeza que deseja excluir o template "${templateName}"?`)) {
      return
    }

    try {
      await api.delete(`/api/templates/${templateId}`)
      toast.success('Template excluído com sucesso!')
      fetchTemplates()
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast.error(error.response?.data?.error || 'Erro ao excluir template')
    }
  }

  const openCreateModal = () => {
    setEditingTemplate(null)
    setActiveTab('editor')
    setShowVariablesPanel(false)
    setFormData({ nome: '', subject: '', html: '', dataset_id: null })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTemplate(null)
    setActiveTab('editor')
    setShowVariablesPanel(false)
    setFormData({ nome: '', subject: '', html: '', dataset_id: null })
  }

  const handlePreview = (template) => {
    setPreviewingTemplate(template)
    setShowPreviewModal(true)
  }

  const closePreviewModal = () => {
    setShowPreviewModal(false)
    setPreviewingTemplate(null)
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
          <h1 className="dashboard-title">Templates de Email</h1>
          <p className="dashboard-subtitle">
            Gerencie seus templates de email reutilizáveis
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
          >
            ➕ Novo Template
          </button>
        </div>
      </div>

      {!Array.isArray(templates) || templates.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ margin: '8px 0', fontSize: '16px', fontWeight: '500', color: '#111827' }}>
            Nenhum template encontrado
          </h3>
          <p style={{ margin: '4px 0 24px 0', fontSize: '14px', color: '#6b7280' }}>
            Comece criando seu primeiro template de email.
          </p>
          <button
            onClick={openCreateModal}
            className="dashboard-refresh-btn"
          >
            ➕ Criar Primeiro Template
          </button>
        </div>
      ) : (
        <div className="metrics-grid">
          {Array.isArray(templates) && templates.map((template) => (
            <div key={template.id} className="metric-card">
              <div className="metric-card-header">
                <div className="metric-card-icon purple">
                  📝
                </div>
                <button className="metric-card-menu">
                  ⋯
                </button>
              </div>
              
              <h3 className="metric-card-value" style={{ fontSize: '18px', marginBottom: '8px' }}>
                {template.nome}
              </h3>
              
              {template.subject && (
                <p className="metric-card-title" style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: '500' }}>Assunto:</span> {template.subject}
                </p>
              )}
              
              <p className="metric-card-subtitle">
                Criado em: {new Date(template.created_at).toLocaleDateString('pt-BR')}
              </p>

              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                background: '#f9fafb', 
                borderRadius: '6px',
                fontSize: '12px'
              }}>
                <div 
                  style={{ 
                    maxHeight: '60px', 
                    overflow: 'hidden',
                    color: '#6b7280'
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: (template.html || '').substring(0, 100) + ((template.html || '').length > 100 ? '...' : '')
                  }}
                />
              </div>

              <div style={{ 
                marginTop: '16px', 
                display: 'flex', 
                gap: '6px',
                paddingTop: '16px',
                borderTop: '1px solid #f3f4f6'
              }}>
                <button
                  onClick={() => handlePreview(template)}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    background: '#dbeafe',
                    color: '#2563eb',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  👁️ Ver
                </button>
                <button
                  onClick={() => handleEdit(template)}
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
                  onClick={() => handleDelete(template.id, template.nome)}
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

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '50',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: activeTab === 'preview' ? '900px' : '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="chart-header" style={{ marginBottom: '24px' }}>
              <h3 className="chart-title">
                {editingTemplate ? 'Editar Template' : 'Novo Template'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            {/* Abas */}
            <div style={{ marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '0' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'editor' ? '2px solid #7c3aed' : '2px solid transparent',
                    color: activeTab === 'editor' ? '#7c3aed' : '#6b7280',
                    fontWeight: activeTab === 'editor' ? '600' : '500',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📝 Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === 'preview' ? '2px solid #7c3aed' : '2px solid transparent',
                    color: activeTab === 'preview' ? '#7c3aed' : '#6b7280',
                    fontWeight: activeTab === 'preview' ? '600' : '500',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  👁️ Preview
                </button>
              </div>
            </div>

            {activeTab === 'editor' ? (
              <div style={{ display: 'grid', gap: '20px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label htmlFor="nome" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Nome do Template
                    </label>
                    <input
                      type="text"
                      name="nome"
                      id="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      className="dashboard-select"
                      style={{ width: '100%' }}
                      placeholder="Ex: Newsletter Semanal"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Assunto (Opcional)
                    </label>
                    <input
                      type="text"
                      name="subject"
                      id="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="dashboard-select"
                      style={{ width: '100%' }}
                      placeholder="Assunto padrão do template - Use {{nome}}, {{nome_completo}} etc."
                    />
                  </div>

                  {/* Seleção de Dataset */}
                  <div>
                    <label htmlFor="dataset_id" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      Dataset de Variáveis (Opcional)
                    </label>
                    <select
                      name="dataset_id"
                      id="dataset_id"
                      value={formData.dataset_id || ''}
                      onChange={handleInputChange}
                      className="dashboard-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">Nenhum dataset selecionado</option>
                      {datasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id}>
                          {dataset.name} ({dataset.total_rows} linhas)
                        </option>
                      ))}
                    </select>
                    <p style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
                      Selecione um dataset para usar no preview das variáveis
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: showVariablesPanel ? '1fr 300px' : '1fr', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label htmlFor="html" style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                          Conteúdo HTML
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                          style={{
                            padding: '4px 8px',
                            background: showVariablesPanel ? '#7c3aed' : '#e5e7eb',
                            color: showVariablesPanel ? 'white' : '#6b7280',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          🏷️ Variáveis
                        </button>
                      </div>
                      <SimpleVariableEditor
                        name="html"
                        id="html"
                        rows={12}
                        value={formData.html}
                        onChange={handleInputChange}
                        placeholder="<h1>Título</h1><p>Conteúdo do template...</p>

Use variáveis como {{nome}}, {{nome_completo}}, {{empresa}} etc."
                        style={{ 
                          width: '100%',
                          minHeight: '300px'
                        }}
                      />
                      <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                        Use HTML para formatar. Variáveis como {"{{nome_cliente}}"} serão substituídas pelos dados do CSV.
                      </p>
                      
                      {/* Variáveis detectadas no template */}
                      {(() => {
                        const detectedVars = detectVariablesInTemplate(formData.html)
                        return detectedVars.length > 0 && (
                          <div style={{ 
                            marginTop: '8px', 
                            padding: '8px 12px', 
                            background: '#f0f9ff', 
                            border: '1px solid #bae6fd',
                            borderRadius: '6px' 
                          }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '500', color: '#0369a1' }}>
                              Variáveis detectadas:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {detectedVars.map((variable, index) => (
                                <span 
                                  key={index} 
                                  style={{
                                    padding: '2px 6px',
                                    background: '#1d4ed8',
                                    color: 'white',
                                    fontSize: '11px',
                                    borderRadius: '3px',
                                    fontFamily: 'monospace'
                                  }}
                                >
                                  {variable}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Painel de Variáveis */}
                    {showVariablesPanel && (
                      <div style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        background: '#f9fafb',
                        maxHeight: '400px',
                        overflow: 'auto'
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                          Variáveis Disponíveis
                        </h4>
                        
                        {variables.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
                              Nenhuma variável criada
                            </p>
                            <button
                              type="button"
                              onClick={() => window.open('/variables', '_blank')}
                              style={{
                                padding: '4px 8px',
                                background: '#7c3aed',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              Criar Variáveis
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {variables.map((variable) => (
                              <div 
                                key={variable.id}
                                style={{
                                  padding: '8px',
                                  background: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => insertVariableAtCursor(variable.name)}
                                title={`Clique para inserir: ${variable.name}`}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>
                                      {variable.display_name}
                                    </div>
                                    <div style={{ 
                                      fontSize: '10px', 
                                      fontFamily: 'monospace',
                                      color: '#7c3aed',
                                      marginTop: '2px'
                                    }}>
                                      {variable.name}
                                    </div>
                                  </div>
                                  <div style={{ fontSize: '12px' }}>
                                    {variable.data_type === 'email' ? '📧' : 
                                     variable.data_type === 'number' ? '🔢' : 
                                     variable.data_type === 'currency' ? '💰' : 
                                     variable.data_type === 'date' ? '📅' : 
                                     variable.data_type === 'url' ? '🔗' : '📝'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px' }}>
                    <button
                      type="button"
                      onClick={closeModal}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        background: 'white',
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="dashboard-refresh-btn"
                    >
                      {editingTemplate ? 'Atualizar' : 'Criar'} Template
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 4px 0' }}>
                      Preview do Template
                    </h4>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                      {formData.dataset_id ? 'Preview com dados reais do dataset' : 'Preview estático'}
                    </p>
                  </div>
                  
                  {/* Controles do Preview */}
                  {formData.dataset_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280' }}>Linha:</label>
                      <input
                        type="number"
                        min="0"
                        max="49"
                        value={previewRowIndex}
                        onChange={(e) => setPreviewRowIndex(parseInt(e.target.value) || 0)}
                        style={{
                          width: '60px',
                          padding: '4px 6px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {formData.html ? (
                  <PreviewContent />
                ) : (
                  <div style={{
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                      Digite o conteúdo HTML no Editor
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      O preview aparecerá aqui em tempo real
                    </p>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className="dashboard-refresh-btn"
                  >
                    📝 Voltar ao Editor
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Preview (Templates Existentes) */}
      {showPreviewModal && previewingTemplate && (
        <div style={{
          position: 'fixed',
          inset: '0',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '50',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div className="chart-header" style={{ marginBottom: '24px' }}>
              <h3 className="chart-title">
                👁️ Visualizar Template: {previewingTemplate.nome}
              </h3>
              <button
                onClick={closePreviewModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: 'white',
              minHeight: '500px'
            }}>
              {/* Email Header Simulation */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
                borderRadius: '8px 8px 0 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}>
                    📧
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      Seu Email
                    </p>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                      contato@empresa.com
                    </p>
                  </div>
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#111827',
                  padding: '12px 0' 
                }}>
                  {previewingTemplate.subject || previewingTemplate.nome}
                </p>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b7280',
                  borderTop: '1px solid #e5e7eb',
                  paddingTop: '8px',
                  marginTop: '8px'
                }}>
                  📅 {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              {/* Email Content */}
              <div style={{
                padding: '32px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                lineHeight: '1.6',
                color: '#374151',
                fontSize: '14px'
              }}>
                <div dangerouslySetInnerHTML={{ __html: previewingTemplate.html || '<p>Nenhum conteúdo disponível</p>' }} />
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '12px', 
              paddingTop: '24px',
              borderTop: '1px solid #e5e7eb',
              marginTop: '24px'
            }}>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                📝 Criado em: {new Date(previewingTemplate.created_at).toLocaleDateString('pt-BR')}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => {
                    closePreviewModal()
                    handleEdit(previewingTemplate)
                  }}
                  className="dashboard-refresh-btn"
                >
                  ✏️ Editar Template
                </button>
                <button
                  type="button"
                  onClick={closePreviewModal}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Templates