const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'htmlusados', 'SGP - NATACHA HONÓRIO FERMIANO (8549)fttxdetalhes.html');
const detailsHtml = fs.readFileSync(filePath, 'utf-8');

console.log('File size:', detailsHtml.length);

let sgpOnuId = '';
const patterns = [
  /\/admin\/network\/onu\/(\d+)/i,
  /\/network\/onu\/(\d+)/i,
  /onu\/(\d+)\/(detail|change|edit)/i,
  /onu_id\s*[:=]\s*["']?(\d+)/i,
  /onuId\s*[:=]\s*["']?(\d+)/i,
  /id_onu\s*[:=]\s*["']?(\d+)/i,
  /["']onu_id["']\s*[:]\s*(\d+)/i
];

for (const pattern of patterns) {
  const match = detailsHtml.match(pattern);
  if (match) {
    console.log(`Matched pattern ${pattern}:`, match[0], 'Group 1:', match[1]);
    sgpOnuId = match[1];
    break;
  }
}

if (!sgpOnuId) {
  console.log('No ONU ID matched in detailsHtml!');
} else {
  console.log('Found ONU ID:', sgpOnuId);
}
