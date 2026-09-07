import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const publicHtml = path.join(rootDir, 'public_html');
const frontendOut = path.join(rootDir, 'apps/frontend/out');
const frontendPublic = path.join(rootDir, 'apps/frontend/public');
const adminUploads = path.join(rootDir, 'apps/admin/uploads');

console.log('📦 [Sync Hostinger] Sincronizando carpeta public_html dentro del proyecto...');

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

// 1. Asegurar directorios de public_html
fs.mkdirSync(publicHtml, { recursive: true });
const adminDir = path.join(publicHtml, 'admin');
const apiDir = path.join(publicHtml, 'api');
const uploadsDir = path.join(publicHtml, 'uploads');

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(apiDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// 2. Copiar archivos compilados de Next.js
if (fs.existsSync(frontendOut)) {
  copyDirSync(frontendOut, publicHtml);
}

// 3. Copiar assets públicos
if (fs.existsSync(frontendPublic)) {
  copyDirSync(frontendPublic, publicHtml);
}

// 4. Copiar uploads
if (fs.existsSync(adminUploads)) {
  copyDirSync(adminUploads, uploadsDir);
}

// 5. Generar reglas .htaccess
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

const subHtaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>
`;

// Script Proxy PHP de Respaldo: Reenvía peticiones al puerto Node.js dinámico/estático con diagnóstico completo
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

// 6. Escribir archivos en public_html local
fs.writeFileSync(path.join(publicHtml, '.htaccess'), rootHtaccess, 'utf8');
fs.writeFileSync(path.join(adminDir, '.htaccess'), subHtaccess, 'utf8');
fs.writeFileSync(path.join(apiDir, '.htaccess'), subHtaccess, 'utf8');
fs.writeFileSync(path.join(adminDir, 'index.php'), phpProxyTemplate, 'utf8');
fs.writeFileSync(path.join(apiDir, 'index.php'), phpProxyTemplate, 'utf8');
fs.writeFileSync(path.join(publicHtml, '.node_port'), '4000', 'utf8');

// 7. Función de sincronización inteligente por destino
function syncWebroot(target) {
  if (!fs.existsSync(target) || path.resolve(target) === path.resolve(publicHtml)) return;

  const isApiSubdomain = target.includes('api.');
  const isAdminSubdomain = target.includes('admin.');

  if (isApiSubdomain) {
    // Webroot exclusivo de API: solo proxy y htaccess específico
    console.log(`📡 [Sync Hostinger] Sincronizando subdominio API: ${target}`);
    fs.writeFileSync(path.join(target, '.htaccess'), subHtaccess, 'utf8');
    fs.writeFileSync(path.join(target, 'index.php'), phpProxyTemplate, 'utf8');
    fs.writeFileSync(path.join(target, '.node_port'), '4000', 'utf8');
    console.log(`✅ [Sync Hostinger] API configurado exitosamente en: ${target}`);
    return;
  }

  if (isAdminSubdomain) {
    // Webroot exclusivo de Admin: proxy, htaccess, uploads y assets
    console.log(`📡 [Sync Hostinger] Sincronizando subdominio Admin: ${target}`);
    fs.writeFileSync(path.join(target, '.htaccess'), subHtaccess, 'utf8');
    fs.writeFileSync(path.join(target, 'index.php'), phpProxyTemplate, 'utf8');
    fs.writeFileSync(path.join(target, '.node_port'), '4000', 'utf8');
    if (fs.existsSync(adminUploads)) {
      const upDest = path.join(target, 'uploads');
      fs.mkdirSync(upDest, { recursive: true });
      copyDirSync(adminUploads, upDest);
    }
    console.log(`✅ [Sync Hostinger] Admin configurado exitosamente en: ${target}`);
    return;
  }

  // Webroot del dominio principal (Frontend):
  console.log(`📡 [Sync Hostinger] Sincronizando dominio principal (Frontend): ${target}`);
  copyDirSync(publicHtml, target);
  if (fs.existsSync(frontendOut)) {
    copyDirSync(frontendOut, target);
  }
  fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccess, 'utf8');
  fs.writeFileSync(path.join(target, '.node_port'), '4000', 'utf8');

  // Subcarpetas api/ y admin/ para acceso vía ruta directa (/api y /admin)
  const tAdmin = path.join(target, 'admin');
  const tApi = path.join(target, 'api');
  fs.mkdirSync(tAdmin, { recursive: true });
  fs.mkdirSync(tApi, { recursive: true });
  fs.writeFileSync(path.join(tAdmin, '.htaccess'), subHtaccess, 'utf8');
  fs.writeFileSync(path.join(tApi, '.htaccess'), subHtaccess, 'utf8');
  fs.writeFileSync(path.join(tAdmin, 'index.php'), phpProxyTemplate, 'utf8');
  fs.writeFileSync(path.join(tApi, 'index.php'), phpProxyTemplate, 'utf8');

  if (fs.existsSync(adminUploads)) {
    const upDest = path.join(target, 'uploads');
    fs.mkdirSync(upDest, { recursive: true });
    copyDirSync(adminUploads, upDest);
  }

  console.log(`✅ [Sync Hostinger] Dominio principal sincronizado exitosamente en: ${target}`);
}

// 8. Sincronizar hacia todas las ubicaciones posibles del webroot de Hostinger
const externalTargets = [
  '/home/u251936581/public_html',
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
  '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
  '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html',
  process.env.HOME ? path.resolve(process.env.HOME, 'public_html') : null
];

// Buscar hacia carpetas superiores (ej: si el proyecto está en ~/hbuilds o ~/apps)
let cur = rootDir;
for (let i = 0; i < 5; i++) {
  const candidate = path.join(cur, 'public_html');
  if (path.resolve(candidate) !== path.resolve(publicHtml)) {
    externalTargets.push(candidate);
  }
  const parent = path.dirname(cur);
  if (parent === cur) break;
  cur = parent;
}

const uniqueTargets = Array.from(new Set(externalTargets.filter(Boolean)));
uniqueTargets.forEach(target => {
  try {
    syncWebroot(target);
  } catch (err) {
    console.warn(`⚠️ [Sync Hostinger] No se pudo sincronizar en ${target}:`, err.message);
  }
});

console.log('✅ [Sync Hostinger] public_html generado con estructura limpia, puerto 4000 y proxies PHP de respaldo.');
