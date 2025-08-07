import React, { useState, useEffect, useRef } from 'react'
import '../styles/dashboard.css'

const VariableEditor = ({ 
  value, 
  onChange, 
  placeholder = '', 
  rows = 12, 
  className = '',
  style = {},
  name,
  id
}) => {
  const textareaRef = useRef(null)
  const highlightRef = useRef(null)
  const [highlightedContent, setHighlightedContent] = useState('')

  // Função para destacar variáveis no texto
  const highlightVariables = (text) => {
    if (!text) return ''
    
    // Regex para encontrar variáveis {{variavel}}
    const variableRegex = /(\{\{[^}]+\}\})/g
    
    return text.replace(variableRegex, (match) => {
      return `<span class="variable-tag">${match}</span>`
    })
  }

  // Atualizar destaque quando o valor mudar
  useEffect(() => {
    const highlighted = highlightVariables(value || '')
    setHighlightedContent(highlighted)
    
    // Sincronizar scroll após atualizar o conteúdo
    setTimeout(() => {
      if (highlightRef.current && textareaRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
      }
    }, 0)
  }, [value])

  // Sincronizar scroll entre textarea e highlight
  const handleScroll = (e) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop
      highlightRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  // Garantir que o cursor permaneça visível
  const handleInput = (e) => {
    const newValue = e.target.value
    onChange({ target: { name, value: newValue } })
  }

  return (
    <div className="variable-editor-container" style={style}>
      {/* Div de destaque (background) */}
      <div 
        ref={highlightRef}
        className="variable-highlight"
        style={{ 
          minHeight: `${rows * 1.5 * 14 + 24}px`, // Aproximadamente altura do textarea
          maxHeight: style.maxHeight || 'none',
          overflow: 'auto'
        }}
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
      
      {/* Textarea transparente (foreground) */}
      <textarea
        ref={textareaRef}
        name={name}
        id={id}
        value={value || ''}
        onChange={handleInput}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        className={`variable-textarea ${className}`}
        style={{ 
          height: '100%',
          resize: style.resize || 'vertical'
        }}
        spellCheck={false}
      />
    </div>
  )
}

export default VariableEditor