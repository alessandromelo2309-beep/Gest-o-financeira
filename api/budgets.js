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
      const path = url.pathname.replace('/api/budgets', '');

      if (req.method === 'GET' && !path) {
        const month = url.searchParams.get('month');
        const year = url.searchParams.get('year');
        let budgets;
        if (month && year) {
          budgets = await sql`SELECT b.*, c.name as category_name, c.icon as category_icon FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ${req.userId} AND b.month = ${month} AND b.year = ${parseInt(year)} ORDER BY c.name`;
        } else {
          budgets = await sql`SELECT b.*, c.name as category_name, c.icon as category_icon FROM budgets b LEFT JOIN categories c ON b.category_id = c.id WHERE b.user_id = ${req.userId} ORDER BY b.year DESC, b.month DESC`;
        }
        return res.json(budgets);
      }

      if (req.method === 'POST') {
        const { category_id, amount, month, year } = req.body;
        if (!category_id || !amount || !month || !year) {
          return res.status(400).json({ error: 'Campos obrigatórios: category_id, amount, month, year' });
        }
        const existing = await sql`SELECT id FROM budgets WHERE user_id = ${req.userId} AND category_id = ${category_id} AND month = ${month} AND year = ${year}`;
        if (existing.length > 0) {
          const result = await sql`UPDATE budgets SET amount = ${amount} WHERE id = ${existing[0].id} RETURNING *`;
          return res.json(result[0]);
        }
        const result = await sql`INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES (${req.userId}, ${category_id}, ${amount}, ${month}, ${year}) RETURNING *`;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM budgets WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Orçamento removido' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nos orçamentos:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
