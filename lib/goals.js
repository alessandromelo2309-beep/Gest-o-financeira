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
      const path = url.pathname.replace('/api/goals', '');

      if (req.method === 'GET' && !path) {
        const goals = await sql`SELECT * FROM goals WHERE user_id = ${req.userId} ORDER BY created_at DESC`;
        return res.json(goals);
      }

      if (req.method === 'POST' && path && path.match(/^\/\d+\/add$/)) {
        const id = parseInt(path.replace('/', '').replace('/add', ''));
        const { amount } = req.body;
        if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valor deve ser um número positivo' });
        const goals = await sql`SELECT * FROM goals WHERE id = ${id} AND user_id = ${req.userId}`;
        if (goals.length === 0) return res.status(404).json({ error: 'Meta não encontrada' });
        const newAmount = parseFloat(goals[0].current_amount) + parseFloat(amount);
        const result = await sql`UPDATE goals SET current_amount = ${newAmount} WHERE id = ${id} AND user_id = ${req.userId} RETURNING *`;
        return res.json(result[0]);
      }

      if (req.method === 'POST') {
        const { name, icon, target_amount, current_amount, monthly_contribution, deadline, color } = req.body;
        if (!name || !target_amount) return res.status(400).json({ error: 'Nome e valor alvo são obrigatórios' });
        const result = await sql`INSERT INTO goals (user_id, name, icon, target_amount, current_amount, monthly_contribution, deadline, color) VALUES (${req.userId}, ${name}, ${icon || '🎯'}, ${target_amount}, ${current_amount || 0}, ${monthly_contribution || 0}, ${deadline || null}, ${color || '#3B82F6'}) RETURNING *`;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { name, icon, target_amount, current_amount, monthly_contribution, deadline, color, status } = req.body;
        const result = await sql`UPDATE goals SET name = COALESCE(${name}, name), icon = COALESCE(${icon}, icon), target_amount = COALESCE(${target_amount}, target_amount), current_amount = COALESCE(${current_amount}, current_amount), monthly_contribution = COALESCE(${monthly_contribution}, monthly_contribution), deadline = COALESCE(${deadline}, deadline), color = COALESCE(${color}, color), status = COALESCE(${status}, status) WHERE id = ${id} AND user_id = ${req.userId} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Meta não encontrada' });
        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM goals WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Meta removida' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro nas metas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
