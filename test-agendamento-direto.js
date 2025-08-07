#!/usr/bin/env node

/**
 * TESTE DIRETO - Simula exatamente o processamento de agendamento
 * Este script reproduz o mesmo código que o agendamento executa
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

// Configurar dependências
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Função para substituir variáveis (copiada do servidor)
function substituirVariaveis(template, variaveis) {
  let resultado = template;
  Object.keys(variaveis).forEach(chave => {
    const regex = new RegExp(`{{${chave}}}`, 'g');
    resultado = resultado.replace(regex, variaveis[chave]);
  });
  return resultado;
}

// Função para dividir array (copiada do servidor)
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function testAgendamento() {
  console.log('🔬 === TESTE DIRETO DE AGENDAMENTO ===');
  console.log('📅 Simulando exatamente o código de processamento...\n');

  try {
    // 1. Buscar campanha
    console.log('1️⃣ Buscando campanha...');
    const { data: campaign, error: campaignError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', 'c65cf035-860e-40af-8d93-3558a099467e')
      .single();

    if (campaignError) {
      console.error('❌ Erro ao buscar campanha:', campaignError);
      return;
    }

    console.log('✅ Campanha encontrada:', campaign.nome);
    console.log('   Segmentos:', JSON.stringify(campaign.segmentos));
    console.log('   Remetente:', campaign.remetente);
    console.log('   Assunto:', campaign.assunto);

    // 2. Buscar contatos
    console.log('\n2️⃣ Buscando contatos...');
    const { data: contacts, error: contactsError } = await supabase
      .from('contatos')
      .select('email, nome, id')
      .in('segmento_id', campaign.segmentos || [])
      .eq('user_id', campaign.user_id);

    if (contactsError) {
      console.error('❌ Erro ao buscar contatos:', contactsError);
      return;
    }

    console.log(`✅ Contatos encontrados: ${contacts?.length || 0}`);
    if (contacts && contacts.length > 0) {
      contacts.forEach(c => console.log(`   - ${c.email} (${c.nome || 'Sem nome'})`));
    } else {
      console.log('❌ PROBLEMA: Nenhum contato encontrado!');
      return;
    }

    // 3. Preparar mensagens
    console.log('\n3️⃣ Preparando mensagens...');
    const contactBatches = chunkArray(contacts, 1000);
    console.log(`   Dividido em ${contactBatches.length} batch(es)`);

    for (const batch of contactBatches) {
      console.log(`\n   📦 Processando batch de ${batch.length} contatos`);
      
      const messages = batch.map(contact => {
        const html = substituirVariaveis(campaign.template_html, {
          nome: contact.nome || contact.email.split('@')[0],
          email: contact.email
        });
        
        return {
          to: contact.email,
          from: campaign.remetente,
          subject: campaign.assunto,
          html: html,
          custom_args: {
            campaign_id: campaign.id,
            contact_id: contact.id,
            user_id: campaign.user_id
          }
        };
      });

      console.log(`   📧 Primeira mensagem:`);
      console.log(`      Para: ${messages[0].to}`);
      console.log(`      De: ${messages[0].from}`);
      console.log(`      Assunto: "${messages[0].subject}"`);
      console.log(`      HTML length: ${messages[0].html.length} caracteres`);

      // 4. TESTE CRÍTICO: Enviar via SendGrid
      console.log('\n4️⃣ 🚨 ENVIANDO VIA SENDGRID... (MOMENTO CRÍTICO)');
      
      try {
        console.log('🔍 ESTRUTURA COMPLETA DA MENSAGEM:');
        console.log(JSON.stringify(messages[0], null, 2));
        
        const sendResult = await sgMail.send(messages);
        console.log('✅ ✅ ✅ SENDGRID RESPONDEU COM SUCESSO!');
        console.log('🔍 RESPOSTA COMPLETA DO SENDGRID:');
        console.log(JSON.stringify(sendResult, null, 2));
        
        if (sendResult && sendResult[0]) {
          console.log(`   Status Code: ${sendResult[0].statusCode || 'undefined'}`);
          console.log(`   Headers:`, sendResult[0].headers || 'undefined');
          if (sendResult[0].headers && sendResult[0].headers['x-message-id']) {
            console.log(`   Message ID: ${sendResult[0].headers['x-message-id']}`);
          }
        }
        console.log('✅ ✅ ✅ EMAILS ENVIADOS COM SUCESSO!');
      } catch (sendError) {
        console.error('❌ ❌ ❌ ERRO NO SENDGRID:');
        console.error('   Código:', sendError.code);
        console.error('   Mensagem:', sendError.message);
        if (sendError.response && sendError.response.body) {
          console.error('   Detalhes:', JSON.stringify(sendError.response.body, null, 2));
        }
        return;
      }
    }

    // 5. Teste de atualização
    console.log('\n5️⃣ Testando atualização da campanha...');
    const { error: updateError } = await supabase
      .from('campanhas')
      .update({ 
        status: 'enviada',
        estatisticas: {
          sent_at: new Date().toISOString(),
          total_contacts: contacts.length,
          scheduled: true,
          test_direct: true
        }
      })
      .eq('id', campaign.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar campanha:', updateError);
    } else {
      console.log('✅ Campanha atualizada com sucesso!');
    }

    console.log('\n🎉 === TESTE COMPLETO ===');
    console.log('🎯 Se chegou até aqui, o agendamento DEVERIA funcionar!');
    console.log('📧 Verifique sua caixa de entrada para confirmar o recebimento');

  } catch (error) {
    console.error('\n💥 ERRO GERAL:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
if (require.main === module) {
  testAgendamento()
    .then(() => {
      console.log('\n🏁 Teste finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Teste falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { testAgendamento };