// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Monorepo Setup (Hostinger)
// Basado en la arquitectura probada y funcional de Unu-Raymi
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n[postinstall] ==========================================');
console.log('[postinstall] Starting Full Monorepo Build & Setup');
console.log('[postinstall] CWD:', process.cwd());
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
    console.warn(`[postinstall] ⚠️ Warning running "${cmd}" in ${subdir}:`, err.message);
  }
}

function copyToAllPublicHtml(srcDir, label) {
  if (!fs.existsSync(srcDir)) return;
  if (process.platform === 'win32') return; // En entorno local Windows no subir a carpetas personales

  let current = process.cwd();
  for (let i = 0; i < 6; i++) {
    const pubCandidate = path.join(current, 'public_html');
    if (fs.existsSync(pubCandidate) && pubCandidate !== srcDir) {
      try {
        fs.cpSync(srcDir, pubCandidate, { recursive: true });
        console.log(`[postinstall] ✅ Copied ${label} to: ${pubCandidate}`);
      } catch (err) {
        console.warn(`[postinstall] Warning copying to ${pubCandidate}:`, err.message);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

// ── 1. PRISMA ORM & BACKEND SETUP ─────────────────────────────────────────────
console.log('[postinstall] === 1/3 BACKEND & PRISMA setup ===');
try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  execSync(`find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
  execSync(`find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
} catch (_) {}

try {
  console.log('> [postinstall] Generando cliente Prisma ORM...');
  execSync('npx prisma generate --schema=apps/backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [postinstall] Cliente Prisma generado con éxito.');
} catch (e) {
  console.warn('⚠️ [postinstall] Warning prisma generate:', e.message);
}

// Compilar TypeScript de backend y admin si no existen en dist/
const backendDist = path.resolve(process.cwd(), 'apps/backend/dist/index.js');
const adminDist = path.resolve(process.cwd(), 'apps/admin/dist/index.js');

if (fs.existsSync(backendDist)) {
  console.log('✅ [postinstall] Backend dist/ ya existe — omitiendo compilación TypeScript.');
} else {
  run('npm run build', 'apps/backend');
}

if (fs.existsSync(adminDist)) {
  console.log('✅ [postinstall] Admin dist/ ya existe — omitiendo compilación TypeScript.');
} else {
  run('npm run build', 'apps/admin');
}

// ── 2. PLANTILLAS DE CONFIGURACIÓN WEB (PATRÓN UNU-RAYMI) ─────────────────────

// Proxy inverso dinámico en PHP para API y Admin
function createPhpProxy(isApi) {
  const proxyType = isApi ? 'API' : 'Admin';
  const prefix = isApi ? '/api' : '/admin';

  return `<?php
// ==============================================================================
// Bearded Mountaineer Lodge - ${proxyType} Reverse Proxy (LiteSpeed/PHP -> Node.js Gateway)
// Patrón de alta disponibilidad probado en Unu-Raymi
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
if (strpos($requestUri, '${prefix}') !== 0) {
    $requestUri = '${prefix}' . $requestUri;
}

// Detección dinámica de puerto Node.js si existe
$possiblePortFiles = [
    __DIR__ . '/.node_port',
    __DIR__ . '/../.node_port',
    __DIR__ . '/../../.node_port',
    __DIR__ . '/../../../.node_port',
    dirname(__DIR__) . '/.node_port',
    '/home/u251936581/public_html/.node_port',
    '/tmp/bearded_node_port'
];

$detectedPort = 4000;
foreach ($possiblePortFiles as $pFile) {
    if (file_exists($pFile)) {
        $val = trim(@file_get_contents($pFile));
        if (!empty($val) && is_numeric($val)) {
            $detectedPort = intval($val);
            break;
        }
    }
}

// Objetivos de conexión: puertos locales + FALLBACK CRÍTICO al dominio principal (Patrón Unu-Raymi)
$targets = [
    "http://127.0.0.1:{$detectedPort}",
    'http://127.0.0.1:4000',
    'http://127.0.0.1:3000',
    'https://beardedmountaineerlodge.com'
];
$targets = array_values(array_unique($targets));

$response = false;
$httpCode = 0;
$contentType = '';

$headers = [];
$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];
foreach ($incomingHeaders as $name => $value) {
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

$lastError = '';

foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $reqHeaders = $headers;
    if (strpos($baseTarget, 'beardedmountaineerlodge.com') !== false) {
        $reqHeaders[] = "Host: beardedmountaineerlodge.com";
    } else {
        $reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }
    $reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');

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

    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    if ($res === false) {
        $lastError = curl_error($ch);
    }
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 500 && $res !== false) {
        $response = $res;
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
    "error" => "El servidor Node.js de Bearded Mountaineer Lodge no responde. Asegúrese de reiniciar la aplicación en Hostinger.",
    "path" => $requestUri,
    "tried_targets" => $targets,
    "curl_error" => $lastError,
    "timestamp" => date("c")
]);
exit(0);
`;
}

const subHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
`;

const rootHtaccess = `<IfModule mod_mime.c>
  AddType text/css .css
  AddType application/javascript .js .mjs
  AddType application/json .json
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType font/ttf .ttf
  AddType image/svg+xml .svg
  AddType image/webp .webp
  AddType image/png .png
  AddType image/jpeg .jpg .jpeg
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

  # 1. Rutas de api/ y admin/ no deben interceptarse como SPA
  RewriteRule ^(api|admin)(/.*)?$ - [L]

  # 2. Servir SIEMPRE archivos y directorios existentes directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 3. Fallback SPA: rutas sin extension que no existen -> index.html
  RewriteCond %{REQUEST_URI} !\\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|ico|json|txt|php|html)$
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;

// ── 3. SINCRONIZAR PROXY API EN CANDIDATOS ────────────────────────────────────
console.log('[postinstall] === Configurando Proxy de API ===');
try {
  let current = process.cwd();
  const apiCandidates = [
    '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/api',
    '/home/u251936581/public_html/api'
  ];

  if (process.platform !== 'win32') {
    for (let i = 0; i < 6; i++) {
      apiCandidates.push(path.join(current, 'public_html', 'api'));
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  for (const pubApiCandidate of apiCandidates) {
    if (fs.existsSync(path.dirname(pubApiCandidate))) {
      try {
        fs.mkdirSync(pubApiCandidate, { recursive: true });
        if (fs.existsSync(path.join(pubApiCandidate, 'default.php'))) {
          fs.unlinkSync(path.join(pubApiCandidate, 'default.php'));
        }
        fs.writeFileSync(path.join(pubApiCandidate, 'index.php'), createPhpProxy(true));
        fs.writeFileSync(path.join(pubApiCandidate, '.htaccess'), subHtaccess);
        console.log(`[postinstall] ✅ API Proxy configurado en: ${pubApiCandidate}`);
      } catch (err) {
        console.warn(`[postinstall] Warning en ${pubApiCandidate}:`, err.message);
      }
    }
  }
} catch (e) {
  console.warn('[postinstall] Warning configurando api candidates:', e.message);
}

// ── 4. SINCRONIZAR FRONTEND STATIC EXPORT ─────────────────────────────────────
console.log('[postinstall] === 2/3 FRONTEND setup ===');
try {
  const srcOut = path.join(process.cwd(), 'apps', 'frontend', 'out');
  const destOut = path.join(process.cwd(), 'out');
  if (fs.existsSync(srcOut)) {
    fs.cpSync(srcOut, destOut, { recursive: true });
    console.log('[postinstall] ✅ Copied frontend out to root out directory');
  }

  const publicHtmlTargets = [
    path.join(process.cwd(), 'public_html'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
    '/home/u251936581/public_html'
  ];

  publicHtmlTargets.forEach(target => {
    if (fs.existsSync(path.dirname(target))) {
      try {
        fs.mkdirSync(target, { recursive: true });
        if (fs.existsSync(path.join(target, 'default.php'))) {
          fs.unlinkSync(path.join(target, 'default.php'));
        }
        if (fs.existsSync(srcOut) && target !== srcOut) {
          fs.cpSync(srcOut, target, { recursive: true });
          fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccess);
          console.log(`[postinstall] ✅ Copied frontend static export to: ${target}`);
        }
      } catch (err) {
        console.warn(`[postinstall] Warning copying frontend to ${target}:`, err.message);
      }
    }
  });

  if (fs.existsSync(srcOut)) {
    copyToAllPublicHtml(srcOut, 'frontend static export');
  }
} catch (e) {
  console.warn('[postinstall] Warning copying frontend build:', e.message);
}

// ── 5. SINCRONIZAR ADMIN WEBROOT ──────────────────────────────────────────────
console.log('[postinstall] === 3/3 ADMIN setup ===');
try {
  const adminPublicDir = path.resolve(process.cwd(), 'apps/admin/public');
  const adminUploadsDir = path.resolve(process.cwd(), 'apps/admin/uploads');

  let adminCurrent = process.cwd();
  const adminTargets = [
    '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin',
    '/home/u251936581/public_html/admin'
  ];

  if (process.platform !== 'win32') {
    for (let i = 0; i < 6; i++) {
      adminTargets.push(path.join(adminCurrent, 'public_html', 'admin'));
      const parent = path.dirname(adminCurrent);
      if (parent === adminCurrent) break;
      adminCurrent = parent;
    }
  }

  adminTargets.forEach(target => {
    try {
      if (fs.existsSync(path.dirname(target))) {
        fs.mkdirSync(target, { recursive: true });
        if (fs.existsSync(path.join(target, 'default.php'))) {
          fs.unlinkSync(path.join(target, 'default.php'));
        }
        // Copiar assets estáticos del Admin
        if (fs.existsSync(adminPublicDir)) {
          fs.cpSync(adminPublicDir, target, { recursive: true });
          const staticSub = path.join(target, 'static');
          fs.mkdirSync(staticSub, { recursive: true });
          fs.cpSync(adminPublicDir, staticSub, { recursive: true });
        }
        if (fs.existsSync(adminUploadsDir)) {
          const upSub = path.join(target, 'uploads');
          fs.mkdirSync(upSub, { recursive: true });
          fs.cpSync(adminUploadsDir, upSub, { recursive: true });
        }
        // Proxy inverso y .htaccess para enrutar vistas dinámicas a Express/Node
        fs.writeFileSync(path.join(target, 'index.php'), createPhpProxy(false));
        fs.writeFileSync(path.join(target, '.htaccess'), subHtaccess);
        console.log(`[postinstall] ✅ Configured admin webroot in: ${target}`);
      }
    } catch (err) {
      console.warn(`[postinstall] Warning configuring admin in ${target}:`, err.message);
    }
  });
} catch (e) {
  console.warn('[postinstall] Warning copying admin build:', e.message);
}

// ── 6. SINCRONIZACIÓN AUTOMÁTICA A CURRENT / NODEJS (PATRÓN UNU-RAYMI) ────────
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
        const itemsToCopy = ['server.js', 'package.json', 'out', 'apps', 'packages', 'public_html', '.env', '.env.production'];
        itemsToCopy.forEach(item => {
          const itemSrc = path.join(process.cwd(), item);
          const itemDest = path.join(target, item);
          if (fs.existsSync(itemSrc)) {
            fs.cpSync(itemSrc, itemDest, { recursive: true });
          }
        });
        console.log(`[postinstall] ✅ Automatically synced app files to: ${target}`);
      } catch (err) {
        console.warn(`[postinstall] Warning syncing to ${target}:`, err.message);
      }
    }
  });
} catch (e) {
  console.warn('[postinstall] Warning during runtime synchronization:', e.message);
}

console.log('\n[postinstall] ✅ Monorepo build and setup completed successfully.\n');
process.exit(0);
