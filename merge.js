const fs = require('fs');
const path = require('path');

// Extensões de arquivo permitidas
const extensoesPermitidas = ['.html', '.css', '.js', '.md', '.txt'];

// Configuração dos merges
const merges = [
  {
    nome: 'merge_site.txt',
    pastas: [
      '.',         // raiz: index.html, README.md, etc
      'docs',
      'assets/css',
      'assets/js'
    ],
    ignorar: ['merge_site.txt', 'merge_extensao.txt', '.git', 'assets/extension', 'assets/images']
  },
  {
    nome: 'merge_extensao.txt',
    pastas: [
      'Extensão ATI',
      'Extensão ATI/css',
      'Extensão ATI/scripts',
      'Extensão ATI/libs'
    ],
    ignorar: []
  }
];

// Função para ler arquivos recursivamente
function lerArquivosRecursivo(pasta, ignorar) {
  let arquivosTodos = [];
  
  // Verifica se a pasta existe
  if (!fs.existsSync(pasta)) return arquivosTodos;

  const itens = fs.readdirSync(pasta);

  itens.forEach(item => {
    if (ignorar.includes(item)) return;

    const itemPath = path.join(pasta, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      arquivosTodos = arquivosTodos.concat(lerArquivosRecursivo(itemPath, ignorar));
    } else {
      // Verifica se a extensão do arquivo é permitida
      const extensao = path.extname(itemPath).toLowerCase();
      if (extensoesPermitidas.includes(extensao)) {
        arquivosTodos.push(itemPath);
      }
    }
  });

  return arquivosTodos;
}

// Gerar merges
merges.forEach(merge => {
  let conteudoFinal = '';

  merge.pastas.forEach(pasta => {
    if (!fs.existsSync(pasta)) {
      console.warn(`Aviso: A pasta "${pasta}" não existe.`);
      return;
    }

    const arquivos = lerArquivosRecursivo(pasta, merge.ignorar);

    arquivos.forEach(filePath => {
      try {
        const fileConteudo = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative('.', filePath);

        conteudoFinal += `\n\n// --- ${relativePath} ---\n\n`;
        conteudoFinal += fileConteudo;
      } catch (err) {
        console.error(`Erro ao ler o arquivo ${filePath}: ${err.message}`);
      }
    });
  });

  fs.writeFileSync(merge.nome, conteudoFinal);
  console.log(`Merge concluído: ${merge.nome}`);
});
