const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testEmailSend() {
  try {
    // Fazer login para obter token
    console.log('1. Fazendo login...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'teste@dashboard.app',
      password: 'dashboard123'
    });

    if (authError) {
      console.error('Erro no login:', authError);
      return;
    }

    console.log('✅ Login realizado com sucesso');
    console.log('Token:', authData.session.access_token.substring(0, 50) + '...');

    // Testar envio de email
    console.log('\n2. Testando envio de email...');
    
    const emailData = {
      to: 'teste@example.com',
      subject: 'Teste de Email - Sistema',
      html: '<h1>Teste</h1><p>Este é um email de teste do sistema.</p>'
    };

    const response = await axios.post('http://localhost:3000/api/email/send', emailData, {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Email enviado com sucesso!');
    console.log('Resposta:', response.data);

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    }
  }
}

testEmailSend();