#!/usr/bin/env node

/**
 * Script para processar agendamentos manualmente
 * Use este script para executar agendamentos pendentes imediatamente
 */

require('dotenv').config();
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'sua-chave-secreta-aqui';

async function processSchedulesNow() {
  console.log(`🚀 Processando agendamentos pendentes...`);
  
  const postData = JSON.stringify({});
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/cron/process-scheduled',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': CRON_SECRET,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ Processamento concluído:');
            console.log(`   📊 Total de agendamentos: ${result.total || 0}`);
            console.log(`   ✅ Processados com sucesso: ${result.processed || 0}`);
            console.log(`   ❌ Erros: ${result.errors || 0}`);
            
            if (result.processed > 0) {
              console.log(`\n🎉 ${result.processed} campanha(s) enviada(s) com sucesso!`);
            } else {
              console.log(`\nℹ️  Nenhuma campanha agendada para envio no momento.`);
            }
            
            resolve(result);
          } else {
            throw new Error(`HTTP ${res.statusCode}: ${data}`);
          }
        } catch (error) {
          reject(new Error(`Erro ao processar resposta: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Erro na requisição: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  processSchedulesNow()
    .then(() => {
      console.log(`\n[${new Date().toISOString()}] ✅ Script executado com sucesso`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`\n[${new Date().toISOString()}] ❌ Script falhou:`, error.message);
      console.error('\n💡 Certifique-se de que:');
      console.error('   - O servidor está rodando (npm start)');
      console.error('   - A porta 3000 está disponível');
      console.error('   - As variáveis de ambiente estão configuradas');
      process.exit(1);
    });
}

module.exports = { processSchedulesNow };