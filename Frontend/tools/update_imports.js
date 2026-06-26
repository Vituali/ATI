import fs from 'fs';
import path from 'path';

function walk(dir, call) {
  let files = fs.readdirSync(dir);
  for (let file of files) {
    let p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) walk(p, call);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) call(p);
  }
}

walk('./src', p => {
  // skip barrel files
  if (p.replace(/\\/g, '/').endsWith('src/hooks/index.ts')) return;
  if (p.replace(/\\/g, '/').endsWith('src/services/index.ts')) return;

  let content = fs.readFileSync(p, 'utf8');
  let original = content;

  // Replace hook imports
  content = content.replace(/from "(\.+\/)hooks\/useUser"/g, 'from "$1hooks"');
  content = content.replace(/from "(\.+\/)hooks\/useNotification"/g, 'from "$1hooks"');

  // Replace services imports
  content = content.replace(/from "(\.+\/)services\/firebase"/g, 'from "$1services"');
  content = content.replace(/from "(\.+\/)services\/permissions"/g, 'from "$1services"');
  content = content.replace(/from "(\.+\/)services\/auth"/g, 'from "$1services"');

  if (content !== original) {
    fs.writeFileSync(p, content);
    console.log(`Updated ${p}`);
  }
});
