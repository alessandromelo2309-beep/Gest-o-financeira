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
      const path = url.pathname.replace('/api/tags', '');

      if (req.method === 'GET' && !path) {
        const tags = await sql`SELECT * FROM tags WHERE user_id = ${req.userId} ORDER BY name`;
        return res.json(tags);
      }

      if (req.method === 'POST' && !path) {
        const { name, color } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
        const result = await sql`INSERT INTO tags (user_id, name, color) VALUES (${req.userId}, ${name}, ${color || '#3B82F6'}) RETURNING *`;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { name, color } = req.body;
        const result = await sql`UPDATE tags SET name = COALESCE(${name}, name), color = COALESCE(${color}, color) WHERE id = ${id} AND user_id = ${req.userId} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Tag não encontrada' });
        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM tags WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Tag removida' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nas tags:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
