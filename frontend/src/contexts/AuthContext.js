import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true

    // Obter sessão inicial
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          if (error) {
            console.error('Erro ao obter sessão:', error)
          }
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro inesperado ao obter sessão:', error)
        if (mounted) {
          setSession(null)
          setUser(null)
          setLoading(false)
        }
      }
    }

    getSession()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)

          if (event === 'SIGNED_IN') {
            toast.success('Login realizado com sucesso!')
          } else if (event === 'SIGNED_OUT') {
            toast.success('Logout realizado com sucesso!')
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return { error }
      }

      return { data }
    } catch (error) {
      toast.error('Erro inesperado durante o login')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        return { error }
      }

      toast.success('Conta criada com sucesso! Verifique seu email.')
      return { data }
    } catch (error) {
      toast.error('Erro inesperado durante o cadastro')
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      
      // Verificar se há sessão antes de tentar fazer logout
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      
      if (!currentSession) {
        // Se não há sessão, apenas limpar o estado local
        setSession(null)
        setUser(null)
        toast.success('Logout realizado com sucesso!')
        return {}
      }
      
      // Fazer logout normal se há sessão
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        // Se o erro for "Auth session missing", não mostrar como erro
        if (error.message.includes('Auth session missing')) {
          // Limpar estado local mesmo assim
          setSession(null)
          setUser(null)
          toast.success('Logout realizado com sucesso!')
          return {}
        }
        
        toast.error(error.message)
        return { error }
      }

      return {}
    } catch (error) {
      // Para qualquer erro inesperado, limpar estado local
      setSession(null)
      setUser(null)
      toast.success('Logout realizado com sucesso!')
      return {}
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
        return { error }
      }

      toast.success('Email de recuperação enviado!')
      return { data }
    } catch (error) {
      toast.error('Erro inesperado durante a recuperação')
      return { error }
    }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}