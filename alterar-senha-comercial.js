const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function alterarSenhaComercial() {
  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  console.log('🔐 Alterando senha do usuário comercial@meunomeok.com...\n');
  
  try {
    // Buscar o usuário
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
    
    console.log('✅ Usuário encontrado:', comercialUser.email);
    console.log('🔐 ID:', comercialUser.id);
    
    // Alterar a senha
    console.log('\n🔄 Alterando senha para: Montag10');
    
    const { data: updateUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      comercialUser.id,
      { password: 'Montag10' }
    );
    
    if (updateError) {
      console.log('❌ Erro ao alterar senha:', updateError.message);
      return;
    }
    
    console.log('✅ Senha alterada com sucesso!');
    
    // Testar a nova senha
    console.log('\n🧪 Testando login com a nova senha...');
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'comercial@meunomeok.com',
      password: 'Montag10'
    });
    
    if (loginError) {
      console.log('❌ Erro no teste de login:', loginError.message);
      return;
    }
    
    console.log('✅ Login com nova senha funcionando!');
    console.log('🔑 Token obtido:', !!loginData.session?.access_token);
    
    console.log('\n🎉 Senha alterada com sucesso!');
    console.log('📋 Suas novas credenciais:');
    console.log('   📧 Email: comercial@meunomeok.com');
    console.log('   🔐 Senha: Montag10');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

alterarSenhaComercial();