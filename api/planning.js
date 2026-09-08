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
      const path = url.pathname.replace('/api/planning', '');

      if (req.method === 'GET' && !path) {
        const plans = await sql`SELECT * FROM financial_goals WHERE user_id = ${req.userId} ORDER BY created_at DESC`;
        return res.json(plans);
      }

      if (req.method === 'POST' && !path) {
        const { name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline } = req.body;
        if (!name || !goal_amount) return res.status(400).json({ error: 'Nome e valor da meta são obrigatórios' });
        const rate = (interest_rate || 0) / 100 / 12;
        let balance = initial_amount || 0;
        let months = 0;
        while (balance < goal_amount && months < 1200) {
          balance += balance * rate + (monthly_contribution || 0);
          months++;
        }
        const projected_date = months < 1200 ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
        const result = await sql`INSERT INTO financial_goals (user_id, name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline, projected_date) VALUES (${req.userId}, ${name}, ${initial_amount || 0}, ${monthly_contribution || 0}, ${interest_rate || 0}, ${goal_amount}, ${deadline || null}, ${projected_date}) RETURNING *`;
        return res.status(201).json(result[0]);
      }

      if (req.method === 'POST' && path === '/simulate') {
        const { initial_amount, monthly_contribution, interest_rate, goal_amount, months } = req.body;
        const scenarios = [];
        for (const [label, rateMod] of [['Otimista', 0.02], ['Realista', 0], ['Conservador', -0.02]]) {
          const rate = ((interest_rate || 5) + rateMod) / 100 / 12;
          let balance = initial_amount || 0;
          const data = [];
          for (let m = 1; m <= (months || 60); m++) {
            balance += balance * rate + (monthly_contribution || 0);
            if (m % 6 === 0 || m === months || m === 1) data.push({ month: m, balance: Math.round(balance * 100) / 100 });
          }
          scenarios.push({ label, data, finalBalance: Math.round(balance * 100) / 100 });
        }
        return res.json(scenarios);
      }

      if (req.method === 'PUT' && path) {
        const id = parseInt(path.replace('/', ''));
        const { name, initial_amount, monthly_contribution, interest_rate, goal_amount, deadline } = req.body;
        const result = await sql`UPDATE financial_goals SET name = COALESCE(${name}, name), initial_amount = COALESCE(${initial_amount}, initial_amount), monthly_contribution = COALESCE(${monthly_contribution}, monthly_contribution), interest_rate = COALESCE(${interest_rate}, interest_rate), goal_amount = COALESCE(${goal_amount}, goal_amount), deadline = COALESCE(${deadline}, deadline) WHERE id = ${id} AND user_id = ${req.userId} RETURNING *`;
        if (result.length === 0) return res.status(404).json({ error: 'Plano não encontrado' });
        return res.json(result[0]);
      }

      if (req.method === 'DELETE' && path) {
        const id = parseInt(path.replace('/', ''));
        await sql`DELETE FROM financial_goals WHERE id = ${id} AND user_id = ${req.userId}`;
        return res.json({ message: 'Plano removido' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro no planejamento:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
