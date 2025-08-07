import React, { useEffect, useRef } from 'react'
import '../styles/dashboard.css'

const SimpleVariableEditor = ({ 
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
  const mirrorRef = useRef(null)

  const handleInputChange = (e) => {
    onChange({ target: { name, value: e.target.value } })
  }

  const insertAtCursor = (text) => {
    if (!textareaRef.current) return
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = value || ''
    
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end)
    onChange({ target: { name, value: newValue } })
    
    // Aguardar um ciclo completo do React
    setTimeout(() => {
      textarea.focus()
      const newPos = start + text.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  // Destacar variáveis no texto
  const highlightText = (text) => {
    if (!text) return ''
    return text.replace(/(\{\{[^}]+\}\})/g, '<span class="variable-simple-highlight">$1</span>')
  }

  // Sincronizar scroll entre textarea e mirror
  const handleScroll = () => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop
      mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  // Expor função para componente pai
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.insertAtCursor = insertAtCursor
    }
  }, [value, insertAtCursor])

  return (
    <div className="simple-variable-editor" style={{ position: 'relative', ...style }}>
      {/* Mirror div para mostrar o destaque das variáveis */}
      <div
        ref={mirrorRef}
        className="simple-variable-mirror"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          padding: '12px',
          border: '1px solid transparent',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflow: 'hidden',
          pointerEvents: 'none',
          color: 'transparent',
          backgroundColor: 'transparent',
          boxSizing: 'border-box'
        }}
        dangerouslySetInnerHTML={{ __html: highlightText(value || '') }}
      />
      
      {/* Textarea real */}
      <textarea
        ref={textareaRef}
        name={name}
        id={id}
        value={value || ''}
        onChange={handleInputChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        className={`simple-variable-textarea ${className}`}
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          minHeight: `${rows * 1.5 * 14 + 24}px`,
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          lineHeight: '1.5',
          resize: 'vertical',
          outline: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: '#111827',
          boxSizing: 'border-box'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3b82f6'
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.98)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d1d5db'
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.95)'
        }}
        spellCheck={false}
      />
    </div>
  )
}

export default SimpleVariableEditor