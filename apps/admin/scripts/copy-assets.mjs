import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

for (const dir of ['views', 'public']) {
  const src = join(root, 'src', dir);
  if (existsSync(src)) {
    cpSync(src, join(dist, dir), { recursive: true });
    console.log(`Copied ${dir} -> dist/${dir}`);
  }
}