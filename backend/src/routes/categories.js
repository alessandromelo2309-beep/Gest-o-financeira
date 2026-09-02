const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { type } = req.query;
  let sql = 'SELECT * FROM categories WHERE user_id = ?';
  const params = [req.userId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY type, name';
  const categories = getAll(sql, params);
  res.json(categories);
});

router.post('/', [
  body('name').trim().notEmpty(),
  body('type').isIn(['income', 'expense']),
  body('icon').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, type, icon, color } = req.body;

  const categoryId = runInsert('INSERT INTO categories (user_id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
    [req.userId, name, type, icon || '📁', color || '#6B7280']);

  const category = getOne('SELECT * FROM categories WHERE id = ?', [categoryId]);
  res.status(201).json(category);
});

router.put('/:id', [
  body('name').optional().trim().notEmpty(),
  body('type').optional().isIn(['income', 'expense']),
  body('icon').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const category = getOne('SELECT * FROM categories WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]);
  if (!category) {
    return res.status(404).json({ error: 'Categoria não encontrada' });
  }

  const { name, type, icon, color } = req.body;
  runQuery(`
    UPDATE categories SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      icon = COALESCE(?, icon),
      color = COALESCE(?, color)
    WHERE id = ?
  `, [name, type, icon, color, req.params.id]);

  const updated = getOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const category = getOne('SELECT * FROM categories WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]);
  if (!category) {
    return res.status(404).json({ error: 'Categoria não encontrada' });
  }

  runQuery('UPDATE transactions SET category_id = NULL WHERE category_id = ?', [req.params.id]);
  runQuery('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ message: 'Categoria excluída' });
});

module.exports = router;
