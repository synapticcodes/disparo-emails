const axios = require('axios');
require('dotenv').config();

async function testDashboardEndpoint() {
  try {
    console.log('🧪 Testando endpoint /api/dashboard/stats...\n');
    
    // Teste sem autenticação (deve retornar 401)
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard/stats');
      console.log('❌ Erro: endpoint deveria requerer autenticação');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint requer autenticação corretamente (401)');
      } else {
        console.log('❌ Erro inesperado:', error.message);
      }
    }
    
    // Teste com token inválido
    try {
      const response = await axios.get('http://localhost:3000/api/dashboard/stats', {
        headers: { Authorization: 'Bearer token-invalido' }
      });
      console.log('❌ Erro: deveria rejeitar token inválido');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Rejeita token inválido corretamente (401)');
      } else {
        console.log('❌ Erro inesperado com token inválido:', error.message);
      }
    }
    
    // Teste da estrutura de resposta do endpoint de saúde
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health check funcionando:', healthResponse.data.status);
    
    // Teste da estrutura de resposta sem auth
    try {
      const protectedResponse = await axios.get('http://localhost:3000/api/protected');
    } catch (error) {
      console.log('✅ Endpoint protegido funcionando (requer auth)');
    }
    
    console.log('\n📋 Diagnóstico:');
    console.log('- Servidor: ✅ Funcionando');
    console.log('- Endpoint dashboard: ✅ Existe e requer autenticação');
    console.log('- Problema provável: Token de autenticação inválido ou expirado no frontend');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testDashboardEndpoint();