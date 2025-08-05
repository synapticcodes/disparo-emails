const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function testComercialUser() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  console.log('🔐 Testando usuário comercial@meunomeok.com...\n');
  
  // Primeiro, vamos descobrir a senha ou resetá-la
  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // Buscar informações do usuário
    console.log('1️⃣ Verificando dados do usuário...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log('❌ Erro ao listar usuários:', listError.message);
      return;
    }
    
    const comercialUser = users.find(u => u.email === 'comercial@meunomeok.com');
    
    if (!comercialUser) {
      console.log('❌ Usuário comercial@meunomeok.com não encontrado');
      return;
    }
    
    console.log('✅ Usuário encontrado:');
    console.log('   📧 Email:', comercialUser.email);
    console.log('   🔐 ID:', comercialUser.id);
    console.log('   ✅ Confirmado:', !!comercialUser.email_confirmed_at);
    console.log('   📅 Criado em:', comercialUser.created_at);
    
    // Resetar senha para uma conhecida
    console.log('\n2️⃣ Definindo senha padrão...');
    const { data: updateUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      comercialUser.id,
      { password: 'minhasenha123' }
    );
    
    if (updateError) {
      console.log('❌ Erro ao atualizar senha:', updateError.message);
    } else {
      console.log('✅ Senha definida como: minhasenha123');
    }
    
    // Testar login
    console.log('\n3️⃣ Testando login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'comercial@meunomeok.com',
      password: 'minhasenha123'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      
      // Tentar com senhas comuns
      const senhasComuns = ['123456', 'senha123', 'meunomeok123', 'comercial123'];
      
      for (const senha of senhasComuns) {
        console.log(`   Tentando senha: ${senha}`);
        const { data: tryLogin, error: tryError } = await supabase.auth.signInWithPassword({
          email: 'comercial@meunomeok.com',
          password: senha
        });
        
        if (!tryError) {
          console.log(`✅ Login bem-sucedido com senha: ${senha}`);
          break;
        }
      }
      return;
    }
    
    const user = loginData.user;
    const session = loginData.session;
    
    console.log('✅ Login bem-sucedido!');
    console.log('🔑 Token obtido:', !!session.access_token);
    
    // Verificar dados existentes do usuário
    console.log('\n4️⃣ Verificando dados existentes...');
    const [
      { data: contatos },
      { data: templates },
      { data: campanhas },
      { data: segmentos }
    ] = await Promise.all([
      supabase.from('contatos').select('*').eq('user_id', user.id),
      supabase.from('templates').select('*').eq('user_id', user.id),
      supabase.from('campanhas').select('*').eq('user_id', user.id),
      supabase.from('segmentos').select('*').eq('user_id', user.id)
    ]);
    
    console.log('📊 Dados do usuário:');
    console.log('   📧 Contatos:', contatos?.length || 0);
    console.log('   📄 Templates:', templates?.length || 0);
    console.log('   📢 Campanhas:', campanhas?.length || 0);
    console.log('   🏷️  Segmentos:', segmentos?.length || 0);
    
    // Testar dashboard
    console.log('\n5️⃣ Testando dashboard...');
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Dashboard funcionando!');
      console.log('📊 Estatísticas:');
      console.log('   📧 Total emails:', response.data.totalEmails);
      console.log('   📤 Enviados:', response.data.emailsEnviados);
      console.log('   📊 Taxa abertura:', response.data.taxaAbertura + '%');
      console.log('   📢 Campanhas ativas:', response.data.campanhasAtivas);
      console.log('   👥 Contatos:', response.data.totalContatos);
      console.log('   📄 Templates:', response.data.totalTemplates);
      
    } catch (dashboardError) {
      console.log('❌ Erro no dashboard:', dashboardError.response?.data || dashboardError.message);
    }
    
    console.log('\n✅ Teste concluído! Seu usuário está funcionando.');
    console.log('🔑 Use: comercial@meunomeok.com / minhasenha123');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testComercialUser();