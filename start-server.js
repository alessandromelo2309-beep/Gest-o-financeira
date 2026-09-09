const { exec } = require('child_process');
const path = require('path');

console.log('Iniciando servidor backend...');
const backend = exec('node src/server.js', { cwd: path.join(__dirname, 'backend') });

backend.stdout.on('data', (data) => {
  console.log(`Backend: ${data}`);
});

backend.stderr.on('data', (data) => {
  console.error(`Backend Error: ${data}`);
});

console.log('Servidor rodando em http://localhost:3001');
console.log('Para link público, abra outro terminal e rode: npx localtunnel --port 3001');
