# 🔧 Como Configurar o Supabase

## ❌ PROBLEMA ATUAL
O erro "Invalid API key" indica que as credenciais do Supabase estão inválidas ou o projeto foi deletado.

## ✅ SOLUÇÃO

### 1. Acesse o Supabase
- Vá para: https://supabase.com/dashboard
- Faça login com sua conta

### 2. Crie um Novo Projeto
- Clique em "New Project"
- Nome: "sistema-emails" (ou qualquer nome)
- Senha do banco: anote uma senha segura
- Região: escolha a mais próxima (ex: South America)
- Clique em "Create new project"

### 3. Aguarde a Criação
- Aguarde uns 2-3 minutos para o projeto ser criado
- O projeto ficará com status "Setting up project..."

### 4. Copie as Credenciais
Quando pronto, vá em **Settings > API** e copie:

- **Project URL**: `https://[seu-projeto].supabase.co`
- **anon public**: `eyJhbGc...` (chave longa)
- **service_role**: `eyJhbGc...` (chave secreta)

### 5. Atualize o Arquivo .env
Substitua no arquivo `.env` (na pasta raiz):

```
SUPABASE_URL=https://[seu-projeto].supabase.co
SUPABASE_ANON_KEY=[sua-chave-anon]
SUPABASE_SERVICE_KEY=[sua-chave-service]
```

### 6. Atualize o Frontend
Substitua no arquivo `frontend/.env`:

```
REACT_APP_SUPABASE_URL=https://[seu-projeto].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[sua-chave-anon]
```

### 7. Criar as Tabelas do Banco
Execute este script no SQL Editor do Supabase:

```sql
-- Criar tabelas necessárias
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contatos (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  nome TEXT,
  telefone TEXT,
  empresa TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  subject TEXT,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campanhas (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id BIGINT REFERENCES templates(id),
  status TEXT DEFAULT 'rascunho',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppressions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  sendgrid_created TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  campaign_id BIGINT REFERENCES campanhas(id),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  executed_at TIMESTAMP WITH TIME ZONE,
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (cada usuário só vê seus próprios dados)
CREATE POLICY "Users can view own logs" ON logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contacts" ON contatos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own templates" ON templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own campaigns" ON campanhas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own suppressions" ON suppressions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own schedules" ON schedules FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own security events" ON security_events FOR ALL USING (auth.uid() = user_id);
```

### 8. Testar Novamente
```bash
cd "/Users/wolfgangpitta/Desktop/projeto emails"
node test-supabase.js
```

### 9. Reiniciar os Servidores
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Frontend  
cd frontend && npm start
```

## 🎯 TESTE FINAL
1. Acesse `http://localhost:3001`
2. Tente criar uma conta
3. Deve funcionar agora! 🎉