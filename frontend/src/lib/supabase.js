import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ixroiuhpvsljxeynfrqz.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cm9pdWhwdnNsanhleW5mcnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzUyMTMsImV4cCI6MjA2OTY1MTIxM30.GggeoRijune6o5eQWQDODw5QnBfd6d1FxWKu7R8Q5FA'

// Debug removido para produção

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})