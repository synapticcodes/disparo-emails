import React, { useState, useEffect, useRef } from 'react'
import '../styles/dashboard.css'

const VariableEditorFixed = ({ 
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
  const [isHighlighted, setIsHighlighted] = useState(false)

  // Função para destacar variáveis no texto com background inline
  const addVariableStyles = (text) => {
    if (!text) return ''
    
    // Aplicar destaque usando CSS inline
    return text.replace(/(\{\{[^}]+\}\})/g, (match) => {
      return `<span style="background: #dbeafe; color: #1d4ed8; border: 2px solid #3b82f6; border-radius: 4px; padding: 2px 6px; font-weight: 600; box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);">${match}</span>`
    })
  }

  // Alternar entre modo normal e destacado
  const toggleHighlight = () => {
    setIsHighlighted(!isHighlighted)
  }

  const handleInputChange = (e) => {
    onChange({ target: { name, value: e.target.value } })
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Botão para alternar destaque */}
      <button
        type="button"
        onClick={toggleHighlight}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          zIndex: 10,
          padding: '4px 8px',
          background: isHighlighted ? '#7c3aed' : '#e5e7eb',
          color: isHighlighted ? 'white' : '#6b7280',
          border: 'none',
          borderRadius: '4px',
          fontSize: '11px',
          cursor: 'pointer'
        }}
      >
        {isHighlighted ? '👁️ Destacado' : '👁️ Normal'}
      </button>

      {isHighlighted ? (
        /* Modo destacado - div com HTML processado */
        <div
          style={{
            width: '100%',
            minHeight: `${rows * 1.5 * 14 + 24}px`,
            padding: '12px 40px 12px 12px', // espaço para o botão
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            backgroundColor: 'white',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflow: 'auto',
            cursor: 'text'
          }}
          dangerouslySetInnerHTML={{ __html: addVariableStyles(value || placeholder) }}
          onClick={() => {
            setIsHighlighted(false)
            setTimeout(() => textareaRef.current?.focus(), 0)
          }}
        />
      ) : (
        /* Modo normal - textarea comum */
        <textarea
          ref={textareaRef}
          name={name}
          id={id}
          value={value || ''}
          onChange={handleInputChange}
          placeholder={placeholder}
          rows={rows}
          className={`normal-textarea ${className}`}
          style={{
            width: '100%',
            minHeight: `${rows * 1.5 * 14 + 24}px`,
            padding: '12px 40px 12px 12px', // espaço para o botão
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'vertical',
            outline: 'none',
            backgroundColor: 'white',
            color: '#111827'
          }}
          spellCheck={false}
        />
      )}
    </div>
  )
}

export default VariableEditorFixed