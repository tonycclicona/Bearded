import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../src/lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

const IMAGE_EXT = /\.(jpe?g|png)$/i;
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;

async function convertExisting(): Promise<void> {
  const files = fs.readdirSync(uploadsDir).filter((f) => IMAGE_EXT.test(f));
  const mapping: Record<string, string> = {};

  for (const file of files) {
    const webp = file.replace(IMAGE_EXT, '.webp');
    const src = path.join(uploadsDir, file);
    const dest = path.join(uploadsDir, webp);
    await sharp(src)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(dest);
    fs.unlinkSync(src);
    mapping[file] = webp;
    console.log(`convertido ${file} -> ${webp}`);
  }

  if (Object.keys(mapping).length === 0) {
    console.log('Sin archivos por convertir.');
    await prisma.$disconnect();
    return;
  }

  const models = [
    { model: prisma.room, label: 'room' },
    { model: prisma.hummingbirdSpot, label: 'hummingbirdSpot' },
    { model: prisma.lodgeExperience, label: 'lodgeExperience' },
    { model: prisma.photoProduct, label: 'photoProduct' },
  ];

  let total = 0;
  for (const { model, label } of models) {
    const rows = (await model.findMany({
      where: { imageUrl: { startsWith: '/admin/uploads/' } },
    })) as { id: string; imageUrl: string }[];
    for (const row of rows) {
      const match = /\/admin\/uploads\/([^/]+)$/.exec(row.imageUrl);
      if (!match) continue;
      const newName = mapping[match[1]];
      if (!newName) continue;
      await model.update({
        where: { id: row.id },
        data: { imageUrl: `/admin/uploads/${newName}` },
      });
      total++;
    }
    console.log(`${label}: ${rows.length} filas revisadas`);
  }

  console.log(`BD actualizada: ${total} referencias -> WebP`);
  await prisma.$disconnect();
}

convertExisting().catch((err) => {
  console.error(err);
  process.exit(1);
});
