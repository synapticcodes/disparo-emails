# 🗄️ SQL para Executar no Supabase

## 📍 Onde Executar
1. Acesse: https://supabase.com/dashboard/project/ixroiuhpvsljxeynfrqz/sql
2. Cole o SQL abaixo
3. Clique em "Run"

## 📜 SQL para Executar

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

-- Habilitar RLS (Row Level Security)
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can manage own schedules" 
ON schedules FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own security events" 
ON security_events FOR ALL 
USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
```

## ✅ Após Executar
Execute este comando para verificar:
```bash
node check-database.js
```

Todas as tabelas devem aparecer com "✅ OK"