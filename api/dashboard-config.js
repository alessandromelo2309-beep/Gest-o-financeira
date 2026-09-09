const { sql, ensureInit } = require('./db');
const { authMiddleware } = require('./auth-middleware');

async function handler(req, res) {
  await ensureInit();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return authMiddleware(async (req, res) => {
    try {
      if (req.method === 'GET') {
        const config = await sql`SELECT * FROM dashboard_config WHERE user_id = ${req.userId}`;
        if (config.length === 0) {
          return res.json({ hidden_cards: [] });
        }
        return res.json({ hidden_cards: JSON.parse(config[0].hidden_cards || '[]') });
      }

      if (req.method === 'POST') {
        const { hidden_cards } = req.body;
        const existing = await sql`SELECT id FROM dashboard_config WHERE user_id = ${req.userId}`;
        if (existing.length > 0) {
          await sql`UPDATE dashboard_config SET hidden_cards = ${JSON.stringify(hidden_cards || [])} WHERE user_id = ${req.userId}`;
        } else {
          await sql`INSERT INTO dashboard_config (user_id, hidden_cards) VALUES (${req.userId}, ${JSON.stringify(hidden_cards || [])})`;
        }
        return res.json({ message: 'Configuração salva' });
      }

      return res.status(404).json({ error: 'Rota não encontrada' });
    } catch (error) {
      console.error('Erro na configuração do dashboard:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  })(req, res);
}

module.exports = handler;
