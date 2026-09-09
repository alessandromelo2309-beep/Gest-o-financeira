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
  // Register user
  const ts = Date.now();
  const r1 = await req('POST', '/api/auth/register', { name: 'DebugU1', email: `debug1${ts}@test.com`, password: 'Teste123!' });
  console.log('U1 register:', r1.status, r1.data.user?.id);
  const t1 = r1.data.token;

  // Create data for U1
  const acc = await req('POST', '/api/accounts', { name: 'ContaU1', type: 'checking', balance: 100 }, t1);
  console.log('U1 create acc:', acc.status, acc.data);
  const cat = await req('POST', '/api/categories', { name: 'TestCat', type: 'expense' }, t1);
  console.log('U1 create cat:', cat.status, cat.data);

  // Register user 2
  const r2 = await req('POST', '/api/auth/register', { name: 'DebugU2', email: `debug2${ts}@test.com`, password: 'Teste123!' });
  console.log('U2 register:', r2.status, r2.data.user?.id);
  const t2 = r2.data.token;

  // Check U2 sees of U1's data
  const accs2 = await req('GET', '/api/accounts', null, t2);
  console.log('U2 accounts:', accs2.status, JSON.stringify(accs2.data));
  const cats2 = await req('GET', '/api/categories', null, t2);
  console.log('U2 categories:', cats2.status, JSON.stringify(cats2.data));

  // Test NEXA
  const n1 = await req('POST', '/api/assistant', { message: 'Olá' }, t1);
  console.log('NEXA hello:', n1.status, JSON.stringify(n1.data).substring(0, 200));
  const n2 = await req('POST', '/api/assistant', { message: 'resumo' }, t1);
  console.log('NEXA summary:', n2.status, JSON.stringify(n2.data).substring(0, 200));
}
debug().catch(e => console.error(e));
