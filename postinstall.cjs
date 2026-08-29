'use strict';

const { execSync } = require('child_process');

console.log('🚀 [Postinstall] Generando cliente Prisma ORM...');

try {
  execSync('npx prisma generate --schema=apps/backend/prisma/schema.prisma', { stdio: 'inherit' });
  console.log('✅ [Postinstall] Cliente Prisma generado con éxito.');
} catch (e) {
  console.warn('⚠️ [Postinstall] Warning prisma generate:', e.message);
}
