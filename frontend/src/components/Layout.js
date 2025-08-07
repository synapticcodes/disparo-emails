import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { forceLogout } from '../utils/authUtils'
import '../styles/dashboard.css'

const Layout = ({ children }) => {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Enviar Email', href: '/send-email', icon: '📧' },
    { name: 'Campanhas', href: '/campaigns', icon: '📢' },
    { name: 'Templates', href: '/templates', icon: '📝' },
    { name: 'Contatos', href: '/contacts', icon: '👥' },
    { name: 'Tags', href: '/tags', icon: '🏷️' },
    { name: 'Variáveis', href: '/variables', icon: '🔧' },
    { name: 'Supressões', href: '/suppressions', icon: '🚫' },
    { name: 'Agendamentos', href: '/schedules', icon: '📅' },
    { name: 'Estatísticas', href: '/stats', icon: '📈' },
    { name: 'Rastreamento', href: '/tracking', icon: '🔍' },
    { name: 'Logs', href: '/logs', icon: '📋' },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Erro no logout normal, forçando logout:', error)
      forceLogout()
    }
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <SidebarContent navigation={navigation} location={location} />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input
              placeholder="Pesquisar..."
              type="search"
            />
          </div>
          
          <div className="header-right">
            <button className="header-notification">
              🔔
            </button>
            
            <div className="header-user">
              <div className="header-user-info">
                <p className="header-user-name">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="header-user-role">Administrador</p>
              </div>
              <div className="header-user-avatar">
                {user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={handleSignOut}
                className="header-logout"
                title="Sair"
              >
                ↗️
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="dashboard-content">
          {children}
        </main>
      </div>
    </div>
  )
}

const SidebarContent = ({ navigation, location }) => (
  <div className="sidebar-content">
    {/* Logo and Brand */}
    <div className="sidebar-logo">
      <div className="sidebar-logo-icon">
        <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>+</span>
      </div>
      <span className="sidebar-logo-text">E-mailer</span>
    </div>

    {/* Primary Action Button */}
    <Link to="/send-email" className="sidebar-primary-btn">
      <span style={{ marginRight: '8px' }}>📧</span>
      Enviar Email
    </Link>

    {/* Navigation */}
    <nav className="sidebar-nav">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.name}</span>
            {isActive && <div className="dot"></div>}
          </Link>
        )
      })}
    </nav>

    {/* Settings */}
    <div className="sidebar-settings">
      <Link to="/settings" className="sidebar-nav-item">
        <span className="icon">⚙️</span>
        Configurações
      </Link>
    </div>
  </div>
)

export default Layout