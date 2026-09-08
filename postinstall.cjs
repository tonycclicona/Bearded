// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Monorepo Setup (Hostinger)
// Restaura el patrón de sincronización probado de cd6b786 + Unu-Raymi
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

// ── 1. PRISMA ORM & BACKEND SETUP ─────────────────────────────────────────────
console.log('[postinstall] === 1/4 BACKEND & PRISMA setup ===');
try {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  execSync(`find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
  execSync(`find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`, { stdio: 'ignore' });
} catch (_) {}

try {
  console.log('> [postinstall] Generando cliente Prisma ORM...');
  execSync('npx prisma generate --schema=backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [postinstall] Cliente Prisma generado con éxito.');
} catch (e) {
  console.warn('⚠️ [postinstall] Warning prisma generate:', e.message);
}

if (process.env.DATABASE_URL) {
  try {
    console.log('> [postinstall] Sincronizando esquema de base de datos con Prisma db push...');
    execSync('npx prisma db push --schema=backend/prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ [postinstall] Prisma db push completado.');
  } catch (e) {
    console.warn('⚠️ [postinstall] Warning prisma db push:', e.message);
  }
}

const backendDist = path.resolve(process.cwd(), 'backend/dist/index.js');
const adminDist = path.resolve(process.cwd(), 'admin/dist/index.js');

if (fs.existsSync(backendDist)) {
  console.log('✅ [postinstall] Backend dist/ ya existe — omitiendo compilación TypeScript.');
} else {
  run('npm run build', 'backend');
}

if (fs.existsSync(adminDist)) {
  console.log('✅ [postinstall] Admin dist/ ya existe — omitiendo compilación TypeScript.');
} else {
  run('npm run build', 'admin');
}

// ── 2. PREPARAR LOCAL public_html COMPLETO ─────────────────────────────────────
console.log('[postinstall] === 2/4 Preparando public_html local con Frontend, Admin y API ===');
const rootDir = process.cwd();
const localPublicHtml = path.resolve(rootDir, 'public_html');
const frontendOut = path.resolve(rootDir, 'frontend/out');
const adminPublicDir = path.resolve(rootDir, 'admin/public');
const adminUploadsDir = path.resolve(rootDir, 'admin/uploads');

fs.mkdirSync(localPublicHtml, { recursive: true });
const localAdminDir = path.join(localPublicHtml, 'admin');
const localApiDir = path.join(localPublicHtml, 'api');
fs.mkdirSync(localAdminDir, { recursive: true });
fs.mkdirSync(localApiDir, { recursive: true });

// A. Copiar export estático del Frontend a public_html y a out/
if (fs.existsSync(frontendOut)) {
  copyDirSync(frontendOut, localPublicHtml);
  const rootOut = path.join(rootDir, 'out');
  fs.mkdirSync(rootOut, { recursive: true });
  copyDirSync(frontendOut, rootOut);
}

// B. Copiar assets del Admin a public_html/admin y public_html/admin/static
if (fs.existsSync(adminPublicDir)) {
  copyDirSync(adminPublicDir, localAdminDir);
  copyDirSync(adminPublicDir, path.join(localAdminDir, 'static'));
}
if (fs.existsSync(adminUploadsDir)) {
  copyDirSync(adminUploadsDir, path.join(localPublicHtml, 'uploads'));
  copyDirSync(adminUploadsDir, path.join(localAdminDir, 'uploads'));
}

// C. Plantillas Web (.htaccess y Proxy Inverso PHP con Fallback Unu-Raymi)
function createPhpProxy(isApi) {
  const proxyType = isApi ? 'API' : 'Admin';
  const prefix = isApi ? '/api' : '/admin';
  const dedicatedPort = isApi ? 3001 : 3002;

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
    $requestUri = '${prefix}' . (strpos($requestUri, '/') === 0 ? $requestUri : '/' . $requestUri);
}
// Normalizar barras duplicadas
$requestUri = preg_replace('#/+#', '/', $requestUri);

$possiblePortFiles = [
    __DIR__ . '/.node_port',
    __DIR__ . '/../.node_port',
    __DIR__ . '/../../.node_port',
    __DIR__ . '/../../../.node_port',
    dirname(__DIR__) . '/.node_port',
    '/home/u251936581/public_html/.node_port',
    '/home/u251936581/public_html/api/.node_port',
    '/home/u251936581/public_html/admin/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/api/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin/.node_port',
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

// Objetivos de conexión: puertos locales Node.js seguros
$targets = [
    "http://127.0.0.1:{$detectedPort}",
    'http://127.0.0.1:4000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:3000',
    "http://localhost:{$detectedPort}",
    'http://localhost:4000',
    'http://localhost:8080'
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

// 1. Detección y conexión prioritaria por Socket UNIX (inmune a cortafuegos y problemas TCP)
$unixSockets = [
    __DIR__ . '/gateway.sock',
    __DIR__ . '/../gateway.sock',
    dirname(__DIR__) . '/gateway.sock',
    '/home/u251936581/public_html/api/gateway.sock',
    '/home/u251936581/public_html/admin/gateway.sock',
    '/home/u251936581/public_html/gateway.sock',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/api/gateway.sock',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/admin/gateway.sock',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/gateway.sock',
    '/tmp/bearded_gateway.sock'
];

$activeUnixSocket = null;
foreach ($unixSockets as $sock) {
    if (file_exists($sock)) {
        $activeUnixSocket = $sock;
        break;
    }
}

$lastError = '';
$targetResults = [];

if ($activeUnixSocket) {
    $ch = curl_init('http://localhost' . $requestUri);
    curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, $activeUnixSocket);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $reqHeaders = $headers;
    $reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $cErr = curl_error($ch);
    $targetResults["unix://{$activeUnixSocket}"] = [
        "http_code" => $httpCode,
        "error" => $cErr ?: null
    ];
    curl_close($ch);
    if ($httpCode > 0 && $res !== false) {
        if ($contentType) {
            header("Content-Type: $contentType");
        }
        http_response_code($httpCode);
        echo $res;
        exit(0);
    }
}

// 2. Conexión TCP de respaldo
foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $reqHeaders = $headers;
    $reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
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
    $cErr = curl_error($ch);
    $targetResults[$baseTarget] = [
        "http_code" => $httpCode,
        "error" => $cErr ?: null
    ];
    if ($res === false) {
        $lastError = $cErr;
    }
    curl_close($ch);

    if ($httpCode > 0 && $res !== false) {
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

$sockCheck = [];
$fp = @fsockopen('127.0.0.1', $detectedPort, $errno, $errstr, 1);
if ($fp) {
    $sockCheck["127.0.0.1:{$detectedPort}"] = "Conexión TCP exitosa";
    fclose($fp);
} else {
    $sockCheck["127.0.0.1:{$detectedPort}"] = "[$errno] $errstr";
}

$procList = [];
$pids = @glob('/proc/[0-9]*');
if ($pids) {
    foreach ($pids as $p) {
        $cmd = @file_get_contents($p . '/cmdline');
        if ($cmd && (strpos($cmd, 'node') !== false || strpos($cmd, 'server.js') !== false)) {
            $procList[] = [
                'pid' => basename($p),
                'cmd' => str_replace("\0", " ", substr($cmd, 0, 150))
            ];
        }
    }
}

$debugLog = '';
$possibleLogs = [
    __DIR__ . '/node_debug.log',
    __DIR__ . '/../node_debug.log',
    __DIR__ . '/../../node_debug.log',
    dirname(__DIR__) . '/node_debug.log',
    '/home/u251936581/public_html/node_debug.log',
    '/home/u251936581/public_html/api/node_debug.log',
    '/home/u251936581/public_html/admin/node_debug.log',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/node_debug.log',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/node_debug.log',
    '/tmp/bearded_node_debug.log'
];
foreach ($possibleLogs as $pl) {
    if (file_exists($pl)) {
        $c = @file_get_contents($pl);
        if (!empty($c)) {
            $lines = explode("\n", trim($c));
            $debugLog = implode("\n", array_slice($lines, -15));
            break;
        }
    }
}

$portFilesFound = [];
foreach ($possiblePortFiles as $pf) {
    if (file_exists($pf)) {
        $portFilesFound[$pf] = trim(@file_get_contents($pf));
    }
}

header("Content-Type: application/json; charset=UTF-8");
http_response_code(502);
echo json_encode([
    "success" => false,
    "error" => "El servidor Node.js de Bearded Mountaineer Lodge no responde. Asegúrese de reiniciar la aplicación en Hostinger.",
    "path" => $requestUri,
    "target_results" => $targetResults,
    "socket_check" => $sockCheck,
    "running_node_processes" => $procList ?: "No se detectaron procesos activos en /proc",
    "detected_port" => $detectedPort,
    "port_files_found" => $portFilesFound,
    "node_debug_log" => $debugLog ?: "Sin registros de node_debug.log",
    "current_dir" => __DIR__,
    "timestamp" => date("c")
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
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
RewriteRule ^(.*)$ index.php [L,QSA]
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

  # 1. Subdominio API (api.*): enviar peticiones a api/index.php
  RewriteCond %{HTTP_HOST} ^api\\. [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(.*)$ api/index.php [L,QSA]

  # 2. Subdominio Admin (admin.*): enviar peticiones a admin/index.php (permitir static files)
  RewriteCond %{HTTP_HOST} ^admin\\. [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ admin/index.php [L,QSA]

  # 3. Rutas de api/ y admin/ en dominio principal no deben interceptarse como SPA
  RewriteRule ^(api|admin)(/.*)?$ - [L]

  # 4. Servir SIEMPRE archivos y directorios existentes directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 5. Fallback SPA: rutas sin extension que no existen -> index.html
  RewriteCond %{REQUEST_URI} !\\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|ico|json|txt|php|html)$
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;

fs.writeFileSync(path.join(localPublicHtml, '.htaccess'), rootHtaccess);
fs.writeFileSync(path.join(localPublicHtml, '.node_port'), '4000');
fs.writeFileSync(path.join(localAdminDir, '.htaccess'), subHtaccess);
fs.writeFileSync(path.join(localAdminDir, 'index.php'), createPhpProxy(false));
fs.writeFileSync(path.join(localApiDir, '.htaccess'), subHtaccess);
fs.writeFileSync(path.join(localApiDir, 'index.php'), createPhpProxy(true));

// ── 3. SINCRONIZACIÓN HACIA LOS WEBROOTS DE HOSTINGER (PATRÓN cd6b786) ────────
console.log('[postinstall] === 3/4 Sincronizando hacia webroots de Hostinger ===');

const targetDestinations = [
  '/home/u251936581/public_html',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html'
];

if (process.env.HOME) {
  targetDestinations.push(path.resolve(process.env.HOME, 'public_html'));
}

// Búsqueda ascendente de public_html hacia arriba (Patrón probado de cd6b786)
if (process.platform !== 'win32') {
  let cur = process.cwd();
  for (let i = 0; i < 6; i++) {
    targetDestinations.push(path.join(cur, 'public_html'));
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
}

const uniqueDestinations = Array.from(new Set(targetDestinations));

for (const dest of uniqueDestinations) {
  try {
    if (fs.existsSync(dest) && path.resolve(dest) !== path.resolve(localPublicHtml)) {
      console.log(`📡 [Postinstall] Sincronizando archivos hacia el webroot de Hostinger: ${dest}`);
      
      // A. Copiar estructura completa de public_html (Frontend + Admin + API + uploads + .htaccess)
      copyDirSync(localPublicHtml, dest);

      // B. Asegurar Frontend estático
      if (fs.existsSync(frontendOut)) {
        copyDirSync(frontendOut, dest);
      }

      // C. Eliminar default.php de Hostinger si existe
      const defaultCandidates = [
        path.join(dest, 'default.php'),
        path.join(dest, 'admin', 'default.php'),
        path.join(dest, 'api', 'default.php')
      ];
      for (const df of defaultCandidates) {
        if (fs.existsSync(df)) {
          try { fs.unlinkSync(df); } catch (_) {}
        }
      }

      console.log(`✅ [Postinstall] Webroot sincronizado con éxito en: ${dest}`);
    }
  } catch (err) {
    console.warn(`⚠️ [Postinstall] No se pudo sincronizar en ${dest}:`, err.message);
  }
}

// Sincronizar subdominios dedicados si sus directorios padre existen en Hostinger
const dedicatedSubdomains = [
  { dir: '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html', src: localAdminDir },
  { dir: '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html', src: localApiDir }
];

for (const sub of dedicatedSubdomains) {
  if (fs.existsSync(path.dirname(sub.dir))) {
    try {
      fs.mkdirSync(sub.dir, { recursive: true });
      copyDirSync(sub.src, sub.dir);
      if (fs.existsSync(path.join(sub.dir, 'default.php'))) {
        try { fs.unlinkSync(path.join(sub.dir, 'default.php')); } catch (_) {}
      }
      console.log(`✅ [Postinstall] Subdominio dedicado sincronizado en: ${sub.dir}`);
    } catch (err) {
      console.warn(`⚠️ [Postinstall] Warning en subdominio ${sub.dir}:`, err.message);
    }
  }
}

// ── 4. SINCRONIZACIÓN AUTOMÁTICA A CURRENT / NODEJS (PATRÓN UNU-RAYMI) ────────
console.log('[postinstall] === 4/4 Sincronizando build artifacts a runtime directories ===');
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
        const itemsToCopy = ['server.js', 'package.json', 'proxy-api.php', '.npmrc', 'admin', 'backend', 'frontend', 'out', 'public_html', '.env', '.env.production'];
        itemsToCopy.forEach(item => {
          const itemSrc = path.join(process.cwd(), item);
          const itemDest = path.join(target, item);
          if (fs.existsSync(itemSrc)) {
            copyDirSync(itemSrc, itemDest);
          }
        });
        console.log(`[postinstall] ✅ Runtime sincronizado en: ${target}`);
      } catch (err) {
        console.warn(`[postinstall] Warning syncing to ${target}:`, err.message);
      }
    }
  });
} catch (e) {
  console.warn('[postinstall] Warning during runtime synchronization:', e.message);
}

// Crear/actualizar tmp/restart.txt para Passenger/cPanel
const restartCandidates = [
  path.join(rootDir, 'tmp/restart.txt'),
  path.join(localPublicHtml, 'tmp/restart.txt'),
  '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/tmp/restart.txt'
];
for (const rf of restartCandidates) {
  try {
    fs.mkdirSync(path.dirname(rf), { recursive: true });
    fs.writeFileSync(rf, String(Date.now()), 'utf8');
  } catch (_) {}
}

console.log('\n[postinstall] ✅ Monorepo build and setup completed successfully.\n');
process.exit(0);
