# Configuração de Webhooks SendGrid

## 🔗 Como configurar webhooks no SendGrid

### 1. Acesse o SendGrid Dashboard
- Login em https://app.sendgrid.com
- Vá para Settings > Mail Settings > Event Webhooks

### 2. Adicionar Webhook
- Clique em "Create new webhook"
- **HTTP Post URL**: `https://SEU_DOMINIO.com/webhook/sendgrid`
- **Actions to Post**: Selecione todos os eventos:
  - ✅ Delivered
  - ✅ Opened  
  - ✅ Clicked
  - ✅ Bounced
  - ✅ Spam Reports
  - ✅ Unsubscribes
  - ✅ Dropped

### 3. Configurações Avançadas
- **HTTP Post URL**: Seu endpoint público
- **Authorization Method**: None (use HTTPS)
- **Signature Verification**: Opcional (recomendado para produção)

## 🚀 Testando Webhooks Localmente

### Opção 1: ngrok (Recomendado)
```bash
# Instalar ngrok
npm install -g ngrok

# Expor servidor local
ngrok http 3000

# Use a URL https fornecida no SendGrid
# Exemplo: https://abc123.ngrok.io/webhook/sendgrid
```

### Opção 2: Cloudflare Tunnel
```bash
# Instalar cloudflared
# macOS: brew install cloudflare/cloudflare/cloudflared

# Criar túnel
cloudflared tunnel --url http://localhost:3000
```

## 📋 Eventos Recebidos

### Estrutura do Webhook
```json
[
  {
    "email": "example@test.com",
    "timestamp": 1513299569,
    "smtp-id": "<14c5d75ce93.dfd.64b469@ismtpd-555>",
    "event": "delivered",
    "category": "cat facts",
    "sg_event_id": "sg_event_id",
    "sg_message_id": "sg_message_id"
  }
]
```

### Tipos de Eventos
- **delivered**: Email entregue com sucesso
- **open**: Email aberto pelo destinatário
- **click**: Link clicado no email
- **bounce**: Email retornou (bounce)
- **spam**: Marcado como spam
- **unsubscribe**: Usuário cancelou inscrição
- **dropped**: SendGrid descartou o email

## 🔒 Segurança

### Verificar Assinatura (Produção)
```javascript
const crypto = require('crypto');

function verifySignature(req) {
  const signature = req.headers['x-twilio-email-event-webhook-signature'];
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];
  
  const payload = timestamp + JSON.stringify(req.body);
  const hash = crypto
    .createHmac('sha256', process.env.SENDGRID_WEBHOOK_KEY)
    .update(payload, 'utf8')
    .digest('base64');
    
  return signature === hash;
}
```

## 🧪 Teste Manual

### Simular Webhook
```bash
curl -X POST http://localhost:3000/webhook/sendgrid \
  -H "Content-Type: application/json" \
  -d '[
    {
      "email": "teste@exemplo.com",
      "timestamp": 1640995200,
      "event": "delivered",
      "sg_message_id": "test-message-123",
      "campaign_id": "UUID_DA_CAMPANHA",
      "custom_args": {
        "user_id": "UUID_DO_USUARIO"
      }
    }
  ]'
```

## 📊 Monitoramento

### Verificar Logs
- Logs do webhook: `GET /api/logs?action=webhook`
- Estatísticas: `GET /api/stats/dashboard`
- Eventos por campanha: `GET /api/stats/campaigns/:id`

### Sincronização Manual
Se webhooks falharem, use:
```bash
POST /api/suppressions/sync
Authorization: Bearer SEU_TOKEN
```

## ⚠️ Troubleshooting

### Webhook não está recebendo eventos
1. Verificar URL pública acessível
2. Confirmar HTTPS (obrigatório)
3. Testar endpoint manualmente
4. Verificar logs do SendGrid

### Eventos perdidos
1. Implementar retry logic
2. Usar sincronização manual
3. Verificar rate limits
4. Confirmar estrutura JSON

### Performance
- Processar eventos em background
- Usar filas para alto volume
- Implementar idempotência
- Cache de dados frequentes