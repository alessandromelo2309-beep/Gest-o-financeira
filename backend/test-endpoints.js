const http = require('http');

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost', port: 3001, path, method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  // Login first
  const loginData = JSON.stringify({ email: 'teste@teste.com', password: '123456' });
  const loginReq = new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  const login = await loginReq;
  console.log('LOGIN:', login.user ? 'OK' : 'FAIL');

  const token = login.token;
  const endpoints = [
    '/api/reports/summary?month=09&year=2026',
    '/api/reports/insights',
    '/api/reports/recent?limit=3',
    '/api/reports/upcoming?days=7',
    '/api/accounts',
    '/api/categories',
  ];

  for (const ep of endpoints) {
    const result = await makeRequest(ep, token);
    console.log(`${ep}: ${result.status} - ${JSON.stringify(result.body).substring(0, 80)}`);
  }
}

test().catch(console.error);
