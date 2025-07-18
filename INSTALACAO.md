# Guia de Instalação - Sistema de Gestão de Clientes

## Pré-requisitos

### 1. Servidor Linux (Ubuntu/Debian)
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git build-essential
```

### 2. Node.js (versão 18 ou superior)
```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 3. PostgreSQL
```bash
# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Iniciar e habilitar o serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configurar usuário e banco
sudo -u postgres psql
```

No console do PostgreSQL:
```sql
CREATE USER cliente_app WITH PASSWORD 'senha_segura_aqui';
CREATE DATABASE cliente_management;
GRANT ALL PRIVILEGES ON DATABASE cliente_management TO cliente_app;
\q
```

### 4. PM2 (Gerenciador de Processos)
```bash
sudo npm install -g pm2
```

## Instalação da Aplicação

### 1. Clonar e configurar o projeto
```bash
# Navegar para o diretório desejado
cd /var/www/

# Clonar o repositório (substitua pela URL do seu repositório)
sudo git clone <URL_DO_REPOSITORIO> cliente-management
cd cliente-management

# Alterar proprietário dos arquivos
sudo chown -R $USER:$USER /var/www/cliente-management
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
```bash
# Criar arquivo .env
cp .env.example .env

# Editar com suas configurações
nano .env
```

Conteúdo do arquivo `.env`:
```env
# Banco de dados
DATABASE_URL=postgresql://cliente_app:senha_segura_aqui@localhost:5432/cliente_management

# Sessão
SESSION_SECRET=sua_chave_secreta_super_segura_aqui

# Ambiente
NODE_ENV=production
PORT=5000
```

### 4. Configurar banco de dados
```bash
# Executar migrações
npm run db:push
```

### 5. Build da aplicação
```bash
# Construir aplicação para produção
npm run build
```

## Configuração do Servidor Web

### Nginx (Recomendado)

#### 1. Instalar Nginx
```bash
sudo apt install -y nginx
```

#### 2. Configurar site
```bash
sudo nano /etc/nginx/sites-available/cliente-management
```

Conteúdo do arquivo:
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com.br;

    # Certificados SSL (configure com Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seu-dominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seu-dominio.com.br/privkey.pem;

    # Configurações de segurança SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Proxy para aplicação Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/cliente-management.access.log;
    error_log /var/log/nginx/cliente-management.error.log;
}
```

#### 3. Habilitar site
```bash
sudo ln -s /etc/nginx/sites-available/cliente-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Configuração do SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com.br

# Configurar renovação automática
sudo crontab -e
```

Adicionar linha no crontab:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## Configuração do PM2

### 1. Criar arquivo de configuração
```bash
nano ecosystem.config.js
```

Conteúdo:
```javascript
module.exports = {
  apps: [{
    name: 'cliente-management',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 2. Iniciar aplicação
```bash
# Criar diretório de logs
mkdir logs

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save

# Configurar inicialização automática
pm2 startup
```

## Configuração do Firewall

```bash
# Configurar UFW
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## Backup e Monitoramento

### 1. Script de backup do banco
```bash
sudo nano /usr/local/bin/backup-cliente-db.sh
```

Conteúdo:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/cliente-management"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

mkdir -p $BACKUP_DIR

# Fazer backup
pg_dump -U cliente_app -h localhost cliente_management > $BACKUP_FILE

# Comprimir backup
gzip $BACKUP_FILE

# Remover backups antigos (manter apenas 7 dias)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup realizado: $BACKUP_FILE.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-cliente-db.sh

# Configurar backup automático
sudo crontab -e
```

Adicionar linha:
```
0 2 * * * /usr/local/bin/backup-cliente-db.sh
```

### 2. Monitoramento com PM2
```bash
# Instalar PM2 Web Monitor
pm2 install pm2-server-monit

# Visualizar status
pm2 status
pm2 logs
pm2 monit
```

## Comandos Úteis

### Gerenciamento da aplicação
```bash
# Verificar status
pm2 status

# Reiniciar aplicação
pm2 restart cliente-management

# Parar aplicação
pm2 stop cliente-management

# Ver logs
pm2 logs cliente-management

# Monitoramento
pm2 monit
```

### Atualizações
```bash
# Atualizar código
cd /var/www/cliente-management
git pull origin main

# Instalar novas dependências
npm install

# Rebuild
npm run build

# Reiniciar aplicação
pm2 restart cliente-management
```

### Manutenção do banco
```bash
# Conectar ao banco
psql -U cliente_app -d cliente_management

# Backup manual
pg_dump -U cliente_app cliente_management > backup.sql

# Restaurar backup
psql -U cliente_app -d cliente_management < backup.sql
```

## Troubleshooting

### 1. Aplicação não inicia
```bash
# Verificar logs
pm2 logs cliente-management

# Verificar configuração
pm2 describe cliente-management

# Reiniciar
pm2 restart cliente-management
```

### 2. Problemas de conexão com banco
```bash
# Verificar status PostgreSQL
sudo systemctl status postgresql

# Verificar logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 3. Problemas com Nginx
```bash
# Verificar configuração
sudo nginx -t

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

## Segurança Adicional

### 1. Configurar fail2ban
```bash
sudo apt install -y fail2ban

# Configurar para SSH
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. Atualizações automáticas
```bash
sudo apt install -y unattended-upgrades

# Configurar
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Conclusão

Após seguir este guia, sua aplicação estará rodando em produção com:
- ✅ HTTPS configurado
- ✅ Banco de dados PostgreSQL
- ✅ Proxy reverso com Nginx
- ✅ Gerenciamento de processos com PM2
- ✅ Backups automáticos
- ✅ Monitoramento básico
- ✅ Configurações de segurança

Para suporte, consulte os logs da aplicação e do sistema.