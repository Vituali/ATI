const fs = require('fs');
const path = require('path');

const mode = process.argv[2];

if (!['prod', 'dev', 'production', 'development'].includes(mode)) {
  console.log('Uso: node switch-env.js [prod|dev]');
  process.exit(1);
}

const isProd = mode.startsWith('prod');
const fileName = isProd ? '.env.production' : '.env.development';
const modeLabel = isProd ? 'PRODUÇÃO' : 'TESTES (Development)';

const projectPath = __dirname;

console.log(`\n🔄 Trocando ambiente para: ${modeLabel}\n`);

const sourceFile = path.join(projectPath, fileName);
const targetFile = path.join(projectPath, '.env');

if (fs.existsSync(sourceFile)) {
  try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    fs.writeFileSync(targetFile, content);
    console.log(`✅ [${path.basename(projectPath)}] Atualizado com ${fileName}`);
  } catch (err) {
    console.error(`❌ [${path.basename(projectPath)}] Erro:`, err.message);
  }
} else {
  console.warn(`⚠️  [${path.basename(projectPath)}] Arquivo ${fileName} não encontrado.`);
}

console.log('\n✨ Concluído!\n');
