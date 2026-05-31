
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Node 18+ já tem fetch nativo
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Tenta ler o .env manualment para evitar dependência do dotenv
async function loadEnv() {
  const envPath = path.join(__dirname, '../.env.dev_prod');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) process.env[key.trim()] = value.trim();
    });
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const version = pkg.version;

async function pushVersion() {
  await loadEnv();
  
  const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL;
  const url = `${databaseURL}config/extension.json`;

  console.log(`🚀 Iniciando atualização de versão no Firebase: ${version}...`);
  
  if (!databaseURL) {
    console.error('❌ Erro: VITE_FIREBASE_DATABASE_URL não configurada.');
    process.exit(1);
  }

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minVersion: version,
        updatedAt: new Date().toISOString(),
        description: `Release v${version} gerado automaticamente.`
      })
    });

    if (response.ok) {
      console.log('✅ Firebase atualizado com sucesso!');
    } else {
      const error = await response.json();
      console.error('❌ Erro ao atualizar Firebase:', error);
      console.log('\n💡 Dica: Verifique se as "Security Rules" do seu Firebase permitem escrita no nó /config.');
    }
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
  }
}

pushVersion();
