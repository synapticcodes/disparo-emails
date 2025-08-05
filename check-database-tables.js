const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDatabaseTables() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  console.log('🔍 Verificando tabelas do banco de dados...\n');
  
  const tablesToCheck = [
    'contatos',
    'templates', 
    'campanhas',
    'segmentos',
    'logs',
    'suppressions',
    'schedules',
    'security_events',
    'email_statistics'
  ];
  
  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
        
      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`❌ ${tableName}: Tabela NÃO existe`);
        } else {
          console.log(`⚠️  ${tableName}: Erro - ${error.message}`);
        }
      } else {
        console.log(`✅ ${tableName}: Tabela existe (${data ? data.length : 0} registros encontrados)`);
      }
    } catch (e) {
      console.log(`❌ ${tableName}: Erro inesperado - ${e.message}`);
    }
  }
  
  console.log('\n📋 Diagnóstico das tabelas concluído!');
  console.log('\n💡 Se alguma tabela não existe, execute o SQL em EXECUTE_THIS_SQL_NO_RLS.md');
}

checkDatabaseTables();