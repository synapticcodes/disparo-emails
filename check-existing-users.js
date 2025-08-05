const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkExistingUsers() {
  // Usar service key para acessar admin functions
  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  console.log('👥 Verificando usuários existentes...\n');
  
  try {
    // Listar usuários via admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Erro ao listar usuários:', error.message);
      return;
    }
    
    console.log(`📊 Total de usuários: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log('🔍 Nenhum usuário encontrado');
      console.log('💡 Vou criar um usuário de teste já confirmado...\n');
      
    } else {
      console.log('👤 Usuários encontrados:');
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.email_confirmed_at ? '✅ Confirmado' : '❌ Não confirmado'})`);
      });
    }
    
    // Criar usuário de teste com credenciais conhecidas
    console.log('\n🆕 Criando usuário de teste...');
    const { data: testUser, error: testUserError } = await supabaseAdmin.auth.admin.createUser({
      email: 'teste@dashboard.app',
      password: 'dashboard123',
      email_confirm: true
    });
    
    if (testUserError && !testUserError.message.includes('already registered')) {
      console.log('❌ Erro ao criar usuário de teste:', testUserError.message);
    } else {
      console.log('✅ Usuário de teste criado: teste@dashboard.app / dashboard123');
    }
    
    // Agora testar login
    console.log('\n🔐 Testando login...');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'teste@dashboard.app',
      password: 'dashboard123'
    });
    
    if (loginError) {
      console.log('❌ Erro no login:', loginError.message);
      return;
    }
    
    console.log('✅ Login bem-sucedido!');
    console.log('🔑 Token obtido:', !!loginData.session?.access_token);
    
    return loginData.session?.access_token;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkExistingUsers();