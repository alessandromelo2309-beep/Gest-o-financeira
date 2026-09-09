const express = require('express');
const { getAll, getOne, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  try {
    const items = getAll(
      'SELECT r.*, c.name as category_name, c.icon as category_icon, a.name as account_name FROM recurring_transactions r LEFT JOIN categories c ON r.category_id = c.id LEFT JOIN accounts a ON r.account_id = a.id WHERE r.user_id = ? ORDER BY r.next_date',
      [req.userId]
    );
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar transações recorrentes' });
  }
});

router.post('/', (req, res) => {
  try {
    const { account_id, category_id, type, description, amount, frequency, next_date } = req.body;
    if (!account_id || !type || !description || !amount || !frequency || !next_date) {
      return res.status(400).json({ error: 'Campos obrigatórios: account_id, type, description, amount, frequency, next_date' });
    }
    const id = runInsert(
      'INSERT INTO recurring_transactions (user_id, account_id, category_id, type, description, amount, frequency, next_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, account_id, category_id || null, type, description, amount, frequency, next_date]
    );
    res.status(201).json({ id, message: 'Transação recorrente criada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar transação recorrente' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { account_id, category_id, type, description, amount, frequency, next_date, active } = req.body;
    const existing = getOne('SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Transação recorrente não encontrada' });

    runQuery(
      'UPDATE recurring_transactions SET account_id = COALESCE(?, account_id), category_id = COALESCE(?, category_id), type = COALESCE(?, type), description = COALESCE(?, description), amount = COALESCE(?, amount), frequency = COALESCE(?, frequency), next_date = COALESCE(?, next_date), active = COALESCE(?, active) WHERE id = ? AND user_id = ?',
      [account_id, category_id, type, description, amount, frequency, next_date, active, req.params.id, req.userId]
    );
    res.json({ message: 'Atualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar transação recorrente' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = getOne('SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing) return res.status(404).json({ error: 'Transação recorrente não encontrada' });

    runQuery('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    res.json({ message: 'Removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover transação recorrente' });
  }
});

router.post('/process', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const due = getAll('SELECT * FROM recurring_transactions WHERE user_id = ? AND active = 1 AND next_date <= ?', [req.userId, today]);
    let processed = 0;

    for (const rec of due) {
      runInsert(
        'INSERT INTO transactions (user_id, account_id, category_id, type, description, amount, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.userId, rec.account_id, rec.category_id, rec.type, rec.description, rec.amount, today]
      );

      const balanceChange = rec.type === 'income' ? rec.amount : -rec.amount;
      runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?', [balanceChange, rec.account_id, req.userId]);

      const next = calculateNextDate(today, rec.frequency);
      runQuery('UPDATE recurring_transactions SET next_date = ? WHERE id = ?', [next, rec.id]);
      processed++;
    }

    res.json({ message: `${processed} transações processadas` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar transações recorrentes' });
  }
});

function calculateNextDate(currentDate, frequency) {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'biweekly': date.setDate(date.getDate() + 14); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
  }
  return date.toISOString().split('T')[0];
}

module.exports = router;
