#!/usr/bin/env node

/**
 * SCRIPT PARA ADICIONAR CONTATOS COM EMAILS REAIS
 * Use este script para testar o sistema com emails que realmente existem
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function adicionarContatosReais() {
  console.log('📧 === ADICIONAR CONTATOS COM EMAILS REAIS ===\n');
  
  // SUBSTITUA PELOS SEUS EMAILS REAIS PARA TESTE
  const contatosReais = [
    {
      nome: 'Seu Nome',
      email: 'SEU_EMAIL@gmail.com', // ← MUDE AQUI
      telefone: '(11) 99999-9999'
    },
    {
      nome: 'Email Teste 2', 
      email: 'OUTRO_EMAIL@gmail.com', // ← OPCIONAL: segundo email
      telefone: '(11) 88888-8888'
    }
  ];
  
  // Verificar se emails foram alterados
  const emailsExemplo = contatosReais.filter(c => 
    c.email.includes('SEU_EMAIL') || c.email.includes('OUTRO_EMAIL')
  );
  
  if (emailsExemplo.length > 0) {
    console.log('❌ Por favor, altere os emails no array contatosReais para seus emails reais');
    console.log('   Edite o arquivo:', __filename);
    process.exit(1);
  }
  
  try {
    // 1. Buscar o primeiro segmento disponível
    console.log('1️⃣ Buscando segmentos disponíveis...');
    const { data: segmentos, error: segmentosError } = await supabase
      .from('segmentos')
      .select('*')
      .limit(1);
      
    if (segmentosError || !segmentos || segmentos.length === 0) {
      console.log('❌ Nenhum segmento encontrado. Criando um novo...');
      
      // Criar segmento de teste
      const { data: novoSegmento, error: criarSegmentoError } = await supabase
        .from('segmentos')
        .insert({
          nome: 'Emails Reais - Teste',
          descricao: 'Segmento para testar com emails reais',
          user_id: '2ce3ae60-3656-411d-81b6-50a4eb62d482' // User ID padrão do sistema
        })
        .select()
        .single();
        
      if (criarSegmentoError) {
        console.error('❌ Erro ao criar segmento:', criarSegmentoError);
        process.exit(1);
      }
      
      console.log('✅ Segmento criado:', novoSegmento.nome);
      segmentos[0] = novoSegmento;
    }
    
    const segmento = segmentos[0];
    console.log(`✅ Usando segmento: ${segmento.nome}`);
    
    // 2. Adicionar contatos
    console.log('\n2️⃣ Adicionando contatos reais...');
    
    for (const contato of contatosReais) {
      console.log(`   📧 Adicionando: ${contato.email}`);
      
      const { error: contatoError } = await supabase
        .from('contatos')
        .insert({
          nome: contato.nome,
          email: contato.email,
          telefone: contato.telefone,
          segmento_id: segmento.id,
          user_id: '2ce3ae60-3656-411d-81b6-50a4eb62d482'
        });
        
      if (contatoError) {
        if (contatoError.code === '23505') {
          console.log(`   ⚠️  Email ${contato.email} já existe, pulando...`);
        } else {
          console.error(`   ❌ Erro ao adicionar ${contato.email}:`, contatoError.message);
        }
      } else {
        console.log(`   ✅ ${contato.email} adicionado com sucesso`);
      }
    }
    
    // 3. Verificar contatos adicionados
    console.log('\n3️⃣ Verificando contatos no segmento...');
    const { data: contatosSegmento } = await supabase
      .from('contatos')
      .select('nome, email')
      .eq('segmento_id', segmento.id);
      
    console.log(`✅ Total de contatos no segmento "${segmento.nome}": ${contatosSegmento?.length || 0}`);
    contatosSegmento?.forEach(c => console.log(`   📧 ${c.email} (${c.nome})`));
    
    console.log('\n🎉 === CONCLUÍDO ===');
    console.log('✅ Contatos reais adicionados com sucesso!');
    console.log('🧪 Agora você pode testar o agendamento com emails reais');
    console.log(`📝 Segmento: ${segmento.nome} (ID: ${segmento.id})`);
    console.log('\n🚀 Próximos passos:');
    console.log('   1. Crie uma campanha usando este segmento');
    console.log('   2. Agende para envio imediato');
    console.log('   3. Verifique sua caixa de entrada!');
    
  } catch (error) {
    console.error('\n💥 Erro geral:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  adicionarContatosReais()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Script falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { adicionarContatosReais };