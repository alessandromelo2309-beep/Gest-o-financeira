const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const accounts = getAll('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at', [req.userId]);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar contas' });
  }
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('type').isIn(['checking', 'savings', 'credit', 'investment', 'cash']),
  body('balance').optional().isFloat(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, type, balance, color } = req.body;

    const accountId = runInsert('INSERT INTO accounts (user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?)',
      [req.userId, name, type, balance || 0, color || '#3B82F6']);

    const account = getOne('SELECT * FROM accounts WHERE id = ?', [accountId]);
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('type').optional().isIn(['checking', 'savings', 'credit', 'investment', 'cash']),
  body('balance').optional().isFloat(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  try {
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
      WHERE id = ? AND user_id = ?
    `, [name, type, balance, color, req.params.id, req.userId]);

    const updated = getOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const account = getOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const hasTransactions = getOne('SELECT COUNT(*) as count FROM transactions WHERE account_id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (hasTransactions && hasTransactions.count > 0) {
      return res.status(400).json({ error: 'Não é possível excluir conta com transações' });
    }

    runQuery('DELETE FROM accounts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Conta excluída' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir conta' });
  }
});

module.exports = router;
