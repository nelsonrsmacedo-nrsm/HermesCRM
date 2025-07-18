#!/bin/bash

# Script de Deploy Automático - Sistema de Gestão de Clientes
# Uso: ./deploy.sh [production|staging]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar se o ambiente foi especificado
ENV=${1:-production}

if [ "$ENV" != "production" ] && [ "$ENV" != "staging" ]; then
    error "Ambiente inválido. Use: production ou staging"
fi

log "Iniciando deploy para ambiente: $ENV"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "package.json não encontrado. Execute este script na raiz do projeto."
fi

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    error "Node.js não está instalado"
fi

# Verificar se o PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    error "PM2 não está instalado. Execute: npm install -g pm2"
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    warning "Arquivo .env não encontrado. Criando arquivo de exemplo..."
    cat > .env << EOF
# Banco de dados
DATABASE_URL=postgresql://cliente_app:senha_aqui@localhost:5432/cliente_management

# Sessão
SESSION_SECRET=sua_chave_secreta_super_segura_aqui

# Ambiente
NODE_ENV=$ENV
PORT=5000
EOF
    warning "Configure o arquivo .env com suas credenciais antes de continuar"
    exit 1
fi

# Backup do banco de dados (apenas em produção)
if [ "$ENV" = "production" ]; then
    log "Fazendo backup do banco de dados..."
    
    # Criar diretório de backup se não existir
    mkdir -p ./backups
    
    # Fazer backup
    BACKUP_FILE="./backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if command -v pg_dump &> /dev/null; then
        # Extrair dados de conexão do DATABASE_URL
        if [ -f ".env" ]; then
            source .env
            if [ ! -z "$DATABASE_URL" ]; then
                log "Fazendo backup para: $BACKUP_FILE"
                pg_dump "$DATABASE_URL" > "$BACKUP_FILE" || warning "Falha no backup do banco"
            fi
        fi
    else
        warning "pg_dump não encontrado. Backup do banco pulado."
    fi
fi

# Instalar dependências
log "Instalando dependências..."
npm ci --production=false

# Executar testes (se existirem)
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    log "Executando testes..."
    npm test || error "Testes falharam"
fi

# Build da aplicação
log "Compilando aplicação..."
npm run build || error "Falha na compilação"

# Aplicar migrações do banco
log "Aplicando migrações do banco..."
npm run db:push || error "Falha nas migrações do banco"

# Criar diretório de logs
mkdir -p ./logs

# Verificar se a aplicação já está rodando
if pm2 list | grep -q "cliente-management"; then
    log "Aplicação já está rodando. Fazendo reload..."
    pm2 reload ecosystem.config.js --env $ENV || error "Falha no reload da aplicação"
else
    log "Iniciando aplicação..."
    pm2 start ecosystem.config.js --env $ENV || error "Falha ao iniciar aplicação"
fi

# Salvar configuração do PM2
log "Salvando configuração do PM2..."
pm2 save

# Verificar se a aplicação está rodando
sleep 5
if pm2 list | grep -q "cliente-management.*online"; then
    log "✅ Deploy realizado com sucesso!"
    log "Status da aplicação:"
    pm2 status cliente-management
else
    error "❌ Aplicação não está rodando. Verifique os logs: pm2 logs cliente-management"
fi

# Informações finais
log "==== INFORMAÇÕES DO DEPLOY ===="
log "Ambiente: $ENV"
log "Versão do Node.js: $(node --version)"
log "Data do deploy: $(date)"
log "Usuário: $(whoami)"
log "Diretório: $(pwd)"

if [ "$ENV" = "production" ]; then
    log "==== PRÓXIMOS PASSOS ===="
    log "1. Verifique se o Nginx está configurado corretamente"
    log "2. Teste a aplicação em: https://seu-dominio.com"
    log "3. Configure monitoramento: pm2 monit"
    log "4. Verifique logs: pm2 logs cliente-management"
fi

log "Deploy concluído!"