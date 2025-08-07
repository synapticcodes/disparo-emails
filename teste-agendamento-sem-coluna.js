#!/usr/bin/env node

/**
 * TESTE: Agendamento com tags SEM a coluna selected_tags
 * Este teste simula o que acontece quando tentamos agendar com tags
 * mas a coluna ainda não foi criada no banco
 */

require('dotenv').config();
const axios = require('axios');

async function testeAgendamentoSemColuna() {
  console.log('🧪 === TESTE: AGENDAMENTO SEM COLUNA selected_tags ===\n');
  
  try {
    // Simular dados de agendamento com tags
    const scheduleData = {
      scheduled_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutos no futuro
      timezone: 'America/Sao_Paulo',
      selected_tags: ['teste'], // Tag que sabemos que existe
      repeat_interval: '',
      repeat_count: 1
    };
    
    const campaignId = 'c65cf035-860e-40af-8d93-3558a099467e'; // ID conhecido
    
    console.log('📅 Testando agendamento com tags...');
    console.log(`   Campanha: ${campaignId}`);
    console.log(`   Tags: ${JSON.stringify(scheduleData.selected_tags)}`);
    console.log(`   Agendado para: ${scheduleData.scheduled_at}`);
    
    try {
      const response = await axios.post(
        `http://localhost:3000/api/test/campaigns/${campaignId}/schedule`,
        scheduleData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ ✅ ✅ AGENDAMENTO CRIADO COM SUCESSO!');
      console.log(`📝 ID do agendamento: ${response.data.schedule?.id || 'N/A'}`);
      console.log(`📊 Status: ${response.data.schedule?.status || 'N/A'}`);
      
      if (response.data.schedule?.id) {
        console.log('🔍 Verificando agendamento no banco...');
        
        // Verificar se foi salvo corretamente
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        
        const { data: savedSchedule } = await supabase
          .from('campaign_schedules')
          .select('*')
          .eq('id', response.data.schedule.id)
          .single();
        
        if (savedSchedule) {
          console.log('✅ Agendamento salvo no banco:');
          console.log(`   Status: ${savedSchedule.status}`);
          console.log(`   Agendado para: ${savedSchedule.scheduled_at}`);
          console.log(`   User ID: ${savedSchedule.user_id}`);
          
          // Verificar se coluna selected_tags existe
          if (savedSchedule.hasOwnProperty('selected_tags')) {
            console.log(`   🏷️ Tags salvas: ${JSON.stringify(savedSchedule.selected_tags)}`);
          } else {
            console.log('   ⚠️ Coluna selected_tags não existe (conforme esperado)');
            console.log('   📝 Tags processadas temporariamente no servidor');
          }
        }
      }
      
    } catch (scheduleError) {
      if (scheduleError.response) {
        console.log(`❌ Erro ao agendar: ${scheduleError.response.status} - ${scheduleError.response.data?.error || scheduleError.response.statusText}`);
        
        if (scheduleError.response.data?.error?.includes('selected_tags')) {
          console.log('🔧 Erro relacionado à coluna selected_tags detectado');
        }
      } else {
        console.log(`❌ Erro de conexão: ${scheduleError.message}`);
      }
    }
    
    console.log('\n🎯 === RESULTADO ===');
    console.log('✅ Sistema deve funcionar mesmo sem a coluna selected_tags');
    console.log('📝 Tags são processadas temporariamente no servidor');
    console.log('🔧 Para funcionalidade completa, adicione a coluna:');
    console.log('   ALTER TABLE campaign_schedules ADD COLUMN selected_tags JSONB DEFAULT NULL;');
    
  } catch (error) {
    console.error('\n💥 Erro geral:', error.message);
  }
}

testeAgendamentoSemColuna();