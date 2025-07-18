# Sistema de Gestão de Clientes

Sistema web completo para gerenciamento de clientes com autenticação de usuários, desenvolvido em React + Node.js + PostgreSQL.

## 🚀 Funcionalidades

- **Autenticação Segura**: Login e cadastro de usuários com hash de senhas
- **Gestão de Clientes**: Cadastro, listagem, busca e exclusão de clientes
- **Interface Responsiva**: Design moderno que funciona em desktop e mobile
- **Busca Inteligente**: Pesquisa por nome ou email dos clientes
- **Sessões Persistentes**: Usuário permanece logado até fazer logout
- **Validação de Dados**: Validação completa no frontend e backend

## 🛠️ Tecnologias Utilizadas

### Frontend
- React 18 com TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query para gerenciamento de estado
- React Hook Form com validação Zod
- Wouter para roteamento

### Backend
- Node.js + Express
- TypeScript
- Passport.js para autenticação
- PostgreSQL com Drizzle ORM
- Express Session para sessões

## 📋 Requisitos

- Node.js 18 ou superior
- PostgreSQL 12 ou superior
- npm ou yarn

## 🔧 Instalação Rápida

### Opção 1: Script Automático (Ubuntu/Debian)

```bash
# Clonar o repositório
git clone <URL_DO_REPOSITORIO>
cd cliente-management

# Executar instalação automática
./install.sh
```

### Opção 2: Instalação Manual

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Aplicar migrações do banco
npm run db:push

# Iniciar em desenvolvimento
npm run dev

# Ou build para produção
npm run build
npm start
```

## 📁 Estrutura do Projeto

```
cliente-management/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Páginas da aplicação
│   │   └── lib/            # Utilitários
├── server/                 # Backend Node.js
│   ├── auth.ts            # Configuração de autenticação
│   ├── db.ts              # Conexão com banco
│   ├── routes.ts          # Rotas da API
│   └── storage.ts         # Camada de dados
├── shared/                 # Schemas compartilhados
│   └── schema.ts          # Definições do banco
├── ecosystem.config.js     # Configuração PM2
├── nginx.conf             # Configuração Nginx
└── deploy.sh              # Script de deploy
```

## 🌐 Instalação em Servidor

Para instalar em um servidor Linux, consulte o arquivo [INSTALACAO.md](INSTALACAO.md) que contém:

- Configuração completa do servidor
- Instalação de dependências
- Configuração do Nginx
- Configuração do SSL
- Scripts de backup
- Monitoramento

## 🚀 Deploy

### Deploy Automático

```bash
# Deploy para produção
./deploy.sh production

# Deploy para staging
./deploy.sh staging
```

### Deploy Manual

```bash
# Build da aplicação
npm run build

# Aplicar migrações
npm run db:push

# Iniciar com PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

## 🔐 Configuração de Segurança

### Variáveis de Ambiente

```env
# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Sessão (use uma chave forte!)
SESSION_SECRET=sua_chave_secreta_super_segura

# Ambiente
NODE_ENV=production
PORT=5000
```

### Configurações Recomendadas

- Use senhas fortes para o banco de dados
- Configure SSL em produção
- Use firewall para proteger o servidor
- Implemente backup automático
- Configure monitoramento

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar dev server

# Produção
npm run build           # Build para produção
npm start              # Iniciar servidor

# Banco de dados
npm run db:push        # Aplicar mudanças no schema
npm run db:studio      # Abrir Drizzle Studio

# PM2 (Produção)
pm2 status             # Ver status
pm2 logs               # Ver logs
pm2 restart app        # Reiniciar
pm2 monit              # Monitor
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   - Verifique se o PostgreSQL está rodando
   - Confirme as credenciais no .env
   - Teste a conexão: `psql -U usuario -d database`

2. **Aplicação não inicia**
   - Verifique os logs: `pm2 logs`
   - Confirme se a porta está livre: `lsof -i :5000`
   - Verifique variáveis de ambiente

3. **Erro de permissão**
   - Verifique proprietário dos arquivos
   - Confirme permissões do diretório

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Faça push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Consulte a documentação
- Verifique os logs da aplicação

---

**Desenvolvido com ❤️ para gestão eficiente de clientes**