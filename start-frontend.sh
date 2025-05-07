#!/bin/sh
set -e

echo "=== Iniciando aplicação frontend VBuz ==="

# Verificar a versão do Node
echo "Usando Node.js $(node -v) e NPM $(npm -v)"

# Verificar se o diretório de trabalho tem arquivos de projeto
if [ ! -f "package.json" ]; then
  echo "AVISO: package.json não encontrado!"
  echo "Verifique se você está montando o volume corretamente."

  # Mantenha o container rodando para solução de problemas
  echo "Mantendo o container em execução para depuração..."
  tail -f /dev/null
  exit 1
fi

# Verificar e instalar dependências
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "Instalando dependências do projeto..."
  npm install
else
  echo "Verificando dependências do projeto..."
  npm ci --prefer-offline --no-audit
fi

# Verificar tipo de projeto Quasar (v1 ou v2+)
if [ -f "quasar.conf.js" ]; then
  QUASAR_CONFIG="quasar.conf.js"
  echo "Detectado projeto Quasar v1"
elif [ -f "quasar.config.js" ]; then
  QUASAR_CONFIG="quasar.config.js"
  echo "Detectado projeto Quasar v2+"
else
  echo "AVISO: Configuração do Quasar não encontrada!"
fi

# Exibir informações sobre o projeto
echo "=== Informações do Projeto ==="
if [ -f "$QUASAR_CONFIG" ]; then
  echo "Configuração: $QUASAR_CONFIG"
fi
echo "Diretório: $(pwd)"
echo "Arquivos: $(ls -la | wc -l)"
echo "==========================="

# Iniciar o servidor de desenvolvimento
echo "Iniciando servidor Quasar em modo de desenvolvimento..."
echo "A aplicação estará disponível em: http://localhost:9000"
echo "==========================="

# Executar o servidor de desenvolvimento com mais opções de debug
exec quasar dev -p 9000 --hostname 0.0.0.0