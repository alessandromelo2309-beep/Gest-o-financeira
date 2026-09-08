const { sql } = require('./db');
const { authMiddleware } = require('./auth-middleware');

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const path = url.pathname.replace('/api/transactions', '');

      if (req.method === 'GET' && !path) {
        const type = url.searchParams.get('type');
        const search = url.searchParams.get('search');
        let transactions;
        if (search) {
          transactions = await sql`
            SELECT t.*, c.name as category_name, c.icon as category_icon, a.name as account_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = ${req.userId}
            AND (t.description ILIKE ${'%' + search + '%'} OR c.name ILIKE ${'%' + search + '%'})
            ORDER BY t.date DESC, t.created_at DESC
          `;
        } else if (type) {
          transactions = await sql`
            SELECT t.*, c.name as category_name, c.icon as category_icon, a.name as account_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = ${req.userId} AND t.type = ${type}
            ORDER BY t.date DESC, t.created_at DESC
          `;
        } else {
          transactions = await sql`
            SELECT t.*, c.name as category_name, c.icon as category_icon, a.name as account_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN accounts a ON t.account_id = a.id
            WHERE t.user_id = ${req.userId}
            ORDER BY t.date DESC, t.created_at DESC
          `;
        }
        return res.json(transactions);
      }

      if (req.method === 'POST') {
        const { account_id, to_account_id, category_id, type, description, amount, date, notes } = req.body;
        if (!account_id || !type || !description || !amount || !date) {
          return res.status(400).json({ error: 'Campos obrigatórios: account_id, type, description, amount, date' });
        }

        const result = await sql`
          INSERT INTO transactions (user_id, account_id, to_account_id, category_id, type, description, amount, date, notes)
          VALUES (${req.userId}, ${account_id}, ${to_account_id || null}, ${category_id || null}, ${type}, ${description}, ${amount}, ${date}, ${notes || null})
          RETURNING *
        `;

        const balanceChange = type === 'income' ? amount : -amount;
        await sql`UPDATE accounts SET balance = balance + ${balanceChange} WHERE id = ${account_id} AND user_id = ${req.userId}`;

        if (type === 'transfer' && to_account_id) {
          await sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${to_account_id} AND user_id = ${req.userId}`;
        }

        return res.status(201).json(result[0]);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { account_id, to_account_id, category_id, type, description, amount, date, notes } = req.body;

        const old = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${req.userId}`;
        if (old.length === 0) return res.status(404).json({ error: 'Transação não encontrada' });

        const oldTx = old[0];
        const oldBalanceChange = oldTx.type === 'income' ? -oldTx.amount : oldTx.amount;
        await sql`UPDATE accounts SET balance = balance + ${oldBalanceChange} WHERE id = ${oldTx.account_id} AND user_id = ${req.userId}`;

        if (oldTx.type === 'transfer' && oldTx.to_account_id) {
          await sql`UPDATE accounts SET balance = balance + ${oldTx.amount} WHERE id = ${oldTx.to_account_id} AND user_id = ${req.userId}`;
        }

        const result = await sql`
          UPDATE transactions SET
            account_id = COALESCE(${account_id}, account_id),
            to_account_id = COALESCE(${to_account_id}, to_account_id),
            category_id = COALESCE(${category_id}, category_id),
            type = COALESCE(${type}, type),
            description = COALESCE(${description}, description),
            amount = COALESCE(${amount}, amount),
            date = COALESCE(${date}, date),
            notes = COALESCE(${notes}, notes)
          WHERE id = ${id} AND user_id = ${req.userId}
          RETURNING *
        `;

        const newBalanceChange = (type || oldTx.type) === 'income' ? (amount || oldTx.amount) : -(amount || oldTx.amount);
        await sql`UPDATE accounts SET balance = balance + ${newBalanceChange} WHERE id = ${account_id || oldTx.account_id} AND user_id = ${req.userId}`;

        if ((type || oldTx.type) === 'transfer' && (to_account_id || oldTx.to_account_id)) {
          await sql`UPDATE accounts SET balance = balance - ${amount || oldTx.amount} WHERE id = ${to_account_id || oldTx.to_account_id} AND user_id = ${req.userId}`;
        }

        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        const tx = await sql`SELECT * FROM transactions WHERE id = ${id} AND user_id = ${req.userId}`;
        if (tx.length === 0) return res.status(404).json({ error: 'Transação não encontrada' });

        const balanceChange = tx[0].type === 'income' ? -tx[0].amount : tx[0].amount;
        await sql`UPDATE accounts SET balance = balance + ${balanceChange} WHERE id = ${tx[0].account_id} AND user_id = ${req.userId}`;

        if (tx[0].type === 'transfer' && tx[0].to_account_id) {
          await sql`UPDATE accounts SET balance = balance + ${tx[0].amount} WHERE id = ${tx[0].to_account_id} AND user_id = ${req.userId}`;
        }

        await sql`DELETE FROM transactions WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Transação removida' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nas transações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
