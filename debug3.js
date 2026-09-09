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
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function debug() {
  // Login with existing user first (might be rate limited)
  console.log('Waiting 60s for rate limit reset...');
  await wait(60000);

  const login = await req('POST', '/api/auth/login', { email: 'teste@teste.com', password: '123456' });
  console.log('Login:', login.status);
  if (login.status !== 200) { console.log('Cannot login:', JSON.stringify(login.data)); return; }
  const t1 = login.data.token;
  const uid1 = login.data.user.id;
  console.log('User1 id:', uid1);

  // Check U1 accounts
  const accs1 = await req('GET', '/api/accounts', null, t1);
  console.log('U1 accounts:', accs1.status, accs1.data?.length, accs1.data?.map(a => ({id:a.id, name:a.name, uid:a.user_id})));

  // Register user 2
  const ts = Date.now();
  const reg2 = await req('POST', '/api/auth/register', { name: 'TestU2', email: `t2final${ts}@test.com`, password: 'Teste123!' });
  console.log('\nU2 register:', reg2.status);
  if (reg2.status !== 201) { console.log('Cannot register U2:', JSON.stringify(reg2.data)); return; }
  const t2 = reg2.data.token;
  const uid2 = reg2.data.user.id;
  console.log('User2 id:', uid2);

  // Check isolation
  const accs2 = await req('GET', '/api/accounts', null, t2);
  console.log('\nU2 sees accounts:', accs2.status, 'count:', accs2.data?.length);
  if (Array.isArray(accs2.data)) {
    accs2.data.forEach(a => console.log('  -', a.name, 'user_id:', a.user_id));
  }

  const cats2 = await req('GET', '/api/categories', null, t2);
  console.log('U2 sees categories:', cats2.status, 'count:', cats2.data?.length);
  if (Array.isArray(cats2.data)) {
    cats2.data.forEach(c => console.log('  -', c.name, 'user_id:', c.user_id));
  }

  // NEXA
  console.log('\n--- NEXA ---');
  const n1 = await req('POST', '/api/assistant', { message: 'Olá' }, t1);
  console.log('NEXA "Olá":', n1.status, JSON.stringify(n1.data).substring(0, 300));
  const n2 = await req('POST', '/api/assistant', { message: 'resumo' }, t1);
  console.log('NEXA "resumo":', n2.status, JSON.stringify(n2.data).substring(0, 300));
}
debug().catch(e => console.error(e));
