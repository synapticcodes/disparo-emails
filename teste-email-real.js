#!/usr/bin/env node

/**
 * TESTE COM EMAIL REAL
 * Para confirmar se o problema são os endereços fictícios
 */

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testeEmailReal() {
  console.log('🧪 === TESTE COM EMAIL REAL ===\n');
  
  // SUBSTITUA POR UM EMAIL SEU REAL PARA TESTAR
  const emailTeste = 'SEU_EMAIL_AQUI@gmail.com'; // ← MUDE AQUI
  
  if (emailTeste.includes('SEU_EMAIL_AQUI')) {
    console.log('❌ Por favor, altere a variável emailTeste para seu email real no código');
    process.exit(1);
  }
  
  const mensagem = {
    to: emailTeste,
    from: 'avisos@lembretescredilly.com',
    subject: '🧪 TESTE - Confirmação SendGrid Funcionando',
    html: `
      <h2>✅ SendGrid Está Funcionando!</h2>
      <p>Se você recebeu este email, significa que:</p>
      <ul>
        <li>✅ SendGrid API está configurada corretamente</li>
        <li>✅ O problema dos agendamentos era os emails fictícios (@exemplo.com)</li>
        <li>✅ Seus emails reais serão entregues normalmente</li>
      </ul>
      <p><strong>Solução:</strong> Cadastre contatos com emails reais no sistema!</p>
      <hr>
      <small>Teste enviado em: ${new Date().toLocaleString('pt-BR')}</small>
    `
  };
  
  try {
    console.log(`📧 Enviando para: ${emailTeste}`);
    const result = await sgMail.send(mensagem);
    
    console.log('✅ ✅ ✅ EMAIL ENVIADO COM SUCESSO!');
    console.log(`📬 Message ID: ${result[0].headers['x-message-id']}`);
    console.log(`🎯 Status: ${result[0].statusCode} (Aceito pelo SendGrid)`);
    console.log('\n📱 Verifique sua caixa de entrada (e spam) agora!');
    console.log('\n🔧 CONCLUSÃO: O problema eram os emails fictícios (@exemplo.com)');
    
  } catch (error) {
    console.error('❌ Erro no envio:', error.message);
    if (error.response && error.response.body) {
      console.error('Detalhes:', error.response.body);
    }
  }
}

testeEmailReal();