import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import '../styles/dashboard.css'

const Variables = () => {
  const [variables, setVariables] = useState([])
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showVariableModal, setShowVariableModal] = useState(false)
  // const [showDatasetModal, setShowDatasetModal] = useState(false) // Unused variable
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editingVariable, setEditingVariable] = useState(null)
  const [activeTab, setActiveTab] = useState('variables')
  
  // Estados para variáveis
  const [variableForm, setVariableForm] = useState({
    name: '',
    display_name: '',
    description: '',
    data_type: 'text',
    default_value: '',
    is_required: false
  })

  // Estados para upload de CSV
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    file: null
  })
  const [csvPreview, setCsvPreview] = useState(null)
  const [variableMapping, setVariableMapping] = useState({})
  const [uploadStep, setUploadStep] = useState(1) // 1: Upload, 2: Preview, 3: Mapping

  const dataTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Número' },
    { value: 'currency', label: 'Moeda' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Data' },
    { value: 'url', label: 'URL' }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Buscar dados diretamente do Supabase
      const [
        { data: variablesData, error: variablesError },
        { data: datasetsData, error: datasetsError }
      ] = await Promise.all([
        supabase.from('custom_variables').select('*'),
        supabase.from('datasets').select('*')
      ])
      
      if (variablesError) console.error('Erro variáveis:', variablesError)
      if (datasetsError) console.error('Erro datasets:', datasetsError)
      
      setVariables(variablesData || [])
      setDatasets(datasetsData || [])
      
      console.log('Dados carregados do Supabase:', {
        variables: variablesData?.length || 0,
        datasets: datasetsData?.length || 0
      })
      
    } catch (error) {
      console.error('Erro geral ao carregar dados:', error)
      toast.error('Erro ao carregar dados: ' + (error.response?.data?.error || error.message))
    } finally {
      setLoading(false)
    }
  }

  // ========== GESTÃO DE VARIÁVEIS ==========

  const handleVariableSubmit = async (e) => {
    e.preventDefault()

    if (!variableForm.name || !variableForm.display_name) {
      toast.error('Nome e nome de exibição são obrigatórios')
      return
    }

    try {
      // Preparar dados da variável
      const variableData = {
        ...variableForm,
        name: variableForm.name.startsWith('{{') ? variableForm.name : `{{${variableForm.name}}}`
      }
      
      if (editingVariable) {
        const { error } = await supabase
          .from('custom_variables')
          .update(variableData)
          .eq('id', editingVariable.id)
        
        if (error) throw error
        toast.success('Variável atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('custom_variables')
          .insert([variableData])
        
        if (error) throw error
        toast.success('Variável criada com sucesso!')
      }

      setShowVariableModal(false)
      setEditingVariable(null)
      resetVariableForm()
      fetchData()
    } catch (error) {
      console.error('Erro ao salvar variável:', error)
      toast.error(error.message || 'Erro ao salvar variável')
    }
  }

  const handleEditVariable = (variable) => {
    setEditingVariable(variable)
    setVariableForm({
      name: variable.name.replace(/[{}]/g, ''), // Remover chaves para edição
      display_name: variable.display_name,
      description: variable.description || '',
      data_type: variable.data_type,
      default_value: variable.default_value || '',
      is_required: variable.is_required
    })
    setShowVariableModal(true)
  }

  const handleDeleteVariable = async (variableId, variableName) => {
    if (!window.confirm(`Tem certeza que deseja excluir a variável "${variableName}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('custom_variables')
        .delete()
        .eq('id', variableId)
      
      if (error) throw error
      toast.success('Variável excluída com sucesso!')
      fetchData()
    } catch (error) {
      console.error('Erro ao excluir variável:', error)
      toast.error(error.response?.data?.error || 'Erro ao excluir variável')
    }
  }

  const resetVariableForm = () => {
    setVariableForm({
      name: '',
      display_name: '',
      description: '',
      data_type: 'text',
      default_value: '',
      is_required: false
    })
  }

  // ========== GESTÃO DE DATASETS CSV ==========

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadForm(prev => ({ ...prev, file }))
    }
  }

  const handlePreviewCSV = async () => {
    if (!uploadForm.file) {
      toast.error('Selecione um arquivo CSV')
      return
    }

    try {
      const formData = new FormData()
      formData.append('csv', uploadForm.file)

      toast.info('Preview de CSV temporariamente indisponível')
      return
    } catch (error) {
      console.error('Erro ao fazer preview:', error)
      toast.error(error.response?.data?.error || 'Erro ao fazer preview do CSV')
    }
  }

  const handleMappingChange = (variableId, csvColumn) => {
    setVariableMapping(prev => ({
      ...prev,
      [variableId]: csvColumn
    }))
  }

  const handleUploadCSV = async () => {
    if (!uploadForm.name || !uploadForm.file) {
      toast.error('Nome do dataset e arquivo são obrigatórios')
      return
    }

    try {
      const formData = new FormData()
      formData.append('csv', uploadForm.file)
      formData.append('name', uploadForm.name)
      formData.append('description', uploadForm.description)
      formData.append('variable_mapping', JSON.stringify(variableMapping))

      toast.info('Upload de CSV temporariamente indisponível')
      return
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast.error(error.response?.data?.error || 'Erro ao fazer upload do CSV')
    }
  }

  const handleDeleteDataset = async (datasetId, datasetName) => {
    if (!window.confirm(`Tem certeza que deseja excluir o dataset "${datasetName}"?`)) {
      return
    }

    try {
      toast.info('Exclusão de datasets temporariamente indisponível')
      return
    } catch (error) {
      console.error('Erro ao excluir dataset:', error)
      toast.error(error.response?.data?.error || 'Erro ao excluir dataset')
    }
  }

  const resetUploadForm = () => {
    setUploadForm({ name: '', description: '', file: null })
    setCsvPreview(null)
    setVariableMapping({})
    setUploadStep(1)
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
          <h1 className="dashboard-title">Variáveis Customizadas</h1>
          <p className="dashboard-subtitle">
            Crie variáveis personalizadas e importe dados via CSV para personalização dinâmica
          </p>
        </div>
        <div className="dashboard-controls">
          <a
            href="http://localhost:3000/api/datasets/exemplo.csv"
            download="exemplo.csv"
            className="dashboard-secondary-btn"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            📥 Baixar Exemplo CSV
          </a>
          <button
            onClick={() => setShowUploadModal(true)}
            className="dashboard-secondary-btn"
          >
            📤 Upload CSV
          </button>
          <button
            onClick={() => setShowVariableModal(true)}
            className="dashboard-refresh-btn"
          >
            ➕ Nova Variável
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="chart-card">
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('variables')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'variables' ? '#f3f4f6' : 'transparent',
              borderBottom: activeTab === 'variables' ? '2px solid #7c3aed' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🏷️ Variáveis ({variables.length})
          </button>
          <button
            onClick={() => setActiveTab('datasets')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'datasets' ? '#f3f4f6' : 'transparent',
              borderBottom: activeTab === 'datasets' ? '2px solid #7c3aed' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            📊 Datasets ({datasets.length})
          </button>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'variables' && (
          <div>
            {variables.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏷️</div>
                <h3 className="empty-state-title">Nenhuma variável encontrada</h3>
                <p className="empty-state-description">
                  Crie sua primeira variável customizada para começar a personalizar seus emails.
                </p>
                <div className="empty-state-action">
                  <button onClick={() => setShowVariableModal(true)} className="dashboard-refresh-btn">
                    ➕ Criar Primeira Variável
                  </button>
                </div>
              </div>
            ) : (
              <div className="metrics-grid">
                {variables.map((variable) => (
                  <div key={variable.id} className="metric-card">
                    <div className="metric-card-header">
                      <div 
                        className="metric-card-icon"
                        style={{ background: '#7c3aed' }}
                      >
                        {variable.data_type === 'email' ? '📧' : 
                         variable.data_type === 'number' ? '🔢' : 
                         variable.data_type === 'currency' ? '💰' : 
                         variable.data_type === 'date' ? '📅' : 
                         variable.data_type === 'url' ? '🔗' : '📝'}
                      </div>
                      <button className="metric-card-menu">⋯</button>
                    </div>
                    
                    <h3 className="metric-card-value" style={{ fontSize: '16px', marginBottom: '4px' }}>
                      {variable.display_name}
                    </h3>
                    
                    <p className="metric-card-title" style={{ 
                      fontSize: '12px', 
                      color: '#7c3aed', 
                      fontFamily: 'monospace',
                      marginBottom: '8px' 
                    }}>
                      {variable.name}
                    </p>
                    
                    {variable.description && (
                      <p className="metric-card-subtitle" style={{ marginBottom: '8px' }}>
                        {variable.description}
                      </p>
                    )}
                    
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                      <span>Tipo: {dataTypes.find(t => t.value === variable.data_type)?.label}</span>
                      {variable.default_value && (
                        <span style={{ marginLeft: '8px' }}>• Padrão: {variable.default_value}</span>
                      )}
                    </div>
                    
                    <p className="metric-card-subtitle">
                      {variable.total_values || 0} valor(es) • {variable.datasets_count || 0} dataset(s)
                    </p>

                    <div style={{ 
                      marginTop: '16px', 
                      display: 'flex', 
                      gap: '6px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      {/* Variáveis universais não podem ser editadas/excluídas */}
                      {variable.is_universal ? (
                        <div style={{
                          flex: 1,
                          padding: '6px 12px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '500',
                          textAlign: 'center'
                        }}>
                          🌟 Variável Universal (Sistema)
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditVariable(variable)}
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
                            onClick={() => handleDeleteVariable(variable.id, variable.display_name)}
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'datasets' && (
          <div>
            {datasets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3 className="empty-state-title">Nenhum dataset encontrado</h3>
                <p className="empty-state-description">
                  Faça upload de um arquivo CSV para criar seu primeiro dataset de variáveis.
                </p>
                <div className="empty-state-action">
                  <a
                    href="http://localhost:3000/api/datasets/exemplo.csv"
                    download="exemplo.csv"
                    className="dashboard-secondary-btn"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', marginRight: '12px' }}
                  >
                    📥 Baixar Exemplo CSV
                  </a>
                  <button onClick={() => setShowUploadModal(true)} className="dashboard-refresh-btn">
                    📤 Fazer Upload de CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="metrics-grid">
                {datasets.map((dataset) => (
                  <div key={dataset.id} className="metric-card">
                    <div className="metric-card-header">
                      <div 
                        className="metric-card-icon"
                        style={{ background: '#059669' }}
                      >
                        📊
                      </div>
                      <button className="metric-card-menu">⋯</button>
                    </div>
                    
                    <h3 className="metric-card-value" style={{ fontSize: '16px', marginBottom: '4px' }}>
                      {dataset.name}
                    </h3>
                    
                    {dataset.description && (
                      <p className="metric-card-title" style={{ marginBottom: '8px' }}>
                        {dataset.description}
                      </p>
                    )}
                    
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                      <span>Arquivo: {dataset.file_name}</span>
                      <br />
                      <span>Processado: {new Date(dataset.processed_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    
                    <p className="metric-card-subtitle">
                      {dataset.total_rows} linhas • {dataset.variables_count || 0} variáveis
                    </p>

                    <div style={{ 
                      marginTop: '16px', 
                      display: 'flex', 
                      gap: '6px',
                      paddingTop: '16px',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      <button
                        onClick={() => {/* TODO: Implementar visualização */}}
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
                        👁️ Ver Dados
                      </button>
                      <button
                        onClick={() => handleDeleteDataset(dataset.id, dataset.name)}
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
        )}
      </div>

      {/* Modal de Variável */}
      {showVariableModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingVariable ? 'Editar Variável' : 'Nova Variável'}
              </h3>
              <button 
                onClick={() => {
                  setShowVariableModal(false)
                  setEditingVariable(null)
                  resetVariableForm()
                }} 
                className="modal-close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleVariableSubmit} className="modal-form">
              <div className="form-field">
                <label className="form-label">Nome da Variável *</label>
                <input
                  type="text"
                  value={variableForm.name}
                  onChange={(e) => setVariableForm(prev => ({ ...prev, name: e.target.value }))}
                  className="dashboard-select"
                  placeholder="nome_cliente (sem as chaves)"
                  required
                  disabled={!!editingVariable} // Não permitir edição do nome
                />
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                  Será convertido automaticamente para: {variableForm.name ? `{{${variableForm.name.replace(/[{}]/g, '')}}}` : '{{nome_variavel}}'}
                </p>
              </div>

              <div className="form-field">
                <label className="form-label">Nome de Exibição *</label>
                <input
                  type="text"
                  value={variableForm.display_name}
                  onChange={(e) => setVariableForm(prev => ({ ...prev, display_name: e.target.value }))}
                  className="dashboard-select"
                  placeholder="Nome amigável para exibição"
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Descrição</label>
                <textarea
                  value={variableForm.description}
                  onChange={(e) => setVariableForm(prev => ({ ...prev, description: e.target.value }))}
                  className="dashboard-select"
                  placeholder="Descreva o propósito desta variável"
                  rows="3"
                />
              </div>

              <div className="form-field">
                <label className="form-label">Tipo de Dados</label>
                <select
                  value={variableForm.data_type}
                  onChange={(e) => setVariableForm(prev => ({ ...prev, data_type: e.target.value }))}
                  className="dashboard-select"
                >
                  {dataTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Valor Padrão</label>
                <input
                  type="text"
                  value={variableForm.default_value}
                  onChange={(e) => setVariableForm(prev => ({ ...prev, default_value: e.target.value }))}
                  className="dashboard-select"
                  placeholder="Valor usado quando não encontrado no CSV"
                />
              </div>

              <div className="form-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={variableForm.is_required}
                    onChange={(e) => setVariableForm(prev => ({ ...prev, is_required: e.target.checked }))}
                  />
                  <span className="form-label" style={{ margin: 0 }}>Variável obrigatória</span>
                </label>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowVariableModal(false)
                    setEditingVariable(null)
                    resetVariableForm()
                  }} 
                  className="dashboard-secondary-btn"
                >
                  Cancelar
                </button>
                <button type="submit" className="dashboard-refresh-btn">
                  {editingVariable ? 'Atualizar' : 'Criar'} Variável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Upload CSV */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Upload de Dataset CSV</h3>
              <button 
                onClick={() => {
                  setShowUploadModal(false)
                  resetUploadForm()
                }} 
                className="modal-close"
              >
                ×
              </button>
            </div>

            {/* Etapa 1: Upload do arquivo */}
            {uploadStep === 1 && (
              <div className="modal-form">
                <div className="form-field">
                  <label className="form-label">Nome do Dataset *</label>
                  <input
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                    className="dashboard-select"
                    placeholder="Ex: Clientes Q1 2024"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Descrição</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    className="dashboard-select"
                    placeholder="Descreva este dataset"
                    rows="3"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Arquivo CSV *</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="dashboard-select"
                    required
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Arquivo deve estar em formato CSV com cabeçalhos na primeira linha.
                  </p>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowUploadModal(false)
                      resetUploadForm()
                    }} 
                    className="dashboard-secondary-btn"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={handlePreviewCSV}
                    className="dashboard-refresh-btn"
                  >
                    Visualizar CSV
                  </button>
                </div>
              </div>
            )}

            {/* Etapa 2: Preview e Mapeamento */}
            {uploadStep === 2 && csvPreview && (
              <div className="modal-form">
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Preview do CSV</h4>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                    {csvPreview.total_rows} linhas encontradas • {csvPreview.headers.length} colunas
                  </p>
                </div>

                {/* Tabela de Preview */}
                <div style={{ marginBottom: '24px', maxHeight: '200px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {csvPreview.headers.map((header, index) => (
                          <th key={index} style={{ 
                            padding: '8px 12px', 
                            textAlign: 'left', 
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.sample_rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {csvPreview.headers.map((header, colIndex) => (
                            <td key={colIndex} style={{ 
                              padding: '8px 12px', 
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: '12px'
                            }}>
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mapeamento de Variáveis */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 16px 0' }}>Mapear Variáveis</h4>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                    Conecte suas variáveis customizadas com as colunas do CSV:
                  </p>

                  {csvPreview.available_variables.length === 0 ? (
                    <div style={{ 
                      padding: '16px', 
                      background: '#fef3c7', 
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <p style={{ margin: 0, color: '#92400e' }}>
                        Nenhuma variável customizada encontrada. Crie variáveis primeiro para fazer o mapeamento.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {csvPreview.available_variables.map((variable) => (
                        <div key={variable.id} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          padding: '12px',
                          background: '#f9fafb',
                          borderRadius: '6px'
                        }}>
                          <div style={{ flex: 1 }}>
                            <strong>{variable.display_name}</strong>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              {variable.name} • {dataTypes.find(t => t.value === variable.data_type)?.label}
                            </div>
                          </div>
                          <select
                            value={variableMapping[variable.id] || ''}
                            onChange={(e) => handleMappingChange(variable.id, e.target.value)}
                            className="dashboard-select"
                            style={{ minWidth: '200px' }}
                          >
                            <option value="">Não mapear</option>
                            {csvPreview.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    onClick={() => setUploadStep(1)}
                    className="dashboard-secondary-btn"
                  >
                    Voltar
                  </button>
                  <button 
                    type="button" 
                    onClick={handleUploadCSV}
                    className="dashboard-refresh-btn"
                  >
                    Fazer Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Variables