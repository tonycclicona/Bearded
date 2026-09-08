#!/usr/bin/env bash
# ==============================================================================
# build.sh — Script de compilación de producción para Bearded Mountaineer Lodge
# Dominio: beardedmountaineerlodge.com
# Node.js: >= 22.0.0
# Gestor de paquetes: npm (workspaces)
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ""
echo "======================================================="
echo "  Bearded Mountaineer Lodge — Production Build"
echo "  CWD: $ROOT_DIR"
echo "  Node: $(node --version)"
echo "  npm:  $(npm --version)"
echo "======================================================="
echo ""

# ── Validaciones previas ──────────────────────────────────────────────────────
if [[ ! -f "package.json" ]]; then
  echo "❌ Error: No se encontró package.json en la raíz. Ejecuta desde la raíz del monorepo."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "⚠️  Advertencia: DATABASE_URL no está definida. Prisma generate puede fallar."
  echo "   Define las variables de entorno en .env o expórtalas antes de ejecutar este script."
fi

if [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo "⚠️  Advertencia: NEXT_PUBLIC_API_URL no está definida."
  echo "   El frontend compilará sin URL de API."
  echo "   Exporta la variable antes de ejecutar:"
  echo "   export NEXT_PUBLIC_API_URL=https://api.beardedmountaineerlodge.com/api"
fi

# ── Fase 1: Instalación limpia ────────────────────────────────────────────────
echo "--- [1/4] Instalando dependencias (npm ci) ---"
npm ci
echo "✅ Dependencias instaladas"

# ── Fase 2: Prisma Generate ───────────────────────────────────────────────────
echo ""
echo "--- [2/4] Generando Prisma Client ---"
npx prisma generate --schema=backend/prisma/schema.prisma
echo "✅ Prisma Client generado"

# ── Fase 3: Build de workspaces ───────────────────────────────────────────────
echo ""
echo "--- [3/4] Compilando workspaces ---"

echo ""
echo "  [3a] Backend API..."
npm run build --workspace=backend
echo "  ✅ Backend compilado → backend/dist/index.js"

echo ""
echo "  [3b] Admin Panel..."
npm run build --workspace=admin
echo "  ✅ Admin compilado → admin/dist/index.js"

echo ""
echo "  [3c] Frontend Next.js (SSG)..."

# Cargar .env.production si existe para garantizar URLs correctas en el bundle
# .env.production tiene prioridad sobre .env (igual que lo hace Next.js internamente)
if [[ -f ".env.production" ]]; then
  echo "  → Cargando .env.production para el build del frontend..."
  set -o allexport
  source .env.production
  set +o allexport
elif [[ -z "${NEXT_PUBLIC_API_URL:-}" ]]; then
  echo ""
  echo "  ❌ ERROR: NEXT_PUBLIC_API_URL no está definida y no existe .env.production"
  echo "  El frontend se compilaría apuntando a localhost, lo que causará fallos en producción."
  echo ""
  echo "  Solución: Crea el archivo .env.production en la raíz del proyecto."
  echo "  Usa como plantilla: deployment/.env.production.example"
  exit 1
fi

echo "  → NEXT_PUBLIC_API_URL = ${NEXT_PUBLIC_API_URL}"
npm run build --workspace=frontend
echo "  ✅ Frontend compilado → frontend/out/"

# ── Fase 4: Verificación de artefactos ───────────────────────────────────────
echo ""
echo "--- [4/4] Verificando artefactos ---"

ERRORS=0

if [[ ! -f "backend/dist/index.js" ]]; then
  echo "  ❌ backend/dist/index.js no encontrado"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ backend/dist/index.js"
fi

if [[ ! -f "admin/dist/index.js" ]]; then
  echo "  ❌ admin/dist/index.js no encontrado"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ admin/dist/index.js"
fi

if [[ ! -f "frontend/out/index.html" ]]; then
  echo "  ❌ frontend/out/index.html no encontrado"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ frontend/out/index.html"
fi

if grep -r "localhost" frontend/out/_next/static --include="*.js" -l 2>/dev/null | head -1 | grep -q .; then
  echo "  ⚠️  Advertencia: Se encontraron referencias a 'localhost' en los chunks del frontend."
  echo "     Verifica que NEXT_PUBLIC_API_URL apunte al dominio de producción."
fi

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "======================================================="
  echo "  ✅ Build completado exitosamente"
  echo "  Siguiente paso: ejecutar deployment/deploy.sh"
  echo "======================================================="
  exit 0
else
  echo "======================================================="
  echo "  ❌ Build completado con $ERRORS error(es)"
  echo "  Revisa los mensajes anteriores antes de continuar."
  echo "======================================================="
  exit 1
fi
