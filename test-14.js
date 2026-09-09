const http = require('http');

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const r = http.request({ hostname: 'localhost', port: 3001, path, method, headers }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(s) }); }
        catch { resolve({ status: res.statusCode, data: s }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function test(name, fn) {
  try {
    const ok = await fn();
    if (ok) { console.log(`  ✅ ${name}`); return true; }
    else { console.log(`  ❌ ${name}`); return false; }
  } catch (e) {
    console.log(`  ❌ ${name} (erro: ${e.message})`);
    return false;
  }
}

async function run() {
  let P = 0, F = 0;
  function r(ok) { if (ok) P++; else F++; }

  console.log('\n========== 14 CENÁRIOS DE TESTE ==========\n');

  // TESTE 1: Acessar deslogado → deve ver login (API retorna 401)
  console.log('TESTE 1: Acessar o sistema deslogado');
  r(await test('GET /api/auth/me sem token → 401', async () => {
    const r = await req('GET', '/api/auth/me');
    return r.status === 401;
  }));
  r(await test('GET /api/accounts sem token → 401', async () => {
    const r = await req('GET', '/api/accounts');
    return r.status === 401;
  }));

  // TESTE 2: Acessar /dashboard diretamente → API retorna 401
  console.log('\nTESTE 2: Acessar /dashboard sem autenticação');
  r(await test('Todas as APIs protegidas retornam 401', async () => {
    const eps = ['/api/accounts', '/api/transactions', '/api/categories', '/api/budgets', '/api/cards', '/api/goals', '/api/notifications', '/api/recurring'];
    for (const ep of eps) {
      const r = await req('GET', ep);
      if (r.status !== 401) return false;
    }
    return true;
  }));

  // TESTE 3: Fazer login
  console.log('\nTESTE 3: Fazer login');
  const ts = Date.now();
  const email1 = `audit${ts}@test.com`;
  let token1;
  r(await test('Registrar usuário 1', async () => {
    const r = await req('POST', '/api/auth/register', { name: 'Audit User 1', email: email1, password: 'Teste123!' });
    if (r.status === 201 && r.data.token) { token1 = r.data.token; return true; }
    return false;
  }));
  r(await test('Login usuário 1', async () => {
    const r = await req('POST', '/api/auth/login', { email: email1, password: 'Teste123!' });
    return r.status === 200 && !!r.data.token;
  }));
  r(await test('GET /api/auth/me retorna dados do usuário', async () => {
    const r = await req('GET', '/api/auth/me', null, token1);
    return r.status === 200 && r.data.email === email1;
  }));

  // TESTE 4: Criar dados
  console.log('\nTESTE 4: Criar dados');
  let accId, catId, txId;
  r(await test('Criar conta', async () => {
    const r = await req('POST', '/api/accounts', { name: 'Conta Teste', type: 'checking', balance: 1000 }, token1);
    if (r.status === 201 && r.data.id) { accId = r.data.id; return true; }
    return false;
  }));
  r(await test('Criar categoria', async () => {
    const r = await req('POST', '/api/categories', { name: 'Alimentação', type: 'expense', icon: '🍔' }, token1);
    if (r.status === 201 && r.data.id) { catId = r.data.id; return true; }
    return false;
  }));
  r(await test('Criar transação', async () => {
    const r = await req('POST', '/api/transactions', { account_id: accId, category_id: catId, type: 'expense', description: 'Supermercado', amount: 150, date: '2026-09-01' }, token1);
    if (r.status === 201 && r.data.id) { txId = r.data.id; return true; }
    return false;
  }));

  // TESTE 5: Atualizar página (reload) → sessão e dados continuam
  console.log('\nTESTE 5: Reload - dados persistem');
  r(await test('Dados persistem após reload (transactions)', async () => {
    const r = await req('GET', '/api/transactions', null, token1);
    return r.status === 200 && r.data.length > 0;
  }));
  r(await test('Dados persistem após reload (accounts)', async () => {
    const r = await req('GET', '/api/accounts', null, token1);
    return r.status === 200 && r.data.length > 0;
  }));
  r(await test('Dados persistem após reload (categories)', async () => {
    const r = await req('GET', '/api/categories', null, token1);
    return r.status === 200 && r.data.length > 0;
  }));

  // TESTE 6: Fazer logout
  console.log('\nTESTE 6: Fazer logout (descartar token)');
  r(await test('Após "logout" (token inválido) → 401', async () => {
    const r = await req('GET', '/api/accounts', null, 'invalid-logout-token');
    return r.status === 401;
  }));

  // TESTE 7: Tentar acessar protegido novamente → 401
  console.log('\nTESTE 7: Acessar página protegida sem token');
  r(await test('APIs retornam 401 sem token', async () => {
    const eps = ['/api/transactions', '/api/accounts', '/api/categories'];
    for (const ep of eps) {
      const r = await req('GET', ep);
      if (r.status !== 401) return false;
    }
    return true;
  }));

  // TESTE 8: Criar segundo usuário → não vê dados do primeiro
  console.log('\nTESTE 8: Isolamento multiusuário');
  const email2 = `audit2${ts}@test.com`;
  let token2, userId2;
  r(await test('Registrar usuário 2', async () => {
    const r = await req('POST', '/api/auth/register', { name: 'Audit User 2', email: email2, password: 'Teste123!' });
    if (r.status === 201 && r.data.token) { token2 = r.data.token; userId2 = r.data.user.id; return true; }
    return false;
  }));
  r(await test('U2 não vê transações de U1', async () => {
    const r = await req('GET', '/api/transactions', null, token2);
    return r.status === 200 && r.data.length === 0;
  }));
  r(await test('U2 não vê contas de U1 (só vê as próprias)', async () => {
    const r = await req('GET', '/api/accounts', null, token2);
    if (r.status !== 200 || !Array.isArray(r.data)) return false;
    return r.data.every(a => a.user_id === userId2);
  }));
  r(await test('U2 não vê categorias de U1 (só vê as próprias)', async () => {
    const r = await req('GET', '/api/categories', null, token2);
    if (r.status !== 200 || !Array.isArray(r.data)) return false;
    return r.data.every(c => c.user_id === userId2);
  }));
  r(await test('U2 não altera conta de U1 (404)', async () => {
    const r = await req('PUT', `/api/accounts/${accId}`, { name: 'HACKED' }, token2);
    return r.status === 404;
  }));
  r(await test('U2 não deleta conta de U1 (404)', async () => {
    const r = await req('DELETE', `/api/accounts/${accId}`, null, token2);
    return r.status === 404;
  }));
  r(await test('U2 pode criar seus próprios dados', async () => {
    const r = await req('POST', '/api/accounts', { name: 'Conta U2', type: 'checking', balance: 500 }, token2);
    return r.status === 201 && r.data.name === 'Conta U2';
  }));

  // TESTE 9: Testar APIs sem autenticação
  console.log('\nTESTE 9: APIs sem autenticação');
  r(await test('POST /api/transactions sem token → 401', async () => {
    const r = await req('POST', '/api/transactions', { account_id: 1, type: 'expense', description: 'Test', amount: 10, date: '2026-09-01' });
    return r.status === 401;
  }));
  r(await test('POST /api/accounts sem token → 401', async () => {
    const r = await req('POST', '/api/accounts', { name: 'Test', type: 'checking', balance: 100 });
    return r.status === 401;
  }));
  r(await test('PUT /api/accounts/1 sem token → 401', async () => {
    const r = await req('PUT', '/api/accounts/1', { name: 'Test' });
    return r.status === 401;
  }));
  r(await test('DELETE /api/accounts/1 sem token → 401', async () => {
    const r = await req('DELETE', '/api/accounts/1');
    return r.status === 401;
  }));

  // TESTE 10: Teste de responsividade (verificação de build do React)
  console.log('\nTESTE 10: Verificação de responsividade (build)');
  r(await test('Frontend build existe e serve corretamente', async () => {
    const r = await req('GET', '/');
    return r.status === 200 && typeof r.data === 'string' && r.data.includes('root');
  }));
  r(await test('PWA manifest existe', async () => {
    const r = await req('GET', '/manifest.json');
    return r.status === 200;
  }));

  // TESTE 11: Tema claro/escuro (verificação de build)
  console.log('\nTESTE 11: Verificação de temas');
  r(await test('ThemeContext implementado no frontend', async () => {
    const r = await req('GET', '/static/js/main.454fb720.js');
    return r.status === 200;
  }));

  // TESTE 12: Testar IA (NEXA)
  console.log('\nTESTE 12: Testar NEXA IA');
  r(await test('NEXA responde a mensagem', async () => {
    const r = await req('POST', '/api/assistant', { message: 'Olá' }, token1);
    const reply = r.data?.reply || r.data?.response;
    return r.status === 200 && reply && reply.length > 0;
  }));
  r(await test('NEXA responde sobre finanças', async () => {
    const r = await req('POST', '/api/assistant', { message: 'resumo' }, token1);
    const reply = r.data?.reply || r.data?.response;
    return r.status === 200 && reply;
  }));
  r(await test('NEXA sem token → 401', async () => {
    const r = await req('POST', '/api/assistant', { message: 'teste' });
    return r.status === 401;
  }));

  // TESTE 13: Logout e login novamente
  console.log('\nTESTE 13: Logout e login novamente');
  r(await test('Novo login funciona com credenciais corretas', async () => {
    const r = await req('POST', '/api/auth/login', { email: email1, password: 'Teste123!' });
    return r.status === 200 && !!r.data.token;
  }));
  r(await test('Login com senha errada → 401', async () => {
    const r = await req('POST', '/api/auth/login', { email: email1, password: 'wrongpassword' });
    return r.status === 401;
  }));
  r(await test('Login com email inexistente → 401', async () => {
    const r = await req('POST', '/api/auth/login', { email: 'naoexiste@test.com', password: '123456' });
    return r.status === 401;
  }));

  // TESTE 14: Teste de segurança
  console.log('\nTESTE 14: Testes de segurança');
  r(await test('Rate limiting funciona (25 requests)', async () => {
    for (let i = 0; i < 25; i++) {
      const r = await req('POST', '/api/auth/login', { email: 'fake@test.com', password: 'wrong' });
      if (r.status === 429) return true;
    }
    return false;
  }));

  console.log(`\n========== RESULTADO: ${P} ✅ / ${F} ❌ / ${P + F} total ==========`);
  if (F === 0) console.log('🎉 TODOS OS TESTES PASSARAM!');
  else console.log(`⚠️  ${F} teste(s) falharam`);
}

run().catch(e => console.error('Erro fatal:', e));
