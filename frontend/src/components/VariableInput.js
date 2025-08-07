import React, { useState, useEffect, useRef } from 'react'
import '../styles/dashboard.css'

const VariableInput = ({ 
  value, 
  onChange, 
  placeholder = '', 
  className = '',
  style = {},
  name,
  id,
  type = 'text'
}) => {
  const inputRef = useRef(null)
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
    setHighlightedContent(highlightVariables(value || ''))
  }, [value])

  // Sincronizar scroll entre input e highlight
  const handleScroll = (e) => {
    if (highlightRef.current) {
      highlightRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  // Garantir que o cursor permaneça visível
  const handleInput = (e) => {
    const newValue = e.target.value
    onChange({ target: { name, value: newValue } })
    
    // Pequeno delay para atualizar o scroll após a mudança
    setTimeout(() => {
      if (highlightRef.current && inputRef.current) {
        highlightRef.current.scrollLeft = inputRef.current.scrollLeft
      }
    }, 0)
  }

  return (
    <div className="variable-editor-container" style={{...style, height: 'auto'}}>
      {/* Div de destaque (background) */}
      <div 
        ref={highlightRef}
        className="variable-highlight"
        style={{ 
          height: '42px', // Altura padrão de um input
          padding: '8px 12px',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'nowrap',
          overflow: 'hidden'
        }}
        dangerouslySetInnerHTML={{ __html: highlightedContent }}
      />
      
      {/* Input transparente (foreground) */}
      <input
        ref={inputRef}
        type={type}
        name={name}
        id={id}
        value={value || ''}
        onChange={handleInput}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`variable-textarea ${className}`}
        style={{ 
          height: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          lineHeight: '1.5'
        }}
        spellCheck={false}
      />
    </div>
  )
}

export default VariableInput