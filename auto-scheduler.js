#!/usr/bin/env node

/**
 * Auto Scheduler - Processador automático de agendamentos
 * Este script executa continuamente e processa agendamentos a cada 2 minutos
 */

require('dotenv').config();
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'sua-chave-secreta-aqui';
const INTERVAL_MINUTES = 2; // Processar a cada 2 minutos

let isProcessing = false;

async function processSchedules() {
  if (isProcessing) {
    console.log(`[${new Date().toISOString()}] ⏳ Processamento já em andamento, pulando...`);
    return;
  }

  isProcessing = true;
  
  try {
    console.log(`[${new Date().toISOString()}] 🔄 Verificando agendamentos pendentes...`);
    
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
      },
      timeout: 30000 // 30s timeout
    };

    const result = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (res.statusCode === 200) {
              resolve(result);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error(`Erro ao processar resposta: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Erro na requisição: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout na requisição'));
      });

      req.write(postData);
      req.end();
    });

    if (result.processed > 0) {
      console.log(`[${new Date().toISOString()}] ✅ ${result.processed} campanha(s) processada(s) com sucesso!`);
      console.log(`   📊 Total: ${result.total}, Erros: ${result.errors}`);
    } else if (result.total === 0) {
      console.log(`[${new Date().toISOString()}] ℹ️  Nenhum agendamento pendente`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Erro no processamento:`, error.message);
    
    // Se servidor não estiver rodando, aguardar mais tempo
    if (error.message.includes('ECONNREFUSED')) {
      console.log(`[${new Date().toISOString()}] 🔄 Servidor pode estar desligado, tentando novamente em ${INTERVAL_MINUTES * 2} minutos...`);
      return; // Não parar o script
    }
  } finally {
    isProcessing = false;
  }
}

function startAutoScheduler() {
  console.log(`🚀 Auto Scheduler iniciado!`);
  console.log(`⏰ Processando agendamentos a cada ${INTERVAL_MINUTES} minutos`);
  console.log(`🔗 API: ${API_URL}`);
  console.log(`📝 Para parar: Ctrl+C`);
  console.log(`${'='.repeat(50)}\n`);

  // Processar imediatamente na inicialização
  processSchedules();

  // Configurar intervalo
  const intervalMs = INTERVAL_MINUTES * 60 * 1000;
  setInterval(processSchedules, intervalMs);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n[${new Date().toISOString()}] 🛑 Parando Auto Scheduler...`);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log(`\n[${new Date().toISOString()}] 🛑 Auto Scheduler terminado`);
    process.exit(0);
  });
}

// Verificar se o servidor está rodando antes de iniciar
async function checkServer() {
  try {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET',
      timeout: 5000
    };

    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Servidor respondeu com status ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout ao verificar servidor'));
      });

      req.end();
    });

    console.log('✅ Servidor está rodando, iniciando auto scheduler...\n');
    startAutoScheduler();

  } catch (error) {
    console.error('❌ Erro ao verificar servidor:', error.message);
    console.log('💡 Certifique-se de que o servidor está rodando em http://localhost:3000');
    console.log('   Execute: npm start');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkServer();
}

module.exports = { processSchedules, startAutoScheduler };