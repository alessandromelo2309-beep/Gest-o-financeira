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
      const path = url.pathname.replace('/api/notifications', '');

      if (req.method === 'GET' && !path) {
        const notifications = await sql`SELECT * FROM notifications WHERE user_id = ${req.userId} ORDER BY created_at DESC LIMIT 50`;
        return res.json(notifications);
      }

      if (path === '/unread-count') {
        const result = await sql`SELECT COUNT(*) as c FROM notifications WHERE user_id = ${req.userId} AND read = 0`;
        return res.json({ count: result[0].c });
      }

      if (path === '/check') {
        const now = new Date();
        const cm = (now.getMonth() + 1).toString().padStart(2, '0');
        const cy = now.getFullYear().toString();

        const budgets = await sql`
          SELECT b.*, c.name as category_name
          FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
          WHERE b.user_id = ${req.userId} AND b.month = ${cm} AND b.year = ${parseInt(cy)}
        `;

        for (const budget of budgets) {
          const spent = await sql`SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE user_id = ${req.userId} AND category_id = ${budget.category_id} AND type = 'expense' AND to_char(date::date, 'MM') = ${cm} AND to_char(date::date, 'YYYY') = ${cy}`;
          const pct = budget.amount > 0 ? (spent[0].t / budget.amount * 100) : 0;
          if (pct >= 80 && pct < 100) {
            const existing = await sql`SELECT id FROM notifications WHERE user_id = ${req.userId} AND type = 'budget_warning' AND title LIKE ${'%' + budget.category_name + '%'}`;
            if (existing.length === 0) {
              await sql`INSERT INTO notifications (user_id, type, title, message) VALUES (${req.userId}, 'budget_warning', ${`Orçamento ${budget.category_name} em ${pct.toFixed(0)}%`}, ${`Você já gastou ${pct.toFixed(0)}% do orçamento de ${budget.category_name} este mês.`})`;
            }
          }
        }

        return res.json({ checked: true });
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`UPDATE notifications SET read = 1 WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Notificação marcada como lida' });
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM notifications WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Notificação removida' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nas notificações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
