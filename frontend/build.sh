#!/bin/bash
set -e

echo "🔍 Verificando estrutura de arquivos..."
ls -la public/
echo ""

echo "📦 Instalando dependências..."
npm install
echo ""

echo "🏗️ Executando build..."
npm run build
echo ""

echo "✅ Build concluído com sucesso!"
ls -la build/