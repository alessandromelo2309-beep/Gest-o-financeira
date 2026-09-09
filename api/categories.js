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
      const path = url.pathname.replace('/api/categories', '');

      if (req.method === 'GET' && !path) {
        const categories = await sql`SELECT * FROM categories WHERE user_id = ${req.userId} ORDER BY type, name`;
        return res.json(categories);
      }

      if (req.method === 'POST') {
        const { name, type, icon, color } = req.body;
        if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
        const result = await sql`INSERT INTO categories (user_id, name, type, icon, color) VALUES (${req.userId}, ${name}, ${type}, ${icon || '📁'}, ${color || '#6B7280'}) RETURNING *`;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { name, type, icon, color } = req.body;
        const result = await sql`UPDATE categories SET name = COALESCE(${name}, name), type = COALESCE(${type}, type), icon = COALESCE(${icon}, icon), color = COALESCE(${color}, color) WHERE id = ${id} AND user_id = ${req.userId} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Categoria não encontrada' });
        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM categories WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Categoria removida' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nas categorias:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
