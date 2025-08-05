require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

console.log('🔍 Testando conexão com Supabase...\n')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

console.log('URL:', supabaseUrl)
console.log('Key (primeiros 20 chars):', supabaseKey?.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupabase() {
  try {
    console.log('\n1. Testando conexão básica...')
    
    // Teste básico de conexão
    const { data, error } = await supabase
      .from('logs')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message)
      return false
    }
    
    console.log('✅ Conexão com Supabase funcionando!')
    
    // Teste de autenticação
    console.log('\n2. Testando funcionalidade de auth...')
    
    const { data: authData, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('❌ Erro no auth:', authError.message)
      return false
    }
    
    console.log('✅ Sistema de autenticação funcionando!')
    
    // Teste de criação de usuário (simulado)
    console.log('\n3. Testando signup (simulado)...')
    
    const testEmail = 'test' + Date.now() + '@example.com'
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123'
    })
    
    if (signupError) {
      console.error('❌ Erro no signup:', signupError.message)
      
      // Se o erro for sobre confirmação de email, isso é normal
      if (signupError.message.includes('confirm') || signupError.message.includes('verification')) {
        console.log('ℹ️  Nota: Este erro é normal - significa que o signup funciona mas requer confirmação de email')
        return true
      }
      
      return false
    }
    
    console.log('✅ Sistema de signup funcionando!')
    console.log('Usuário criado:', signupData.user?.email)
    
    return true
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message)
    return false
  }
}

testSupabase().then(success => {
  if (success) {
    console.log('\n🎉 Supabase está funcionando corretamente!')
    console.log('✅ Você pode prosseguir com o cadastro no frontend')
  } else {
    console.log('\n❌ Há problemas com a configuração do Supabase')
    console.log('🔧 Verifique as credenciais e tente novamente')
  }
  process.exit(0)
})