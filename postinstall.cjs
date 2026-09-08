// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge Clean Build & Deploy
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
console.log('\n[deploy] [1/4] Prisma Generate...');
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
  }
} catch (e) {
  console.warn('[deploy] ⚠️  Aviso Prisma generate:', e.message);
}

// ── 2. Build Backend y Admin ──────────────────────────────────────────────────
console.log('\n[deploy] [2/4] Compilando Backend y Admin...');
run('node scripts/build.cjs', 'backend');
run('node scripts/build.cjs', 'admin');

// ── 3. Build Frontend (Next.js SSG) ───────────────────────────────────────────
const frontendOutIndex = path.join(ROOT, 'frontend/out/index.html');
if (fs.existsSync(frontendOutIndex)) {
  console.log('\n[deploy] [3/4] frontend/out/ ya existe y está listo (omitiendo compilación pesada en servidor)...');
} else {
  console.log('\n[deploy] [3/4] Compilando Frontend (Next.js SSG)...');
  run('node scripts/build.cjs', 'frontend');
}

// ── 4. Despliegue directo a Hostinger public_html ─────────────────────────────
console.log('\n[deploy] [4/4] Desplegando en public_html...');

// Generador de Proxy PHP inverso con soporte multi-puerto y fallback HTTPS (Patrón Unu-Raymi)
function generateProxyPhp(prefix) {
  return `<?php
// Bearded Mountaineer Lodge - Reverse Proxy to Node.js Gateway
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 1. Detectar puerto desde .node_port
$detectedPort = null;
$detectedSocket = null;
$portCandidates = [
    __DIR__ . '/.node_port',
    dirname(__DIR__) . '/.node_port',
    dirname(dirname(__DIR__)) . '/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/.node_port'
];
foreach ($portCandidates as $pf) {
    if (file_exists($pf)) {
        $val = trim(@file_get_contents($pf));
        if (!empty($val) && is_numeric($val)) {
            $detectedPort = intval($val);
            break;
        }
    }
}

$socketCandidates = [
    __DIR__ . '/.node_socket',
    dirname(__DIR__) . '/.node_socket',
    dirname(dirname(__DIR__)) . '/.node_socket',
    '/home/u251936581/domains/beardedmountaineerlodge.com/.node_socket'
];
foreach ($socketCandidates as $sf) {
    if (file_exists($sf)) {
        $val = trim(@file_get_contents($sf));
        if (!empty($val) && file_exists($val)) {
            $detectedSocket = $val;
            break;
        }
    }
}

$targets = [];
if ($detectedPort) {
    $targets[] = "http://127.0.0.1:{$detectedPort}";
}
$targets[] = 'http://127.0.0.1:4000';
$targets[] = 'http://127.0.0.1:3001';
$targets[] = 'http://127.0.0.1:3000';
// Fallback garantizado a Gateway principal HTTPS (patrón Unu-Raymi)
$targets[] = 'https://beardedmountaineerlodge.com';
$targets = array_values(array_unique($targets));

$uri = $_SERVER['REQUEST_URI'];
${prefix === 'admin' ? `if (strpos($uri, '/admin') !== 0 && strpos($uri, '/static') !== 0 && strpos($uri, '/uploads') !== 0) {
    $uri = '/admin' . (strpos($uri, '/') === 0 ? $uri : '/' . $uri);
}` : prefix === 'api' ? `if (strpos($uri, '/api') !== 0) {
    $uri = '/api' . (strpos($uri, '/') === 0 ? $uri : '/' . $uri);
}` : ''}

$headers = [];
$incoming = function_exists('getallheaders') ? getallheaders() : [];
foreach ($incoming as $k => $v) {
    $lk = strtolower($k);
    if ($lk !== 'host' && $lk !== 'accept-encoding' && $lk !== 'content-length') {
        $headers[] = "$k: $v";
    }
}
$headers[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'beardedmountaineerlodge.com');
$headers[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$headers[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');
$headers[] = "X-Bypass-Proxy: 1";

$body = null;
$isMultipart = !empty($_FILES) || (isset($_SERVER['CONTENT_TYPE']) && strpos(strtolower($_SERVER['CONTENT_TYPE']), 'multipart/form-data') !== false);
if ($isMultipart) {
    $postFields = $_POST;
    foreach ($_FILES as $field => $fileData) {
        if (is_array($fileData['tmp_name'])) {
            foreach ($fileData['tmp_name'] as $idx => $tmpName) {
                if (!empty($tmpName) && is_uploaded_file($tmpName) && $fileData['error'][$idx] === UPLOAD_ERR_OK) {
                    $postFields[$field . '[' . $idx . ']'] = new CURLFile($tmpName, $fileData['type'][$idx] ?: 'application/octet-stream', $fileData['name'][$idx]);
                }
            }
        } else if (!empty($fileData['tmp_name']) && is_uploaded_file($fileData['tmp_name']) && $fileData['error'] === UPLOAD_ERR_OK) {
            $postFields[$field] = new CURLFile($fileData['tmp_name'], $fileData['type'] ?: 'application/octet-stream', $fileData['name']);
        }
    }
} else if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
}

$response = false;
$httpCode = 0;
$responseHeaders = [];

foreach ($targets as $base) {
    $targetUrl = $base . $uri;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    if ($detectedSocket && strpos($base, '127.0.0.1') !== false) {
        curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, $detectedSocket);
    }

    $reqHeaders = $headers;
    if (strpos($base, 'beardedmountaineerlodge.com') !== false) {
        // En llamada HTTPS al gateway, apuntar Host al gateway
        $reqHeaders = array_filter($reqHeaders, function($h) {
            return strpos(strtolower($h), 'host:') !== 0;
        });
        $reqHeaders[] = "Host: beardedmountaineerlodge.com";
    }

    $respHeaders = [];
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($c, $h) use (&$respHeaders) {
        $len = strlen($h);
        $t = trim($h);
        if ($t !== '') $respHeaders[] = $t;
        return $len;
    });

    if ($isMultipart) {
        $filtered = array_filter($reqHeaders, function($h) {
            $lh = strtolower($h);
            return strpos($lh, 'content-type:') !== 0 && strpos($lh, 'content-length:') !== 0;
        });
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($filtered));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($reqHeaders));
        if ($body !== null && $body !== false) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 500 && $response !== false) {
        $responseHeaders = $respHeaders;
        break;
    }
}

if ($httpCode > 0 && $response !== false) {
    http_response_code($httpCode);
    foreach ($responseHeaders as $h) {
        $lh = strtolower($h);
        if (strpos($lh, 'set-cookie:') === 0 || strpos($lh, 'location:') === 0 || strpos($lh, 'content-type:') === 0 || strpos($lh, 'access-control-') === 0) {
            header($h, false);
        }
    }
    echo $response;
    exit(0);
}

http_response_code(502);
echo "<h1>502 Bad Gateway</h1><p>El servidor Node.js de Bearded Mountaineer Lodge no responde en los puertos locales ni via Gateway. Verifica que la Web App este en estado <strong>Started (Iniciada)</strong> en el panel de Hostinger.</p>";
`;
}

const subHtaccess = `DirectoryIndex index.php index.html

<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\\.php$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . index.php [L]
</IfModule>
`;

const rootHtaccess = `DirectoryIndex index.html index.php
Options -Indexes +FollowSymLinks

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

  # Subdominios o rutas de API -> proxy PHP
  RewriteCond %{HTTP_HOST} ^api\\. [NC,OR]
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # Subdominios o rutas de Admin -> proxy PHP
  RewriteCond %{HTTP_HOST} ^admin\\. [NC,OR]
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # Servir archivos físicos existentes directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # Fallback SPA para Next.js
  RewriteRule ^ /index.html [L]
</IfModule>
`;

// Destino canónico oficial en Hostinger para Bearded Mountaineer Lodge
const HOSTINGER_PUBLIC_HTML = '/home/u251936581/domains/beardedmountaineerlodge.com/public_html';

function deployTo(targetDir) {
  // Sandbox Guard
  if (targetDir.includes('mycoandes') || targetDir === '/home/u251936581' || targetDir === '/home/u251936581/public_html') {
    console.error(`[deploy] 🛑 BLOQUEO DE SEGURIDAD: Destino no permitido: "${targetDir}"`);
    return false;
  }

  console.log(`[deploy] → Desplegando en: ${targetDir}`);
  try {
    fs.mkdirSync(targetDir, { recursive: true });
    const apiDir = path.join(targetDir, 'api');
    const adminDir = path.join(targetDir, 'admin');
    const uploadsDir = path.join(targetDir, 'uploads');
    fs.mkdirSync(apiDir, { recursive: true });
    fs.mkdirSync(adminDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

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

    // 3. Limpiar .txt residuales de Next.js
    for (const f of fs.readdirSync(targetDir)) {
      if (f.startsWith('__next.') || (f.endsWith('.txt') && f !== 'robots.txt')) {
        try { fs.unlinkSync(path.join(targetDir, f)); } catch (_) {}
      }
    }

    // 4. Escribir .htaccess raíz
    fs.writeFileSync(path.join(targetDir, '.htaccess'), rootHtaccess.trim());

    // 5. Configurar API proxy
    fs.writeFileSync(path.join(apiDir, 'index.php'), generateProxyPhp('api').trim());
    fs.writeFileSync(path.join(apiDir, '.htaccess'), subHtaccess.trim());
    console.log('  ✅ API proxy configurado en public_html/api');

    // 6. Configurar Admin proxy y assets
    fs.writeFileSync(path.join(adminDir, 'index.php'), generateProxyPhp('admin').trim());
    fs.writeFileSync(path.join(adminDir, '.htaccess'), subHtaccess.trim());
    const adminPub = path.join(ROOT, 'admin/public');
    if (fs.existsSync(adminPub)) {
      copyDir(adminPub, adminDir);
      copyDir(adminPub, path.join(adminDir, 'static'));
    }
    const adminDistPub = path.join(ROOT, 'admin/dist/public');
    if (fs.existsSync(adminDistPub)) {
      copyDir(adminDistPub, adminDir);
      copyDir(adminDistPub, path.join(adminDir, 'static'));
    }
    console.log('  ✅ Admin proxy y assets configurados en public_html/admin');

    // 7. Eliminar default.php de Hostinger en todas las carpetas
    [targetDir, apiDir, adminDir].forEach(function(dir) {
      const defPhp = path.join(dir, 'default.php');
      if (fs.existsSync(defPhp)) {
        try { fs.unlinkSync(defPhp); } catch (_) {}
      }
    });

    console.log(`[deploy] ✅ Despliegue completado con éxito en: ${targetDir}\n`);
    return true;
  } catch (err) {
    console.error(`[deploy] ❌ Error en despliegue a ${targetDir}:`, err.message);
    return false;
  }
}

// Ejecutar en Linux (Hostinger)
if (isLinux) {
  deployTo(HOSTINGER_PUBLIC_HTML);
} else {
  console.log('[deploy] ℹ️  Entorno local (Windows): omitiendo copia a /home/u251936581.');
  console.log('[deploy] ℹ️  Builds listos para producción.');
}

// ── 5. Limpieza de caché residual en Hostinger ────────────────────────────────
if (isLinux) {
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
}

// ── 6. Reinicio de aplicación Node.js en Hostinger (Phusion Passenger) ────────
if (isLinux) {
  const restartPaths = [
    path.join(ROOT, 'tmp', 'restart.txt'),
    path.join(HOSTINGER_PUBLIC_HTML, 'tmp', 'restart.txt'),
    '/home/u251936581/domains/beardedmountaineerlodge.com/tmp/restart.txt'
  ];
  for (const rp of restartPaths) {
    try {
      fs.mkdirSync(path.dirname(rp), { recursive: true });
      fs.writeFileSync(rp, String(Date.now()), 'utf8');
    } catch (_) {}
  }
  console.log('[deploy] ✅ Señal de reinicio enviada a Passenger (tmp/restart.txt).');
}

console.log('[deploy] ✅ Build & Deploy finalizado.\n');
