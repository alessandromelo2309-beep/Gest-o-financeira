const handlers = {
  accounts: () => require('../lib/accounts'),
  assistant: () => require('../lib/assistant'),
  auth: () => require('../lib/auth'),
  budgets: () => require('../lib/budgets'),
  calculators: () => require('../lib/calculators'),
  cards: () => require('../lib/cards'),
  categories: () => require('../lib/categories'),
  'dashboard-config': () => require('../lib/dashboard-config'),
  export: () => require('../lib/export'),
  gamification: () => require('../lib/gamification'),
  goals: () => require('../lib/goals'),
  import: () => require('../lib/import'),
  notifications: () => require('../lib/notifications'),
  planning: () => require('../lib/planning'),
  recurring: () => require('../lib/recurring'),
  reports: () => require('../lib/reports'),
  tags: () => require('../lib/tags'),
  transactions: () => require('../lib/transactions'),
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;

  if (!pathname.startsWith('/api/')) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }

  const route = pathname.replace('/api/', '').split('/')[0];

  if (!route || !handlers[route]) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }

  try {
    const handlerFn = handlers[route]();
    return await handlerFn(req, res);
  } catch (error) {
    console.error(`Erro no handler ${route}:`, error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
};
