#!/usr/bin/env node

/**
 * Testar dashboard com autenticação simulada
 */

require('dotenv').config();
const axios = require('axios');

async function testDashboardAuth() {
  console.log('🧪 === TESTE DASHBOARD COM AUTENTICAÇÃO ===\n');
  
  try {
    // Simular uma requisição como o frontend faz
    const response = await axios.get('http://localhost:3000/api/stats/dashboard?period=7', {
      headers: {
        'Authorization': 'Bearer fake-token-user-id-2ce3ae60-3656-411d-81b6-50a4eb62d482',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Resposta recebida!');
    console.log('📊 Status:', response.status);
    console.log('📈 Source:', response.data.source);
    console.log('📅 Period:', response.data.period_days, 'dias');
    
    console.log('\n📊 OVERVIEW:');
    Object.entries(response.data.overview || {}).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n📈 SENDGRID METRICS:');
    Object.entries(response.data.sendgrid_metrics || {}).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🎯 PERFORMANCE:');
    Object.entries(response.data.performance || {}).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}%`);
    });
    
    // Dados para gráficos
    const chartData = {
      emails: [
        response.data.sendgrid_metrics?.requests || 0,
        response.data.sendgrid_metrics?.delivered || 0,  
        response.data.sendgrid_metrics?.unique_opens || 0,
        response.data.sendgrid_metrics?.unique_clicks || 0,
        response.data.sendgrid_metrics?.bounces || 0
      ]
    };
    
    console.log('\n📊 DADOS PARA GRÁFICO:');
    console.log('   Labels: ["Enviados", "Entregues", "Abertos", "Clicados", "Bounces"]');
    console.log('   Data:', chartData.emails);
    
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    return null;
  }
}

testDashboardAuth();