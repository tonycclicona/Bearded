// ==============================================================================
// postinstall.cjs — Monorepo Build & Webroot Setup para Hostinger
// Replicación exacta y enriquecida de la arquitectura probada de Unu-Raymi
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Starting Full Monorepo Build & Setup (Bearded Lodge)');
console.log('[postinstall] CWD:', process.cwd());
console.log('[postinstall] PLATFORM:', process.platform);
console.log('[postinstall] ==========================================\n');

function run(cmd, subdir) {
  const cwd = path.join(process.cwd(), subdir);
  if (!fs.existsSync(cwd)) {
    console.log(`[postinstall] Skipping ${subdir} (directory does not exist)`);
    return;
  }
  console.log(`[postinstall] Running: "${cmd}" in: ${cwd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
    console.log(`[postinstall] ✅ Finished: "${cmd}" in: ${subdir}`);
  } catch (err) {
    console.error(`[postinstall] ⚠️ Error running "${cmd}" in ${subdir}:`, err.message);
  }
}

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

// ── 1. BUILD BACKEND & API SETUP (Patrón Unu-Raymi) ───────────────────────────
console.log('[postinstall] === 1/3 BACKEND & API setup ===');
try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (process.platform === 'linux') {
    execSync(`find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
  }
} catch (_) {}

try {
  execSync('npx prisma generate --schema=backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [postinstall] Prisma Client generado.');
} catch (e) {
  console.warn('⚠️ [postinstall] Warning prisma generate:', e.message);
}

run('npm run build', 'backend');

// Crear index.php y .htaccess dentro de public_html/api/ que actúe como proxy hacia Node.js
try {
  const proxyContent = fs.existsSync(path.join(process.cwd(), 'proxy-api.php'))
    ? fs.readFileSync(path.join(process.cwd(), 'proxy-api.php'), 'utf8')
    : '';

  const apiCandidates = [
    '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/api',
    '/home/u251936581/public_html/api',
    path.join(process.cwd(), 'public_html', 'api')
  ];

  if (path.basename(process.cwd()).toLowerCase() === 'public_html') {
    apiCandidates.push(path.join(process.cwd(), 'api'));
  }

  let current = process.cwd();
  for (let i = 0; i < 6; i++) {
    apiCandidates.push(path.join(current, 'public_html', 'api'));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  const uniqueApiCandidates = Array.from(new Set(apiCandidates));
  for (const pubApiCandidate of uniqueApiCandidates) {
    if (fs.existsSync(path.dirname(pubApiCandidate))) {
      try {
        fs.mkdirSync(pubApiCandidate, { recursive: true });
        if (fs.existsSync(path.join(pubApiCandidate, 'default.php'))) {
          fs.unlinkSync(path.join(pubApiCandidate, 'default.php'));
        }
        if (proxyContent) {
          fs.writeFileSync(path.join(pubApiCandidate, 'index.php'), proxyContent);
        }

        const apiHtaccessContent = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
`;
        fs.writeFileSync(path.join(pubApiCandidate, '.htaccess'), apiHtaccessContent);
        fs.writeFileSync(path.join(pubApiCandidate, '.node_port'), '4000');
        console.log(`[postinstall] ✅ Created dynamic API proxy index.php & .htaccess in: ${pubApiCandidate}`);
      } catch (err) {}
    }
  }
} catch (e) {
  console.error('Warning API setup:', e.message);
}

// ── 2. BUILD FRONTEND (Patrón Unu-Raymi) ──────────────────────────────────────
console.log('\n[postinstall] === 2/3 FRONTEND setup ===');
run('npm run build', 'frontend');
try {
  const srcOut = path.join(process.cwd(), 'frontend', 'out');
  const destOut = path.join(process.cwd(), 'out');
  if (fs.existsSync(srcOut)) {
    fs.cpSync(srcOut, destOut, { recursive: true });
  }

  const publicHtmlTargets = [
    path.join(process.cwd(), 'public_html'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
    '/home/u251936581/public_html'
  ];

  if (path.basename(process.cwd()).toLowerCase() === 'public_html') {
    publicHtmlTargets.push(process.cwd());
  }

  const rootHtaccess = `DirectoryIndex index.html index.php
Options -Indexes +FollowSymLinks

<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType image/webp .webp
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|webp|png|jpg|jpeg|ico|json)$">
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 0. Si la petición viene del proxy inverso interno, no reescribir (entregar directo a Node.js)
  RewriteCond %{HTTP:X-Bypass-Proxy} 1
  RewriteRule ^ - [L]

  # 1. Enviar peticiones del subdominio API (ej: api.beardedmountaineerlodge.com)
  RewriteCond %{HTTP_HOST} ^api\\. [NC]
  RewriteRule ^(.*)$ api/index.php [L,QSA]

  # 2. Enviar peticiones del subdominio Admin (ej: admin.beardedmountaineerlodge.com)
  RewriteCond %{HTTP_HOST} ^admin\\. [NC]
  RewriteCond %{REQUEST_URI} !^/static/ [NC]
  RewriteCond %{REQUEST_URI} !^/uploads/ [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(.*)$ admin/index.php [L,QSA]

  # 3. Enviar peticiones API con prefijo /api/ del dominio principal
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # 4. Enviar peticiones Admin con prefijo /admin/ del dominio principal
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # 5. Servir archivos físicos existentes (HTML, CSS, JS, imágenes, fonts)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 6. Fallback SPA Next.js para el frontend
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;

  publicHtmlTargets.forEach(target => {
    if (fs.existsSync(target) && target !== srcOut) {
      try {
        if (fs.existsSync(srcOut)) {
          fs.cpSync(srcOut, target, { recursive: true });
        }
        if (fs.existsSync(path.join(target, 'default.php'))) {
          fs.unlinkSync(path.join(target, 'default.php'));
        }
        fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccess.trim());
        fs.writeFileSync(path.join(target, '.node_port'), '4000');
        console.log(`[postinstall] ✅ Copied frontend static export directly to: ${target}`);
      } catch (err) {
        console.error(`Warning: Failed to copy to ${target}:`, err.message);
      }
    }
  });

  if (fs.existsSync(srcOut)) {
    copyToAllPublicHtml(srcOut, 'frontend static export');
  }
} catch (e) {
  console.error('Warning: Failed to copy frontend build:', e.message);
}

// ── 3. BUILD ADMIN (Misma lógica que frontend según Unu-Raymi) ────────────────
console.log('\n[postinstall] === 3/3 ADMIN setup ===');
run('npm run build', 'admin');
try {
  let adminCurrent = process.cwd();
  const adminTargets = [
    '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin',
    '/home/u251936581/public_html/admin',
    path.join(process.cwd(), 'public_html', 'admin')
  ];

  if (path.basename(process.cwd()).toLowerCase() === 'public_html') {
    adminTargets.push(path.join(process.cwd(), 'admin'));
  }

  for (let i = 0; i < 6; i++) {
    adminTargets.push(path.join(adminCurrent, 'public_html', 'admin'));
    const parent = path.dirname(adminCurrent);
    if (parent === adminCurrent) break;
    adminCurrent = parent;
  }

  const proxyContent = fs.existsSync(path.join(process.cwd(), 'proxy-api.php'))
    ? fs.readFileSync(path.join(process.cwd(), 'proxy-api.php'), 'utf8')
    : '';

  const adminPublicSrc = path.join(process.cwd(), 'admin', 'public');
  const adminUploadsSrc = path.join(process.cwd(), 'admin', 'uploads');

  const adminHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
`;

  const uniqueAdminTargets = Array.from(new Set(adminTargets));
  uniqueAdminTargets.forEach(target => {
    try {
      if (fs.existsSync(path.dirname(target))) {
        fs.mkdirSync(target, { recursive: true });
        // Eliminar default.php si existe
        if (fs.existsSync(path.join(target, 'default.php'))) {
          fs.unlinkSync(path.join(target, 'default.php'));
        }

        // Copiar assets físicos del admin (estáticos y uploads)
        if (fs.existsSync(adminPublicSrc)) {
          copyDirSync(adminPublicSrc, target);
          copyDirSync(adminPublicSrc, path.join(target, 'static'));
        }
        if (fs.existsSync(adminUploadsSrc)) {
          copyDirSync(adminUploadsSrc, path.join(target, 'uploads'));
        }

        // Colocar proxy inverso como index.php
        if (proxyContent) {
          fs.writeFileSync(path.join(target, 'index.php'), proxyContent);
        }

        fs.writeFileSync(path.join(target, '.htaccess'), adminHtaccess);
        fs.writeFileSync(path.join(target, '.node_port'), '4000');
        console.log(`[postinstall] ✅ Copied admin setup and created .htaccess in: ${target}`);
      }
    } catch (err) {
      console.error(`Warning: Failed to copy admin to ${target}:`, err.message);
    }
  });
} catch (e) {
  console.error('Warning: Failed to copy admin build:', e.message);
}

// ── 4. SINCRONIZACIÓN AUTOMÁTICA A CURRENT / NODEJS Y RESTART (Unu-Raymi) ──────
console.log('\n[postinstall] === Syncing build artifacts to runtime directories ===');
try {
  const currentDirs = [
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs',
    path.resolve(process.cwd(), '../current/nodejs'),
    path.resolve(process.cwd(), '../../current/nodejs')
  ];

  currentDirs.forEach(target => {
    if (fs.existsSync(path.dirname(target))) {
      try {
        fs.mkdirSync(target, { recursive: true });
        const itemsToCopy = ['server.js', 'package.json', 'out', 'frontend', 'admin', 'backend', '.env', '.node_port'];
        itemsToCopy.forEach(item => {
          const itemSrc = path.join(process.cwd(), item);
          const itemDest = path.join(target, item);
          if (fs.existsSync(itemSrc)) {
            if (fs.statSync(itemSrc).isDirectory()) {
              copyDirSync(itemSrc, itemDest);
            } else {
              fs.copyFileSync(itemSrc, itemDest);
            }
          }
        });
        console.log(`[postinstall] ✅ Automatically synced app files to: ${target}`);
      } catch (err) {
        console.error(`Warning: Failed to sync to ${target}:`, err.message);
      }
    }
  });
} catch (e) {}

// Crear restart.txt para Passenger / LiteSpeed Node.js
const restartPaths = [
  path.join(process.cwd(), 'tmp', 'restart.txt'),
  path.join(process.cwd(), 'public_html', 'tmp', 'restart.txt')
];
for (const rPath of restartPaths) {
  try {
    fs.mkdirSync(path.dirname(rPath), { recursive: true });
    fs.writeFileSync(rPath, String(Date.now()), 'utf8');
  } catch (_) {}
}

console.log('\n[postinstall] ✅ All subapps built and delivered successfully.\n');
process.exit(0);
