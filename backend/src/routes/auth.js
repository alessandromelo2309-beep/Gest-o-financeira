const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    const existingUser = getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = runInsert('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

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
      { name: 'Outros', type: 'expense', icon: '📦', color: '#6B7280' }
    ];

    for (const cat of defaultCategories) {
      runInsert('INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
        [userId, cat.name, cat.type, cat.icon, cat.color]);
    }

    runInsert('INSERT INTO accounts (user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?)',
      [userId, 'Conta Corrente', 'checking', 0, '#3B82F6']);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: userId, name, email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta de usuário' });
  }
});

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = getOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
  try {
    const user = getOne('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

router.put('/profile', require('../middleware/auth').authMiddleware, [
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email } = req.body;
    const user = getOne('SELECT * FROM users WHERE id = ?', [req.userId]);

    if (email && email !== user.email) {
      const existing = getOne('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.userId]);
      if (existing) return res.status(400).json({ error: 'Email já está em uso' });
    }

    runQuery('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
      [name || null, email || null, req.userId]);

    res.json(getOne('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.userId]));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

router.put('/password', require('../middleware/auth').authMiddleware, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const user = getOne('SELECT * FROM users WHERE id = ?', [req.userId]);

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    const hashed = bcrypt.hashSync(newPassword, 10);
    runQuery('UPDATE users SET password = ? WHERE id = ?', [hashed, req.userId]);
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

module.exports = router;
