const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const { month, year } = req.query;

    let sql = `
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
    `;
    const params = [req.userId];

    if (month && year) {
      sql += ` AND b.month = ? AND b.year = ?`;
      params.push(month, year);
    }

    sql += ` ORDER BY b.year DESC, b.month DESC`;
    const budgets = getAll(sql, params);
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
});

router.post('/', [
  body('category_id').isInt(),
  body('amount').isFloat({ gt: 0 }),
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2020 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_id, amount, month, year } = req.body;

    const existing = getOne(
      'SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [req.userId, category_id, month, year]
    );

    if (existing) {
      runQuery('UPDATE budgets SET amount = ? WHERE id = ? AND user_id = ?', [amount, existing.id, req.userId]);
      const updated = getOne(`
        SELECT b.*, c.name as category_name, c.icon as category_icon
        FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
        WHERE b.id = ? AND b.user_id = ?
      `, [existing.id, req.userId]);
      return res.json(updated);
    }

    const budgetId = runInsert('INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)',
      [req.userId, category_id, amount, month, year]);

    const budget = getOne(`
      SELECT b.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ? AND b.user_id = ?
    `, [budgetId, req.userId]);

    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar orçamento' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const budget = getOne('SELECT * FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]);
    if (!budget) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    runQuery('DELETE FROM budgets WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Orçamento excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir orçamento' });
  }
});

module.exports = router;
