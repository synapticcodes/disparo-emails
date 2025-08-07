#!/bin/bash

# Script para manter o auto-scheduler rodando permanentemente

echo "🚀 Iniciando Auto Scheduler Permanente..."

# Verificar se PM2 está instalado
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 encontrado, usando PM2 para gerenciar o processo..."
    
    # Parar processo anterior se existir
    pm2 delete auto-scheduler 2>/dev/null || true
    
    # Iniciar com PM2
    pm2 start auto-scheduler.js --name "auto-scheduler" --log-date-format="YYYY-MM-DD HH:mm:ss"
    pm2 save
    
    echo "✅ Auto Scheduler iniciado com PM2!"
    echo "📝 Comandos úteis:"
    echo "   pm2 logs auto-scheduler    # Ver logs"
    echo "   pm2 restart auto-scheduler # Reiniciar"
    echo "   pm2 stop auto-scheduler    # Parar"
    echo "   pm2 list                   # Listar processos"
    
else
    echo "⚠️ PM2 não encontrado, instalando..."
    npm install -g pm2
    
    if [ $? -eq 0 ]; then
        echo "✅ PM2 instalado com sucesso!"
        # Executar novamente agora que PM2 está instalado
        exec "$0"
    else
        echo "❌ Falha ao instalar PM2, usando nohup como alternativa..."
        
        # Matar processos anteriores do auto-scheduler
        pkill -f "auto-scheduler.js" 2>/dev/null || true
        
        # Iniciar em background com nohup
        nohup node auto-scheduler.js > auto-scheduler.log 2>&1 &
        
        echo "✅ Auto Scheduler iniciado em background!"
        echo "📝 Comandos úteis:"
        echo "   tail -f auto-scheduler.log     # Ver logs"
        echo "   pkill -f auto-scheduler.js     # Parar processo"
        echo "   ps aux | grep auto-scheduler   # Ver processo"
    fi
fi

echo ""
echo "🎯 Sistema de agendamento automático está ATIVO!"
echo "📧 Campanhas agendadas serão processadas automaticamente"
echo "⏰ Verificações a cada 2 minutos"