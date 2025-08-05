const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function testAuthAndDashboard() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  console.log('🔐 Testando autenticação e dashboard...\n');
  
  const testUser = {
    email: 'teste@dashboard.app',
    password: 'dashboard123'
  };
  
  try {
    // 1. Tentar fazer login primeiro
    console.log('1️⃣ Tentando fazer login...');
    let { data: loginData, error: loginError } = await supabase.auth.signInWithPassword(testUser);
    
    if (loginError && loginError.message.includes('Invalid login credentials')) {
      console.log('   ℹ️  Usuário não existe, criando conta...');
      
      // 2. Criar usuário se não existir
      const { data: signupData, error: signupError } = await supabase.auth.signUp(testUser);
      
      if (signupError) {
        console.log('   ❌ Erro ao criar usuário:', signupError.message);
        return;
      }
      
      console.log('   ✅ Usuário criado! Aguarde confirmação de email...');
      console.log('   ⏳ Tentando login novamente em 2 segundos...');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Tentar login novamente
      const { data: retryLogin, error: retryError } = await supabase.auth.signInWithPassword(testUser);
      
      if (retryError) {
        console.log('   ❌ Erro no login após criar usuário:', retryError.message);
        console.log('   💡 Verifique o email para confirmar a conta ou desabilite email confirmation no Supabase');
        return;
      }
      
      loginData = retryLogin;
    } else if (loginError) {
      console.log('   ❌ Erro no login:', loginError.message);
      return;
    }
    
    const user = loginData.user;
    const session = loginData.session;
    
    if (!user || !session) {
      console.log('   ❌ Login falhou: sem usuário ou sessão');
      return;
    }
    
    console.log('   ✅ Login bem-sucedido!');
    console.log('   👤 Usuário:', user.email);
    console.log('   🔑 Token existe:', !!session.access_token);
    
    // 3. Testar o endpoint do dashboard
    console.log('\n2️⃣ Testando endpoint do dashboard...');
    
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('   ✅ Dashboard funcionando!');
      console.log('   📊 Dados retornados:');
      console.log('      - Total de emails:', response.data.totalEmails);
      console.log('      - Emails enviados:', response.data.emailsEnviados);  
      console.log('      - Taxa de abertura:', response.data.taxaAbertura + '%');
      console.log('      - Campanhas ativas:', response.data.campanhasAtivas);
      console.log('      - Total contatos:', response.data.totalContatos);
      console.log('      - Total templates:', response.data.totalTemplates);
      
    } catch (dashboardError) {
      console.log('   ❌ Erro no dashboard:', dashboardError.response?.data || dashboardError.message);
      
      if (dashboardError.response?.status === 401) {
        console.log('   🔍 Token inválido ou expirado');
      }
    }
    
    console.log('\n🎯 Teste do dashboard concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testAuthAndDashboard();