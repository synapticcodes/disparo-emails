require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function setupDatabase() {
  console.log('🛠️  Criando tabelas que faltam...\n')
  
  try {
    // Criar tabela schedules
    console.log('Criando tabela schedules...')
    const { error: scheduleError } = await supabase.rpc('exec_sql', {
      sql: `
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
        
        ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage own schedules" ON schedules;
        CREATE POLICY "Users can manage own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);
      `
    })
    
    if (scheduleError) {
      console.log('⚠️  Tabela schedules já existe ou erro:', scheduleError.message)
    } else {
      console.log('✅ Tabela schedules criada')
    }
    
    // Criar tabela security_events
    console.log('Criando tabela security_events...')
    const { error: securityError } = await supabase.rpc('exec_sql', {
      sql: `
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
        
        ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own security events" ON security_events;
        CREATE POLICY "Users can view own security events" ON security_events FOR ALL USING (auth.uid() = user_id);
      `
    })
    
    if (securityError) {
      console.log('⚠️  Tabela security_events já existe ou erro:', securityError.message)
    } else {
      console.log('✅ Tabela security_events criada')
    }
    
    console.log('\n🎉 Setup do banco concluído!')
    
  } catch (error) {
    console.error('❌ Erro no setup:', error.message)
    console.log('\n🔧 Execute manualmente no SQL Editor do Supabase:')
    console.log('https://supabase.com/dashboard/project/ixroiuhpvsljxeynfrqz/sql')
    console.log('\nSQL a executar:')
    console.log(`
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

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own security events" ON security_events FOR ALL USING (auth.uid() = user_id);
    `)
  }
}

setupDatabase()