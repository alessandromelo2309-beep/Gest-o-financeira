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

async function debug() {
  console.log('=== DEBUG 4 FAILURES ===\n');

  // Use existing test user or register new
  const ts = Date.now() + 1000;
  const r1 = await req('POST', '/api/auth/register', { name: 'D1', email: `d1${ts}@t.com`, password: 'Teste123!' });
  console.log('U1 register:', r1.status);
  if (r1.status !== 201) { console.log('Rate limited, waiting 60s...'); return; }
  const t1 = r1.data.token;
  console.log('U1 token:', t1 ? t1.substring(0, 20) + '...' : 'null');

  // Create data for U1
  const a1 = await req('POST', '/api/accounts', { name: 'ContaU1', type: 'checking', balance: 100 }, t1);
  console.log('U1 acc:', a1.status, a1.data?.name);
  const c1 = await req('POST', '/api/categories', { name: 'CatU1', type: 'expense' }, t1);
  console.log('U1 cat:', c1.status, c1.data?.name);

  // Register user 2
  const r2 = await req('POST', '/api/auth/register', { name: 'D2', email: `d2${ts}@t.com`, password: 'Teste123!' });
  console.log('U2 register:', r2.status);
  const t2 = r2.data.token;

  // Check isolation
  const accs2 = await req('GET', '/api/accounts', null, t2);
  console.log('\nU2 accounts:', accs2.status, 'count:', Array.isArray(accs2.data) ? accs2.data.length : 'NOT ARRAY', JSON.stringify(accs2.data).substring(0, 200));
  const cats2 = await req('GET', '/api/categories', null, t2);
  console.log('U2 categories:', cats2.status, 'count:', Array.isArray(cats2.data) ? cats2.data.length : 'NOT ARRAY', JSON.stringify(cats2.data).substring(0, 200));
  const txs2 = await req('GET', '/api/transactions', null, t2);
  console.log('U2 transactions:', txs2.status, 'count:', Array.isArray(txs2.data) ? txs2.data.length : 'NOT ARRAY');

  // Test NEXA
  console.log('\n--- NEXA ---');
  const n1 = await req('POST', '/api/assistant', { message: 'Olá' }, t1);
  console.log('NEXA "Olá":', n1.status, JSON.stringify(n1.data).substring(0, 300));
  const n2 = await req('POST', '/api/assistant', { message: 'resumo' }, t1);
  console.log('NEXA "resumo":', n2.status, JSON.stringify(n2.data).substring(0, 300));
}
debug().catch(e => console.error(e));
