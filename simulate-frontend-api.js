const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Simular exatamente como o frontend está configurado
const frontendSupabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || 'https://ixroiuhpvsljxeynfrqz.supabase.co',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cm9pdWhwdnNsanhleW5mcnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzUyMTMsImV4cCI6MjA2OTY1MTIxM30.GggeoRijune6o5eQWQDODw5QnBfd6d1FxWKu7R8Q5FA',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Simular interceptor do axios como no frontend
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session }, error } = await frontendSupabase.auth.getSession()
    
    if (error) {
      console.error('Erro ao buscar sessão:', error)
    }
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    } else {
      console.warn('Nenhum token encontrado na sessão')
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await frontendSupabase.auth.getSession()
      
      if (!session) {
        console.log('Token inválido, fazendo logout')
        await frontendSupabase.auth.signOut()
      }
    }
    return Promise.reject(error)
  }
);

async function simulateFrontendAPI() {
  console.log('🎭 Simulando comportamento do frontend...\n');
  
  try {
    // 1. Login como no frontend
    console.log('1️⃣ Login via frontend Supabase...');
    
    const { data: loginData, error: loginError } = await frontendSupabase.auth.signInWithPassword({
      email: 'comercial@meunomeok.com',
      password: 'Montag10'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }
    
    console.log('✅ Login bem-sucedido via frontend');
    console.log('   👤 User:', loginData.user.email);
    console.log('   🔑 Token presente:', !!loginData.session.access_token);
    
    // Aguardar um momento para simular delay do frontend
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 2. Chamada via interceptor (como no dashboard)
    console.log('\n2️⃣ Chamada via interceptor (como Dashboard.js)...');
    
    try {
      const response = await api.get('/api/dashboard/stats');
      console.log('✅ API via interceptor funcionando');
      console.log('   📊 Dados:', {
        totalEmails: response.data.totalEmails,
        campanhasAtivas: response.data.campanhasAtivas
      });
    } catch (interceptorError) {
      console.log('❌ Erro via interceptor:', interceptorError.response?.data);
      console.log('   Status:', interceptorError.response?.status);
      
      // Verificar se o interceptor adicionou o token
      console.log('   🔍 Headers enviados:', interceptorError.config?.headers?.Authorization ? 'Token presente' : 'Token ausente');
    }
    
    // 3. Verificar múltiplas getSession (simular re-renders)
    console.log('\n3️⃣ Simulando múltiplas verificações (re-renders)...');
    
    for (let i = 1; i <= 3; i++) {
      const { data: { session }, error } = await frontendSupabase.auth.getSession();
      
      if (error) {
        console.log(`   ❌ Verificação ${i}: Erro -`, error.message);
      } else if (!session) {
        console.log(`   ❌ Verificação ${i}: Sem sessão`);
      } else {
        console.log(`   ✅ Verificação ${i}: OK`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 4. Testar logout
    console.log('\n4️⃣ Testando logout...');
    
    const { error: logoutError } = await frontendSupabase.auth.signOut();
    
    if (logoutError) {
      console.log('❌ Erro no logout:', logoutError.message);
      
      if (logoutError.message.includes('Auth session missing')) {
        console.log('   🔍 Este é o erro que você está vendo!');
        console.log('   💡 Possível causa: Sessão já foi invalidada');
        
        // Verificar se há sessão ativa
        const { data: { session: currentSession } } = await frontendSupabase.auth.getSession();
        console.log('   🧐 Sessão atual:', currentSession ? 'Existe' : 'Não existe');
      }
    } else {
      console.log('✅ Logout funcionando');
    }
    
    console.log('\n📋 Resumo dos Problemas:');
    console.log('   1. Dashboard "Não autorizado": ❓');
    console.log('   2. Logout "Auth session missing": ❓');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

simulateFrontendAPI();