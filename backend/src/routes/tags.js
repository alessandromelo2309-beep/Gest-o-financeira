const express = require('express');
const { getAll, getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const tags = getAll('SELECT * FROM tags WHERE user_id = ? ORDER BY name', [req.userId]);
  res.json(tags);
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const id = runInsert('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)', [req.userId, name.trim(), color || '#3B82F6']);
    res.status(201).json({ id, name: name.trim(), color: color || '#3B82F6' });
  } catch (e) {
    res.status(400).json({ error: 'Tag já existe' });
  }
});

router.delete('/:id', (req, res) => {
  runQuery('DELETE FROM tags WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ message: 'Removida' });
});

router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  runQuery('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ? AND user_id = ?',
    [name, color, req.params.id, req.userId]);
  res.json({ message: 'Atualizada' });
});

router.post('/transaction/:transactionId', (req, res) => {
  const { tag_ids } = req.body;
  if (!Array.isArray(tag_ids)) return res.status(400).json({ error: 'tag_ids deve ser um array' });
  runQuery('DELETE FROM transaction_tags WHERE transaction_id = ?', [req.params.transactionId]);
  for (const tagId of tag_ids) {
    runInsert('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)', [req.params.transactionId, tagId]);
  }
  res.json({ message: 'Tags atualizadas' });
});

router.get('/transaction/:transactionId', (req, res) => {
  const tags = getAll(
    'SELECT t.* FROM tags t JOIN transaction_tags tt ON t.id = tt.tag_id WHERE tt.transaction_id = ?',
    [req.params.transactionId]
  );
  res.json(tags);
});

module.exports = router;
