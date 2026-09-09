const url = require('url');

const handlers = {
  '/api/auth': require('./auth'),
  '/api/transactions': require('./transactions'),
  '/api/categories': require('./categories'),
  '/api/accounts': require('./accounts'),
  '/api/budgets': require('./budgets'),
  '/api/goals': require('./goals'),
  '/api/cards': require('./cards'),
  '/api/tags': require('./tags'),
  '/api/recurring': require('./recurring'),
  '/api/planning': require('./planning'),
  '/api/notifications': require('./notifications'),
  '/api/reports': require('./reports'),
  '/api/dashboard-config': require('./dashboard-config'),
  '/api/calculators': require('./calculators'),
  '/api/assistant': require('./assistant'),
  '/api/gamification': require('./gamification'),
  '/api/export': require('./export'),
  '/api/import': require('./import'),
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  for (const [prefix, handler] of Object.entries(handlers)) {
    if (pathname.startsWith(prefix)) {
      try {
        return await handler(req, res);
      } catch (err) {
        console.error(`Error in ${prefix}:`, err);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
      }
    }
  }

  return res.status(404).json({ error: 'Rota não encontrada' });
};
