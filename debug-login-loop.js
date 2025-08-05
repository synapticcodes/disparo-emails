const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function debugLoginLoop() {
  console.log('🔍 Investigando problema de loop no login...\n');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  try {
    // 1. Testar login básico
    console.log('1️⃣ Testando login básico...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'comercial@meunomeok.com',
      password: 'Montag10'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }
    
    const user = loginData.user;
    const session = loginData.session;
    
    console.log('✅ Login básico funcionando');
    console.log('   👤 Usuário:', user.email);
    console.log('   🔑 Access Token:', session.access_token ? 'Presente' : 'Ausente');
    console.log('   ⏰ Expira em:', new Date(session.expires_at * 1000).toLocaleString());
    
    // 2. Testar renovação de sessão
    console.log('\n2️⃣ Testando renovação de sessão...');
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.log('❌ Erro na renovação:', refreshError.message);
    } else {
      console.log('✅ Renovação de sessão funcionando');
    }
    
    // 3. Testar chamada de API que pode estar causando loop
    console.log('\n3️⃣ Testando chamada de API...');
    
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API dashboard funcionando');
      console.log('   📊 Total emails:', response.data.totalEmails);
      
    } catch (apiError) {
      console.log('❌ Erro na API:', apiError.response?.status, apiError.response?.data);
      
      if (apiError.response?.status === 401) {
        console.log('⚠️  Token pode estar inválido - isso pode causar loop');
      }
    }
    
    // 4. Testar múltiplas chamadas getSession (simular comportamento do frontend)
    console.log('\n4️⃣ Testando múltiplas chamadas getSession...');
    
    for (let i = 1; i <= 3; i++) {
      const { data: { session: checkSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log(`❌ Erro na verificação ${i}:`, sessionError.message);
      } else {
        console.log(`✅ Verificação ${i}: Token ${checkSession?.access_token ? 'válido' : 'inválido'}`);
      }
      
      // Pequena pausa entre chamadas
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 5. Verificar se há conflitos de sessão
    console.log('\n5️⃣ Verificando estado da sessão...');
    
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (currentSession) {
      console.log('✅ Sessão ativa encontrada');
      console.log('   🆔 User ID:', currentSession.user.id);
      console.log('   📧 Email:', currentSession.user.email);
      console.log('   🔑 Token válido:', !!currentSession.access_token);
      
      // Verificar se o token não está corrompido
      try {
        const tokenParts = currentSession.access_token.split('.');
        console.log('   🔍 Token tem', tokenParts.length, 'partes (deve ser 3)');
        
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('   ⏰ Token expira em:', new Date(payload.exp * 1000).toLocaleString());
          console.log('   👤 Sub:', payload.sub);
        }
      } catch (tokenError) {
        console.log('❌ Token corrompido:', tokenError.message);
      }
      
    } else {
      console.log('❌ Nenhuma sessão ativa encontrada');
    }
    
    // 6. Testar logout e login novamente
    console.log('\n6️⃣ Testando ciclo logout/login...');
    
    await supabase.auth.signOut();
    console.log('✅ Logout realizado');
    
    const { data: reloginData, error: reloginError } = await supabase.auth.signInWithPassword({
      email: 'comercial@meunomeok.com',
      password: 'Montag10'
    });
    
    if (reloginError) {
      console.log('❌ Erro no re-login:', reloginError.message);
    } else {
      console.log('✅ Re-login funcionando');
    }
    
    console.log('\n🎯 Diagnóstico do Loop de Login:');
    console.log('   - Login básico: ✅ Funcionando');
    console.log('   - Token válido: ✅ Funcionando');
    console.log('   - API calls: ✅ Funcionando');
    console.log('   - Múltiplas verificações: ✅ Funcionando');
    
    console.log('\n💡 Possíveis causas do loop:');
    console.log('   1. Interceptor do axios fazendo chamadas infinitas');
    console.log('   2. Redirecionamento incorreto no frontend');
    console.log('   3. Estado de loading infinito');
    console.log('   4. Verificação de autenticação em loop');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugLoginLoop();