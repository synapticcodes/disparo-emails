#!/usr/bin/env node

/**
 * DEBUG: Verificar por que as tags não carregam no frontend
 */

const axios = require('axios');

async function debugTagsEndpoint() {
  console.log('🔍 === DEBUG: ENDPOINT DE TAGS ===\n');
  
  try {
    // 1. Testar endpoint sem autenticação (deve dar erro)
    console.log('1️⃣ Testando /api/tags sem autenticação...');
    try {
      const response = await axios.get('http://localhost:3000/api/tags');
      console.log('✅ Resposta:', response.data);
    } catch (error) {
      console.log(`❌ Erro esperado: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    }
    
    // 2. Testar endpoint de teste (funcionando)
    console.log('\n2️⃣ Testando /api/test/tags (funciona)...');
    try {
      const response = await axios.get('http://localhost:3000/api/test/tags');
      console.log(`✅ Tags encontradas: ${response.data?.length || 0}`);
      response.data?.forEach(tag => console.log(`   🏷️ ${tag.name} (${tag.id})`));
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
    
    // 3. Verificar estrutura de resposta
    console.log('\n3️⃣ Estrutura esperada pelo frontend:');
    console.log('Frontend espera: Array direto ou { data: Array }');
    console.log('Backend retorna: { success: true, data: Array }');
    
    console.log('\n4️⃣ Solução:');
    console.log('- ✅ Já corrigido no frontend (Schedules.js linha 49)');
    console.log('- ✅ tagsData = tagsRes.data.data || tagsRes.data || []');
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

debugTagsEndpoint();