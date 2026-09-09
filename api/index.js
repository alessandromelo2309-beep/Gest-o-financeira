const auth = require('./auth');
const transactions = require('./transactions');
const categories = require('./categories');
const accounts = require('./accounts');
const budgets = require('./budgets');
const goals = require('./goals');
const cards = require('./cards');
const tags = require('./tags');
const recurring = require('./recurring');
const planning = require('./planning');
const notifications = require('./notifications');
const reports = require('./reports');
const dashboardConfig = require('./dashboard-config');
const calculators = require('./calculators');
const assistant = require('./assistant');
const gamification = require('./gamification');
const exportData = require('./export');
const importData = require('./import');

const routes = [
  { prefix: '/api/auth', handler: auth },
  { prefix: '/api/transactions', handler: transactions },
  { prefix: '/api/categories', handler: categories },
  { prefix: '/api/accounts', handler: accounts },
  { prefix: '/api/budgets', handler: budgets },
  { prefix: '/api/goals', handler: goals },
  { prefix: '/api/cards', handler: cards },
  { prefix: '/api/tags', handler: tags },
  { prefix: '/api/recurring', handler: recurring },
  { prefix: '/api/planning', handler: planning },
  { prefix: '/api/notifications', handler: notifications },
  { prefix: '/api/reports', handler: reports },
  { prefix: '/api/dashboard-config', handler: dashboardConfig },
  { prefix: '/api/calculators', handler: calculators },
  { prefix: '/api/assistant', handler: assistant },
  { prefix: '/api/gamification', handler: gamification },
  { prefix: '/api/export', handler: exportData },
  { prefix: '/api/import', handler: importData },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const pathname = url.pathname;

  for (const route of routes) {
    if (pathname.startsWith(route.prefix)) {
      return route.handler(req, res);
    }
  }

  return res.status(404).json({ error: 'Rota não encontrada' });
};
