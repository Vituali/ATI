const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');

console.log('🚀 Iniciando Emulador do Firebase...');

// Executa o emulador na mesma pasta onde o script foi chamado
const emulator = spawn('npx', ['firebase', 'emulators:start'], {
  stdio: 'inherit',
  shell: true
});

const importScriptPath = path.resolve(__dirname, 'import-users.js');

function checkDatabaseReady() {
  // Faz uma requisição leve para testar se a porta 9000 responde
  http.get('http://127.0.0.1:9000/.json?ns=site-ati-75d83', (res) => {
    console.log('🎯 Emulador de Banco de Dados detectado! Importando atendentes...');
    exec(`node "${importScriptPath}"`, (err, stdout, stderr) => {
      if (stdout) console.log(stdout.trim());
      if (stderr) console.error(stderr.trim());
    });
  }).on('error', () => {
    // Se falhar (porta fechada), tenta de novo em 1 segundo
    setTimeout(checkDatabaseReady, 1000);
  });
}

// Inicia a verificação após 2 segundos
setTimeout(checkDatabaseReady, 2000);

emulator.on('exit', (code) => {
  process.exit(code);
});
