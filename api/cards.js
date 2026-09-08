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
      const path = url.pathname.replace('/api/cards', '');

      if (req.method === 'GET' && !path) {
        const cards = await sql`SELECT * FROM credit_cards WHERE user_id = ${req.userId} ORDER BY created_at`;
        return res.json(cards);
      }

      if (path === '/summary') {
        const cards = await sql`SELECT * FROM credit_cards WHERE user_id = ${req.userId}`;
        return res.json({
          count: cards.length,
          totalLimit: cards.reduce((sum, c) => sum + c.limit_amount, 0),
          totalClosingDay: cards.length > 0 ? cards[0].closing_day : 1,
          totalDueDay: cards.length > 0 ? cards[0].due_day : 10,
        });
      }

      if (req.method === 'POST') {
        const { name, brand, last_four, limit_amount, closing_day, due_day, color } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
        const result = await sql`INSERT INTO credit_cards (user_id, name, brand, last_four, limit_amount, closing_day, due_day, color) VALUES (${req.userId}, ${name}, ${brand || 'outro'}, ${last_four || ''}, ${limit_amount || 0}, ${closing_day || 1}, ${due_day || 10}, ${color || '#6B7280'}) RETURNING *`;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { name, brand, last_four, limit_amount, closing_day, due_day, color } = req.body;
        const result = await sql`UPDATE credit_cards SET name = COALESCE(${name}, name), brand = COALESCE(${brand}, brand), last_four = COALESCE(${last_four}, last_four), limit_amount = COALESCE(${limit_amount}, limit_amount), closing_day = COALESCE(${closing_day}, closing_day), due_day = COALESCE(${due_day}, due_day), color = COALESCE(${color}, color) WHERE id = ${id} AND user_id = ${req.userId} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Cartão não encontrado' });
        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM credit_cards WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Cartão removido' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nos cartões:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
