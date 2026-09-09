// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Build & Hostinger Deployment Engine
// Homologado al 100% con la arquitectura probada de Unu-Raymi
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const isLinux = process.platform === 'linux';

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Starting Full Monorepo Build & Setup');
console.log('[postinstall] CWD:', ROOT);
console.log('[postinstall] Platform:', process.platform);
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

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      try { fs.copyFileSync(s, d); } catch (_) {}
    }
  }
}

function copyToAllPublicHtml(srcDir, label) {
  if (!fs.existsSync(srcDir)) return;
  let current = ROOT;
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

// ── 1. BUILD BACKEND ──────────────────────────────────────────────────────────
console.log('[postinstall] === 1/3 BACKEND setup ===');
try {
  const schema = path.join(ROOT, 'backend/prisma/schema.prisma');
  if (fs.existsSync(schema)) {
    try {
      execSync(`npx prisma generate --schema="${schema}"`, { stdio: 'inherit' });
      console.log('[postinstall] ✅ Prisma Client generado.');
    } catch (e) {
      console.warn('[postinstall] ⚠️  Prisma generate aviso:', e.message);
    }
  }
} catch (_) {}

run('node scripts/build.cjs', 'backend');

// Proxy Dinámico de API para Hostinger LiteSpeed (Código Unu-Raymi)
const apiIndexContent = `<?php
// ==============================================================================
// Bearded Mountaineer Lodge API Dynamic Reverse Proxy (LiteSpeed / PHP -> Node.js Gateway)
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$requestUri = $_SERVER['REQUEST_URI'];
if (strpos($requestUri, '/api') !== 0) {
    $requestUri = '/api' . $requestUri;
}

$targets = [
    'http://127.0.0.1:4000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3000',
    'https://beardedmountaineerlodge.com'
];
$response = false;
$httpCode = 0;
$contentType = '';

$headers = [];
foreach (getallheaders() as $name => $value) {
    $lower = strtolower($name);
    if ($lower !== 'host' && $lower !== 'accept-encoding' && $lower !== 'content-length') {
        $headers[] = "$name: $value";
    }
}

$isMultipart = !empty($_FILES) || (isset($_SERVER['CONTENT_TYPE']) && strpos(strtolower($_SERVER['CONTENT_TYPE']), 'multipart/form-data') !== false);
$postFields = null;
$body = null;

if ($isMultipart) {
    $postFields = $_POST;
    foreach ($_FILES as $field => $fileData) {
        if (is_array($fileData['tmp_name'])) {
            foreach ($fileData['tmp_name'] as $idx => $tmpName) {
                if (!empty($tmpName) && is_uploaded_file($tmpName) && $fileData['error'][$idx] === UPLOAD_ERR_OK) {
                    $postFields[$field . '[' . $idx . ']'] = new CURLFile(
                        $tmpName,
                        $fileData['type'][$idx] ?: 'application/octet-stream',
                        $fileData['name'][$idx]
                    );
                }
            }
        } else {
            if (!empty($fileData['tmp_name']) && is_uploaded_file($fileData['tmp_name']) && $fileData['error'] === UPLOAD_ERR_OK) {
                $postFields[$field] = new CURLFile(
                    $fileData['tmp_name'],
                    $fileData['type'] ?: 'application/octet-stream',
                    $fileData['name']
                );
            }
        }
    }
} else if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
}

foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, ''); // Decodifica gzip/deflate/br automáticamente
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $reqHeaders = $headers;
    if (strpos($baseTarget, 'beardedmountaineerlodge.com') !== false) {
        $reqHeaders[] = "Host: beardedmountaineerlodge.com";
    } else {
        $reqHeaders[] = "Host: api.beardedmountaineerlodge.com";
    }

    if ($isMultipart) {
        $filteredHeaders = array_filter($reqHeaders, function($h) {
            $lh = strtolower($h);
            return strpos($lh, 'content-type:') !== 0 && strpos($lh, 'content-length:') !== 0;
        });
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($filteredHeaders));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    $isHtml = (strpos(strtolower($contentType ?: ''), 'text/html') !== false);
    if ($httpCode >= 200 && $httpCode < 500 && $response !== false && !$isHtml) {
        break;
    }
}

if ($httpCode > 0 && $response !== false) {
    if ($contentType) {
        header("Content-Type: $contentType");
    }
    http_response_code($httpCode);
    echo $response;
    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");
http_response_code(502);
echo json_encode([
    "success" => false,
    "error" => "El servidor Node.js de Bearded Mountaineer Lodge no está respondiendo en los puertos locales (4000/3001/3000). Asegúrate de iniciar la aplicación Node.js en el panel de Hostinger.",
    "path" => $requestUri,
    "timestamp" => date("c")
]);
exit(0);
`;

const apiHtaccessContent = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>
`;

try {
  let current = ROOT;
  const apiCandidates = [
    '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/subdomains/api',
    path.join(ROOT, 'public_html', 'api')
  ];

  for (let i = 0; i < 6; i++) {
    apiCandidates.push(path.join(current, 'public_html', 'api'));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  for (const pubApiCandidate of apiCandidates) {
    if (fs.existsSync(path.dirname(pubApiCandidate))) {
      try {
        fs.mkdirSync(pubApiCandidate, { recursive: true });
        if (fs.existsSync(path.join(pubApiCandidate, 'default.php'))) {
          fs.unlinkSync(path.join(pubApiCandidate, 'default.php'));
        }
        fs.writeFileSync(path.join(pubApiCandidate, 'index.php'), apiIndexContent);
        fs.writeFileSync(path.join(pubApiCandidate, '.htaccess'), apiHtaccessContent);
        console.log(`[postinstall] ✅ Created dynamic API proxy index.php & .htaccess in: ${pubApiCandidate}`);
      } catch (err) {}
    }
  }
} catch (e) {}

// ── 2. BUILD FRONTEND ─────────────────────────────────────────────────────────
console.log('[postinstall] === 2/3 FRONTEND setup ===');
const frontendOutIndex = path.join(ROOT, 'frontend/out/index.html');
if (fs.existsSync(frontendOutIndex)) {
  console.log('[postinstall] frontend/out/ ya existe (omitiendo build pesada)');
} else {
  run('node scripts/build.cjs', 'frontend');
}

try {
  const srcOut = path.join(ROOT, 'frontend', 'out');
  const destOut = path.join(ROOT, 'out');
  if (fs.existsSync(srcOut)) {
    fs.cpSync(srcOut, destOut, { recursive: true });
  }

  const publicHtmlTargets = [
    path.join(ROOT, 'public_html'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
    '/home/u251936581/public_html'
  ];

  const rootHtaccessContent = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /

# 1. Rutas existentes fisicamente (imagenes, assets, chunks JS, etc.)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# 2. Rutas de API: delegar siempre al proxy de API interno
RewriteRule ^api(/.*)?$ api/index.php [QSA,L]

# 3. Rutas de Admin: delegar al panel administrativo
RewriteRule ^admin(/.*)?$ admin/index.html [QSA,L]

# 4. Fallback SPA Frontend (Next.js SSG)
RewriteRule ^index\\.html$ - [L]
RewriteRule . /index.html [L]
</IfModule>
`;

  publicHtmlTargets.forEach(target => {
    if (fs.existsSync(target) && target !== srcOut) {
      try {
        fs.cpSync(srcOut, target, { recursive: true });
        fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccessContent);
        const rootIndexPhp = path.join(target, 'index.php');
        if (!fs.existsSync(rootIndexPhp)) {
          fs.writeFileSync(rootIndexPhp, apiIndexContent);
        }
        console.log(`[postinstall] ✅ Copied frontend static export directly and generated master .htaccess in: ${target}`);
      } catch (err) {
        console.error(`Warning: Failed to copy to ${target}:`, err.message);
      }
    }
  });

  copyToAllPublicHtml(srcOut, 'frontend static export');
} catch (e) {
  console.error('Warning: Failed to copy frontend build:', e.message);
}

// ── 3. BUILD ADMIN ────────────────────────────────────────────────────────────
console.log('[postinstall] === 3/3 ADMIN setup ===');
const adminOutIndex = path.join(ROOT, 'admin/out/index.html');
if (fs.existsSync(adminOutIndex)) {
  console.log('[postinstall] admin/out/ ya existe (omitiendo build pesada)');
} else {
  run('node scripts/build.cjs', 'admin');
}

try {
  const srcOut = path.join(ROOT, 'admin', 'out');
  let adminCurrent = ROOT;
  const adminTargets = [
    '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin',
    '/home/u251936581/public_html/admin'
  ];

  for (let i = 0; i < 6; i++) {
    adminTargets.push(path.join(adminCurrent, 'public_html', 'admin'));
    const parent = path.dirname(adminCurrent);
    if (parent === adminCurrent) break;
    adminCurrent = parent;
  }

  adminTargets.forEach(target => {
    try {
      if (fs.existsSync(path.dirname(target))) {
        fs.mkdirSync(target, { recursive: true });
        if (fs.existsSync(path.join(target, 'default.php'))) {
          fs.unlinkSync(path.join(target, 'default.php'));
        }
        fs.cpSync(srcOut, target, { recursive: true });

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
        fs.writeFileSync(path.join(target, '.htaccess'), adminHtaccess);
        console.log(`[postinstall] ✅ Copied admin static export and created .htaccess in: ${target}`);
      }
    } catch (err) {}
  });
} catch (e) {
  console.error('Warning: Failed to copy admin build:', e.message);
}

// ── 4. SINCRONIZACIÓN AUTOMÁTICA A CURRENT / NODEJS Y PUBLIC_HTML ───────────
console.log('\n[postinstall] === Syncing build artifacts to runtime directories ===');
try {
  const currentDirs = [
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs',
    path.resolve(ROOT, '../current/nodejs'),
    path.resolve(ROOT, '../../current/nodejs')
  ];

  currentDirs.forEach(target => {
    if (fs.existsSync(path.dirname(target))) {
      try {
        fs.mkdirSync(target, { recursive: true });
        const itemsToCopy = ['server.js', 'package.json', 'out', 'frontend', 'admin', 'backend', '.env', '.env.production'];
        itemsToCopy.forEach(item => {
          const itemSrc = path.join(ROOT, item);
          const itemDest = path.join(target, item);
          if (fs.existsSync(itemSrc)) {
            fs.cpSync(itemSrc, itemDest, { recursive: true });
          }
        });
        console.log(`[postinstall] ✅ Automatically synced app files to: ${target}`);
      } catch (err) {
        console.error(`Warning: Failed to sync to ${target}:`, err.message);
      }
    }
  });
} catch (e) {}

// Señal de reinicio a Phusion Passenger en Hostinger
try {
  const restartPaths = [
    path.join(ROOT, 'tmp', 'restart.txt'),
    path.resolve(ROOT, '../tmp/restart.txt'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/tmp/restart.txt',
    '/home/u251936581/domains/beardedmountaineerlodge.com/tmp/restart.txt'
  ];
  restartPaths.forEach(rp => {
    try {
      fs.mkdirSync(path.dirname(rp), { recursive: true });
      fs.writeFileSync(rp, String(Date.now()), 'utf8');
    } catch (_) {}
  });
  console.log('[postinstall] ✅ Sent restart signal to Passenger (tmp/restart.txt)');
} catch (_) {}

console.log('\n[postinstall] ✅ All subapps built and delivered successfully.\n');
