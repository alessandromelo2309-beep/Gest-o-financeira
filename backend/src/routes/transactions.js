const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getAll, runInsert, runQuery } = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const { month, year, category_id, account_id, type } = req.query;

  let sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           a.name as account_name, a2.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts a2 ON t.to_account_id = a2.id
    WHERE t.user_id = ?
  `;
  const params = [req.userId];

  if (month && year) {
    sql += ` AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?`;
    params.push(month.toString().padStart(2, '0'), year.toString());
  }
  if (category_id) {
    sql += ` AND t.category_id = ?`;
    params.push(category_id);
  }
  if (account_id) {
    sql += ` AND t.account_id = ?`;
    params.push(account_id);
  }
  if (type) {
    sql += ` AND t.type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY t.date DESC, t.created_at DESC`;

  const transactions = getAll(sql, params);
  res.json(transactions);
});

router.post('/', [
  body('account_id').isInt(),
  body('type').isIn(['income', 'expense', 'transfer']),
  body('description').trim().notEmpty(),
  body('amount').isFloat({ gt: 0 }),
  body('date').isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { account_id, to_account_id, category_id, type, description, amount, date, notes } = req.body;

  if (type === 'transfer' && !to_account_id) {
    return res.status(400).json({ error: 'Conta de destino é obrigatória para transferências' });
  }

  const transactionId = runInsert(`
    INSERT INTO transactions (user_id, account_id, to_account_id, category_id, type, description, amount, date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [req.userId, account_id, to_account_id || null, category_id || null, type, description, amount, date, notes || null]);

  if (type === 'income') {
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?', [amount, account_id, req.userId]);
  } else if (type === 'expense') {
    runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?', [amount, account_id, req.userId]);
  } else if (type === 'transfer') {
    runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?', [amount, account_id, req.userId]);
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?', [amount, to_account_id, req.userId]);
  }

  const transaction = getOne(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, a.name as account_name,
           a2.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts a2 ON t.to_account_id = a2.id
    WHERE t.id = ?
  `, [transactionId]);

  res.status(201).json(transaction);
});

router.put('/:id', [
  body('account_id').optional().isInt(),
  body('type').optional().isIn(['income', 'expense', 'transfer']),
  body('description').optional().trim().notEmpty(),
  body('amount').optional().isFloat({ gt: 0 }),
  body('date').optional().isISO8601()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const oldTransaction = getOne('SELECT * FROM transactions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]);
  if (!oldTransaction) {
    return res.status(404).json({ error: 'Transação não encontrada' });
  }

  if (oldTransaction.type === 'income') {
    runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTransaction.amount, oldTransaction.account_id]);
  } else if (oldTransaction.type === 'expense') {
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTransaction.amount, oldTransaction.account_id]);
  } else if (oldTransaction.type === 'transfer') {
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ?', [oldTransaction.amount, oldTransaction.account_id]);
    if (oldTransaction.to_account_id) {
      runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ?', [oldTransaction.amount, oldTransaction.to_account_id]);
    }
  }

  const { account_id, to_account_id, category_id, type, description, amount, date, notes } = req.body;
  runQuery(`
    UPDATE transactions SET
      account_id = COALESCE(?, account_id),
      to_account_id = COALESCE(?, to_account_id),
      category_id = COALESCE(?, category_id),
      type = COALESCE(?, type),
      description = COALESCE(?, description),
      amount = COALESCE(?, amount),
      date = COALESCE(?, date),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `, [account_id, to_account_id, category_id, type, description, amount, date, notes, req.params.id]);

  const updatedTransaction = getOne('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  if (updatedTransaction.type === 'income') {
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ?', [updatedTransaction.amount, updatedTransaction.account_id]);
  } else if (updatedTransaction.type === 'expense') {
    runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ?', [updatedTransaction.amount, updatedTransaction.account_id]);
  } else if (updatedTransaction.type === 'transfer') {
    runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ?', [updatedTransaction.amount, updatedTransaction.account_id]);
    if (updatedTransaction.to_account_id) {
      runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ?', [updatedTransaction.amount, updatedTransaction.to_account_id]);
    }
  }

  const transaction = getOne(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, a.name as account_name,
           a2.name as to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts a2 ON t.to_account_id = a2.id
    WHERE t.id = ?
  `, [req.params.id]);

  res.json(transaction);
});

router.delete('/:id', (req, res) => {
  const transaction = getOne('SELECT * FROM transactions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]);
  if (!transaction) {
    return res.status(404).json({ error: 'Transação não encontrada' });
  }

  if (transaction.type === 'income') {
    runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.account_id]);
  } else if (transaction.type === 'expense') {
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.account_id]);
  } else if (transaction.type === 'transfer') {
    runQuery('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.account_id]);
    if (transaction.to_account_id) {
      runQuery('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.to_account_id]);
    }
  }

  runQuery('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  res.json({ message: 'Transação excluída' });
});

module.exports = router;
