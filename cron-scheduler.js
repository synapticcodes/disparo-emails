#!/usr/bin/env node

/**
 * Cron Scheduler para processar campanhas agendadas
 * 
 * Execute este script em um cron job para processar campanhas automaticamente:
 * 
 * # Crontab entry (executa a cada 5 minutos)
 * */5 * * * * /usr/bin/node /caminho/para/projeto/cron-scheduler.js
 * 
 * Ou use PM2 para gerenciamento:
 * pm2 start cron-scheduler.js --cron "*/5 * * * *"
 */

require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'sua-chave-secreta-aqui';

async function processCampaigns() {
  console.log(`[${new Date().toISOString()}] 🕐 Iniciando processamento de campanhas agendadas...`);
  
  try {
    const response = await fetch(`${API_URL}/api/cron/process-scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': CRON_SECRET
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.total > 0) {
      console.log(`✅ Processamento concluído:`);
      console.log(`   📊 Total de agendamentos: ${result.total}`);
      console.log(`   ✅ Processados com sucesso: ${result.processed}`);
      console.log(`   ❌ Erros: ${result.errors}`);
    } else {
      console.log(`ℹ️  Nenhuma campanha agendada para processamento`);
    }

  } catch (error) {
    console.error(`❌ Erro no processamento:`, error.message);
    
    // Opcional: enviar alerta por email ou Slack
    if (process.env.ALERT_WEBHOOK) {
      try {
        await fetch(process.env.ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Erro no cron de campanhas: ${error.message}`,
            timestamp: new Date().toISOString()
          })
        });
      } catch (alertError) {
        console.error('❌ Erro ao enviar alerta:', alertError.message);
      }
    }
    
    process.exit(1);
  }
}

// Função fetch para Node.js < 18
async function fetch(url, options = {}) {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');
  
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  processCampaigns()
    .then(() => {
      console.log(`[${new Date().toISOString()}] ✅ Cron executado com sucesso`);
      process.exit(0);
    })
    .catch((error) => {
      console.error(`[${new Date().toISOString()}] ❌ Cron falhou:`, error.message);
      process.exit(1);
    });
}

module.exports = { processCampaigns };