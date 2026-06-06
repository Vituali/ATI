const http = require('http');
const https = require('https');

const prodUrl = 'https://site-ati-75d83-default-rtdb.firebaseio.com/atendentes.json';
const localUrl = 'http://127.0.0.1:9000/atendentes.json?ns=site-ati-75d83';

https.get(prodUrl, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const atendentes = JSON.parse(data);
      if (!atendentes || res.statusCode !== 200) {
        console.error('Falha ao obter atendentes de produção. Status:', res.statusCode, data);
        process.exit(1);
      }
      
      console.log(`Carregados ${Object.keys(atendentes).length} atendentes de produção. Gravando no emulador local...`);
      
      const req = http.request(localUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      }, (localRes) => {
        let localData = '';
        localRes.on('data', (chunk) => { localData += chunk; });
        localRes.on('end', () => {
          if (localRes.statusCode === 200) {
            console.log('✅ Atendentes importados com sucesso para o emulador local!');
            process.exit(0);
          } else {
            console.error('❌ Falha ao gravar no emulador local. Status:', localRes.statusCode, localData);
            process.exit(1);
          }
        });
      });
      
      req.write(JSON.stringify(atendentes));
      req.end();
    } catch (e) {
      console.error('Erro ao processar resposta:', e);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Erro de conexão ao buscar de produção:', err);
  process.exit(1);
});
