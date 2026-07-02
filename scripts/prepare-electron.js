const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[prepare] Source introuvable, ignoré : ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[prepare] Copie des fichiers statiques Next.js...');
copyDir(
  path.join(root, '.next', 'static'),
  path.join(root, '.next', 'standalone', '.next', 'static')
);

console.log('[prepare] Copie du dossier public...');
copyDir(
  path.join(root, 'public'),
  path.join(root, '.next', 'standalone', 'public')
);

console.log('[prepare] Copie de l\'icône Electron...');
const iconSrc = path.join(root, 'public', 'images', 'logo-cma.png');
const iconDest = path.join(root, 'electron', 'icon.png');
if (fs.existsSync(iconSrc) && !fs.existsSync(iconDest)) {
  fs.copyFileSync(iconSrc, iconDest);
}

console.log('[prepare] Copie de .env.local dans le bundle...');
const envSrc = path.join(root, '.env.local');
const envDest = path.join(root, '.next', 'standalone', 'env.config');
if (fs.existsSync(envSrc)) {
  fs.copyFileSync(envSrc, envDest);
  console.log('[prepare] .env.local intégré dans le bundle (env.config).');
} else {
  console.warn('[prepare] ATTENTION : .env.local introuvable, DATABASE_URL non intégrée.');
}

console.log('[prepare] Terminé.');
