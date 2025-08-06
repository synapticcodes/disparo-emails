const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function setupTagsTable() {
  try {
    console.log('🔧 Configurando tabela de tags...');
    
    // Verificar se as variáveis de ambiente estão carregadas
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_ANON_KEY são necessárias');
      console.log('Verifique se o arquivo .env existe com as configurações corretas');
      return;
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Testar conexão básica
    console.log('🔗 Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('contatos')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Erro na conexão com Supabase:', testError.message);
      return;
    }
    
    console.log('✅ Conexão com Supabase estabelecida');
    
    // Ler o arquivo SQL
    const sqlContent = fs.readFileSync('./create-tags-table.sql', 'utf8');
    
    // Executar cada comando SQL separadamente
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${sqlCommands.length} comandos SQL...`);
    
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command) {
        try {
          console.log(`Executando comando ${i + 1}/${sqlCommands.length}...`);
          
          // Para comandos que não retornam dados (DDL), usar rpc pode não funcionar
          // Vamos tentar executar diretamente
          const { error } = await supabase.rpc('exec_sql', { sql_query: command });
          
          if (error) {
            console.log(`⚠️ Comando ${i + 1} pode ter falhado (isso é normal para alguns comandos DDL):`, error.message);
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
          }
        } catch (err) {
          console.log(`⚠️ Erro no comando ${i + 1}:`, err.message);
        }
      }
    }
    
    // Verificar se a tabela foi criada
    console.log('🔍 Verificando se a tabela tags foi criada...');
    const { data: tagsData, error: tagsError } = await supabase
      .from('tags')
      .select('count', { count: 'exact', head: true });
    
    if (tagsError) {
      console.error('❌ Tabela tags não foi criada ou não está acessível:', tagsError.message);
      console.log('\n🚨 AÇÃO NECESSÁRIA:');
      console.log('Você precisa executar o SQL manualmente no painel do Supabase:');
      console.log('1. Acesse https://supabase.com/dashboard');
      console.log('2. Entre no seu projeto');
      console.log('3. Vá para "SQL Editor"');
      console.log('4. Cole e execute o conteúdo do arquivo create-tags-table.sql');
    } else {
      console.log('✅ Tabela tags criada e acessível!');
      
      // Criar algumas tags de exemplo
      console.log('🏷️ Criando tags de exemplo...');
      
      // Para isso, precisaríamos de um usuário autenticado
      // Por enquanto, vamos apenas confirmar que a estrutura está pronta
      console.log('📋 Estrutura da tabela tags está pronta para uso!');
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.log('\n🚨 SOLUÇÃO RECOMENDADA:');
    console.log('Execute manualmente o SQL no painel do Supabase:');
    console.log('1. Acesse https://supabase.com/dashboard');
    console.log('2. Entre no seu projeto');
    console.log('3. Vá para "SQL Editor"');
    console.log('4. Cole e execute o conteúdo do arquivo create-tags-table.sql');
  }
}

setupTagsTable();