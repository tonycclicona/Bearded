import fs from 'fs';
import path from 'path';

const homeDir = process.env.HOME || '/home/u251936581';
const hbuildsPublicHtml = path.join(homeDir, 'hbuilds', 'current', 'public_html');
const lastSourcePublicHtml = path.join(homeDir, 'hbuilds', 'last-source', 'public_html');
const targetPublicHtml = path.join(homeDir, 'public_html');

console.log('🔗 [Hostinger Symlink] Configurando enlace simbólico permanente...');
console.log('   - Destino web:', targetPublicHtml);

// Determinar el origen real
let sourcePath = null;
if (fs.existsSync(hbuildsPublicHtml)) {
  sourcePath = hbuildsPublicHtml;
} else if (fs.existsSync(lastSourcePublicHtml)) {
  sourcePath = lastSourcePublicHtml;
}

if (!sourcePath) {
  console.log(`ℹ️ [Hostinger Symlink] Origen no encontrado en rutas automáticas.`);
  console.log(`   Rutas probadas:`);
  console.log(`   - ${hbuildsPublicHtml}`);
  console.log(`   - ${lastSourcePublicHtml}`);
} else {
  console.log('   - Origen detectado:', sourcePath);
  try {
    // Si targetPublicHtml es un directorio normal o enlace existente
    if (fs.existsSync(targetPublicHtml)) {
      const stats = fs.lstatSync(targetPublicHtml);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(targetPublicHtml);
        console.log('   ♻️ Enlace simbólico anterior removido.');
      } else {
        // Renombrar o respaldar para seguridad
        const backupPath = `${targetPublicHtml}_backup_${Date.now()}`;
        fs.renameSync(targetPublicHtml, backupPath);
        console.log(`   📦 Carpeta anterior respaldada en: ${backupPath}`);
      }
    }

    // Crear el enlace simbólico
    fs.symlinkSync(sourcePath, targetPublicHtml, 'dir');
    console.log(`✅ [Hostinger Symlink] ¡Enlace creado con éxito!`);
    console.log(`   ${targetPublicHtml} ➔ ${sourcePath}`);
  } catch (err) {
    console.error('❌ [Hostinger Symlink] Error creando symlink:', err.message);
  }
}
