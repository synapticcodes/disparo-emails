const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function debugAuthErrors() {
  console.log('🔍 Investigando erros de autorização...\n');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  try {
    // 1. Fazer login e capturar o token
    console.log('1️⃣ Fazendo login e capturando token...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'comercial@meunomeok.com',
      password: 'Montag10'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }
    
    const session = loginData.session;
    const user = loginData.user;
    const accessToken = session.access_token;
    
    console.log('✅ Login bem-sucedido');
    console.log('   👤 User ID:', user.id);
    console.log('   📧 Email:', user.email);
    console.log('   🔑 Token (primeiros 50 chars):', accessToken.substring(0, 50) + '...');
    console.log('   ⏰ Token expira em:', new Date(session.expires_at * 1000).toLocaleString());
    
    // 2. Verificar se o token está válido decodificando-o
    console.log('\n2️⃣ Verificando validade do token...');
    
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const header = JSON.parse(atob(tokenParts[0]));
        const payload = JSON.parse(atob(tokenParts[1]));
        
        console.log('✅ Token válido (3 partes)');
        console.log('   🔐 Algoritmo:', header.alg);
        console.log('   👤 Subject:', payload.sub);
        console.log('   📧 Email:', payload.email);
        console.log('   ⏰ Expira em:', new Date(payload.exp * 1000).toLocaleString());
        console.log('   🎯 Audience:', payload.aud);
        console.log('   🏢 Issuer:', payload.iss);
        
        // Verificar se não expirou
        const now = Date.now() / 1000;
        const isExpired = payload.exp < now;
        console.log('   ⌛ Expirado:', isExpired ? '❌ SIM' : '✅ NÃO');
        
      } else {
        console.log('❌ Token inválido (não tem 3 partes)');
      }
    } catch (tokenError) {
      console.log('❌ Erro ao decodificar token:', tokenError.message);
    }
    
    // 3. Testar chamada para API com token
    console.log('\n3️⃣ Testando chamada para API...');
    
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API respondeu com sucesso');
      console.log('   📊 Total emails:', response.data.totalEmails);
      
    } catch (apiError) {
      console.log('❌ Erro na API:', apiError.response?.status, apiError.response?.statusText);
      console.log('   💬 Resposta:', apiError.response?.data);
      
      if (apiError.response?.status === 401) {
        console.log('   🔍 Verificando se o problema é no servidor...');
        
        // Testar endpoint de health
        try {
          const healthResponse = await axios.get('http://localhost:3000/health');
          console.log('   ✅ Servidor funcionando (health check OK)');
        } catch (healthError) {
          console.log('   ❌ Servidor não está respondendo');
        }
        
        // Testar endpoint protegido simples
        try {
          const protectedResponse = await axios.get('http://localhost:3000/api/protected', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('   ✅ Endpoint protegido funcionando:', protectedResponse.data.message);
        } catch (protectedError) {
          console.log('   ❌ Endpoint protegido também falhou:', protectedError.response?.data);
        }
      }
    }
    
    // 4. Testar getSession() múltiplas vezes (simular o que acontece no frontend)
    console.log('\n4️⃣ Testando getSession() múltiplas vezes...');
    
    for (let i = 1; i <= 3; i++) {
      const { data: { session: checkSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log(`   ❌ Erro na verificação ${i}:`, sessionError.message);
      } else if (!checkSession) {
        console.log(`   ❌ Verificação ${i}: Nenhuma sessão encontrada`);
      } else {
        const sameToken = checkSession.access_token === accessToken;
        console.log(`   ✅ Verificação ${i}: Token ${sameToken ? 'igual' : 'diferente'}`);
        
        if (!sameToken) {
          console.log('   ⚠️  Token mudou! Isso pode estar causando o problema');
          console.log('   🔑 Novo token (primeiros 50):', checkSession.access_token.substring(0, 50) + '...');
        }
      }
    }
    
    // 5. Testar logout
    console.log('\n5️⃣ Testando logout...');
    
    try {
      const { error: logoutError } = await supabase.auth.signOut();
      
      if (logoutError) {
        console.log('❌ Erro no logout:', logoutError.message);
      } else {
        console.log('✅ Logout funcionando');
        
        // Verificar se a sessão foi realmente limpa
        const { data: { session: afterLogout } } = await supabase.auth.getSession();
        console.log('   🧹 Sessão limpa:', !afterLogout);
      }
    } catch (logoutErr) {
      console.log('❌ Erro inesperado no logout:', logoutErr.message);
    }
    
    console.log('\n🎯 Diagnóstico:');
    console.log('   - Login: ✅ Funcionando');
    console.log('   - Token: ✅ Válido');
    console.log('   - Autorização: ❓ Verificar logs acima');
    console.log('   - Logout: ❓ Verificar logs acima');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

debugAuthErrors();