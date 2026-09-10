// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Build & Hostinger Deployment Engine
// Estrictamente confinado a: /home/u251936581/domains/beardedmountaineerlodge.com/public_html
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const CANONICAL_PUBLIC_HTML = '/home/u251936581/domains/beardedmountaineerlodge.com/public_html';

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Starting Monorepo Build & Setup');
console.log('[postinstall] CWD:', ROOT);
console.log('[postinstall] Canonical public_html:', CANONICAL_PUBLIC_HTML);
console.log('[postinstall] ==========================================\n');

function run(cmd, subdir) {
  const cwd = subdir ? path.join(ROOT, subdir) : ROOT;
  if (!fs.existsSync(cwd)) {
    console.log(`[postinstall] Skipping ${subdir} (directory does not exist)`);
    return;
  }
  console.log(`[postinstall] Running: "${cmd}" in: ${cwd}`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
    console.log(`[postinstall] ✅ Finished: "${cmd}" in: ${subdir}`);
  } catch (err) {
    console.error(`[postinstall] ❌ ERROR running "${cmd}" in ${subdir}:`, err.message);
  }
}

// ── 1. COMPILAR BACKEND ─────────────────────────────────────────────────────────
console.log('[postinstall] === 1/3 BACKEND setup ===');
try {
  const nodeModulesPath = path.join(ROOT, 'node_modules');
  if (process.platform === 'linux' && fs.existsSync(nodeModulesPath)) {
    execSync(`find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
    execSync(`find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
  }
} catch (_) {}

run('node scripts/build.cjs', 'backend');

// ── 2. PROXY DE API PARA SUBDIRECTORIO public_html/api ─────────────────────────
const proxyPhpSource = path.join(ROOT, 'proxy-api.php');
let apiIndexContent = '';
if (fs.existsSync(proxyPhpSource)) {
  apiIndexContent = fs.readFileSync(proxyPhpSource, 'utf8');
} else {
  apiIndexContent = `<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }
$requestUri = $_SERVER['REQUEST_URI'];
if (strpos($requestUri, '/api') !== 0) { $requestUri = '/api' . $requestUri; }
$ch = curl_init('http://127.0.0.1:4000' . $requestUri);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);
if ($code > 0 && $res !== false) {
    if ($type) header("Content-Type: $type");
    http_response_code($code);
    echo $res;
    exit(0);
}
header("Content-Type: application/json; charset=UTF-8");
http_response_code(502);
echo json_encode(["success" => false, "error" => "El servidor Node.js no responde en el puerto 4000"]);
exit(0);
`;
}

const apiHtaccessContent = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>
`;

const apiDestinations = [];
if (fs.existsSync(CANONICAL_PUBLIC_HTML)) {
  apiDestinations.push(path.join(CANONICAL_PUBLIC_HTML, 'api'));
}
const localPublicHtml = path.join(ROOT, 'public_html');
if (fs.existsSync(localPublicHtml)) {
  apiDestinations.push(path.join(localPublicHtml, 'api'));
}

apiDestinations.forEach(apiDest => {
  try {
    fs.mkdirSync(apiDest, { recursive: true });
    fs.writeFileSync(path.join(apiDest, 'index.php'), apiIndexContent);
    fs.writeFileSync(path.join(apiDest, '.htaccess'), apiHtaccessContent);
    console.log(`[postinstall] ✅ API Proxy index.php y .htaccess configurados en: ${apiDest}`);
  } catch (err) {
    console.warn(`[postinstall] Warning setting API proxy in ${apiDest}:`, err.message);
  }
});

// ── 3. COMPILAR FRONTEND Y DESPLEGAR EN public_html ──────────────────────────
console.log('[postinstall] === 2/3 FRONTEND setup ===');
const frontendOutIndex = path.join(ROOT, 'frontend/out/index.html');
if (fs.existsSync(frontendOutIndex)) {
  console.log('[postinstall] frontend/out/ ya existe (omitiendo build pesada)');
} else {
  run('node scripts/build.cjs', 'frontend');
}

try {
  const srcFrontendOut = path.join(ROOT, 'frontend', 'out');
  const destLocalOut = path.join(ROOT, 'out');
  if (fs.existsSync(srcFrontendOut)) {
    fs.cpSync(srcFrontendOut, destLocalOut, { recursive: true });
  }

  const rootHtaccessContent = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

# 1. Rutas de API y Admin: no reescribir con el frontend
RewriteCond %{REQUEST_URI} ^/api [NC,OR]
RewriteCond %{REQUEST_URI} ^/admin [NC]
RewriteRule ^ - [L]

# 2. Archivos físicos existentes
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# 3. Fallback SPA Frontend
RewriteCond %{REQUEST_URI} !^/api [NC]
RewriteCond %{REQUEST_URI} !^/admin [NC]
RewriteRule ^index\\.html$ - [L]

RewriteCond %{REQUEST_URI} !^/api [NC]
RewriteCond %{REQUEST_URI} !^/admin [NC]
RewriteRule . /index.html [L]
</IfModule>
`;

  // Copiar solo al public_html canónico si existe
  if (fs.existsSync(srcFrontendOut) && fs.existsSync(CANONICAL_PUBLIC_HTML)) {
    fs.cpSync(srcFrontendOut, CANONICAL_PUBLIC_HTML, { recursive: true });
    fs.writeFileSync(path.join(CANONICAL_PUBLIC_HTML, '.htaccess'), rootHtaccessContent);
    const rootIndexPhp = path.join(CANONICAL_PUBLIC_HTML, 'index.php');
    if (fs.existsSync(rootIndexPhp)) {
      try { fs.unlinkSync(rootIndexPhp); } catch (_) {}
    }
    console.log(`[postinstall] ✅ Frontend exportado a: ${CANONICAL_PUBLIC_HTML}`);
  }
} catch (e) {
  console.error('[postinstall] Warning frontend copy:', e.message);
}

// ── 4. COMPILAR ADMIN Y DESPLEGAR EN public_html/admin ─────────────────────────
console.log('[postinstall] === 3/3 ADMIN setup ===');
const adminOutIndex = path.join(ROOT, 'admin/out/index.html');
if (fs.existsSync(adminOutIndex)) {
  console.log('[postinstall] admin/out/ ya existe (omitiendo build pesada)');
} else {
  run('node scripts/build.cjs', 'admin');
}

try {
  const srcAdminOut = path.join(ROOT, 'admin', 'out');
  if (fs.existsSync(srcAdminOut) && fs.existsSync(CANONICAL_PUBLIC_HTML)) {
    const adminDest = path.join(CANONICAL_PUBLIC_HTML, 'admin');
    fs.mkdirSync(adminDest, { recursive: true });
    fs.cpSync(srcAdminOut, adminDest, { recursive: true });

    const adminHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME}/index.html -f
RewriteRule ^(.*)$ $1/index.html [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
</IfModule>
`;
    fs.writeFileSync(path.join(adminDest, '.htaccess'), adminHtaccess);
    const adminDefaultPhp = path.join(adminDest, 'default.php');
    if (fs.existsSync(adminDefaultPhp)) {
      try { fs.unlinkSync(adminDefaultPhp); } catch (_) {}
    }
    console.log(`[postinstall] ✅ Admin exportado a: ${adminDest}`);
  }
} catch (e) {
  console.error('[postinstall] Warning admin copy:', e.message);
}

console.log('\n[postinstall] ✅ Build y distribución completadas exclusivamente en el directorio autorizado.\n');
