#!/usr/bin/env node

/**
 * Teste direto das métricas SendGrid
 */

require('dotenv').config();
const client = require('@sendgrid/client');

// Configurar cliente
client.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGridStats() {
  console.log('🧪 === TESTE DIRETO DAS MÉTRICAS SENDGRID ===\n');
  
  try {
    // Calcular datas dos últimos 7 dias
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📅 Período: ${startDateStr} até ${endDateStr}\n`);

    // 1. Estatísticas globais
    console.log('1. 📊 ESTATÍSTICAS GLOBAIS');
    try {
      const request = {
        url: `/v3/stats?start_date=${startDateStr}&end_date=${endDateStr}&limit=10`,
        method: 'GET',
      };

      const [response] = await client.request(request);
      
      console.log('✅ Resposta recebida do SendGrid');
      console.log(`📦 Tipo de resposta: ${Array.isArray(response.body) ? 'Array' : typeof response.body}`);
      console.log(`📈 Total de grupos de stats: ${response.body?.length || 0}`);
      
      // Processar estatísticas
      let totalStats = {
        requests: 0,
        delivered: 0,
        opens: 0,
        unique_opens: 0,
        clicks: 0,
        unique_clicks: 0,
        bounces: 0,
        spam_reports: 0,
        unsubscribes: 0
      };

      if (response.body && Array.isArray(response.body)) {
        response.body.forEach((statGroup, index) => {
          console.log(`\n📊 Grupo ${index + 1}:`);
          console.log(`   Data: ${statGroup.date}`);
          console.log(`   Stats: ${statGroup.stats?.length || 0} entradas`);
          
          if (statGroup.stats && Array.isArray(statGroup.stats)) {
            statGroup.stats.forEach((stat, statIndex) => {
              console.log(`   Stat ${statIndex + 1}:`, stat.metrics);
              
              totalStats.requests += stat.metrics?.requests || 0;
              totalStats.delivered += stat.metrics?.delivered || 0;
              totalStats.opens += stat.metrics?.opens || 0;
              totalStats.unique_opens += stat.metrics?.unique_opens || 0;
              totalStats.clicks += stat.metrics?.clicks || 0;
              totalStats.unique_clicks += stat.metrics?.unique_clicks || 0;
              totalStats.bounces += stat.metrics?.bounces || 0;
              totalStats.spam_reports += stat.metrics?.spam_reports || 0;
              totalStats.unsubscribes += stat.metrics?.unsubscribes || 0;
            });
          }
        });
      }
      
      console.log('\n📈 TOTAIS CALCULADOS:');
      console.log(`   📧 Requests: ${totalStats.requests.toLocaleString()}`);
      console.log(`   ✅ Delivered: ${totalStats.delivered.toLocaleString()}`);
      console.log(`   👁️ Opens: ${totalStats.opens.toLocaleString()}`);
      console.log(`   👁️ Unique Opens: ${totalStats.unique_opens.toLocaleString()}`);
      console.log(`   🖱️ Clicks: ${totalStats.clicks.toLocaleString()}`);
      console.log(`   🖱️ Unique Clicks: ${totalStats.unique_clicks.toLocaleString()}`);
      console.log(`   ⚠️ Bounces: ${totalStats.bounces.toLocaleString()}`);
      console.log(`   🚫 Spam Reports: ${totalStats.spam_reports.toLocaleString()}`);
      console.log(`   🔕 Unsubscribes: ${totalStats.unsubscribes.toLocaleString()}`);
      
      // Calcular taxas
      const deliveryRate = totalStats.requests > 0 ? ((totalStats.delivered / totalStats.requests) * 100).toFixed(2) : '0.00';
      const openRate = totalStats.delivered > 0 ? ((totalStats.unique_opens / totalStats.delivered) * 100).toFixed(2) : '0.00';
      const clickRate = totalStats.delivered > 0 ? ((totalStats.unique_clicks / totalStats.delivered) * 100).toFixed(2) : '0.00';
      const bounceRate = totalStats.requests > 0 ? ((totalStats.bounces / totalStats.requests) * 100).toFixed(2) : '0.00';
      
      console.log('\n📊 TAXAS DE PERFORMANCE:');
      console.log(`   📈 Taxa de Entrega: ${deliveryRate}%`);
      console.log(`   👁️ Taxa de Abertura: ${openRate}%`);
      console.log(`   🖱️ Taxa de Clique: ${clickRate}%`);
      console.log(`   ⚠️ Taxa de Bounce: ${bounceRate}%`);
      
    } catch (error) {
      console.error('❌ Erro nas estatísticas globais:', error.message);
    }

    console.log('\n2. 🚫 SUPRESSÕES (Bounces)');
    try {
      const [response] = await client.request({
        url: '/v3/suppression/bounces?limit=10',
        method: 'GET',
      });
      
      const bounces = response.body || [];
      console.log(`✅ ${bounces.length} bounces encontrados`);
      
      if (bounces.length > 0) {
        console.log('📋 Primeiros bounces:');
        bounces.slice(0, 3).forEach((bounce, index) => {
          console.log(`   ${index + 1}. ${bounce.email} - ${bounce.reason} (${bounce.created})`);
        });
      }
      
    } catch (error) {
      console.error('❌ Erro nas supressões:', error.message);
    }

  } catch (error) {
    console.error('💥 Erro geral:', error.message);
  }
}

testSendGridStats();