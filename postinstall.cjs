// ==============================================================================
// postinstall.cjs — Bearded Mountaineer Lodge
// Ejecutado automáticamente por npm después de "npm install"
//
// Este script realiza ÚNICAMENTE lo necesario para que el proyecto funcione
// después de instalar dependencias:
//   1. Genera el Prisma Client (requerido para que backend y admin importen @prisma/client)
//
// Para compilar y desplegar en producción, usa:
//   bash deployment/build.sh   → Compila todos los workspaces
//   bash deployment/deploy.sh  → Copia artefactos a public_html/
// ==============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

loadEnv(path.resolve(process.cwd(), '.env'));
loadEnv(path.resolve(process.cwd(), 'backend/.env'));

// Prisma generate requiere una DATABASE_URL válida (aunque sea dummy)
// para poder generar el cliente. El cliente generado es independiente
// de la base de datos de producción.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://dummy:dummy@localhost:3306/dummy';
}

// ── Prisma Generate ───────────────────────────────────────────────────────────
const schemaFile = path.join(process.cwd(), 'backend/prisma/schema.prisma');

if (!fs.existsSync(schemaFile)) {
  console.log('[postinstall] schema.prisma no encontrado, omitiendo prisma generate.');
  process.exit(0);
}

// Habilitar permisos de ejecución en los binarios de Prisma (Linux/Hostinger)
if (process.platform === 'linux') {
  try {
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    execSync(
      `find "${nodeModulesPath}" -name "schema-engine*" -exec chmod +x {} + 2>/dev/null || true`,
      { stdio: 'ignore' }
    );
    execSync(
      `find "${nodeModulesPath}" -name "query-engine*" -exec chmod +x {} + 2>/dev/null || true`,
      { stdio: 'ignore' }
    );
  } catch (_) {}
}

// Intentar prisma generate con fallbacks
const localPrismaCli = path.join(process.cwd(), 'node_modules/prisma/build/index.js');
const binPrismaCli = path.join(process.cwd(), 'node_modules/.bin/prisma');

const prismaCommands = [
  fs.existsSync(localPrismaCli) ? `node "${localPrismaCli}" generate --schema="${schemaFile}"` : null,
  fs.existsSync(binPrismaCli) ? `"${binPrismaCli}" generate --schema="${schemaFile}"` : null,
  `npx prisma generate --schema="${schemaFile}"`
].filter(Boolean);

let generated = false;
for (const cmd of prismaCommands) {
  try {
    execSync(cmd, { stdio: 'pipe', env: process.env });
    console.log('[postinstall] ✅ Prisma Client generado exitosamente.');
    generated = true;
    break;
  } catch (e) {
    // Continuar con el siguiente fallback
  }
}

if (!generated) {
  console.warn('[postinstall] ⚠️  No se pudo generar Prisma Client. Ejecuta manualmente:');
  console.warn(`  npx prisma generate --schema=backend/prisma/schema.prisma`);
}

process.exit(0);
