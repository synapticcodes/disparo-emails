-- Criar tabelas que faltam no banco de dados

-- Tabela de agendamentos
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

-- Tabela de eventos de segurança
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

-- Tabela de alertas críticos
CREATE TABLE IF NOT EXISTS critical_alerts (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  event_data JSONB,
  ip TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  investigated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) nas novas tabelas
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (cada usuário só vê seus próprios dados)
CREATE POLICY "Users can manage own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own security events" ON security_events FOR ALL USING (auth.uid() = user_id);

-- Para critical_alerts, apenas admins podem ver (por enquanto, permitir todos)
CREATE POLICY "Users can view critical alerts" ON critical_alerts FOR SELECT USING (true);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- Inserir alguns dados de exemplo (opcional)
-- Nota: Só inserir se as tabelas estiverem vazias