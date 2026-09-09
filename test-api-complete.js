require('dotenv').config({ path: __dirname + '/backend/.env' });

const authHandler = require('./api/auth');
const accountsHandler = require('./api/accounts');
const transactionsHandler = require('./api/transactions');
const categoriesHandler = require('./api/categories');
const cardsHandler = require('./api/cards');
const budgetsHandler = require('./api/budgets');
const goalsHandler = require('./api/goals');
const tagsHandler = require('./api/tags');
const recurringHandler = require('./api/recurring');
const notificationsHandler = require('./api/notifications');
const reportsHandler = require('./api/reports');
const planningHandler = require('./api/planning');
const exportHandler = require('./api/export');
const importHandler = require('./api/import');
const gamificationHandler = require('./api/gamification');
const assistantHandler = require('./api/assistant');
const calculatorsHandler = require('./api/calculators');
const dashboardConfigHandler = require('./api/dashboard-config');

const handlers = {
  auth: authHandler,
  accounts: accountsHandler,
  transactions: transactionsHandler,
  categories: categoriesHandler,
  cards: cardsHandler,
  budgets: budgetsHandler,
  goals: goalsHandler,
  tags: tagsHandler,
  recurring: recurringHandler,
  notifications: notificationsHandler,
  reports: reportsHandler,
  planning: planningHandler,
  export: exportHandler,
  import: importHandler,
  gamification: gamificationHandler,
  assistant: assistantHandler,
  calculators: calculatorsHandler,
  'dashboard-config': dashboardConfigHandler,
};

function makeReq(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json', host: 'localhost:3001' };
  if (token) headers['authorization'] = 'Bearer ' + token;
  return {
    method,
    url: 'http://localhost:3001' + path,
    headers,
    body: body ? (typeof body === 'string' ? JSON.parse(body) : body) : undefined,
  };
}

function makeRes() {
  let statusCode = 200;
  let responseData = null;
  let headers = {};
  const res = {
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; return res; },
    end: () => res,
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };
  return res;
}

function testRoute(name, method, path, body, token) {
  return new Promise((resolve) => {
    const routeName = path.split('/api/')[1] || path;
    const serviceName = routeName.split('/')[0];
    const handler = handlers[serviceName];
    if (!handler) {
      console.log('  [SKIP] ' + name + ' - no handler for /' + serviceName);
      resolve({ name, status: 'SKIP', code: 0 });
      return;
    }
    const req = makeReq(method, path, body, token);
    const res = makeRes();
    try {
      Promise.resolve(handler(req, res)).then(() => {
        const code = res.getStatusCode();
        const data = res.getData();
        const status = code < 500 ? (code < 400 ? 'OK' : (code < 500 ? 'CLIENT_ERR' : 'SERVER_ERR')) : 'SERVER_ERR';
        const statusIcon = status === 'OK' ? '[PASS]' : '[FAIL]';
        const detail = data ? (typeof data === 'string' ? data.substring(0, 80) : JSON.stringify(data).substring(0, 120)) : 'no data';
        console.log('  ' + statusIcon + ' ' + method + ' ' + path + ' -> ' + code + ' | ' + detail);
        resolve({ name, status, code, data });
      }).catch(e => {
        console.log('  [ERR]  ' + method + ' ' + path + ' -> ' + e.message);
        resolve({ name, status: 'ERROR', code: 0, error: e.message });
      });
    } catch (e) {
      console.log('  [ERR]  ' + method + ' ' + path + ' -> ' + e.message);
      resolve({ name, status: 'ERROR', code: 0, error: e.message });
    }
  });
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('TESTE COMPLETO DA API - GESTAO FINANCEIRA');
  console.log('='.repeat(70));

  console.log('\n[1] TESTE DE AUTH - POST /api/auth/register');
  const reg = await testRoute('register', 'POST', '/api/auth/register', {
    name: 'Teste API', email: 'api-teste-' + Date.now() + '@test.com', password: '123456'
  });

  let token = null;
  if (reg.data && reg.data.token) {
    token = reg.data.token;
    console.log('  -> Token obtido: ' + token.substring(0, 30) + '...');
  }

  console.log('\n[2] TESTE DE AUTH - POST /api/auth/login');
  const login = await testRoute('login', 'POST', '/api/auth/login', {
    email: 'teste@teste.com', password: '123456'
  });
  if (login.data && login.data.token) {
    token = login.data.token;
    console.log('  -> Token de login obtido: ' + token.substring(0, 30) + '...');
  }

  console.log('\n[3] TESTE DE AUTH - GET /api/auth/me');
  await testRoute('me', 'GET', '/api/auth/me', null, token);

  console.log('\n[4] TESTE DE CONTAS - GET/POST /api/accounts');
  await testRoute('list accounts', 'GET', '/api/accounts', null, token);
  const acct = await testRoute('create account', 'POST', '/api/accounts', { name: 'Conta Teste', type: 'checking', balance: 100, color: '#3B82F6' }, token);

  console.log('\n[5] TESTE DE CATEGORIAS - GET/POST /api/categories');
  await testRoute('list categories', 'GET', '/api/categories', null, token);
  await testRoute('create category', 'POST', '/api/categories', { name: 'Cat Teste', type: 'expense', icon: '📁', color: '#6B7280' }, token);

  console.log('\n[6] TESTE DE TRANSACTIONS - GET/POST /api/transactions');
  await testRoute('list transactions', 'GET', '/api/transactions', null, token);

  let accountId = acct.data ? acct.data.id : null;
  if (accountId) {
    await testRoute('create transaction', 'POST', '/api/transactions', {
      account_id: accountId, type: 'income', description: 'Salario Teste', amount: 5000, date: '2026-09-08'
    }, token);
  }

  console.log('\n[7] TESTE DE CARDS - GET/POST /api/cards');
  await testRoute('list cards', 'GET', '/api/cards', null, token);
  await testRoute('card summary', 'GET', '/api/cards/summary', null, token);
  await testRoute('create card', 'POST', '/api/cards', { name: 'Cartao Teste', brand: 'visa', limit_amount: 5000, closing_day: 1, due_day: 10 }, token);

  console.log('\n[8] TESTE DE BUDGETS - GET/POST /api/budgets');
  await testRoute('list budgets', 'GET', '/api/budgets', null, token);
  await testRoute('create budget', 'POST', '/api/budgets', { category_id: 1, amount: 2000, month: '09', year: 2026 }, token);

  console.log('\n[9] TESTE DE GOALS - GET/POST /api/goals');
  await testRoute('list goals', 'GET', '/api/goals', null, token);
  await testRoute('create goal', 'POST', '/api/goals', { name: 'Meta Teste', target_amount: 10000, current_amount: 0, monthly_contribution: 500 }, token);

  console.log('\n[10] TESTE DE TAGS - GET/POST /api/tags');
  await testRoute('list tags', 'GET', '/api/tags', null, token);
  await testRoute('create tag', 'POST', '/api/tags', { name: 'tag-teste', color: '#3B82F6' }, token);

  console.log('\n[11] TESTE DE RECURRING - GET/POST /api/recurring');
  await testRoute('list recurring', 'GET', '/api/recurring', null, token);
  if (accountId) {
    await testRoute('create recurring', 'POST', '/api/recurring', {
      account_id: accountId, type: 'expense', description: 'Aluguel', amount: 1500, frequency: 'monthly', next_date: '2026-09-10'
    }, token);
  }

  console.log('\n[12] TESTE DE NOTIFICATIONS - GET /api/notifications');
  await testRoute('list notifications', 'GET', '/api/notifications', null, token);
  await testRoute('unread count', 'GET', '/api/notifications/unread-count', null, token);

  console.log('\n[13] TESTE DE REPORTS - GET /api/reports/*');
  await testRoute('reports summary', 'GET', '/api/reports/summary', null, token);
  await testRoute('reports by-category', 'GET', '/api/reports/by-category', null, token);
  await testRoute('reports recent', 'GET', '/api/reports/recent', null, token);
  await testRoute('reports monthly', 'GET', '/api/reports/monthly', null, token);
  await testRoute('reports insights', 'GET', '/api/reports/insights', null, token);

  console.log('\n[14] TESTE DE PLANNING - GET/POST /api/planning');
  await testRoute('list planning', 'GET', '/api/planning', null, token);
  await testRoute('create planning', 'POST', '/api/planning', {
    name: 'Plano Teste', initial_amount: 1000, monthly_contribution: 500, interest_rate: 10, goal_amount: 50000
  }, token);
  await testRoute('simulate planning', 'POST', '/api/planning/simulate', {
    initial_amount: 1000, monthly_contribution: 500, interest_rate: 10, goal_amount: 50000
  }, token);

  console.log('\n[15] TESTE DE EXPORT - GET /api/export');
  await testRoute('export csv', 'GET', '/api/export?format=csv', null, token);

  console.log('\n[16] TESTE DE IMPORT - POST /api/import');
  await testRoute('import csv', 'POST', '/api/import', { csvData: 'type,description,amount,date\nexpense,Teste Import,100,2026-09-08' }, token);

  console.log('\n[17] TESTE DE GAMIFICATION - GET /api/gamification/*');
  await testRoute('achievements', 'GET', '/api/gamification/achievements', null, token);
  await testRoute('streaks', 'GET', '/api/gamification/streaks', null, token);
  await testRoute('stats', 'GET', '/api/gamification/stats', null, token);

  console.log('\n[18] TESTE DE ASSISTANT - POST/GET /api/assistant');
  await testRoute('assistant history', 'GET', '/api/assistant/history', null, token);

  console.log('\n[19] TESTE DE CALCULATORS - POST /api/calculators/*');
  await testRoute('compound calc', 'POST', '/api/calculators/compound', { principal: 10000, rate: 10, months: 12 });
  await testRoute('loan calc', 'POST', '/api/calculators/loan', { amount: 50000, rate: 1.5, months: 60 });
  await testRoute('savings-goal calc', 'POST', '/api/calculators/savings-goal', { goal: 20000, monthly: 1000, rate: 8 });

  console.log('\n[20] TESTE DE DASHBOARD-CONFIG - GET/POST /api/dashboard-config');
  await testRoute('get dashboard config', 'GET', '/api/dashboard-config', null, token);
  await testRoute('save dashboard config', 'POST', '/api/dashboard-config', { hidden_cards: ['goals', 'gamification'] }, token);

  console.log('\n[21] TESTE DE OPTIONS (CORS) - /api/auth');
  await testRoute('options auth', 'OPTIONS', '/api/auth/login');

  console.log('\n[22] TESTE DE 404 - ROTA INEXISTENTE');
  await testRoute('not found', 'GET', '/api/nonexistent');

  console.log('\n[23] TESTE DE CRIACAO DE CONTA');
  await testRoute('create account 2', 'POST', '/api/accounts', { name: 'Poupanca', type: 'savings', balance: 500, color: '#10B981' }, token);
  await testRoute('list accounts again', 'GET', '/api/accounts', null, token);

  console.log('\n' + '='.repeat(70));
  console.log('TESTES COMPLETADOS');
  console.log('='.repeat(70));
}

runTests().catch(e => {
  console.error('Erro fatal:', e.message);
  process.exit(1);
});
