const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugTagsError() {
  try {
    console.log('🔍 Debugando erro na página de Tags...');
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // 1. Verificar se a tabela tags existe e está acessível
    console.log('1. Verificando estrutura da tabela tags...');
    
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro ao acessar tabela tags:', error.message);
        console.log('Código do erro:', error.code);
        console.log('Detalhes:', error.details);
        
        if (error.code === 'PGRST116') {
          console.log('\n🚨 PROBLEMA IDENTIFICADO:');
          console.log('A tabela "tags" não existe no esquema público ou não está acessível.');
          console.log('\n🔧 SOLUÇÃO:');
          console.log('Execute o SQL manualmente no painel do Supabase:');
          console.log('1. Acesse https://supabase.com/dashboard');
          console.log('2. Entre no seu projeto');
          console.log('3. Vá para "SQL Editor"');
          console.log('4. Cole e execute o conteúdo do arquivo create-tags-table.sql');
        }
        
      } else {
        console.log('✅ Tabela tags acessível');
        console.log('Dados retornados:', data);
      }
      
    } catch (err) {
      console.error('❌ Erro na consulta:', err.message);
    }
    
    // 2. Verificar se a tabela contatos existe (para comparação)
    console.log('\n2. Verificando tabela contatos (para comparação)...');
    
    try {
      const { data, error } = await supabase
        .from('contatos')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('❌ Erro ao acessar tabela contatos:', error.message);
      } else {
        console.log('✅ Tabela contatos acessível');
      }
      
    } catch (err) {
      console.error('❌ Erro na consulta contatos:', err.message);
    }
    
    // 3. Listar todas as tabelas disponíveis
    console.log('\n3. Verificando tabelas disponíveis...');
    
    try {
      // Esta consulta pode não funcionar sem autenticação adequada
      const { data, error } = await supabase
        .rpc('get_tables'); // Esta função pode não existir
      
      if (error) {
        console.log('ℹ️ Não foi possível listar tabelas (normal em alguns casos)');
      } else {
        console.log('Tabelas disponíveis:', data);
      }
      
    } catch (err) {
      console.log('ℹ️ Listagem de tabelas não disponível via API');
    }
    
    console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
    console.log('- Se a tabela tags mostrou erro PGRST116, ela não existe');
    console.log('- Se mostrou erro de autenticação, a tabela existe mas precisa de RLS configurado');
    console.log('- Se mostrou dados, a tabela está funcionando corretamente');
    
    console.log('\n🚀 PRÓXIMAS AÇÕES:');
    console.log('1. Execute o SQL create-tags-table.sql no painel do Supabase');
    console.log('2. Certifique-se de que as políticas RLS estão criadas');
    console.log('3. Reinicie o frontend e teste novamente');
    
  } catch (error) {
    console.error('❌ Erro geral no debug:', error.message);
  }
}

debugTagsError();