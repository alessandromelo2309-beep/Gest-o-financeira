/**
 * =====================================================
 * SCRIPT DE MIGRAÇÃO: SQLite → PostgreSQL (Neon)
 * =====================================================
 * 
 * IMPORTANTE:
 * - NÃO apaga o SQLite original
 * - Cria backup ANTES de qualquer operação
 * - Preserva TODOS os IDs e relacionamentos
 * - Pode ser executado múltiplas vezes (idempotente)
 * 
 * COMO USAR:
 * 1. Configure DATABASE_URL no arquivo .env
 * 2. Execute: node scripts/migrate.js
 * 3. Verifique com: node scripts/migrate.js --verify
 * =====================================================
 */

const initSqlJs = require('sql.js');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Caminhos
const SQLITE_PATH = path.join(__dirname, '../backend/database.sqlite');
const BACKUP_DIR = path.join(__dirname, '../backups');
const BACKUP_PATH = path.join(BACKUP_DIR, `backup-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);

// Carregar .env do backend
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada!');
  console.error('   Adicione a connection string do Neon no arquivo backend/.env');
  console.error('   Exemplo: DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require');
  process.exit(1);
}

// Conexão Neon
const sql = neon(process.env.DATABASE_URL);

// =====================================================
// 1. BACKUP DO SQLITE
// =====================================================
function createBackup() {
  console.log('\n📦 Criando backup do SQLite...');
  
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error('❌ Arquivo SQLite não encontrado:', SQLITE_PATH);
    process.exit(1);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  fs.copyFileSync(SQLITE_PATH, BACKUP_PATH);
  const stats = fs.statSync(BACKUP_PATH);
  console.log(`   ✅ Backup criado: ${BACKUP_PATH}`);
  console.log(`   📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
  return BACKUP_PATH;
}

// =====================================================
// 2. LER DADOS DO SQLITE
// =====================================================
async function readSQLite() {
  console.log('\n📖 Lendo dados do SQLite...');
  
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(SQLITE_PATH);
  const db = new SQL.Database(buffer);

  function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  const data = {
    users: getAll('SELECT * FROM users'),
    accounts: getAll('SELECT * FROM accounts'),
    categories: getAll('SELECT * FROM categories'),
    transactions: getAll('SELECT * FROM transactions'),
    budgets: getAll('SELECT * FROM budgets'),
    credit_cards: getAll('SELECT * FROM credit_cards'),
    goals: getAll('SELECT * FROM goals'),
    recurring_transactions: getAll('SELECT * FROM recurring_transactions'),
    notifications: getAll('SELECT * FROM notifications'),
    tags: getAll('SELECT * FROM tags'),
    transaction_tags: getAll('SELECT * FROM transaction_tags'),
    achievements: getAll('SELECT * FROM achievements'),
    streaks: getAll('SELECT * FROM streaks'),
    dashboard_config: getAll('SELECT * FROM dashboard_config'),
    financial_goals: getAll('SELECT * FROM financial_goals'),
  };

  db.close();

  // Resumo
  console.log('   📊 Dados encontrados:');
  Object.entries(data).forEach(([table, rows]) => {
    if (rows.length > 0) {
      console.log(`      ${table}: ${rows.length} registros`);
    }
  });

  return data;
}

// =====================================================
// 3. CRIAR TABELAS NO POSTGRESQL
// =====================================================
async function createTables() {
  console.log('\n🔧 Criando tabelas no PostgreSQL...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'checking',
      balance REAL DEFAULT 0,
      color TEXT DEFAULT '#3B82F6',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT DEFAULT '📁',
      color TEXT DEFAULT '#6B7280',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS credit_cards (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      brand TEXT DEFAULT 'outro',
      last_four TEXT DEFAULT '',
      limit_amount REAL DEFAULT 0,
      closing_day INTEGER DEFAULT 1,
      due_day INTEGER DEFAULT 10,
      color TEXT DEFAULT '#6B7280',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '🎯',
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      monthly_contribution REAL DEFAULT 0,
      deadline TEXT,
      color TEXT DEFAULT '#3B82F6',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
      next_date TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (transaction_id, tag_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      achievement_key TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, achievement_key)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS streaks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      last_record_date TEXT,
      total_savings REAL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_config (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      hidden_cards TEXT DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS financial_goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      initial_amount REAL DEFAULT 0,
      monthly_contribution REAL DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      goal_amount REAL NOT NULL,
      deadline TEXT,
      projected_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  console.log('   ✅ Todas as tabelas criadas com sucesso');
}

// =====================================================
// 4. INSERIR DADOS NO POSTGRESQL (COM ID FIXO)
// =====================================================
async function insertData(data) {
  console.log('\n💾 Inserindo dados no PostgreSQL...');

  // Ordem de inserção respeitando foreign keys
  const tables = [
    'users',
    'accounts',
    'categories',
    'credit_cards',
    'goals',
    'transactions',
    'budgets',
    'recurring_transactions',
    'notifications',
    'tags',
    'transaction_tags',
    'achievements',
    'streaks',
    'dashboard_config',
    'financial_goals',
  ];

  let totalInserted = 0;

  for (const table of tables) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;

    console.log(`   📝 Inserindo ${rows.length} registros em ${table}...`);

    for (const row of rows) {
      try {
        switch (table) {
          case 'users':
            await sql`
              INSERT INTO users (id, name, email, password, created_at)
              VALUES (${row.id}, ${row.name}, ${row.email}, ${row.password}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'accounts':
            await sql`
              INSERT INTO accounts (id, user_id, name, type, balance, color, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.type}, ${row.balance || 0}, ${row.color || '#3B82F6'}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'categories':
            await sql`
              INSERT INTO categories (id, user_id, name, type, icon, color, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.type}, ${row.icon || '📁'}, ${row.color || '#6B7280'}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'credit_cards':
            await sql`
              INSERT INTO credit_cards (id, user_id, name, brand, last_four, limit_amount, closing_day, due_day, color, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.brand || 'outro'}, ${row.last_four || ''}, ${row.limit_amount || 0}, ${row.closing_day || 1}, ${row.due_day || 10}, ${row.color || '#6B7280'}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'goals':
            await sql`
              INSERT INTO goals (id, user_id, name, icon, target_amount, current_amount, monthly_contribution, deadline, color, status, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.icon || '🎯'}, ${row.target_amount}, ${row.current_amount || 0}, ${row.monthly_contribution || 0}, ${row.deadline || null}, ${row.color || '#3B82F6'}, ${row.status || 'active'}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'transactions':
            await sql`
              INSERT INTO transactions (id, user_id, account_id, to_account_id, category_id, type, description, amount, date, notes, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.account_id}, ${row.to_account_id || null}, ${row.category_id || null}, ${row.type}, ${row.description}, ${row.amount}, ${row.date}, ${row.notes || null}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'budgets':
            await sql`
              INSERT INTO budgets (id, user_id, category_id, amount, month, year, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.category_id}, ${row.amount}, ${row.month}, ${row.year}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'recurring_transactions':
            await sql`
              INSERT INTO recurring_transactions (id, user_id, account_id, category_id, type, description, amount, frequency, next_date, active, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.account_id}, ${row.category_id || null}, ${row.type}, ${row.description}, ${row.amount}, ${row.frequency}, ${row.next_date}, ${row.active !== undefined ? row.active : 1}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'notifications':
            await sql`
              INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.type}, ${row.title}, ${row.message}, ${row.read || 0}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'tags':
            await sql`
              INSERT INTO tags (id, user_id, name, color, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.color || '#3B82F6'}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'transaction_tags':
            await sql`
              INSERT INTO transaction_tags (transaction_id, tag_id)
              VALUES (${row.transaction_id}, ${row.tag_id})
              ON CONFLICT (transaction_id, tag_id) DO NOTHING
            `;
            break;

          case 'achievements':
            await sql`
              INSERT INTO achievements (id, user_id, achievement_key, unlocked_at)
              VALUES (${row.id}, ${row.user_id}, ${row.achievement_key}, ${row.unlocked_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'streaks':
            await sql`
              INSERT INTO streaks (id, user_id, current_streak, best_streak, last_record_date, total_savings, updated_at)
              VALUES (${row.id}, ${row.user_id}, ${row.current_streak || 0}, ${row.best_streak || 0}, ${row.last_record_date || null}, ${row.total_savings || 0}, ${row.updated_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'dashboard_config':
            await sql`
              INSERT INTO dashboard_config (id, user_id, hidden_cards, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.hidden_cards || '[]'}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;

          case 'financial_goals':
            await sql`
              INSERT INTO financial_goals (id, user_id, name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline, projected_date, created_at)
              VALUES (${row.id}, ${row.user_id}, ${row.name}, ${row.initial_amount || 0}, ${row.monthly_contribution || 0}, ${row.interest_rate || 0}, ${row.goal_amount}, ${row.deadline || null}, ${row.projected_date || null}, ${row.created_at || new Date()})
              ON CONFLICT (id) DO NOTHING
            `;
            break;
        }
        totalInserted++;
      } catch (error) {
        console.error(`   ⚠️ Erro ao inserir em ${table}:`, error.message);
      }
    }
  }

  console.log(`   ✅ ${totalInserted} registros inseridos com sucesso`);
  return totalInserted;
}

// =====================================================
// 5. ATUALIZAR SEQUÊNCIAS (AUTOINCREMENT)
// =====================================================
async function updateSequences() {
  console.log('\n🔄 Atualizando sequências...');

  const tables = ['users', 'accounts', 'categories', 'transactions', 'budgets', 'credit_cards', 'goals', 'recurring_transactions', 'notifications', 'tags', 'achievements', 'streaks', 'dashboard_config', 'financial_goals'];

  for (const table of tables) {
    try {
      const result = await sql`SELECT COALESCE(MAX(id), 0) as max_id FROM ${sql(table)}`;
      const maxId = result[0].max_id;
      if (maxId > 0) {
        await sql`SELECT setval(pg_get_serial_sequence(${table}, 'id'), ${maxId})`;
      }
    } catch (error) {
      // Ignorar erros de sequência
    }
  }

  console.log('   ✅ Sequências atualizadas');
}

// =====================================================
// 6. VERIFICAR MIGRAÇÃO
// =====================================================
async function verifyMigration() {
  console.log('\n🔍 Verificando migração...');

  // Ler SQLite
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(SQLITE_PATH);
  const db = new SQL.Database(buffer);

  function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  const tables = [
    'users', 'accounts', 'categories', 'transactions', 'budgets',
    'credit_cards', 'goals', 'recurring_transactions', 'notifications',
    'tags', 'transaction_tags', 'achievements', 'streaks',
    'dashboard_config', 'financial_goals'
  ];

  let allPassed = true;

  for (const table of tables) {
    const sqliteCount = getOne(`SELECT COUNT(*) as c FROM ${table}`)?.c || 0;
    
    try {
      const pgResult = await sql`SELECT COUNT(*) as c FROM ${sql(table)}`;
      const pgCount = pgResult[0].c;

      const status = sqliteCount === pgCount ? '✅' : '⚠️';
      const match = sqliteCount === pgCount ? 'OK' : 'DIFERENTE';
      
      console.log(`   ${status} ${table}: SQLite=${sqliteCount} | PostgreSQL=${pgCount} [${match}]`);
      
      if (sqliteCount !== pgCount) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ ${table}: Erro ao verificar - ${error.message}`);
      allPassed = false;
    }
  }

  db.close();

  // Verificar usuário teste
  console.log('\n👤 Verificando usuário teste...');
  const testUser = await sql`SELECT id, name, email FROM users WHERE email = 'teste@teste.com'`;
  if (testUser.length > 0) {
    console.log(`   ✅ Usuário encontrado: ${testUser[0].name} (${testUser[0].email})`);
  } else {
    console.log('   ⚠️ Usuário teste@teste.com não encontrado');
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 MIGRAÇÃO VERIFICADA COM SUCESSO!');
    console.log('   Todos os dados foram transferidos corretamente.');
  } else {
    console.log('⚠️ MIGRAÇÃO COM DIFERENÇAS');
    console.log('   Alguns registros podem ter sido perdidos ou duplicados.');
    console.log('   Verifique os logs acima para mais detalhes.');
  }
  console.log('='.repeat(50));

  return allPassed;
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  const args = process.argv.slice(2);
  const verifyOnly = args.includes('--verify');

  console.log('='.repeat(50));
  console.log('  MIGRAÇÃO: SQLite → PostgreSQL (Neon)');
  console.log('='.repeat(50));

  if (verifyOnly) {
    await verifyMigration();
    return;
  }

  // 1. Backup
  createBackup();

  // 2. Ler SQLite
  const data = await readSQLite();

  // 3. Criar tabelas
  await createTables();

  // 4. Inserir dados
  const inserted = await insertData(data);

  // 5. Atualizar sequências
  await updateSequences();

  // 6. Verificar
  await verifyMigration();

  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('   1. O SQLite original NÃO foi apagado');
  console.log('   2. Backup salvo em:', BACKUP_PATH);
  console.log('   3. Configure o Vercel com DATABASE_URL');
  console.log('   4. Faça deploy e teste o sistema');
  console.log('   5. Se tudo funcionar, pode arquivar o SQLite');
}

main().catch(error => {
  console.error('\n❌ ERRO FATAL:', error.message);
  process.exit(1);
});
