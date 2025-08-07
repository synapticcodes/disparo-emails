import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import SimpleVariableEditor from '../components/SimpleVariableEditor'
import '../styles/dashboard.css'

const SendEmail = () => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    html: '',
    templateId: ''
  })
  const [selectedContactInfo, setSelectedContactInfo] = useState(null)
  const [templatesList, setTemplatesList] = useState([])
  const [contactsList, setContactsList] = useState([])
  const [variables, setVariables] = useState([])
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [showVariablesPanel, setShowVariablesPanel] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      console.log('Carregando templates, contatos e variáveis...')
      
      // Buscar dados diretamente do Supabase
      const [
        { data: templatesData, error: templatesError },
        { data: contactsData, error: contactsError },
        { data: variablesData, error: variablesError }
      ] = await Promise.all([
        supabase.from('templates').select('*'),
        supabase.from('contatos').select('*'),
        supabase.from('custom_variables').select('*')
      ])
      
      if (templatesError) console.error('Erro templates:', templatesError)
      if (contactsError) console.error('Erro contatos:', contactsError)
      if (variablesError) console.error('Erro variáveis:', variablesError)
      
      setTemplatesList(templatesData || [])
      setContactsList(contactsData || [])
      
      // Adicionar variáveis universais ao início da lista
      const universalVariables = [
        {
          id: 'universal-nome',
          name: '{{nome}}',
          display_name: 'Nome (primeiro nome)',
          description: 'Primeiro nome do contato',
          data_type: 'text',
          is_universal: true
        },
        {
          id: 'universal-nome-completo',
          name: '{{nome_completo}}',
          display_name: 'Nome Completo',
          description: 'Nome completo do contato',
          data_type: 'text',
          is_universal: true
        },
        {
          id: 'universal-email',
          name: '{{email}}',
          display_name: 'Email',
          description: 'Email do contato',
          data_type: 'email',
          is_universal: true
        }
      ]
      
      // Combinar variáveis universais com customizadas
      const allVariables = [...universalVariables, ...(variablesData || [])]
      setVariables(allVariables)
      
      console.log('Dados carregados do Supabase:', { 
        templatesData, 
        contactsData, 
        customVariables: variablesData?.length || 0,
        totalVariables: allVariables.length
      })
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setTemplatesList([])
      setContactsList([])
      setVariables([])
      toast.error('Erro ao carregar dados')
    }
  }

  // Inserir variável no cursor do textarea
  const insertVariableAtCursor = (variableName) => {
    const textarea = document.querySelector('textarea[name="html"]')
    if (textarea && textarea.insertAtCursor) {
      // Usar a função exposta pelo SimpleVariableEditor
      textarea.insertAtCursor(variableName)
    } else {
      // Fallback para inserção manual
      const start = textarea ? textarea.selectionStart : 0
      const end = textarea ? textarea.selectionEnd : 0
      const currentValue = emailData.html || ''
      const newValue = currentValue.substring(0, start) + variableName + currentValue.substring(end)
      
      setEmailData(prev => ({ ...prev, html: newValue }))
      
      setTimeout(() => {
        if (textarea) {
          textarea.focus()
          const newPosition = start + variableName.length
          textarea.setSelectionRange(newPosition, newPosition)
        }
      }, 0)
    }
  }

  // Detectar variáveis no template atual
  const detectVariablesInTemplate = (htmlContent) => {
    const variableRegex = /\{\{[^}]+\}\}/g
    const matches = htmlContent.match(variableRegex) || []
    return [...new Set(matches)] // Remove duplicatas
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Se estiver mudando o email e for diferente do contato selecionado, limpar info do contato
    if (name === 'to' && selectedContactInfo && value !== selectedContactInfo.email) {
      setSelectedContactInfo(null)
    }
    
    setEmailData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleTemplateSelect = (e) => {
    const templateId = e.target.value
    
    if (!templateId) {
      setEmailData(prev => ({
        ...prev,
        templateId: '',
        html: ''
      }))
      return
    }
    
    if (Array.isArray(templatesList)) {
      const selectedTemplate = templatesList.find(t => t.id === templateId)
      
      if (selectedTemplate) {
        console.log('Template selecionado:', selectedTemplate)
        setEmailData(prev => ({
          ...prev,
          templateId,
          html: selectedTemplate.html || prev.html
        }))
      }
    }
  }

  const handleContactSelect = (e) => {
    const contactId = e.target.value
    
    if (!contactId) {
      return
    }
    
    if (Array.isArray(contactsList)) {
      const selectedContact = contactsList.find(c => c.id === contactId)
      
      if (selectedContact) {
        console.log('Contato selecionado:', selectedContact)
        setEmailData(prev => ({
          ...prev,
          to: selectedContact.email
        }))
        
        // Salvar informações do contato para exibir
        setSelectedContactInfo(selectedContact)
        
        // Reset do select após selecionar
        e.target.value = ''
        
        toast.success(`Contato selecionado: ${selectedContact.nome || selectedContact.email}`)
      }
    }
  }

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!emailData.to.trim()) {
      toast.error('Por favor, insira o email do destinatário')
      return
    }

    if (!validateEmail(emailData.to)) {
      toast.error('Por favor, insira um email válido')
      return
    }

    if (!emailData.subject.trim()) {
      toast.error('Por favor, insira o assunto do email')
      return
    }

    if (!emailData.html.trim()) {
      toast.error('Por favor, insira o conteúdo do email')
      return
    }

    try {
      setLoading(true)
      
      console.log('📤 Enviando email...', {
        to: emailData.to,
        subject: emailData.subject,
        htmlLength: emailData.html.length
      })
      
      // Chamar Edge Function diretamente
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html
        }
      })
      
      if (error) {
        console.error('❌ Error from Edge Function:', error)
        throw error
      }

      if (data?.error) {
        console.error('❌ Error in response data:', data)
        throw new Error(data.details || data.error || 'Erro desconhecido')
      }

      console.log('✅ Email sent successfully:', data)
      toast.success(`Email enviado com sucesso para ${emailData.to}!`)
      
      // Limpar formulário
      setEmailData({
        to: '',
        subject: '',
        html: '',
        templateId: ''
      })
      setSelectedContactInfo(null)
    } catch (error) {
      console.error('💥 Erro ao enviar email:', error)
      
      // Extrair mensagem de erro específica
      let errorMessage = 'Erro desconhecido ao enviar email'
      
      if (error.message) {
        errorMessage = error.message
      } else if (error.details) {
        errorMessage = error.details
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      // Mapear erros comuns para mensagens amigáveis
      if (errorMessage.includes('Invalid email') || errorMessage.includes('Email inválido')) {
        errorMessage = 'Email destinatário inválido'
      } else if (errorMessage.includes('API key') || errorMessage.includes('Configuração inválida')) {
        errorMessage = 'Configuração do servidor incorreta. Contate o administrador.'
      } else if (errorMessage.includes('SendGrid') || errorMessage.includes('Falha no envio')) {
        errorMessage = 'Erro no serviço de email. Tente novamente em alguns minutos.'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      } else if (errorMessage.includes('Campos obrigatórios')) {
        errorMessage = 'Preencha todos os campos obrigatórios'
      }
      
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const renderPreview = () => {
    return (
      <div style={{ 
        background: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '24px',
        marginTop: '16px'
      }}>
        <div style={{ 
          borderBottom: '1px solid #e5e7eb', 
          paddingBottom: '16px', 
          marginBottom: '16px' 
        }}>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px 0' }}>
            Para: {emailData.to}
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Assunto: {emailData.subject}
          </p>
        </div>
        <div 
          style={{ 
            lineHeight: '1.6',
            color: '#374151'
          }}
          dangerouslySetInnerHTML={{ __html: emailData.html }}
        />
      </div>
    )
  }

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Enviar Email</h1>
          <p className="dashboard-subtitle">
            Envie emails individuais diretamente
          </p>
        </div>
        <div className="dashboard-controls">
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="dashboard-refresh-btn"
          >
            {previewMode ? '📝 Editar' : '👁️ Visualizar'}
          </button>
        </div>
      </div>

      {previewMode ? (
        <div style={{ marginBottom: '32px' }}>
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Preview do Email</h3>
            </div>
            {renderPreview()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={() => setPreviewMode(false)}
              className="dashboard-refresh-btn"
            >
              Voltar à Edição
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ marginBottom: '32px' }}>
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Informações do Email</h3>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                Configure o destinatário e conteúdo do email
              </p>
            </div>
            <div style={{ display: 'grid', gap: '24px' }}>
              <div>
                <label htmlFor="contactSelect" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Selecionar Contato {contactsList.length > 0 && <span style={{ color: '#10b981', fontSize: '12px' }}>({contactsList.length} disponíveis)</span>}
                </label>
                {contactsList.length > 0 ? (
                  <>
                    <select
                      name="contactSelect"
                      id="contactSelect"
                      onChange={handleContactSelect}
                      className="dashboard-select"
                      style={{ width: '100%' }}
                    >
                      <option value="">Escolher de contatos existentes...</option>
                      {contactsList.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.nome ? `${contact.nome} (${contact.email})` : contact.email}
                        </option>
                      ))}
                    </select>
                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                      💡 Ou digite manualmente o email abaixo
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{
                      padding: '12px',
                      background: '#f3f4f6',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db'
                    }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                        📝 Nenhum contato encontrado. 
                        <a 
                          href="/contacts" 
                          style={{ color: '#7c3aed', textDecoration: 'none', fontWeight: '500', marginLeft: '4px' }}
                        >
                          Adicionar contatos
                        </a>
                      </p>
                    </div>
                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                      💡 Digite manualmente o email abaixo
                    </p>
                  </>
                )}
              </div>

              <div>
                <label htmlFor="to" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Email do Destinatário
                </label>
                <input
                  type="email"
                  name="to"
                  id="to"
                  value={emailData.to}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  style={{ width: '100%' }}
                  placeholder={contactsList.length > 0 ? "exemplo@email.com (ou selecione um contato acima)" : "exemplo@email.com"}
                  required
                />
                {selectedContactInfo && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '8px',
                    color: 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>👤</span>
                      <div>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
                          {selectedContactInfo.nome || 'Contato Selecionado'}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                          {selectedContactInfo.email}
                        </p>
                        {selectedContactInfo.tags && selectedContactInfo.tags.length > 0 && (
                          <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(Array.isArray(selectedContactInfo.tags) ? selectedContactInfo.tags : selectedContactInfo.tags.split(',')).map((tag, index) => (
                              <span 
                                key={index}
                                style={{
                                  background: 'rgba(255,255,255,0.2)',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: '500'
                                }}
                              >
                                🏷️ {tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="templateId" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Template (Opcional) {templatesList.length > 0 && <span style={{ color: '#10b981', fontSize: '12px' }}>({templatesList.length} disponíveis)</span>}
                </label>
                <select
                  name="templateId"
                  id="templateId"
                  value={emailData.templateId}
                  onChange={handleTemplateSelect}
                  className="dashboard-select"
                  style={{ width: '100%' }}
                >
                  <option value="">Selecione um template</option>
                  {Array.isArray(templatesList) && templatesList.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.nome || template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="subject" style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Assunto
                </label>
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  value={emailData.subject}
                  onChange={handleInputChange}
                  className="dashboard-select"
                  style={{ width: '100%' }}
                  placeholder="Assunto do email - Use {{nome}}, {{nome_completo}} etc."
                />
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
                    value={emailData.html}
                    onChange={handleInputChange}
                    placeholder="<h1>Olá {{nome}}!</h1><p>Caro {{nome_completo}}, este é seu email personalizado...</p>

Use variáveis como {{nome}}, {{nome_completo}}, etc."
                    style={{ 
                      width: '100%',
                      minHeight: '300px'
                    }}
                  />
                  <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                    Use HTML para formatar seu email. Variáveis como {"{{nome}}"}, {"{{nome_completo}}"} serão substituídas pelos dados do contato selecionado.
                  </p>
                  
                  {/* Variáveis detectadas no template */}
                  {(() => {
                    const detectedVars = detectVariablesInTemplate(emailData.html)
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
                                {variable.is_universal && ' 🌟'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                background: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                opacity: (!emailData.html || !emailData.subject || !emailData.to) ? '0.5' : '1'
              }}
              disabled={!emailData.html || !emailData.subject || !emailData.to}
            >
              Visualizar Preview
            </button>
            <button
              type="submit"
              disabled={loading}
              className="dashboard-refresh-btn"
              style={{
                opacity: loading ? '0.5' : '1',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="loading-spinner" style={{ width: '16px', height: '16px', marginRight: '8px' }}></div>
                  Enviando...
                </span>
              ) : (
                '📧 Enviar Email'
              )}
            </button>
          </div>
        </form>
      )}
    </>
  )
}

export default SendEmail