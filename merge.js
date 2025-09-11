const fs = require('fs');
const path = require('path');

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
    ignorar: ['merge_site.txt', 'merge_extensao.txt', '.git']
  },
  {
    nome: 'merge_extensao.txt',
    pastas: [
      'Extensão ATI'   // substitua pelo caminho da pasta da extensão
    ],
    ignorar: []
  }
];

// Função para ler arquivos recursivamente
function lerArquivosRecursivo(pasta, ignorar) {
  let arquivosTodos = [];
  const itens = fs.readdirSync(pasta);

  itens.forEach(item => {
    if (ignorar.includes(item)) return;

    const itemPath = path.join(pasta, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      arquivosTodos = arquivosTodos.concat(lerArquivosRecursivo(itemPath, ignorar));
    } else {
      arquivosTodos.push(itemPath);
    }
  });

  return arquivosTodos;
}

// Gerar merges
merges.forEach(merge => {
  let conteudoFinal = '';

  merge.pastas.forEach(pasta => {
    if (!fs.existsSync(pasta)) return;

    const arquivos = lerArquivosRecursivo(pasta, merge.ignorar);

    arquivos.forEach(filePath => {
      const fileConteudo = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative('.', filePath);

      conteudoFinal += `\n\n// --- ${relativePath} ---\n\n`;
      conteudoFinal += fileConteudo;
    });
  });

  fs.writeFileSync(merge.nome, conteudoFinal);
  console.log(`Merge concluído: ${merge.nome}`);
});
