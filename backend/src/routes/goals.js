const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const goals = getAll('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  res.json(goals);
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('target_amount').isFloat({ gt: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, icon, target_amount, monthly_contribution, deadline, color } = req.body;
  const id = runInsert(
    'INSERT INTO goals (user_id, name, icon, target_amount, monthly_contribution, deadline, color) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, name, icon || '🎯', target_amount, monthly_contribution || 0, deadline || null, color || '#3B82F6']
  );
  res.status(201).json(getOne('SELECT * FROM goals WHERE id = ?', [id]));
});

router.put('/:id', (req, res) => {
  const goal = getOne('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  const { name, icon, target_amount, current_amount, monthly_contribution, deadline, color, status } = req.body;
  runQuery(
    'UPDATE goals SET name=COALESCE(?,name), icon=COALESCE(?,icon), target_amount=COALESCE(?,target_amount), current_amount=COALESCE(?,current_amount), monthly_contribution=COALESCE(?,monthly_contribution), deadline=COALESCE(?,deadline), color=COALESCE(?,color), status=COALESCE(?,status) WHERE id=?',
    [name, icon, target_amount, current_amount, monthly_contribution, deadline, color, status, req.params.id]
  );
  res.json(getOne('SELECT * FROM goals WHERE id = ?', [req.params.id]));
});

router.post('/:id/add', [
  body('amount').isFloat({ gt: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const goal = getOne('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  const newAmount = goal.current_amount + req.body.amount;
  const completed = newAmount >= goal.target_amount;

  runQuery(
    'UPDATE goals SET current_amount = ?, status = ? WHERE id = ?',
    [newAmount, completed ? 'completed' : goal.status, req.params.id]
  );
  res.json(getOne('SELECT * FROM goals WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  const goal = getOne('SELECT * FROM goals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });
  runQuery('DELETE FROM goals WHERE id = ?', [req.params.id]);
  res.json({ message: 'Meta excluída' });
});

module.exports = router;
