const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const accounts = getAll('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at', [req.userId]);
  res.json(accounts);
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('type').isIn(['checking', 'savings', 'credit', 'investment', 'cash']),
  body('balance').optional().isFloat(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, type, balance, color } = req.body;

  const accountId = runInsert('INSERT INTO accounts (user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?)',
    [req.userId, name, type, balance || 0, color || '#3B82F6']);

  const account = getOne('SELECT * FROM accounts WHERE id = ?', [accountId]);
  res.status(201).json(account);
});

router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('type').optional().isIn(['checking', 'savings', 'credit', 'investment', 'cash']),
  body('balance').optional().isFloat(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const account = getOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]);
  if (!account) {
    return res.status(404).json({ error: 'Conta não encontrada' });
  }

  const { name, type, balance, color } = req.body;
  runQuery(`
    UPDATE accounts SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      balance = COALESCE(?, balance),
      color = COALESCE(?, color)
    WHERE id = ?
  `, [name, type, balance, color, req.params.id]);

  const updated = getOne('SELECT * FROM accounts WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const account = getOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]);
  if (!account) {
    return res.status(404).json({ error: 'Conta não encontrada' });
  }

  const hasTransactions = getOne('SELECT COUNT(*) as count FROM transactions WHERE account_id = ?', [req.params.id]);
  if (hasTransactions && hasTransactions.count > 0) {
    return res.status(400).json({ error: 'Não é possível excluir conta com transações' });
  }

  runQuery('DELETE FROM accounts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Conta excluída' });
});

module.exports = router;
