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

// 1b. Compilar TypeScript (solo si tsc está disponible Y dist/ no existe aún)
const backendDist = path.resolve(__dirname, 'apps/backend/dist/index.js');
const adminDist = path.resolve(__dirname, 'apps/admin/dist/index.js');

function hasTsc() {
  try {
    execSync('tsc --version', { stdio: 'pipe' });
    return true;
  } catch { return false; }
}

const tscAvailable = hasTsc();

if (fs.existsSync(backendDist)) {
  console.log('✅ [Postinstall] Backend dist/ ya existe — omitiendo compilación TypeScript.');
} else if (tscAvailable) {
  try {
    console.log('> [Postinstall] Compilando TypeScript del Backend...');
    execSync('npm run build --workspace=apps/backend', { stdio: 'inherit' });
    console.log('✅ [Postinstall] Backend compilado con éxito.');
  } catch (e) {
    console.warn('⚠️ [Postinstall] Warning compilando backend:', e.message);
  }
} else {
  console.warn('⚠️ [Postinstall] tsc no disponible y dist/ no existe. El servidor puede no arrancar correctamente.');
}

if (fs.existsSync(adminDist)) {
  console.log('✅ [Postinstall] Admin dist/ ya existe — omitiendo compilación TypeScript.');
} else if (tscAvailable) {
  try {
    console.log('> [Postinstall] Compilando TypeScript del Admin...');
    execSync('npm run build --workspace=apps/admin', { stdio: 'inherit' });
    console.log('✅ [Postinstall] Admin compilado con éxito.');
  } catch (e) {
    console.warn('⚠️ [Postinstall] Warning compilando admin:', e.message);
  }
} else {
  console.warn('⚠️ [Postinstall] tsc no disponible y admin/dist/ no existe. El servidor puede no arrancar correctamente.');
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

// 3. Templates de configuración web
const subHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php [QSA,L]
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

  # 2. Servir SIEMPRE archivos y directorios que existen en disco directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 3. SPA Fallback: rutas sin extension que no existen en disco -> index.html
  RewriteCond %{REQUEST_URI} !\\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|ico|json|txt|php|html)$
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
`;

const phpProxyTemplate = `<?php
// Proxy PHP hacia Node.js con auto-recuperación de puertos
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

$candidatePorts = array_values(array_unique([$detectedPort, 4000, 3001, 3002, 3000, 8080]));

$uri = $_SERVER['REQUEST_URI'] ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$headers = function_exists('getallheaders') ? getallheaders() : [];
$rawInput = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE']) ? file_get_contents('php://input') : null;

$reqHeaders = [];
foreach ($headers as $k => $v) {
    if (strtolower($k) !== 'host') {
        $reqHeaders[] = "{$k}: {$v}";
    }
}
$reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');
$reqHeaders[] = "X-Forwarded-Port: " . ($_SERVER['SERVER_PORT'] ?? '443');

$response = false;
$activePort = 4000;
$lastError = '';
$ch = null;

foreach ($candidatePorts as $p) {
    $url = "http://127.0.0.1:{$p}" . $uri;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 2000);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);

    if ($rawInput !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $rawInput);
    }

    $res = curl_exec($ch);
    if ($res !== false) {
        $response = $res;
        $activePort = $p;
        break;
    } else {
        $lastError = curl_error($ch);
        curl_close($ch);
        $ch = null;
    }
}

if ($response === false || $ch === null) {
    http_response_code(503);
    header('Content-Type: application/json');

    $debugLog = '';
    $possibleLogFiles = [
        __DIR__ . '/node_debug.log',
        __DIR__ . '/../node_debug.log',
        __DIR__ . '/../../node_debug.log',
        dirname(__DIR__) . '/node_debug.log',
        '/home/u251936581/public_html/node_debug.log',
        '/tmp/bearded_node_debug.log'
    ];
    foreach ($possibleLogFiles as $lf) {
        if (file_exists($lf)) {
            $content = @file_get_contents($lf);
            if (!empty($content)) {
                $lines = explode("\\n", trim($content));
                $debugLog = implode("\\n", array_slice($lines, -15));
                break;
            }
        }
    }

    echo json_encode([
        'error' => 'API Gateway no disponible. Verifique que Node.js esté corriendo en Hostinger.',
        'target_port' => $detectedPort,
        'tried_ports' => $candidatePorts,
        'curl_error' => $lastError,
        'node_debug_log' => $debugLog ?: 'Sin registros recientes. Verifique en el panel de Hostinger que el WebApp Node.js esté en ejecución.'
    ]);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$respHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
$headerLines = explode("\\r\\n", $respHeaders);
foreach ($headerLines as $h) {
    if (!empty($h) && !stripos($h, 'Transfer-Encoding:') && !stripos($h, 'HTTP/')) {
        header($h, false);
    }
}

echo $body;
`;

// 4. Sincronización inteligente por destino
function syncWebroot(dest) {
  if (!fs.existsSync(dest) || path.resolve(dest) === path.resolve(localPublicHtml)) return;

  const isApi = dest.includes('api.');
  const isAdmin = dest.includes('admin.');

  if (isApi) {
    console.log(`📡 [Postinstall] Sincronizando webroot de API: ${dest}`);
    fs.writeFileSync(path.join(dest, '.htaccess'), subHtaccess, 'utf8');
    fs.writeFileSync(path.join(dest, 'index.php'), phpProxyTemplate, 'utf8');
    fs.writeFileSync(path.join(dest, '.node_port'), '4000', 'utf8');
    console.log(`✅ [Postinstall] Webroot API configurado en: ${dest}`);
    return;
  }

  if (isAdmin) {
    console.log(`📡 [Postinstall] Sincronizando webroot de Admin: ${dest}`);
    fs.writeFileSync(path.join(dest, '.htaccess'), subHtaccess, 'utf8');
    fs.writeFileSync(path.join(dest, 'index.php'), phpProxyTemplate, 'utf8');
    fs.writeFileSync(path.join(dest, '.node_port'), '4000', 'utf8');
    if (fs.existsSync(adminPublicDir)) {
      copyDirSync(adminPublicDir, dest);
      copyDirSync(adminPublicDir, path.join(dest, 'static'));
    }
    if (fs.existsSync(adminUploads)) {
      const upDest = path.join(dest, 'uploads');
      fs.mkdirSync(upDest, { recursive: true });
      copyDirSync(adminUploads, upDest);
    }
    console.log(`✅ [Postinstall] Webroot Admin configurado en: ${dest}`);
    return;
  }

  // Webroot del dominio principal (Frontend):
  console.log(`📡 [Postinstall] Sincronizando dominio principal: ${dest}`);
  if (fs.existsSync(localPublicHtml)) {
    copyDirSync(localPublicHtml, dest);
  }
  if (fs.existsSync(frontendOut)) {
    copyDirSync(frontendOut, dest);
  }
  fs.writeFileSync(path.join(dest, '.htaccess'), rootHtaccess, 'utf8');
  fs.writeFileSync(path.join(dest, '.node_port'), '4000', 'utf8');

  // Subcarpetas api/ y admin/ para acceso por ruta
  const tApi = path.join(dest, 'api');
  const tAdmin = path.join(dest, 'admin');
  fs.mkdirSync(tApi, { recursive: true });
  fs.mkdirSync(tAdmin, { recursive: true });
  fs.writeFileSync(path.join(tApi, '.htaccess'), subHtaccess, 'utf8');
  fs.writeFileSync(path.join(tAdmin, '.htaccess'), subHtaccess, 'utf8');
  fs.writeFileSync(path.join(tApi, 'index.php'), phpProxyTemplate, 'utf8');
  fs.writeFileSync(path.join(tAdmin, 'index.php'), phpProxyTemplate, 'utf8');

  if (fs.existsSync(adminPublicDir)) {
    copyDirSync(adminPublicDir, tAdmin);
    copyDirSync(adminPublicDir, path.join(tAdmin, 'static'));
  }

  if (fs.existsSync(adminUploads)) {
    const upDest = path.join(dest, 'uploads');
    fs.mkdirSync(upDest, { recursive: true });
    copyDirSync(adminUploads, upDest);
    copyDirSync(adminUploads, path.join(tAdmin, 'uploads'));
  }

  console.log(`✅ [Postinstall] Dominio principal sincronizado en: ${dest}`);
}

// 5. Preparar public_html local con Frontend, Admin y API
const adminPublicDir = path.resolve(rootDir, 'apps/admin/public');
const localAdminDir = path.join(localPublicHtml, 'admin');
const localApiDir = path.join(localPublicHtml, 'api');
fs.mkdirSync(localAdminDir, { recursive: true });
fs.mkdirSync(localApiDir, { recursive: true });

if (fs.existsSync(frontendOut)) {
  copyDirSync(frontendOut, localPublicHtml);
}
if (fs.existsSync(adminPublicDir)) {
  copyDirSync(adminPublicDir, localAdminDir);
  copyDirSync(adminPublicDir, path.join(localAdminDir, 'static'));
}
if (fs.existsSync(adminUploads)) {
  copyDirSync(adminUploads, path.join(localPublicHtml, 'uploads'));
  copyDirSync(adminUploads, path.join(localAdminDir, 'uploads'));
}

fs.writeFileSync(path.join(localPublicHtml, '.htaccess'), rootHtaccess, 'utf8');
fs.writeFileSync(path.join(localAdminDir, '.htaccess'), subHtaccess, 'utf8');
fs.writeFileSync(path.join(localApiDir, '.htaccess'), subHtaccess, 'utf8');
fs.writeFileSync(path.join(localAdminDir, 'index.php'), phpProxyTemplate, 'utf8');
fs.writeFileSync(path.join(localApiDir, 'index.php'), phpProxyTemplate, 'utf8');
fs.writeFileSync(path.join(localPublicHtml, '.node_port'), '4000', 'utf8');

// 6. Copia directa ascendente a todos los public_html encontrados (Patrón Unu-Raymi)
if (fs.existsSync(localPublicHtml)) {
  copyToAllPublicHtml(localPublicHtml, 'public_html completo (Frontend + Admin + API)');
}
if (fs.existsSync(frontendOut)) {
  copyToAllPublicHtml(frontendOut, 'frontend build');
}

// 7. Localizaciones objetivo de Hostinger
const targetDestinations = [
  '/home/u251936581/public_html',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
  '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
  '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html'
];

if (process.env.HOME) {
  targetDestinations.push(path.resolve(process.env.HOME, 'public_html'));
}

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
    syncWebroot(dest);
  } catch (err) {
    console.warn(`⚠️ [Postinstall] No se pudo sincronizar en ${dest}:`, err.message);
  }
}

console.log('✅ [Postinstall] Proceso de preparación finalizado.');
