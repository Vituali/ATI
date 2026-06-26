const fs = require('fs');
const path = require('path');

const files = [
  'SGP - NATACHA HONÓRIO FERMIANO (8549)infotec.html',
  'SGP - NATACHA HONÓRIO FERMIANO (8549)fttxdetalhes.html'
];

files.forEach(f => {
  const filePath = path.join(__dirname, '..', 'htmlusados', f);
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', f);
    return;
  }
  const html = fs.readFileSync(filePath, 'utf-8');
  console.log(`\n=== Links in ${f} ===`);
  const regex = /\/admin\/servicos\/internet\/(\d+)/g;
  let match;
  const matches = new Set();
  while ((match = regex.exec(html)) !== null) {
    matches.add(match[0]);
  }
  console.log(Array.from(matches));
});
