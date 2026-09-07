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

  # 1. API Subdomain / Rutas -> Reenviar a Node.js
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]

  # 2. Admin Subdomain / Rutas -> Reenviar a Node.js
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteCond %{REQUEST_URI} ^/admin [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]

  # 3. Acceso directo a _next/ y uploads/ (NUNCA REESCRIBIR A index.html)
  RewriteRule ^_next/ - [L]
  RewriteRule ^uploads/ - [L]

  # 4. Servir archivos estáticos reales directamente si existen
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 5. Fallback dinámico: si el archivo no existe en disco, entregar vía Node.js (puerto 4000)
  RewriteRule ^(.*)$ http://127.0.0.1:4000/$1 [P,L]
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

// Script Proxy PHP de Respaldo: Reenvía peticiones al puerto Node.js dinámico/estático si mod_proxy no está habilitado
const phpProxyTemplate = `<?php
// Proxy PHP de ultra-baja latencia hacia Node.js con auto-recuperación de puertos
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

// Lista de puertos a intentar en orden de prioridad: 4000 primero, luego el detectado, luego los respaldos
$candidatePorts = array_unique([$detectedPort, 4000, 3001, 3002, 3000, 8080]);

$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$headers = getallheaders();
$rawInput = in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE']) ? file_get_contents('php://input') : null;

$reqHeaders = [];
foreach ($headers as $k => $v) {
    if (strtolower($k) !== 'host') {
        $reqHeaders[] = "{$k}: {$v}";
    }
}
$reqHeaders[] = "Host: " . $_SERVER['HTTP_HOST'];
$reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

$response = false;
$activePort = 4000;
$lastError = '';

foreach ($candidatePorts as $p) {
    $url = "http://127.0.0.1:{$p}" . $uri;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT_MS, 2000); // 2000ms timeout para verificación segura
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
    }
    curl_close($ch);
}

if ($response === false) {
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
                $lines = explode("\n", trim($content));
                $debugLog = implode("\n", array_slice($lines, -15));
                break;
            }
        }
    }

    $hostHeader = $_SERVER['HTTP_HOST'] ?? '';
    $uriPath = parse_url($uri, PHP_URL_PATH) ?? '';

    // Si se solicita /health directamente
    if ($uriPath === '/health' || $uriPath === '/api/health' || $uriPath === '/admin/health') {
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'proxy_standby',
            'message' => 'PHP Gateway activo. Esperando conexión a Node.js en puerto ' . $detectedPort,
            'time' => date('c'),
            'host' => $hostHeader,
            'port_files_found' => array_values(array_filter($possiblePortFiles, 'file_exists'))
        ]);
        exit;
    }

    echo json_encode([
        'error' => 'API Gateway no disponible. Verifique que Node.js esté corriendo en Hostinger.',
        'target_port' => $detectedPort,
        'tried_ports' => array_values($candidatePorts),
        'curl_error' => $lastError,
        'node_debug_log' => $debugLog ?: 'Sin registros recientes. Es probable que la aplicación Node.js esté detenida o no iniciada en el panel de Hostinger.',
        'php_detected_env' => [
            'cwd' => getcwd(),
            'script' => __FILE__,
            'port_files' => array_values(array_filter($possiblePortFiles, 'file_exists'))
        ]
    ]);
    exit;
}

$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$respHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

http_response_code($httpCode);
$headerLines = explode("\\r\\n", $respHeaders);
foreach ($headerLines as $h) {
    if (!empty($h) && !stripos($h, 'Transfer-Encoding:') && !stripos($h, 'HTTP/')) {
        header($h);
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

// 7. Sincronizar hacia todas las ubicaciones posibles del webroot de Hostinger
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
    if (fs.existsSync(target) && path.resolve(target) !== path.resolve(publicHtml)) {
      console.log(`📡 [Sync Hostinger] Sincronizando hacia webroot real: ${target}`);
      copyDirSync(publicHtml, target);
      if (fs.existsSync(frontendOut)) {
        copyDirSync(frontendOut, target);
      }
      fs.writeFileSync(path.join(target, '.htaccess'), rootHtaccess, 'utf8');
      fs.writeFileSync(path.join(target, '.node_port'), '4000', 'utf8');
      
      const tAdmin = path.join(target, 'admin');
      const tApi = path.join(target, 'api');
      fs.mkdirSync(tAdmin, { recursive: true });
      fs.mkdirSync(tApi, { recursive: true });
      fs.writeFileSync(path.join(tAdmin, '.htaccess'), subHtaccess, 'utf8');
      fs.writeFileSync(path.join(tApi, '.htaccess'), subHtaccess, 'utf8');
      fs.writeFileSync(path.join(tAdmin, 'index.php'), phpProxyTemplate, 'utf8');
      fs.writeFileSync(path.join(tApi, 'index.php'), phpProxyTemplate, 'utf8');

      // Si el target es la carpeta de un subdominio dedicado (ej: domains/api.* o domains/admin.*)
      if (target.includes('api.')) {
        fs.writeFileSync(path.join(target, 'index.php'), phpProxyTemplate, 'utf8');
        fs.writeFileSync(path.join(target, '.htaccess'), subHtaccess, 'utf8');
      } else if (target.includes('admin.')) {
        fs.writeFileSync(path.join(target, 'index.php'), phpProxyTemplate, 'utf8');
        fs.writeFileSync(path.join(target, '.htaccess'), subHtaccess, 'utf8');
      }

      console.log(`✅ [Sync Hostinger] Sincronizado exitosamente en: ${target}`);
    }
  } catch (err) {
    console.warn(`⚠️ [Sync Hostinger] No se pudo sincronizar en ${target}:`, err.message);
  }
});

console.log('✅ [Sync Hostinger] public_html generado con estructura limpia, puerto 4000 y proxies PHP de respaldo.');
