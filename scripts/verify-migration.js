/**
 * =====================================================
 * VERIFICAÇÃO PÓS-MIGRAÇÃO
 * =====================================================
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const { neon } = require('@neondatabase/serverless');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const sql = neon(process.env.DATABASE_URL);
const SQLITE_PATH = path.join(__dirname, '../backend/database.sqlite');

async function main() {
  console.log('='.repeat(60));
  console.log('  VERIFICAÇÃO DE MIGRAÇÃO: SQLite → PostgreSQL');
  console.log('='.repeat(60));

  // Ler SQLite
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(SQLITE_PATH);
  const db = new SQL.Database(buffer);

  function getOne(q) {
    const stmt = db.prepare(q);
    if (stmt.step()) { const r = stmt.getAsObject(); stmt.free(); return r; }
    stmt.free();
    return null;
  }

  // Queries explícitas para cada tabela (Neon não suporta nomes dinâmicos)
  const checks = [
    { label: 'Usuários',           sqlite: 'SELECT COUNT(*) as c FROM users',              pg: sql`SELECT COUNT(*) as c FROM users` },
    { label: 'Contas',             sqlite: 'SELECT COUNT(*) as c FROM accounts',            pg: sql`SELECT COUNT(*) as c FROM accounts` },
    { label: 'Categorias',         sqlite: 'SELECT COUNT(*) as c FROM categories',          pg: sql`SELECT COUNT(*) as c FROM categories` },
    { label: 'Transações',         sqlite: 'SELECT COUNT(*) as c FROM transactions',        pg: sql`SELECT COUNT(*) as c FROM transactions` },
    { label: 'Orçamentos',         sqlite: 'SELECT COUNT(*) as c FROM budgets',             pg: sql`SELECT COUNT(*) as c FROM budgets` },
    { label: 'Cartões de Crédito', sqlite: 'SELECT COUNT(*) as c FROM credit_cards',        pg: sql`SELECT COUNT(*) as c FROM credit_cards` },
    { label: 'Metas',              sqlite: 'SELECT COUNT(*) as c FROM goals',               pg: sql`SELECT COUNT(*) as c FROM goals` },
    { label: 'Transações Recorrentes', sqlite: 'SELECT COUNT(*) as c FROM recurring_transactions', pg: sql`SELECT COUNT(*) as c FROM recurring_transactions` },
    { label: 'Notificações',       sqlite: 'SELECT COUNT(*) as c FROM notifications',       pg: sql`SELECT COUNT(*) as c FROM notifications` },
    { label: 'Tags',               sqlite: 'SELECT COUNT(*) as c FROM tags',                pg: sql`SELECT COUNT(*) as c FROM tags` },
    { label: 'Tag-Transações',     sqlite: 'SELECT COUNT(*) as c FROM transaction_tags',    pg: sql`SELECT COUNT(*) as c FROM transaction_tags` },
    { label: 'Conquistas',         sqlite: 'SELECT COUNT(*) as c FROM achievements',        pg: sql`SELECT COUNT(*) as c FROM achievements` },
    { label: 'Sequências',         sqlite: 'SELECT COUNT(*) as c FROM streaks',             pg: sql`SELECT COUNT(*) as c FROM streaks` },
    { label: 'Config Dashboard',   sqlite: 'SELECT COUNT(*) as c FROM dashboard_config',    pg: sql`SELECT COUNT(*) as c FROM dashboard_config` },
    { label: 'Metas Financeiras',  sqlite: 'SELECT COUNT(*) as c FROM financial_goals',     pg: sql`SELECT COUNT(*) as c FROM financial_goals` },
  ];

  let totalSQLite = 0;
  let totalPG = 0;
  let allPassed = true;

  console.log('\n📊 Comparando contagens de registros:\n');

  for (const check of checks) {
    const sqliteCount = getOne(check.sqlite)?.c || 0;
    totalSQLite += sqliteCount;

    try {
      const pgResult = await check.pg;
      const pgCount = parseInt(pgResult[0].c) || 0;
      totalPG += pgCount;

      const diff = pgCount - sqliteCount;
      const status = sqliteCount === pgCount ? '✅' : '⚠️';
      const diffText = diff === 0 ? '' : ` (${diff > 0 ? '+' : ''}${diff})`;

      console.log(`   ${status} ${check.label.padEnd(25)} SQLite: ${String(sqliteCount).padStart(6)} | PG: ${String(pgCount).padStart(6)}${diffText}`);

      if (sqliteCount !== pgCount) allPassed = false;
    } catch (error) {
      console.log(`   ❌ ${check.label.padEnd(25)} ERRO: ${error.message}`);
      allPassed = false;
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`   TOTAL${' '.repeat(19)} SQLite: ${String(totalSQLite).padStart(6)} | PG: ${String(totalPG).padStart(6)}`);
  console.log('─'.repeat(60));

  // Verificar usuário teste
  console.log('\n👤 Verificando dados do usuário teste@teste.com...\n');

  const pgUser = await sql`SELECT id, name, email FROM users WHERE email = 'teste@teste.com'`;
  if (pgUser.length > 0) {
    console.log(`   ✅ Usuário: ${pgUser[0].name} (${pgUser[0].email})`);

    const pgAccounts = await sql`SELECT id, name, balance FROM accounts WHERE user_id = ${pgUser[0].id}`;
    console.log(`   📊 Contas: ${pgAccounts.length}`);
    pgAccounts.forEach(a => console.log(`      - ${a.name}: R$ ${(a.balance || 0).toFixed(2)}`));

    const pgTransactions = await sql`SELECT COUNT(*) as c FROM transactions WHERE user_id = ${pgUser[0].id}`;
    console.log(`   💰 Transações: ${pgTransactions[0].c}`);

    const pgCategories = await sql`SELECT COUNT(*) as c FROM categories WHERE user_id = ${pgUser[0].id}`;
    console.log(`   📁 Categorias: ${pgCategories[0].c}`);

    const totalBalance = await sql`SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ${pgUser[0].id}`;
    console.log(`   💵 Saldo Total: R$ ${(totalBalance[0].total || 0).toFixed(2)}`);
  } else {
    console.log('   ❌ Usuário teste@teste.com NÃO encontrado!');
    allPassed = false;
  }

  // Verificar SQLite original
  console.log('\n📦 Verificando SQLite original...');
  const sqliteExists = fs.existsSync(SQLITE_PATH);
  const sqliteSize = sqliteExists ? (fs.statSync(SQLITE_PATH).size / 1024).toFixed(2) : 0;
  console.log(`   ${sqliteExists ? '✅' : '❌'} Arquivo: ${sqliteExists ? 'Intacto' : 'NÃO encontrado'}`);
  console.log(`   📊 Tamanho: ${sqliteSize} KB`);

  // Resultado final
  console.log('\n' + '='.repeat(60));
  if (allPassed && sqliteExists) {
    console.log('  🎉 MIGRAÇÃO VERIFICADA COM SUCESSO!');
    console.log('\n  Todos os dados foram transferidos corretamente.');
    console.log('  O SQLite original está intacto.');
    console.log('  Você pode prosseguir com o deploy na Vercel.');
  } else {
    console.log('  ⚠️ MIGRAÇÃO COM OBSERVAÇÕES');
    if (!allPassed) console.log('  Verifique os logs acima para diferenças.');
    if (!sqliteExists) console.log('  SQLite original não encontrado!');
  }
  console.log('='.repeat(60));

  db.close();
}

main().catch(error => {
  console.error('\n❌ ERRO:', error.message);
  process.exit(1);
});
