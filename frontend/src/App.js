import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import SendEmail from './pages/SendEmail'
import Campaigns from './pages/Campaigns'
import Templates from './pages/Templates'
import Contacts from './pages/Contacts'
import Suppressions from './pages/Suppressions'
import Schedules from './pages/Schedules'
import Statistics from './pages/Statistics'
import Logs from './pages/Logs'
import Tags from './pages/Tags'
import Variables from './pages/Variables'
import EmailTracking from './pages/EmailTracking'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/send-email" element={<SendEmail />} />
                    <Route path="/campaigns" element={<Campaigns />} />
                    <Route path="/templates" element={<Templates />} />
                    <Route path="/contacts" element={<Contacts />} />
                    <Route path="/tags" element={<Tags />} />
                    <Route path="/variables" element={<Variables />} />
                    <Route path="/suppressions" element={<Suppressions />} />
                    <Route path="/schedules" element={<Schedules />} />
                    <Route path="/stats" element={<Statistics />} />
                    <Route path="/tracking" element={<EmailTracking />} />
                    <Route path="/logs" element={<Logs />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App