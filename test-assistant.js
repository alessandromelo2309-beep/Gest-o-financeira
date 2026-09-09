const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  // Login
  const login = await post('/api/auth/login', { email: 'teste@teste.com', password: '123456' });
  const token = login.token;
  console.log('Token OK:', !!token);

  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  function chat(msg) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ message: msg });
      const req = http.request({
        hostname: 'localhost', port: 3001, path: '/api/assistant', method: 'POST',
        headers: { ...headers, 'Content-Length': data.length }
      }, res => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => {
          try { resolve(JSON.parse(buf)); } catch(e) { resolve({ raw: buf }); }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  // Test 1: "Quero economizar dinheiro"
  console.log('\n--- Teste 1: "Quero economizar dinheiro" ---');
  const r1 = await chat('Quero economizar dinheiro');
  console.log(r1.response ? r1.response.substring(0, 200) : r1);

  // Test 2: "Oi, tudo bem?"
  console.log('\n--- Teste 2: "Oi, tudo bem?" ---');
  const r2 = await chat('Oi, tudo bem?');
  console.log(r2.response ? r2.response.substring(0, 200) : r2);

  // Test 3: "Meu saldo"
  console.log('\n--- Teste 3: "Meu saldo" ---');
  const r3 = await chat('Meu saldo');
  console.log(r3.response ? r3.response.substring(0, 200) : r3);

  // Test 4: "Como economizar?"
  console.log('\n--- Teste 4: "Como economizar?" ---');
  const r4 = await chat('Como economizar?');
  console.log(r4.response ? r4.response.substring(0, 200) : r4);

  // Test 5: "Resumo"
  console.log('\n--- Teste 5: "Resumo" ---');
  const r5 = await chat('Resumo');
  console.log(r5.response ? r5.response.substring(0, 200) : r5);

  // Test 6: Random gibberish
  console.log('\n--- Teste 6: "asdfghjkl" ---');
  const r6 = await chat('asdfghjkl');
  console.log(r6.response ? r6.response.substring(0, 200) : r6);

  console.log('\n✅ Todos os testes concluídos sem crash!');
}

test().catch(e => console.error('Erro:', e));
