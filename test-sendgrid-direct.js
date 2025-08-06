const sgMail = require('@sendgrid/mail');
require('dotenv').config();

// Test SendGrid API key directly
async function testSendGrid() {
  try {
    console.log('🔑 Testing SendGrid API key...');
    console.log('API Key:', process.env.SENDGRID_API_KEY ? 'Present' : 'Missing');
    
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: 'test@example.com',
      from: 'avisos@lembretescredilly.com', // Sender verificado
      subject: 'SendGrid Test',
      text: 'Testing SendGrid API directly',
      html: '<p>Testing SendGrid API directly</p>'
    };

    console.log('📧 Sending test email...');
    const response = await sgMail.send(msg);
    
    console.log('✅ SendGrid test successful!');
    console.log('Response:', response[0].statusCode);
    
  } catch (error) {
    console.error('❌ SendGrid error:', error.response?.body || error.message);
    if (error.response?.body?.errors) {
      console.error('Detailed errors:', error.response.body.errors);
    }
  }
}

testSendGrid();