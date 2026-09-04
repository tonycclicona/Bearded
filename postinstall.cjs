'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 [Postinstall] Iniciando preparación y despliegue automático en Hostinger...');

// 1. Generar cliente Prisma ORM
try {
  console.log('> [Postinstall] Generando cliente Prisma ORM...');
  execSync('npx prisma generate --schema=apps/backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [Postinstall] Cliente Prisma generado con éxito.');
} catch (e) {
  console.warn('⚠️ [Postinstall] Warning prisma generate:', e.message);
}

// 2. Definir directorios
const rootDir = __dirname;
const localPublicHtml = path.resolve(rootDir, 'public_html');
const frontendOut = path.resolve(rootDir, 'apps/frontend/out');
const adminUploads = path.resolve(rootDir, 'apps/admin/uploads');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    try {
      if (entry.isDirectory()) {
        copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    } catch (_) {}
  }
}

function copyToAllPublicHtml(srcDir, label) {
  if (!fs.existsSync(srcDir)) return;
  
  let current = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pubCandidate = path.join(current, 'public_html');
    if (fs.existsSync(pubCandidate) && pubCandidate !== srcDir) {
      try {
        fs.cpSync(srcDir, pubCandidate, { recursive: true });
        console.log(`[postinstall] ✅ Copied ${label} to: ${pubCandidate}`);
      } catch (err) {
        console.error(`Warning: Failed to copy to ${pubCandidate}:`, err.message);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

// 3. Localizaciones objetivo de Hostinger
const targetDestinations = [
  '/home/u251936581/public_html',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html'
];

if (process.env.HOME) {
  targetDestinations.push(path.resolve(process.env.HOME, 'public_html'));
}

// Agregar búsqueda de public_html hacia arriba (Patrón probado de Unu-Raymi)
let cur = process.cwd();
for (let i = 0; i < 6; i++) {
  targetDestinations.push(path.join(cur, 'public_html'));
  const parent = path.dirname(cur);
  if (parent === cur) break;
  cur = parent;
}

const uniqueDestinations = Array.from(new Set(targetDestinations));

for (const dest of uniqueDestinations) {
  try {
    if (fs.existsSync(dest) && path.resolve(dest) !== path.resolve(localPublicHtml)) {
      console.log(`📡 [Postinstall] Sincronizando archivos hacia el webroot de Hostinger: ${dest}`);
      
      // A. Copiar estructura base de public_html (archivos del frontend, .htaccess, proxies api y admin)
      if (fs.existsSync(localPublicHtml)) {
        copyDirSync(localPublicHtml, dest);
      }

      // B. Asegurar los archivos más recientes del frontend compilado si existen
      if (fs.existsSync(frontendOut)) {
        copyDirSync(frontendOut, dest);
      }

      // C. Copiar uploads de medios
      if (fs.existsSync(adminUploads)) {
        const upDest = path.join(dest, 'uploads');
        fs.mkdirSync(upDest, { recursive: true });
        copyDirSync(adminUploads, upDest);
      }

      // D. Asegurar copia estricta de los .htaccess
      const rootHt = path.join(localPublicHtml, '.htaccess');
      if (fs.existsSync(rootHt)) {
        fs.copyFileSync(rootHt, path.join(dest, '.htaccess'));
      }
      const adminHt = path.join(localPublicHtml, 'admin', '.htaccess');
      if (fs.existsSync(adminHt)) {
        fs.mkdirSync(path.join(dest, 'admin'), { recursive: true });
        fs.copyFileSync(adminHt, path.join(dest, 'admin', '.htaccess'));
      }
      const apiHt = path.join(localPublicHtml, 'api', '.htaccess');
      if (fs.existsSync(apiHt)) {
        fs.mkdirSync(path.join(dest, 'api'), { recursive: true });
        fs.copyFileSync(apiHt, path.join(dest, 'api', '.htaccess'));
      }

      console.log(`✅ [Postinstall] Webroot sincronizado con éxito en: ${dest}`);
    }
  } catch (err) {
    console.warn(`⚠️ [Postinstall] No se pudo sincronizar en ${dest}:`, err.message);
  }
}

// 4. Copia directa ascendente a todos los public_html encontrados
if (fs.existsSync(localPublicHtml)) {
  copyToAllPublicHtml(localPublicHtml, 'public_html base');
}
if (fs.existsSync(frontendOut)) {
  copyToAllPublicHtml(frontendOut, 'frontend build');
}

console.log('✅ [Postinstall] Proceso de preparación finalizado.');
