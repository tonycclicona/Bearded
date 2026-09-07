// ==============================================================================
// scripts/sync-hostinger.mjs — Sincronizador local y de preparación para Hostinger
// Basado en la arquitectura probada y funcional de Unu-Raymi
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const publicHtml = path.join(rootDir, 'public_html');
const frontendOut = path.join(rootDir, 'apps/frontend/out');
const frontendPublic = path.join(rootDir, 'apps/frontend/public');
const adminPublicDir = path.join(rootDir, 'apps/admin/public');
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

// 1. Plantillas de Configuración Web (Patrón Unu-Raymi)
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

// Objetivos de conexión: puertos locales Node.js seguros
$targets = [
    "http://127.0.0.1:{$detectedPort}",
    'http://127.0.0.1:4000',
    'http://127.0.0.1:${dedicatedPort}',
    'http://127.0.0.1:3000'
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
    if ($res === false) {
        $lastError = curl_error($ch);
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

// 2. Preparar directorios en public_html
fs.mkdirSync(publicHtml, { recursive: true });
const adminDir = path.join(publicHtml, 'admin');
const apiDir = path.join(publicHtml, 'api');
const uploadsDir = path.join(publicHtml, 'uploads');

fs.mkdirSync(adminDir, { recursive: true });
fs.mkdirSync(path.join(adminDir, 'static'), { recursive: true });
fs.mkdirSync(path.join(adminDir, 'uploads'), { recursive: true });
fs.mkdirSync(apiDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// 3. Copiar Frontend (apps/frontend/out -> out y -> public_html)
const rootOut = path.join(rootDir, 'out');
if (fs.existsSync(frontendOut)) {
  copyDirSync(frontendOut, rootOut);
  copyDirSync(frontendOut, publicHtml);
}
if (fs.existsSync(frontendPublic)) {
  copyDirSync(frontendPublic, publicHtml);
}

// 4. Copiar Admin (assets estáticos y uploads a public_html/admin)
if (fs.existsSync(adminPublicDir)) {
  copyDirSync(adminPublicDir, adminDir);
  copyDirSync(adminPublicDir, path.join(adminDir, 'static'));
}
if (fs.existsSync(adminUploads)) {
  copyDirSync(adminUploads, uploadsDir);
  copyDirSync(adminUploads, path.join(adminDir, 'uploads'));
}

// 5. Escribir configuraciones y proxies
fs.writeFileSync(path.join(publicHtml, '.htaccess'), rootHtaccess);
fs.writeFileSync(path.join(publicHtml, '.node_port'), '4000');

fs.writeFileSync(path.join(adminDir, '.htaccess'), subHtaccess);
fs.writeFileSync(path.join(adminDir, 'index.php'), createPhpProxy(false));

fs.writeFileSync(path.join(apiDir, '.htaccess'), subHtaccess);
fs.writeFileSync(path.join(apiDir, 'index.php'), createPhpProxy(true));

// Eliminar default.php si existe en cualquier subcarpeta
const defaultCandidates = [
  path.join(publicHtml, 'default.php'),
  path.join(adminDir, 'default.php'),
  path.join(apiDir, 'default.php')
];
for (const df of defaultCandidates) {
  if (fs.existsSync(df)) {
    try { fs.unlinkSync(df); } catch (_) {}
  }
}

console.log('✅ [Sync Hostinger] public_html sincronizado y preparado exitosamente.');
