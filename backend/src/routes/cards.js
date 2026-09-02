const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const cards = getAll('SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  res.json(cards);
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('limit_amount').isFloat({ gt: 0 }),
  body('closing_day').isInt({ min: 1, max: 31 }),
  body('due_day').isInt({ min: 1, max: 31 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, brand, last_four, limit_amount, closing_day, due_day, color } = req.body;
  const id = runInsert(
    'INSERT INTO credit_cards (user_id, name, brand, last_four, limit_amount, closing_day, due_day, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, name, brand || 'outro', last_four || '', limit_amount, closing_day, due_day, color || '#6B7280']
  );
  const card = getOne('SELECT * FROM credit_cards WHERE id = ?', [id]);
  res.status(201).json(card);
});

router.put('/:id', (req, res) => {
  const card = getOne('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });

  const { name, brand, last_four, limit_amount, closing_day, due_day, color } = req.body;
  runQuery(
    'UPDATE credit_cards SET name=COALESCE(?,name), brand=COALESCE(?,brand), last_four=COALESCE(?,last_four), limit_amount=COALESCE(?,limit_amount), closing_day=COALESCE(?,closing_day), due_day=COALESCE(?,due_day), color=COALESCE(?,color) WHERE id=?',
    [name, brand, last_four, limit_amount, closing_day, due_day, color, req.params.id]
  );
  res.json(getOne('SELECT * FROM credit_cards WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const card = getOne('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!card) return res.status(404).json({ error: 'Cartão não encontrado' });
  runQuery('DELETE FROM credit_cards WHERE id = ?', [req.params.id]);
  res.json({ message: 'Cartão excluído' });
});

router.get('/summary', (req, res) => {
  const cards = getAll('SELECT * FROM credit_cards WHERE user_id = ?', [req.userId]);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthStr = currentMonth.toString().padStart(2, '0');

  const result = cards.map(card => {
    const spent = getOne(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
       WHERE user_id = ? AND account_id IN (SELECT id FROM accounts WHERE user_id = ?)
       AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
       AND description LIKE '%' || ? || '%'`,
      [req.userId, req.userId, monthStr, currentYear.toString(), card.name]
    );
    return { ...card, spent: spent?.total || 0, available: (card.limit_amount || 0) - (spent?.total || 0) };
  });

  res.json(result);
});

module.exports = router;
