import React, { useState, useEffect, useRef } from 'react'
import '../styles/dashboard.css'

const VariableEditorV2 = ({ 
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
  const containerRef = useRef(null)

  // Função para destacar variáveis
  const highlightVariables = (text) => {
    if (!text) return ''
    return text.replace(/(\{\{[^}]+\}\})/g, '<mark class="variable-highlight-mark">$1</mark>')
  }

  // Sincronizar scroll
  const handleScroll = () => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop
      mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }

  const handleInputChange = (e) => {
    onChange({ target: { name, value: e.target.value } })
  }

  return (
    <div 
      ref={containerRef}
      className="variable-editor-v2" 
      style={{ position: 'relative', ...style }}
    >
      {/* Mirror div para mostrar destaque */}
      <div
        ref={mirrorRef}
        className="variable-mirror"
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
          backgroundColor: 'transparent'
        }}
        dangerouslySetInnerHTML={{ __html: highlightVariables(value || '') }}
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
        className={`variable-textarea-v2 ${className}`}
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
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#111827',
          boxSizing: 'border-box'
        }}
        spellCheck={false}
      />
    </div>
  )
}

export default VariableEditorV2