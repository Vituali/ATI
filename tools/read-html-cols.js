const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../htmlusados/SGP.35buscadepotencia.html');
const html = fs.readFileSync(filePath, 'utf-8');

const tbodyMatch = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(html);
if (tbodyMatch) {
  const tbody = tbodyMatch[1];
  const trMatch = /<tr[^>]*>([\s\S]*?)<\/tr>/i.exec(tbody);
  if (trMatch) {
    console.log('HTML da Primeira Linha:\n', trMatch[1]);
  }
}
