const http = require('http');
http.get('http://localhost:3001/', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Has root div:', body.includes('id="root"'));
    console.log('Has JS:', body.includes('.js'));
  });
}).on('error', e => console.error('Error:', e.message));
