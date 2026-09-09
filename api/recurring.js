const { sql, ensureInit } = require('./db');
const { authMiddleware } = require('./auth-middleware');

async function handler(req, res) {
  await ensureInit();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const path = url.pathname.replace('/api/recurring', '');

      if (req.method === 'GET' && !path) {
        const recurring = await sql`
          SELECT r.*, c.name as category_name, c.icon as category_icon, a.name as account_name
          FROM recurring_transactions r
          LEFT JOIN categories c ON r.category_id = c.id
          LEFT JOIN accounts a ON r.account_id = a.id
          WHERE r.user_id = ${req.userId}
          ORDER BY r.next_date
        `;
        return res.json(recurring);
      }

      if (req.method === 'POST') {
        const { account_id, category_id, type, description, amount, frequency, next_date } = req.body;
        if (!account_id || !type || !description || !amount || !frequency || !next_date) {
          return res.status(400).json({ error: 'Campos obrigatórios: account_id, type, description, amount, frequency, next_date' });
        }
        const result = await sql`
          INSERT INTO recurring_transactions (user_id, account_id, category_id, type, description, amount, frequency, next_date)
          VALUES (${req.userId}, ${account_id}, ${category_id || null}, ${type}, ${description}, ${amount}, ${frequency}, ${next_date})
          RETURNING *
        `;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { account_id, category_id, type, description, amount, frequency, next_date, active } = req.body;
        const result = await sql`
          UPDATE recurring_transactions SET
            account_id = COALESCE(${account_id}, account_id),
            category_id = COALESCE(${category_id}, category_id),
            type = COALESCE(${type}, type),
            description = COALESCE(${description}, description),
            amount = COALESCE(${amount}, amount),
            frequency = COALESCE(${frequency}, frequency),
            next_date = COALESCE(${next_date}, next_date),
            active = COALESCE(${active}, active)
          WHERE id = ${id} AND user_id = ${req.userId}
          RETURNING *
        `;
        if (result.length === 0) return res.status(404).json({ error: 'Transação recorrente não encontrada' });
        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM recurring_transactions WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Transação recorrente removida' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nas transações recorrentes:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
