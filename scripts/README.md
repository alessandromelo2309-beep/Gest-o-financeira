# Scripts de Migração: SQLite → PostgreSQL

## Pré-requisitos

1. **Conta no Neon** (https://neon.tech)
   - Crie um projeto gratuito
   - Copie a connection string

2. **Node.js** instalado (v18+)

3. **sql.js** instalado (já está no projeto)

## Configuração

1. Adicione a `DATABASE_URL` no arquivo `backend/.env`:

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

## Executar Migração

```bash
node scripts/migrate.js
```

O que o script faz:
1. ✅ Cria backup do SQLite em `backups/`
2. ✅ Lê todos os dados do SQLite
3. ✅ Cria todas as tabelas no PostgreSQL
4. ✅ Insere os dados preservando os IDs originais
5. ✅ Atualiza as sequências de auto-incremento
6. ✅ Verifica se a contagem está correta

## Verificar Migração

```bash
node scripts/verify-migration.js
```

Este script compara:
- Contagem de registros em cada tabela
- Dados do usuário teste@teste.com
- Saldos das contas
- Total de transações, categorias, metas e cartões

## O que NÃO é alterado

- ❌ O arquivo SQLite original **NÃO é apagado**
- ❌ Os dados existentes **NÃO são sobrescritos**
- ❌ Nenhuma operação destrutiva é feita sem confirmação

## Estrutura de Arquivos

```
Default Project/
├── api/                    # API Routes para Vercel (serverless)
│   ├── db.js              # Conexão Neon PostgreSQL
│   ├── auth-middleware.js  # Middleware JWT
│   ├── auth.js            # Login/Register
│   ├── transactions.js    # CRUD transações
│   └── ...                # Outras rotas
├── scripts/
│   ├── migrate.js         # Script de migração
│   └── verify-migration.js # Script de verificação
├── backend/
│   ├── database.sqlite    # SQLite original (preservado)
│   ├── .env               # DATABASE_URL aqui
│   └── src/
│       └── database.js    # Schema original
├── frontend/
│   └── build/             # Build do React
└── vercel.json            # Configuração Vercel
```

## Troubleshooting

### Erro: "relation already exists"
As tabelas já existem no PostgreSQL. Isso é normal se você já executou o script antes.

### Erro: "duplicate key value"
O registro já existe no PostgreSQL. O script usa `ON CONFLICT DO NOTHING` para evitar duplicatas.

### Erro: "foreign key constraint fails"
Verifique a ordem de inserção. O script insere na ordem correta: users → accounts → categories → etc.

### Dados diferentes no SQLite e PostgreSQL
Execute novamente o script de migração. Ele é idempotente (pode ser executado múltiplas vezes).
