# 🗄️ SQL para Executar no Supabase (SEM RLS)

## 📍 Onde Executar
1. Acesse: https://supabase.com/dashboard/project/ixroiuhpvsljxeynfrqz/sql
2. Cole o SQL abaixo
3. Clique em "Run"

## 📜 SQL para Executar (SEM RLS)

```sql
-- Criar tabela de agendamentos
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  campaign_id BIGINT REFERENCES campanhas(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  repeat_interval TEXT,
  repeat_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de eventos de segurança
CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  severity TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_agent TEXT
);

-- Criar tabela de estatísticas de email
CREATE TABLE IF NOT EXISTS email_statistics (
  id BIGSERIAL PRIMARY KEY,
  message_id TEXT,
  campaign_id BIGINT REFERENCES campanhas(id),
  contact_id BIGINT REFERENCES contatos(id),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_email_statistics_user_id ON email_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_email_statistics_campaign_id ON email_statistics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_statistics_event_type ON email_statistics(event_type);

-- Inserir dados de exemplo (opcional)
INSERT INTO schedules (user_id, campaign_id, scheduled_at, status) 
VALUES 
  (gen_random_uuid(), 1, NOW() + INTERVAL '1 hour', 'pending'),
  (gen_random_uuid(), 2, NOW() + INTERVAL '1 day', 'pending')
ON CONFLICT DO NOTHING;

INSERT INTO security_events (type, message, severity, ip) 
VALUES 
  ('SYSTEM_START', 'Sistema iniciado com sucesso', 'low', '127.0.0.1'),
  ('DATABASE_SETUP', 'Tabelas criadas com sucesso', 'low', '127.0.0.1')
ON CONFLICT DO NOTHING;

INSERT INTO email_statistics (email, event_type, event_data) 
VALUES 
  ('exemplo@teste.com', 'delivered', '{"status": "delivered"}'),
  ('exemplo@teste.com', 'open', '{"timestamp": "2024-01-01T10:00:00Z"}')
ON CONFLICT DO NOTHING;
```

## ✅ Características das Tabelas

### **schedules (Agendamentos)**
- `id`: ID único do agendamento
- `user_id`: ID do usuário (pode ser null)
- `campaign_id`: ID da campanha a ser enviada
- `scheduled_at`: Data/hora do envio
- `status`: Status (pending, completed, failed)
- `timezone`: Fuso horário
- `repeat_interval`: Intervalo de repetição
- `repeat_count`: Quantas vezes repetir

### **security_events (Eventos de Segurança)**
- `id`: ID único do evento
- `type`: Tipo do evento (LOGIN_FAILED, XSS_ATTEMPT, etc.)
- `message`: Mensagem descritiva
- `data`: Dados extras em JSON
- `severity`: Severidade (low, medium, high, critical)
- `ip`: IP do usuário
- `user_id`: ID do usuário (pode ser null)
- `user_agent`: User agent do navegador

### **email_statistics (Estatísticas de Email)**
- `id`: ID único da estatística
- `message_id`: ID da mensagem do SendGrid
- `campaign_id`: ID da campanha (pode ser null)
- `contact_id`: ID do contato (pode ser null)
- `email`: Email do destinatário
- `event_type`: Tipo do evento (delivered, open, click, bounce, etc.)
- `event_data`: Dados extras do evento em JSON
- `timestamp`: Data/hora do evento
- `user_id`: ID do usuário

## 🚫 RLS Desabilitado
- **NÃO** habilitamos RLS nas novas tabelas
- **NÃO** criamos políticas de segurança
- Todos os usuários podem acessar todos os dados
- Perfeito para desenvolvimento e testes