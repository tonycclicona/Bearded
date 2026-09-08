#!/usr/bin/env bash
# ==============================================================================
# deploy.sh — Script de despliegue a public_html para Bearded Mountaineer Lodge
# Dominio: beardedmountaineerlodge.com
# Hostinger: Compartido con Node.js administrado
#
# IMPORTANTE:
#   - Ejecutar DESPUÉS de build.sh
#   - Ejecuta migraciones de Prisma antes de copiar archivos
#   - NO elimina admin/uploads/ (directorio persistente)
#   - Requiere que frontend/out/ exista
#   - Requiere DATABASE_URL configurada en el entorno o .env
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Configuración ─────────────────────────────────────────────────────────────
HOSTINGER_OFFICIAL="/home/u251936581/domains/beardedmountaineerlodge.com/public_html"
if [[ -z "${PUBLIC_HTML_DIR:-}" ]]; then
  if [[ -d "/home/u251936581/domains/beardedmountaineerlodge.com" ]]; then
    PUBLIC_HTML_DIR="$HOSTINGER_OFFICIAL"
  else
    PUBLIC_HTML_DIR="$ROOT_DIR/public_html"
  fi
fi

# Sandbox Guard
if [[ "$PUBLIC_HTML_DIR" == *"mycoandes"* ]] || [[ "$PUBLIC_HTML_DIR" == "/home/u251936581" ]] || [[ "$PUBLIC_HTML_DIR" == "/home/u251936581/public_html" ]]; then
  echo "🛑 ERROR DE SEGURIDAD: Ruta de destino prohibida: $PUBLIC_HTML_DIR"
  exit 1
fi

NODE_PORT="${GATEWAY_PORT:-${PORT:-4000}}"
PROXY_SRC="$ROOT_DIR/deployment/proxy-api.php"

echo ""
echo "======================================================="
echo "  Bearded Mountaineer Lodge — Deploy to public_html"
echo "  PUBLIC_HTML: $PUBLIC_HTML_DIR"
echo "  NODE_PORT:   $NODE_PORT"
echo "======================================================="
echo ""

# ── Validaciones ──────────────────────────────────────────────────────────────
if [[ ! -f "frontend/out/index.html" ]]; then
  echo "❌ Error: frontend/out/index.html no encontrado."
  echo "   Ejecuta primero: bash deployment/build.sh"
  exit 1
fi

if [[ ! -f "$PROXY_SRC" ]]; then
  echo "❌ Error: deployment/proxy-api.php no encontrado."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ Error: DATABASE_URL no está definida."
  echo "   Las migraciones de Prisma requieren DATABASE_URL."
  echo "   Carga el .env antes de ejecutar este script:"
  echo "   source .env && bash deployment/deploy.sh"
  exit 1
fi

# ── Fase 1: Migraciones de base de datos ─────────────────────────────────────
echo "--- [1/6] Ejecutando migraciones de Prisma ---"
echo "   DATABASE_URL detectada: ${DATABASE_URL%%@*}@..."

if npx prisma migrate deploy --schema=backend/prisma/schema.prisma; then
  echo "  ✅ Migraciones aplicadas correctamente"
else
  echo ""
  echo "  ❌ Error al aplicar migraciones."
  echo "  El deploy se ha DETENIDO para evitar desplegar código contra un schema desactualizado."
  echo "  Revisa la conexión a la base de datos y el estado de las migraciones:"
  echo "    npx prisma migrate status --schema=backend/prisma/schema.prisma"
  exit 1
fi

# ── Crear estructura de public_html ──────────────────────────────────────────
echo "--- [2/6] Preparando directorios ---"
mkdir -p "$PUBLIC_HTML_DIR"
mkdir -p "$PUBLIC_HTML_DIR/api"
mkdir -p "$PUBLIC_HTML_DIR/admin"

# Crear directorio de uploads si no existe (NUNCA borrar el existente)
if [[ ! -d "$ROOT_DIR/admin/uploads" ]]; then
  mkdir -p "$ROOT_DIR/admin/uploads"
  echo "  ✅ admin/uploads/ creado"
fi

# ── Copiar frontend estático ──────────────────────────────────────────────────
echo ""
echo "--- [3/6] Copiando frontend estático a public_html/ ---"

# Limpiar solo archivos de build anteriores (no uploads ni proxy)
# Eliminar _next/ viejo para evitar chunks obsoletos
if [[ -d "$PUBLIC_HTML_DIR/_next" ]]; then
  rm -rf "$PUBLIC_HTML_DIR/_next"
fi

# Copiar frontend/out/ completo a public_html/
cp -r "$ROOT_DIR/frontend/out/." "$PUBLIC_HTML_DIR/"

# Eliminar el placeholder default.php de Hostinger si existe
if [[ -f "$PUBLIC_HTML_DIR/default.php" ]]; then
  rm -f "$PUBLIC_HTML_DIR/default.php"
  echo "  ✅ default.php eliminado"
fi

echo "  ✅ Frontend copiado a $PUBLIC_HTML_DIR/"

# ── Configurar .htaccess en raíz ─────────────────────────────────────────────
echo ""
echo "--- [4/6] Configurando .htaccess ---"

cat > "$PUBLIC_HTML_DIR/.htaccess" << 'HTACCESS'
DirectoryIndex index.html index.php
Options -Indexes +FollowSymLinks

<IfModule mod_mime.c>
  AddType application/javascript .js .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType font/woff2 .woff2
  AddType font/woff .woff
  AddType image/webp .webp
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.(js|mjs|css|woff2|woff|ttf|svg|webp|png|jpg|jpeg|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.(html)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>
</IfModule>

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 0. No reescribir peticiones del proxy inverso interno
  RewriteCond %{HTTP:X-Bypass-Proxy} 1
  RewriteRule ^ - [L]

  # 1. Subdominio API → proxy PHP
  RewriteCond %{HTTP_HOST} ^api\. [NC]
  RewriteRule ^(.*)$ api/index.php [L,QSA]

  # 2. Subdominio Admin → proxy PHP
  RewriteCond %{HTTP_HOST} ^admin\. [NC]
  RewriteCond %{REQUEST_URI} !^/static/ [NC]
  RewriteCond %{REQUEST_URI} !^/uploads/ [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteRule ^(.*)$ admin/index.php [L,QSA]

  # 3. Ruta /api/* → proxy PHP
  RewriteRule ^api(/.*)?$ api/index.php [L,QSA]

  # 4. Ruta /admin/* → proxy PHP
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin(/.*)?$ admin/index.php [L,QSA]

  # 5. Archivos y directorios físicos → servir directamente
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 6. Fallback SPA (Next.js static export con trailingSlash)
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ /index.html [L]
</IfModule>
HTACCESS

echo "  ✅ .htaccess creado en raíz"

# ── Configurar proxy API ──────────────────────────────────────────────────────
echo ""
echo "--- [5/6] Configurando proxies PHP ---"

cp "$PROXY_SRC" "$PUBLIC_HTML_DIR/api/index.php"
echo "$NODE_PORT" > "$PUBLIC_HTML_DIR/api/.node_port"

cat > "$PUBLIC_HTML_DIR/api/.htaccess" << 'HTACCESS_API'
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
# Impedir ejecución de scripts subidos
<FilesMatch "\.(php|php5|phtml|cgi|pl|py|rb|sh)$">
  Order Allow,Deny
  Deny from all
</FilesMatch>
HTACCESS_API

echo "  ✅ public_html/api/index.php configurado"

# ── Configurar proxy Admin ────────────────────────────────────────────────────
cp "$PROXY_SRC" "$PUBLIC_HTML_DIR/admin/index.php"
echo "$NODE_PORT" > "$PUBLIC_HTML_DIR/admin/.node_port"

cat > "$PUBLIC_HTML_DIR/admin/.htaccess" << 'HTACCESS_ADMIN'
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
HTACCESS_ADMIN

echo "  ✅ public_html/admin/index.php configurado"

# ── Escribir .node_port en raíz ──────────────────────────────────────────────
echo "$NODE_PORT" > "$PUBLIC_HTML_DIR/.node_port"

# ── Copiar assets estáticos del admin ────────────────────────────────────────
if [[ -d "$ROOT_DIR/admin/dist/public" ]]; then
  mkdir -p "$PUBLIC_HTML_DIR/admin/static"
  cp -r "$ROOT_DIR/admin/dist/public/." "$PUBLIC_HTML_DIR/admin/static/"
  echo "  ✅ Assets estáticos del admin copiados a public_html/admin/static/"
fi

# ── Resumen final ─────────────────────────────────────────────────────────────
echo ""
echo "--- [6/6] Verificación ---"

ERRORS=0

[[ -f "$PUBLIC_HTML_DIR/index.html" ]] && echo "  ✅ index.html" || { echo "  ❌ index.html FALTA"; ERRORS=$((ERRORS+1)); }
[[ -d "$PUBLIC_HTML_DIR/_next" ]] && echo "  ✅ _next/ (assets Next.js)" || { echo "  ❌ _next/ FALTA"; ERRORS=$((ERRORS+1)); }
[[ -f "$PUBLIC_HTML_DIR/.htaccess" ]] && echo "  ✅ .htaccess" || { echo "  ❌ .htaccess FALTA"; ERRORS=$((ERRORS+1)); }
[[ -f "$PUBLIC_HTML_DIR/api/index.php" ]] && echo "  ✅ api/index.php" || { echo "  ❌ api/index.php FALTA"; ERRORS=$((ERRORS+1)); }
[[ -f "$PUBLIC_HTML_DIR/admin/index.php" ]] && echo "  ✅ admin/index.php" || { echo "  ❌ admin/index.php FALTA"; ERRORS=$((ERRORS+1)); }

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "======================================================="
  echo "  ✅ Deploy a public_html completado exitosamente"
  echo ""
  echo "  ⚠️  ÚLTIMO PASO OBLIGATORIO:"
  echo "  Reinicia la aplicación Node.js en el panel de Hostinger"
  echo "  para que los cambios del backend y admin surtan efecto."
  echo "======================================================="
  exit 0
else
  echo "======================================================="
  echo "  ❌ Deploy con $ERRORS error(es). Revisa los mensajes."
  echo "======================================================="
  exit 1
fi
