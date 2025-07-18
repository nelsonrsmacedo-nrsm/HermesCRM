#!/bin/bash

# Script de Instalação Rápida - Sistema de Gestão de Clientes
# Para Ubuntu/Debian

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INSTALL] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Verificar se é root
if [ "$EUID" -eq 0 ]; then
    error "Não execute este script como root"
fi

log "Iniciando instalação do Sistema de Gestão de Clientes..."

# Atualizar sistema
log "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
log "Instalando dependências básicas..."
sudo apt install -y curl wget git build-essential software-properties-common

# Instalar Node.js 20
log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação Node.js
if ! command -v node &> /dev/null; then
    error "Falha na instalação do Node.js"
fi

log "Node.js instalado: $(node --version)"
log "NPM instalado: $(npm --version)"

# Instalar PostgreSQL
log "Instalando PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Iniciar PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Instalar PM2
log "Instalando PM2..."
sudo npm install -g pm2

# Instalar Nginx
log "Instalando Nginx..."
sudo apt install -y nginx

# Configurar firewall básico
log "Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Configurar PostgreSQL
log "Configurando banco de dados..."
sudo -u postgres psql -c "CREATE USER cliente_app WITH PASSWORD 'senha123';" || true
sudo -u postgres psql -c "CREATE DATABASE cliente_management;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE cliente_management TO cliente_app;" || true

# Clonar ou preparar diretório do projeto
INSTALL_DIR="/var/www/cliente-management"
log "Preparando diretório: $INSTALL_DIR"

if [ -d "$INSTALL_DIR" ]; then
    warning "Diretório já existe. Fazendo backup..."
    sudo mv "$INSTALL_DIR" "${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
fi

sudo mkdir -p "$INSTALL_DIR"
sudo chown -R $USER:$USER "$INSTALL_DIR"

# Copiar arquivos do projeto atual
log "Copiando arquivos do projeto..."
cp -r . "$INSTALL_DIR/"
cd "$INSTALL_DIR"

# Instalar dependências do projeto
log "Instalando dependências do projeto..."
npm install

# Configurar variáveis de ambiente
log "Configurando variáveis de ambiente..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Banco de dados
DATABASE_URL=postgresql://cliente_app:senha123@localhost:5432/cliente_management

# Sessão
SESSION_SECRET=$(openssl rand -hex 32)

# Ambiente
NODE_ENV=production
PORT=5000
EOF
    log "Arquivo .env criado com configurações padrão"
fi

# Build da aplicação
log "Compilando aplicação..."
npm run build

# Aplicar migrações
log "Aplicando migrações do banco..."
npm run db:push

# Configurar Nginx
log "Configurando Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/cliente-management
sudo ln -sf /etc/nginx/sites-available/cliente-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Configurar PM2
log "Configurando PM2..."
mkdir -p logs
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup | grep -E "^sudo" | bash || true

# Esperar aplicação iniciar
log "Aguardando aplicação iniciar..."
sleep 10

# Verificar status
if pm2 list | grep -q "cliente-management.*online"; then
    log "✅ Instalação concluída com sucesso!"
    log ""
    log "==== INFORMAÇÕES DA INSTALAÇÃO ===="
    log "Aplicação: http://localhost ou http://$(hostname -I | awk '{print $1}')"
    log "Diretório: $INSTALL_DIR"
    log "Banco: cliente_management"
    log "Usuário do banco: cliente_app"
    log "Senha do banco: senha123"
    log ""
    log "==== COMANDOS ÚTEIS ===="
    log "Ver status: pm2 status"
    log "Ver logs: pm2 logs cliente-management"
    log "Reiniciar: pm2 restart cliente-management"
    log "Monitor: pm2 monit"
    log ""
    log "⚠️  IMPORTANTE: Altere a senha do banco em produção!"
    log "⚠️  Configure um domínio e SSL para uso em produção!"
else
    error "❌ Falha na instalação. Verifique os logs: pm2 logs cliente-management"
fi

log "Instalação finalizada!"