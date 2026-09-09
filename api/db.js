const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

let dbInitialized = false;

async function ensureInit() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

async function initDB() {
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

  await sql`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users))`;
  await sql`SELECT setval('accounts_id_seq', (SELECT COALESCE(MAX(id), 1) FROM accounts))`;
  await sql`SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories))`;
  await sql`SELECT setval('transactions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM transactions))`;
  await sql`SELECT setval('budgets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM budgets))`;
  await sql`SELECT setval('credit_cards_id_seq', (SELECT COALESCE(MAX(id), 1) FROM credit_cards))`;
  await sql`SELECT setval('goals_id_seq', (SELECT COALESCE(MAX(id), 1) FROM goals))`;
  await sql`SELECT setval('recurring_transactions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM recurring_transactions))`;
  await sql`SELECT setval('notifications_id_seq', (SELECT COALESCE(MAX(id), 1) FROM notifications))`;
  await sql`SELECT setval('tags_id_seq', (SELECT COALESCE(MAX(id), 1) FROM tags))`;
  await sql`SELECT setval('achievements_id_seq', (SELECT COALESCE(MAX(id), 1) FROM achievements))`;
  await sql`SELECT setval('streaks_id_seq', (SELECT COALESCE(MAX(id), 1) FROM streaks))`;
  await sql`SELECT setval('dashboard_config_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dashboard_config))`;
  await sql`SELECT setval('financial_goals_id_seq', (SELECT COALESCE(MAX(id), 1) FROM financial_goals))`;
}

module.exports = { sql, initDB, ensureInit };
