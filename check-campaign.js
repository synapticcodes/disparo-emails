const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const checkCampaignData = async () => {
  console.log('=== VERIFICAÇÃO COMPLETA DA CAMPANHA ===');
  
  const { data: campaign, error } = await supabase
    .from('campanhas')
    .select('*')
    .eq('id', 'c65cf035-860e-40af-8d93-3558a099467e')
    .single();
    
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log('📋 DADOS DA CAMPANHA:');
  console.log(`   Nome: ${campaign.nome || '❌ NÃO DEFINIDO'}`);
  console.log(`   Assunto: ${campaign.assunto || '❌ NÃO DEFINIDO'}`);
  console.log(`   Remetente: ${campaign.remetente || '❌ NÃO DEFINIDO'}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Segmentos: ${JSON.stringify(campaign.segmentos) || '❌ NÃO DEFINIDO'}`);
  console.log(`   Template HTML: ${campaign.template_html ? '✅ DEFINIDO (' + campaign.template_html.length + ' chars)' : '❌ NÃO DEFINIDO'}`);
  
  console.log('\n🔍 CAMPOS OBRIGATÓRIOS PARA SENDGRID:');
  console.log(`   Remetente (from): ${campaign.remetente ? '✅ OK' : '❌ FALTANDO'}`);
  console.log(`   Assunto (subject): ${campaign.assunto ? '✅ OK' : '❌ FALTANDO'}`);
  console.log(`   Conteúdo (html): ${campaign.template_html ? '✅ OK' : '❌ FALTANDO'}`);
  
  console.log('\n⚠️  PROBLEMAS IDENTIFICADOS:');
  const problems = [];
  if (!campaign.assunto) problems.push('Assunto não configurado');
  if (!campaign.remetente) problems.push('Remetente não configurado');  
  if (!campaign.template_html) problems.push('Template HTML não configurado');
  if (!campaign.segmentos || campaign.segmentos.length === 0) problems.push('Nenhum segmento configurado');
  
  if (problems.length === 0) {
    console.log('   ✅ Nenhum problema encontrado!');
  } else {
    problems.forEach(p => console.log(`   ❌ ${p}`));
  }
  
  // Verificar último agendamento
  console.log('\n📅 ÚLTIMO AGENDAMENTO:');
  const { data: lastSchedule } = await supabase
    .from('campaign_schedules')
    .select('*')
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (lastSchedule && lastSchedule.length > 0) {
    const schedule = lastSchedule[0];
    console.log(`   ID: ${schedule.id}`);
    console.log(`   Status: ${schedule.status}`);
    console.log(`   Agendado para: ${schedule.scheduled_at}`);
    console.log(`   Executado em: ${schedule.executed_at || 'Não executado'}`);
    console.log(`   Erro: ${schedule.error_message || 'Nenhum'}`);
  }
};

checkCampaignData();