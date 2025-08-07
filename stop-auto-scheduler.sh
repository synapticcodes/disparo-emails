#!/bin/bash

# Script para parar o auto-scheduler

echo "🛑 Parando Auto Scheduler..."

# Tentar parar com PM2 primeiro
if command -v pm2 &> /dev/null; then
    pm2 delete auto-scheduler 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Auto Scheduler parado via PM2"
    else
        echo "ℹ️ Processo não encontrado no PM2"
    fi
fi

# Parar processos com pkill
pkill -f "auto-scheduler.js" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Processos auto-scheduler finalizados"
else
    echo "ℹ️ Nenhum processo auto-scheduler encontrado"
fi

# Verificar se ainda há processos rodando
RUNNING=$(ps aux | grep -v grep | grep "auto-scheduler.js" | wc -l)
if [ $RUNNING -eq 0 ]; then
    echo "✅ Auto Scheduler parado completamente!"
else
    echo "⚠️ Ainda há $RUNNING processo(s) rodando"
fi