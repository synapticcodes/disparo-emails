#!/bin/bash

echo "🚀 Iniciando servidores do sistema de emails..."

# Matar processos existentes
echo "🔄 Parando servidores existentes..."
pkill -f "node server.js" 2>/dev/null
pkill -f "react-scripts start" 2>/dev/null

echo "⏳ Aguardando processos pararem..."
sleep 2

# Iniciar backend na porta 3001
echo "🔧 Iniciando backend na porta 3001..."
PORT=3001 node server.js &
BACKEND_PID=$!

# Aguardar backend inicializar
sleep 3

# Verificar se backend está rodando
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend rodando em http://localhost:3001"
else
    echo "❌ Erro ao iniciar backend"
    exit 1
fi

# Iniciar frontend na porta 3000
echo "🎨 Iniciando frontend na porta 3000..."
cd frontend
npm start &
FRONTEND_PID=$!

echo "✅ Servidores iniciados:"
echo "   🔧 Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
echo "   🎨 Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "📊 Dashboard disponível em: http://localhost:3000"
echo "📡 API SendGrid funcionando com dados reais!"
echo ""
echo "Para parar os servidores, execute:"
echo "   pkill -f 'node server.js'"
echo "   pkill -f 'react-scripts start'"