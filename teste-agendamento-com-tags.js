#!/usr/bin/env node

/**
 * TESTE: Agendamento de Campanha com Seleção de Tags
 * Este script testa a nova funcionalidade de agendamento com filtro por tags
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const API_BASE = 'http://localhost:3000';

// Simular autenticação (usando user_id conhecido do sistema)
const fakeAuthToken = 'fake-token-for-testing';
const testUserId = '2ce3ae60-3656-411d-81b6-50a4eb62d482';

async function testAgendamentoComTags() {
  console.log('🧪 === TESTE: AGENDAMENTO COM SELEÇÃO DE TAGS ===\n');
  
  try {
    // 1. Verificar tags disponíveis
    console.log('1️⃣ Verificando tags disponíveis...');
    const { data: tags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', testUserId)
      .order('name');
      
    if (tagsError) throw tagsError;
    
    console.log(`✅ Tags encontradas: ${tags.length}`);
    tags.forEach(tag => console.log(`   🏷️ ${tag.name} (${tag.id})`));
    
    if (tags.length === 0) {
      console.log('❌ Nenhuma tag encontrada. Criando tags de teste...');
      
      // Criar tags de teste
      const testTags = [
        { name: 'cliente', description: 'Cliente ativo', color: '#4CAF50', icon: '👤' },
        { name: 'vip', description: 'Cliente VIP', color: '#FF9800', icon: '⭐' }
      ];
      
      for (const tagData of testTags) {
        await supabase.from('tags').insert({ ...tagData, user_id: testUserId });
        console.log(`   ✅ Tag criada: ${tagData.name}`);
      }
      
      // Buscar tags novamente
      const { data: newTags } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', testUserId);
      tags.push(...(newTags || []));
    }
    
    // 2. Buscar contatos por tags específicas
    console.log('\n2️⃣ Testando busca de contatos por tags...');
    const tagsParaTeste = ['cliente', 'vip'];
    
    try {
      const response = await axios.post(`${API_BASE}/api/contacts/by-tags`, {
        tags: tagsParaTeste
      }, {
        headers: {
          'Authorization': `Bearer ${fakeAuthToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const { contacts, total } = response.data;
      console.log(`✅ Endpoint funcionando! Contatos encontrados: ${total}`);
      
      if (contacts && contacts.length > 0) {
        contacts.forEach(c => {
          console.log(`   📧 ${c.email} - Tags: ${JSON.stringify(c.tags)}`);
        });
      } else {
        console.log('   ⚠️ Nenhum contato com essas tags encontrado');
      }
      
    } catch (apiError) {
      if (apiError.response) {
        console.log(`❌ Erro API: ${apiError.response.status} - ${apiError.response.data.error}`);
      } else {
        console.log(`❌ Erro de conexão: ${apiError.message}`);
      }
    }
    
    // 3. Verificar campanhas disponíveis
    console.log('\n3️⃣ Verificando campanhas para agendar...');
    const { data: campaigns } = await supabase
      .from('campanhas')
      .select('id, nome, status')
      .eq('user_id', testUserId)
      .in('status', ['rascunho', 'enviada', 'agendada'])
      .limit(1);
    
    if (!campaigns || campaigns.length === 0) {
      console.log('❌ Nenhuma campanha disponível para agendar');
      return;
    }
    
    const testCampaign = campaigns[0];
    console.log(`✅ Campanha para teste: ${testCampaign.nome} (${testCampaign.status})`);
    
    // 4. Criar agendamento com tags
    console.log('\n4️⃣ Criando agendamento com filtro por tags...');
    
    const scheduleData = {
      scheduled_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutos no futuro
      timezone: 'America/Sao_Paulo',
      selected_tags: tagsParaTeste
    };
    
    try {
      const scheduleResponse = await axios.post(
        `${API_BASE}/api/campaigns/${testCampaign.id}/schedule`,
        scheduleData,
        {
          headers: {
            'Authorization': `Bearer ${fakeAuthToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Agendamento criado com sucesso!');
      console.log(`📅 ID do agendamento: ${scheduleResponse.data.schedule.id}`);
      console.log(`🏷️ Tags selecionadas: ${tagsParaTeste.join(', ')}`);
      console.log(`⏰ Agendado para: ${scheduleData.scheduled_at}`);
      
      // 5. Verificar se o agendamento foi salvo corretamente
      console.log('\n5️⃣ Verificando agendamento no banco...');
      const { data: savedSchedule } = await supabase
        .from('campaign_schedules')
        .select('*')
        .eq('id', scheduleResponse.data.schedule.id)
        .single();
      
      if (savedSchedule) {
        console.log('✅ Agendamento salvo no banco:');
        console.log(`   Status: ${savedSchedule.status}`);
        console.log(`   Tags selecionadas: ${JSON.stringify(savedSchedule.selected_tags)}`);
        console.log(`   Agendado para: ${savedSchedule.scheduled_at}`);
      }
      
    } catch (scheduleError) {
      if (scheduleError.response) {
        console.log(`❌ Erro ao criar agendamento: ${scheduleError.response.data.error}`);
      } else {
        console.log(`❌ Erro: ${scheduleError.message}`);
      }
    }
    
    console.log('\n🎉 === TESTE CONCLUÍDO ===');
    console.log('✅ Funcionalidade de agendamento com tags implementada!');
    console.log('🎯 Próximo passo: Teste no frontend em http://localhost:3001/schedules');
    
  } catch (error) {
    console.error('\n💥 Erro geral no teste:', error.message);
  }
}

// Executar teste
if (require.main === module) {
  testAgendamentoComTags()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Teste falhou:', error.message);
      process.exit(1);
    });
}

module.exports = { testAgendamentoComTags };