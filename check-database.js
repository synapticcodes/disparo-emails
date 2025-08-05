require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function checkDatabase() {
  console.log('🗄️  Verificando estrutura do banco de dados...\n')
  
  const tables = ['logs', 'contatos', 'templates', 'campanhas', 'suppressions', 'schedules', 'security_events']
  
  for (const table of tables) {
    try {
      console.log(`Verificando tabela: ${table}`)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ Tabela ${table}: ${error.message}`)
      } else {
        console.log(`✅ Tabela ${table}: OK`)
      }
    } catch (err) {
      console.log(`❌ Erro ao verificar ${table}: ${err.message}`)
    }
  }
  
  console.log('\n🔧 Se alguma tabela não existe, execute o script SQL no Supabase Dashboard:')
  console.log('https://supabase.com/dashboard/project/ixroiuhpvsljxeynfrqz/sql')
}

checkDatabase()