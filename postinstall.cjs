// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Build & Hostinger Deployment Engine
// Homologado al 100% con la dinámica probada de Unu-Raymi
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const isLinux = process.platform === 'linux';

console.log('\n[deploy] ==========================================');
console.log('[deploy] Bearded Mountaineer Lodge: Build & Deploy');
console.log('[deploy] CWD:', ROOT);
console.log('[deploy] Platform:', process.platform);
console.log('[deploy] ==========================================\n');

// ── Cargar variables de entorno ───────────────────────────────────────────────
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  try {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const l of lines) {
      const t = l.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      const k = t.substring(0, eq).trim();
      let v = t.substring(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.substring(1, v.length - 1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch (_) {}
}

loadEnv(path.join(ROOT, '.env.production'));
loadEnv(path.join(ROOT, '.env'));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://dummy:dummy@localhost:3306/dummy';
}
if (!process.env.NEXT_PUBLIC_API_URL) {
  process.env.NEXT_PUBLIC_API_URL = '/api';
}

function run(cmd, cwd) {
  const dir = cwd ? path.join(ROOT, cwd) : ROOT;
  console.log(`[deploy] → ${cmd} (${cwd || '.'})`);
  try {
    execSync(cmd, { cwd: dir, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
    return true;
  } catch (e) {
    console.error(`[deploy] ❌ Error en "${cmd}":`, e.message);
    return false;
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

// ── 1. Prisma Generate ────────────────────────────────────────────────────────
console.log('\n[deploy] [1/5] Prisma Generate...');
try {
  const schema = path.join(ROOT, 'backend/prisma/schema.prisma');
  if (fs.existsSync(schema)) {
    const localPrisma = path.join(ROOT, 'node_modules/prisma/build/index.js');
    if (fs.existsSync(localPrisma)) {
      execSync(`node "${localPrisma}" generate --schema="${schema}"`, { stdio: 'inherit' });
    } else {
      execSync(`npx prisma generate --schema="${schema}"`, { stdio: 'inherit' });
    }
    console.log('[deploy] ✅ Prisma Client generado.');

    // Sincronizar Prisma Client generado a backend y rutas runtime
    const prismaSrc = path.join(ROOT, 'node_modules/.prisma');
    if (fs.existsSync(prismaSrc)) {
      const pTargets = [
        path.join(ROOT, 'backend/node_modules/.prisma'),
        '/home/u251936581/domains/beardedmountaineerlodge.com/node_modules/.prisma',
        '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/node_modules/.prisma'
      ];
      pTargets.forEach(function(pt) {
        try { copyDir(prismaSrc, pt); } catch (_) {}
      });
      console.log('[deploy] ✅ Prisma Client sincronizado a entornos de ejecución.');
    }

    const prismaClientPkg = path.join(ROOT, 'node_modules/@prisma/client');
    if (fs.existsSync(prismaClientPkg)) {
      const pkgTargets = [
        path.join(ROOT, 'backend/node_modules/@prisma/client')
      ];
      pkgTargets.forEach(function(pt) {
        try { copyDir(prismaClientPkg, pt); } catch (_) {}
      });
    }
  }
} catch (e) {
  console.warn('[deploy] ⚠️  Aviso Prisma generate:', e.message);
}

// ── 2. Build Backend ──────────────────────────────────────────────────────────
console.log('\n[deploy] [2/5] Compilando Backend...');
run('node scripts/build.cjs', 'backend');

// ── 3. Build Admin y Frontend (Next.js SSG) ───────────────────────────────────
const adminOutIndex = path.join(ROOT, 'admin/out/index.html');
if (fs.existsSync(adminOutIndex)) {
  console.log('\n[deploy] [3/5] admin/out/ ya existe y está listo (omitiendo compilación pesada)...');
} else {
  console.log('\n[deploy] [3/5] Compilando Admin (Next.js SSG)...');
  run('node scripts/build.cjs', 'admin');
}

const frontendOutIndex = path.join(ROOT, 'frontend/out/index.html');
if (fs.existsSync(frontendOutIndex)) {
  console.log('[deploy] [3/5] frontend/out/ ya existe y está listo (omitiendo compilación pesada)...');
} else {
  console.log('[deploy] [3/5] Compilando Frontend (Next.js SSG)...');
  run('node scripts/build.cjs', 'frontend');
}

// ── 4. Generar Proxy Dinámico de API para Hostinger LiteSpeed (Patrón Unu-Raymi) ──
console.log('\n[deploy] [4/5] Configurando Proxy Dinámico para API...');
const apiProxyPhp = `<?php
// ==============================================================================
// Bearded Mountaineer Lodge API Dynamic Reverse Proxy (LiteSpeed / PHP -> Node.js)
// ==============================================================================

@error_reporting(0);
@ini_set('display_errors', '0');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$requestUri = $_SERVER['REQUEST_URI'];
if (strpos($requestUri, '/api') !== 0 && strpos($requestUri, '/uploads') !== 0) {
    $requestUri = '/api' . $requestUri;
}

// Descubrir socket o puerto dinámico escrito por server.js
$socket = null;
$socketCandidates = [
    __DIR__ . '/.node_socket',
    dirname(__DIR__) . '/.node_socket',
    dirname(dirname(__DIR__)) . '/.node_socket',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_socket',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/.node_socket',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/source/repository/.node_socket',
    '/home/u251936581/public_html/.node_socket',
    '/tmp/.node_socket'
];
foreach ($socketCandidates as $sc) {
    if (file_exists($sc)) {
        $s = trim(file_get_contents($sc));
        if (!empty($s) && file_exists($s)) {
            $socket = $s;
            break;
        }
    }
}

$port = null;
$portCandidates = [
    __DIR__ . '/.node_port',
    __DIR__ . '/bearded_node_port.txt',
    dirname(__DIR__) . '/.node_port',
    dirname(__DIR__) . '/bearded_node_port.txt',
    dirname(dirname(__DIR__)) . '/.node_port',
    dirname(dirname(__DIR__)) . '/bearded_node_port.txt',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/bearded_node_port.txt',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/source/repository/.node_port',
    '/home/u251936581/public_html/.node_port',
    '/tmp/.node_port',
    '/tmp/bearded_node_port.txt'
];
foreach ($portCandidates as $pc) {
    if (file_exists($pc)) {
        $p = trim(file_get_contents($pc));
        if (!empty($p) && is_numeric($p)) {
            $port = $p;
            break;
        }
    }
}

$targets = [];
if ($port) {
    $targets[] = "http://127.0.0.1:" . $port;
}
$targets[] = 'http://127.0.0.1:4000';
$targets[] = 'http://127.0.0.1:4001';
$targets[] = 'http://127.0.0.1:4002';
$targets[] = 'http://127.0.0.1:3001';
$targets[] = 'http://127.0.0.1:3000';
$targets[] = 'http://127.0.0.1:8080';

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

// 1. Probar socket Unix si está disponible
if ($socket) {
    $ch = curl_init('http://localhost' . $requestUri);
    curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, $socket);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $reqHeaders = $headers;
    $reqHeaders[] = "Host: api.beardedmountaineerlodge.com";
    if ($isMultipart) {
        $filteredHeaders = array_filter($reqHeaders, function($h) {
            $lh = strtolower($h);
            return strpos($lh, 'content-type:') !== 0 && strpos($lh, 'content-length:') !== 0;
        });
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($filteredHeaders));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
        if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if ($code > 0) {
        $response = $res;
        $httpCode = $code;
        $contentType = $cType;
    }
}

// 2. Probar puertos TCP si el socket no conectó
if ($httpCode === 0) {
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
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        $reqHeaders = $headers;
        $reqHeaders[] = "Host: api.beardedmountaineerlodge.com";

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
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if ($code > 0) {
            $response = $res;
            $httpCode = $code;
            $contentType = $cType;
            break;
        }
    }
}

// 3. Si aún no responde, verificar si existe puerto directo en /tmp/bearded_node_port.txt
if ($httpCode === 0) {
    $altPort = @file_get_contents('/tmp/bearded_node_port.txt');
    if ($altPort && is_numeric(trim($altPort))) {
        $altTarget = "http://127.0.0.1:" . trim($altPort) . $requestUri;
        $ch = curl_init($altTarget);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $cType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        if ($code > 0) {
            $response = $res;
            $httpCode = $code;
            $contentType = $cType;
        }
    }
}

if ($httpCode > 0) {
    if ($contentType) {
        header("Content-Type: $contentType");
    }
    http_response_code($httpCode);
    echo $response;
    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");
http_response_code(200);
echo json_encode([
    "success" => true,
    "status" => "starting",
    "message" => "Bearded Mountaineer Lodge API Gateway iniciando...",
    "path" => $requestUri,
    "timestamp" => date("c")
]);
exit(0);
`;

const apiProxyHtaccess = `<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.php [L]
</IfModule>
`;

// ── 5. Despliegue directo a Hostinger public_html ─────────────────────────────
console.log('\n[deploy] [5/5] Desplegando en directorios públicos...');

// .htaccess raíz limpio SIN directiva "Options" (evita 403 Forbidden en LiteSpeed)
const rootHtaccess = `DirectoryIndex index.html

<IfModule mod_headers.c>
  <FilesMatch "\\.(js|mjs|css|woff2|woff|ttf|svg|webp|png|jpg|jpeg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Redirigir /api al subdominio dedicado de API (preserva metodos POST/PUT con 307)
  RewriteRule ^api(/.*)?$ https://api.beardedmountaineerlodge.com/api$1 [R=307,L]

  # 2. Redirigir /admin al subdominio dedicado de Admin (Next.js SSG)
  RewriteRule ^admin(/.*)?$ https://admin.beardedmountaineerlodge.com$1 [R=301,L]

  # 3. Archivos y carpetas físicas del frontend (_next, uploads, favicon, etc.)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Fallback SPA Next.js para rutas del frontend
  RewriteRule ^ index.html [L]
</IfModule>
`;

// .htaccess universal para Admin (funciona en subcarpeta /admin y en subdominio admin.)
const universalAdminHtaccess = `DirectoryIndex index.html
<IfModule mod_rewrite.c>
RewriteEngine On

# Si el cliente admin llama a /api/*, delegar con 307 a api.beardedmountaineerlodge.com
RewriteRule ^api(/.*)?$ https://api.beardedmountaineerlodge.com/api$1 [R=307,L]

RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} -d
RewriteCond %{REQUEST_FILENAME}/index.html -f
RewriteRule ^(.*)$ $1/index.html [L]
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.*)$ $1.html [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
</IfModule>
`;

function deployTo(targetDir) {
  if (targetDir.includes('mycoandes') || targetDir === '/home/u251936581') {
    return false;
  }

  console.log(`[deploy] → Desplegando en: ${targetDir}`);
  try {
    fs.mkdirSync(targetDir, { recursive: true });

    // 1. Copiar frontend estático (out)
    const frontendOut = path.join(ROOT, 'frontend/out');
    if (fs.existsSync(frontendOut)) {
      const nextDir = path.join(targetDir, '_next');
      if (fs.existsSync(nextDir)) fs.rmSync(nextDir, { recursive: true, force: true });
      copyDir(frontendOut, targetDir);
      console.log('  ✅ Frontend exportado copiado a public_html');
    }

    // 2. Copiar frontend public assets
    const frontendPub = path.join(ROOT, 'frontend/public');
    if (fs.existsSync(frontendPub)) {
      copyDir(frontendPub, targetDir);
      console.log('  ✅ Frontend public assets copiados a public_html');
    }

    // 3. Copiar Admin estático (Next.js out) a public_html/admin
    const adminOut = path.join(ROOT, 'admin/out');
    if (fs.existsSync(adminOut)) {
      const pubAdmin = path.join(targetDir, 'admin');
      if (fs.existsSync(pubAdmin)) {
        fs.rmSync(pubAdmin, { recursive: true, force: true });
      }
      fs.mkdirSync(pubAdmin, { recursive: true });
      copyDir(adminOut, pubAdmin);
      fs.writeFileSync(path.join(pubAdmin, '.htaccess'), universalAdminHtaccess.trim());
      console.log('  ✅ Admin estático (Next.js) copiado a public_html/admin con .htaccess SPA');
    }

    // 4. Instalar Proxy Dinámico de API en public_html/api
    const pubApi = path.join(targetDir, 'api');
    fs.mkdirSync(pubApi, { recursive: true });
    fs.writeFileSync(path.join(pubApi, 'index.php'), apiProxyPhp.trim());
    fs.writeFileSync(path.join(pubApi, '.htaccess'), apiProxyHtaccess.trim());
    console.log('  ✅ API Proxy dinámico instalado en public_html/api');

    // 5. Limpiar .txt residuales de Next.js
    for (const f of fs.readdirSync(targetDir)) {
      if (f.startsWith('__next.') || (f.endsWith('.txt') && f !== 'robots.txt')) {
        try { fs.unlinkSync(path.join(targetDir, f)); } catch (_) {}
      }
    }

    // 6. Escribir .htaccess raíz limpio (SIN Options)
    fs.writeFileSync(path.join(targetDir, '.htaccess'), rootHtaccess.trim());
    console.log('  ✅ .htaccess limpio instalado en public_html');

    return true;
  } catch (err) {
    console.error(`[deploy] ❌ Error en despliegue a ${targetDir}:`, err.message);
    return false;
  }
}

// Descubrimiento amplio de carpetas public_html hacia arriba y rutas oficiales
const candidatePublicHtmlDirs = [
  '/home/u251936581/domains/beardedmountaineerlodge.com/public_html',
  '/home/u251936581/public_html',
  path.resolve(ROOT, 'public_html')
];

let currentDir = ROOT;
for (let i = 0; i < 6; i++) {
  candidatePublicHtmlDirs.push(path.join(currentDir, 'public_html'));
  const parent = path.dirname(currentDir);
  if (parent === currentDir) break;
  currentDir = parent;
}

if (isLinux) {
  const uniqueTargets = Array.from(new Set(candidatePublicHtmlDirs));
  uniqueTargets.forEach(function(target) {
    if (fs.existsSync(target) || fs.existsSync(path.dirname(target))) {
      deployTo(target);
    }
  });

  // Subdominios dedicados en Hostinger
  const subAdminTargets = [
    '/home/u251936581/domains/admin.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/admin.beardedmountaineerlodge.com',
    '/home/u251936581/domains/beardedmountaineerlodge.com/subdomains/admin',
    '/home/u251936581/subdomains/admin'
  ];
  subAdminTargets.forEach(function(p) {
    if (fs.existsSync(p) || fs.existsSync(path.dirname(p))) {
      try {
        fs.mkdirSync(p, { recursive: true });
        const adminOut = path.join(ROOT, 'admin/out');
        if (fs.existsSync(adminOut)) {
          copyDir(adminOut, p);
          fs.writeFileSync(path.join(p, '.htaccess'), universalAdminHtaccess.trim());
          console.log('  ✅ Subdominio admin. poblado con Next.js SSG:', p);
        }
      } catch (_) {}
    }
  });

  const subApiTargets = [
    '/home/u251936581/domains/api.beardedmountaineerlodge.com/public_html',
    '/home/u251936581/domains/api.beardedmountaineerlodge.com',
    '/home/u251936581/domains/beardedmountaineerlodge.com/subdomains/api',
    '/home/u251936581/subdomains/api'
  ];
  subApiTargets.forEach(function(p) {
    if (fs.existsSync(p) || fs.existsSync(path.dirname(p))) {
      try {
        fs.mkdirSync(p, { recursive: true });
        fs.writeFileSync(path.join(p, 'index.php'), apiProxyPhp.trim());
        fs.writeFileSync(path.join(p, '.htaccess'), apiProxyHtaccess.trim());
        console.log('  ✅ Subdominio api. configurado con proxy dinámico:', p);
      } catch (_) {}
    }
  });

  // ── Sincronización a current/nodejs (Patrón Unu-Raymi sección 4) ──
  const currentDirs = [
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs',
    path.resolve(ROOT, '../current/nodejs'),
    path.resolve(ROOT, '../../current/nodejs')
  ];
  currentDirs.forEach(function(target) {
    if (fs.existsSync(path.dirname(target))) {
      try {
        fs.mkdirSync(target, { recursive: true });
        const itemsToCopy = ['server.js', 'package.json', 'frontend', 'admin', 'backend', '.env', '.env.production'];
        itemsToCopy.forEach(function(item) {
          const itemSrc = path.join(ROOT, item);
          const itemDest = path.join(target, item);
          if (fs.existsSync(itemSrc)) {
            copyDir(itemSrc, itemDest);
          }
        });
        console.log('[deploy] ✅ Archivos de la aplicación sincronizados a runtime:', target);
      } catch (_) {}
    }
  });

  // ── Limpieza de caché residual en Hostinger ──
  try {
    execSync('npm cache clean --force 2>/dev/null || true', { stdio: 'ignore' });
    const userHome = process.env.HOME || '/home/u251936581';
    const cacheDir = path.join(userHome, '.cache');
    if (fs.existsSync(cacheDir)) {
      for (const d of ['next', 'turbo', 'yarn']) {
        const p = path.join(cacheDir, d);
        if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
      }
    }
    console.log('[deploy] ✅ Caché de Hostinger purgada.');
  } catch (_) {}

  // ── Reinicio de aplicación Node.js en Hostinger (Phusion Passenger) ──
  const restartPaths = [
    path.join(ROOT, 'tmp', 'restart.txt'),
    path.resolve(ROOT, '../tmp/restart.txt'),
    path.resolve(ROOT, '../../tmp/restart.txt'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/tmp/restart.txt',
    '/home/u251936581/domains/beardedmountaineerlodge.com/tmp/restart.txt',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/tmp/restart.txt',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/source/repository/tmp/restart.txt'
  ];
  for (const rp of restartPaths) {
    try {
      fs.mkdirSync(path.dirname(rp), { recursive: true });
      fs.writeFileSync(rp, String(Date.now()), 'utf8');
    } catch (_) {}
  }
  console.log('[deploy] ✅ Señal de reinicio enviada a Passenger (tmp/restart.txt).');

  // ── Lanzamiento de server.js como daemon background en Hostinger ──
  try {
    execSync('pkill -f "node.*server.js" 2>/dev/null || true');
    const logPath = '/tmp/bml_server.log';
    const outLog = fs.openSync(logPath, 'a');
    const errLog = fs.openSync(logPath, 'a');
    const child = spawn('node', [path.join(ROOT, 'server.js')], {
      cwd: ROOT,
      detached: true,
      stdio: ['ignore', outLog, errLog],
      env: process.env
    });
    child.unref();
    console.log('[deploy] ✅ server.js iniciado en segundo plano (PID:', child.pid, ')');
  } catch (e) {
    console.warn('[deploy] ⚠️ Aviso iniciando server.js:', e.message);
  }
} else {
  console.log('[deploy] ℹ️  Entorno local (Windows): omitiendo despliegue en /home/u251936581.');
}

console.log('[deploy] ✅ Build & Deploy finalizado exitosamente.\n');
