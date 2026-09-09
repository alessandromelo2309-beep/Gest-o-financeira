const express = require('express');
const { getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  let config = getOne('SELECT * FROM dashboard_config WHERE user_id = ?', [req.userId]);
  if (!config) {
    runInsert('INSERT INTO dashboard_config (user_id, hidden_cards) VALUES (?, ?)', [req.userId, '[]']);
    config = getOne('SELECT * FROM dashboard_config WHERE user_id = ?', [req.userId]);
  }
  res.json({ hidden_cards: JSON.parse(config.hidden_cards || '[]') });
});

router.put('/', (req, res) => {
  const { hidden_cards } = req.body;
  const config = getOne('SELECT * FROM dashboard_config WHERE user_id = ?', [req.userId]);
  if (config) {
    runQuery('UPDATE dashboard_config SET hidden_cards = ? WHERE user_id = ?', [JSON.stringify(hidden_cards || []), req.userId]);
  } else {
    runInsert('INSERT INTO dashboard_config (user_id, hidden_cards) VALUES (?, ?)', [req.userId, JSON.stringify(hidden_cards || [])]);
  }
  res.json({ message: 'Configuração atualizada', hidden_cards: hidden_cards || [] });
});

module.exports = router;
