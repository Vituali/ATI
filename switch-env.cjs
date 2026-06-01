// switch-env.cjs
const fs = require('fs');
const path = require('path');

const mode = process.argv[2];

if (!['prod', 'dev', 'dev_prod', 'production', 'development'].includes(mode)) {
  console.log('Uso: node switch-env.cjs [prod|dev|dev_prod]');
  process.exit(1);
}

const isProd = mode.startsWith('prod');
const isDevProd = mode === 'dev_prod';

let fileName = '.env.development';
let modeLabel = 'TESTES (Development)';

if (isProd) {
  fileName = '.env.production';
  modeLabel = 'PRODUÇÃO';
} else if (isDevProd) {
  fileName = '.env.dev_prod';
  modeLabel = 'DESENVOLVIMENTO PRODUÇÃO (Dev_Prod)';
}

const rootPath = __dirname;
const sourceFile = path.join(rootPath, fileName);
const targetFile = path.join(rootPath, '.env');

console.log(`\n🔄 [ATI Monorepo] Trocando ambiente global para: ${modeLabel}\n`);

if (fs.existsSync(sourceFile)) {
  try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    fs.writeFileSync(targetFile, content);
    console.log(`✅ [.env] global na raiz atualizado com o conteúdo de ${fileName}`);
  } catch (err) {
    console.error(`❌ Erro ao atualizar o .env global:`, err.message);
  }
} else {
  console.warn(`⚠️  Arquivo ${fileName} não encontrado na raiz.`);
}

console.log('\n✨ Concluído!\n');
