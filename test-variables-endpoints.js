// Script para testar endpoints de variáveis
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testVariablesEndpoints() {
  console.log('🧪 Testando endpoints de variáveis...\n');

  try {
    // 1. Testar se conseguimos fazer login
    console.log('1. Testando autenticação...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'comercial@empresa.com',
      password: '123456'
    });

    if (authError) {
      console.error('❌ Erro na autenticação:', authError.message);
      return;
    }

    console.log('✅ Autenticação OK');
    const token = authData.session.access_token;

    // 2. Testar se as tabelas existem
    console.log('\n2. Testando se tabelas existem...');
    
    const { data: tablesData, error: tablesError } = await supabase
      .from('custom_variables')
      .select('*')
      .limit(1);

    if (tablesError) {
      console.error('❌ Tabela custom_variables não existe:', tablesError.message);
      console.log('💡 Execute: CREATE_VARIABLES_BASIC.sql no Supabase');
      return;
    }

    console.log('✅ Tabela custom_variables existe');

    // 3. Testar endpoint via HTTP
    console.log('\n3. Testando endpoint HTTP...');
    
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3000/api/variables', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro no endpoint:', result.error);
      return;
    }

    console.log('✅ Endpoint /api/variables OK');
    console.log('📊 Dados retornados:', {
      success: result.success,
      count: result.data?.length || 0,
      first_variable: result.data?.[0]?.name || 'nenhuma'
    });

    // 4. Testar endpoint de datasets
    console.log('\n4. Testando endpoint de datasets...');
    
    const datasetsResponse = await fetch('http://localhost:3000/api/datasets', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const datasetsResult = await datasetsResponse.json();
    
    if (!datasetsResponse.ok) {
      console.error('❌ Erro no endpoint de datasets:', datasetsResult.error);
      return;
    }

    console.log('✅ Endpoint /api/datasets OK');
    console.log('📊 Datasets encontrados:', datasetsResult.data?.length || 0);

    console.log('\n🎉 Todos os testes passaram! O sistema deve funcionar.');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Verificar se node-fetch está instalado
try {
  require('node-fetch');
  testVariablesEndpoints();
} catch (e) {
  console.log('Instalando node-fetch...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2', { stdio: 'inherit' });
  testVariablesEndpoints();
}