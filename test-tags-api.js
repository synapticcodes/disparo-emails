const axios = require('axios');
require('dotenv').config();

async function testTagsAPI() {
  try {
    console.log('🧪 Testando API de Tags...');
    
    const API_BASE_URL = 'http://localhost:3000';
    
    // Primeiro, vamos testar se o servidor está rodando
    console.log('1. Testando health check...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Servidor está rodando:', healthResponse.data.message);
    
    // Vamos simular uma requisição sem autenticação para ver a resposta
    console.log('2. Testando endpoint /api/tags sem autenticação...');
    try {
      await axios.get(`${API_BASE_URL}/api/tags`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint protegido corretamente (401 - Token necessário)');
      } else {
        console.log('❌ Erro inesperado:', error.response?.data || error.message);
      }
    }
    
    console.log('\n📋 Para testar completamente a API, você precisa:');
    console.log('1. Fazer login no frontend para obter um token');
    console.log('2. O token será automaticamente incluído nas requisições do frontend');
    console.log('3. Acesse http://localhost:3001/tags (assumindo que o frontend está na porta 3001)');
    
    console.log('\n🔧 Próximos passos:');
    console.log('1. Certifique-se de que o frontend está rodando');
    console.log('2. Faça login no sistema');
    console.log('3. Acesse a página Tags');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🚨 O servidor não está rodando!');
      console.log('Execute: npm start');
    }
  }
}

testTagsAPI();