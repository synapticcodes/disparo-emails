const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ixroiuhpvsljxeynfrqz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cm9pdWhwdnNsanhleW5mcnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNzUyMTMsImV4cCI6MjA2OTY1MTIxM30.GggeoRijune6o5eQWQDODw5QnBfd6d1FxWKu7R8Q5FA'
);

async function testLoggingSystem() {
  console.log('🧪 Iniciando teste do sistema de logs...\n');
  
  try {
    // Tentar diferentes emails para encontrar um usuário existente
    const testEmails = [
      'admin@admin.com',
      'usuario@teste.com',
      'test@test.com'
    ];
    
    let authData = null;
    let foundUser = false;
    
    console.log('📋 Passo 1: Tentando login com usuários existentes...');
    
    for (const email of testEmails) {
      try {
        console.log(`🔍 Tentando login com: ${email}`);
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'teste123456'
        });
        
        if (!loginError && loginData.session) {
          authData = loginData;
          foundUser = true;
          console.log(`✅ Login realizado com sucesso: ${email}`);
          break;
        }
      } catch (e) {
        // Continue para o próximo email
      }
    }
    
    // Se não encontrou usuário, criar um novo mas pular confirmação de email
    if (!foundUser) {
      console.log('❌ Nenhum usuário encontrado. Vamos apenas testar as APIs...');
      console.log('ℹ️  Para testar completamente, acesse http://localhost:3001 e faça login manualmente.');
      
      // Vamos simular apenas o teste das APIs sem autenticação para ver se existem logs
      console.log('\n📋 Testando APIs sem autenticação (apenas para verificar estrutura)...');
      
      try {
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log('✅ Servidor funcionando:', healthResponse.data.message);
      } catch (error) {
        console.error('❌ Servidor não está funcionando:', error.message);
        return;
      }
      
      console.log('\n⚠️  Para testar completamente o sistema de logs:');
      console.log('1. Acesse http://localhost:3001');
      console.log('2. Faça login ou registre-se');
      console.log('3. Vá para "Enviar Email"');
      console.log('4. Envie um email de teste');
      console.log('5. Vá para "Logs" para ver o registro');
      return;
    }
    
    // 2. Verificar logs antes do envio
    console.log('\n📋 Passo 2: Verificando logs existentes...');
    const logsResponse = await axios.get('http://localhost:3000/api/logs', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const logsBefore = logsResponse.data.data || logsResponse.data;
    console.log(`📊 Logs existentes: ${logsBefore.length}`);
    
    // 3. Enviar email de teste
    console.log('\n📋 Passo 3: Enviando email de teste...');
    const emailData = {
      to: 'teste@exemplo.com',
      subject: 'Teste do Sistema de Logs - ' + new Date().toLocaleTimeString(),
      html: '<h1>Teste de Log</h1><p>Este é um email de teste para verificar o sistema de logs.</p><p>Enviado em: ' + new Date().toLocaleString('pt-BR') + '</p>',
      text: 'Teste de Log - Este é um email de teste para verificar o sistema de logs. Enviado em: ' + new Date().toLocaleString('pt-BR')
    };
    
    const emailResponse = await axios.post('http://localhost:3000/api/email/send', emailData, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Email enviado:', emailResponse.data.message);
    
    // 4. Verificar logs após o envio (aguardar um pouco)
    console.log('\n📋 Passo 4: Verificando logs após envio...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
    
    const logsAfterResponse = await axios.get('http://localhost:3000/api/logs?limit=10', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const logsAfter = logsAfterResponse.data.data || logsAfterResponse.data;
    console.log(`📊 Logs após envio: ${logsAfter.length}`);
    
    // 5. Mostrar o log mais recente
    if (logsAfter.length > 0) {
      const latestLog = logsAfter[0];
      console.log('\n🔍 Log mais recente:');
      console.log('   📧 Ação:', latestLog.action);
      console.log('   ✅ Status:', latestLog.status);
      console.log('   📅 Data:', new Date(latestLog.created_at).toLocaleString('pt-BR'));
      console.log('   📋 Detalhes:', JSON.stringify(latestLog.details, null, 2));
    }
    
    // 6. Verificar estatísticas de logs
    console.log('\n📋 Passo 5: Verificando estatísticas...');
    const statsResponse = await axios.get('http://localhost:3000/api/logs/stats', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const stats = statsResponse.data.stats;
    console.log('📊 Estatísticas de logs:');
    console.log('   📈 Total:', stats.total_logs);
    console.log('   ✅ Sucessos:', stats.by_status.sucesso || 0);
    console.log('   ❌ Erros:', stats.by_status.erro || 0);
    console.log('   📧 Envios diretos:', stats.by_action.envio_direto || 0);
    
    console.log('\n🎉 Teste do sistema de logs concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.response?.data || error.message);
  }
}

// Executar o teste
testLoggingSystem();