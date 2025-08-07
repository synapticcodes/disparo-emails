#!/bin/bash

# Setup de Cron para Agendamentos Automáticos
# Este script configura o processamento automático de campanhas agendadas

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_PATH="$(which node)"

echo "🚀 Configurando processamento automático de agendamentos..."
echo "📁 Diretório do projeto: $CURRENT_DIR"
echo "🔧 Node.js: $NODE_PATH"

# Verificar se o node está disponível
if [ ! -x "$NODE_PATH" ]; then
    echo "❌ Node.js não encontrado. Instale Node.js primeiro."
    exit 1
fi

# Verificar se o arquivo existe
if [ ! -f "$CURRENT_DIR/process-schedules-now.js" ]; then
    echo "❌ Arquivo process-schedules-now.js não encontrado."
    exit 1
fi

echo ""
echo "Escolha uma opção de configuração:"
echo "1) Cron Job (executa a cada 5 minutos)"
echo "2) Auto Scheduler em background (executa a cada 2 minutos)"
echo "3) Ambos (recomendado)"
echo "4) Cancelar"
echo ""

read -p "Digite sua escolha (1-4): " choice

case $choice in
    1|3)
        echo ""
        echo "⚙️ Configurando Cron Job..."
        
        # Criar entrada do cron
        CRON_JOB="*/5 * * * * cd $CURRENT_DIR && $NODE_PATH process-schedules-now.js >> $CURRENT_DIR/scheduler.log 2>&1"
        
        # Verificar se já existe
        if crontab -l 2>/dev/null | grep -q "process-schedules-now.js"; then
            echo "⚠️  Cron job já existe. Substituindo..."
            # Remover linha existente e adicionar nova
            (crontab -l 2>/dev/null | grep -v "process-schedules-now.js"; echo "$CRON_JOB") | crontab -
        else
            # Adicionar nova linha
            (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        fi
        
        echo "✅ Cron job configurado! Processamento a cada 5 minutos."
        echo "📝 Logs serão salvos em: $CURRENT_DIR/scheduler.log"
        ;;
esac

case $choice in
    2|3)
        echo ""
        echo "⚙️ Configurando Auto Scheduler..."
        
        # Verificar se PM2 está instalado
        if command -v pm2 >/dev/null 2>&1; then
            echo "📦 PM2 encontrado, usando PM2 para gerenciar o processo..."
            
            # Parar processo existente se houver
            pm2 delete auto-scheduler 2>/dev/null || true
            
            # Iniciar novo processo
            pm2 start "$CURRENT_DIR/auto-scheduler.js" --name "auto-scheduler" --log "$CURRENT_DIR/auto-scheduler.log"
            pm2 save
            
            echo "✅ Auto Scheduler iniciado com PM2!"
            echo "📝 Para ver logs: pm2 logs auto-scheduler"
            echo "🛑 Para parar: pm2 stop auto-scheduler"
            
        else
            echo "💡 PM2 não encontrado. Para usar PM2 (recomendado):"
            echo "   npm install -g pm2"
            echo "   Em seguida, execute este script novamente."
            echo ""
            echo "📋 Ou execute manualmente em background:"
            echo "   nohup node auto-scheduler.js > auto-scheduler.log 2>&1 &"
        fi
        ;;
esac

case $choice in
    1|2|3)
        echo ""
        echo "🎉 Configuração concluída!"
        echo ""
        echo "📊 Para verificar se está funcionando:"
        echo "   - Crie um agendamento para 2-3 minutos no futuro"
        echo "   - Aguarde o processamento automático"
        echo "   - Verifique os logs:"
        
        if [ "$choice" = "1" ] || [ "$choice" = "3" ]; then
            echo "     tail -f $CURRENT_DIR/scheduler.log"
        fi
        
        if [ "$choice" = "2" ] || [ "$choice" = "3" ]; then
            if command -v pm2 >/dev/null 2>&1; then
                echo "     pm2 logs auto-scheduler"
            else
                echo "     tail -f $CURRENT_DIR/auto-scheduler.log"
            fi
        fi
        
        echo ""
        echo "🔧 Para verificar cron jobs: crontab -l"
        echo "🛑 Para remover cron: crontab -e (remover linha manualmente)"
        ;;
    4)
        echo "❌ Configuração cancelada."
        exit 0
        ;;
    *)
        echo "❌ Opção inválida."
        exit 1
        ;;
esac