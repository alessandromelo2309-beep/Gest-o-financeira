const { sql } = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, JWT_SECRET } = require('./auth-middleware');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace('/api/auth', '');

  if (req.method === 'POST' && path === '/register') {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await sql`INSERT INTO users (name, email, password) VALUES (${name}, ${email}, ${hashedPassword}) RETURNING id`;
    const userId = result[0].id;

    const defaultCategories = [
      { name: 'Salário', type: 'income', icon: '💰', color: '#10B981' },
      { name: 'Freelance', type: 'income', icon: '💻', color: '#34D399' },
      { name: 'Investimentos', type: 'income', icon: '📈', color: '#6EE7B7' },
      { name: 'Alimentação', type: 'expense', icon: '🍔', color: '#EF4444' },
      { name: 'Transporte', type: 'expense', icon: '🚗', color: '#F59E0B' },
      { name: 'Moradia', type: 'expense', icon: '🏠', color: '#8B5CF6' },
      { name: 'Lazer', type: 'expense', icon: '🎮', color: '#EC4899' },
      { name: 'Saúde', type: 'expense', icon: '🏥', color: '#06B6D4' },
      { name: 'Educação', type: 'expense', icon: '📚', color: '#3B82F6' },
      { name: 'Outros', type: 'expense', icon: '📦', color: '#6B7280' },
    ];

    for (const cat of defaultCategories) {
      await sql`INSERT INTO categories (user_id, name, type, icon, color) VALUES (${userId}, ${cat.name}, ${cat.type}, ${cat.icon}, ${cat.color})`;
    }

    await sql`INSERT INTO accounts (user_id, name, type, balance, color) VALUES (${userId}, 'Conta Corrente', 'checking', 0, '#3B82F6')`;

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: { id: userId, name, email } });
  }

  if (req.method === 'POST' && path === '/login') {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  }

  if (req.method === 'GET' && path === '/me') {
    return authMiddleware(async (req, res) => {
      const users = await sql`SELECT id, name, email, created_at FROM users WHERE id = ${req.userId}`;
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      return res.json(users[0]);
    })(req, res);
  }

  if (req.method === 'PUT' && path === '/profile') {
    return authMiddleware(async (req, res) => {
      const { name, email } = req.body;
      const users = await sql`SELECT * FROM users WHERE id = ${req.userId}`;
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (email && email !== users[0].email) {
        const existing = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${req.userId}`;
        if (existing.length > 0) {
          return res.status(400).json({ error: 'Email já está em uso' });
        }
      }

      await sql`UPDATE users SET name = COALESCE(${name}, name), email = COALESCE(${email}, email) WHERE id = ${req.userId}`;
      const updated = await sql`SELECT id, name, email, created_at FROM users WHERE id = ${req.userId}`;
      return res.json(updated[0]);
    })(req, res);
  }

  if (req.method === 'PUT' && path === '/password') {
    return authMiddleware(async (req, res) => {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Senha atual e nova senha (mín. 6 caracteres) são obrigatórias' });
      }

      const users = await sql`SELECT * FROM users WHERE id = ${req.userId}`;
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const valid = await bcrypt.compare(currentPassword, users[0].password);
      if (!valid) {
        return res.status(400).json({ error: 'Senha atual incorreta' });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await sql`UPDATE users SET password = ${hashed} WHERE id = ${req.userId}`;
      return res.json({ message: 'Senha alterada com sucesso' });
    })(req, res);
  }

  return res.status(404).json({ error: 'Rota não encontrada' });
}

module.exports = handler;
