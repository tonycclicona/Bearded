import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { uploadsDir } from './upload.js';
export const MAX_WIDTH = 1200;
export const WEBP_QUALITY = 80;
export async function optimizeToWebp(filename) {
    const source = path.join(uploadsDir, filename);
    const webpName = `${filename.replace(/\.[^.]+$/, '')}.webp`;
    const dest = path.join(uploadsDir, webpName);
    await sharp(source)
        .rotate()
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(dest);
    fs.unlinkSync(source);
    return webpName;
}
export function processImageMiddleware(req, _res, next) {
    if (!req.file) {
        next();
        return;
    }
    optimizeToWebp(req.file.filename)
        .then((webpName) => {
        req.file.filename = webpName;
        next();
    })
        .catch(next);
}
export function processImagesMiddleware(req, _res, next) {
    const fileList = [];
    if (req.file) {
        fileList.push(req.file);
    }
    if (req.files) {
        if (Array.isArray(req.files)) {
            fileList.push(...req.files);
        }
        else {
            Object.values(req.files).forEach((files) => {
                if (Array.isArray(files)) {
                    fileList.push(...files);
                }
            });
        }
    }
    if (fileList.length === 0) {
        next();
        return;
    }
    Promise.all(fileList.map(async (f) => {
        if (f.mimetype && f.mimetype.startsWith('image/')) {
            const webpName = await optimizeToWebp(f.filename);
            f.filename = webpName;
        }
    }))
        .then(() => next())
        .catch(next);
}
//# sourceMappingURL=image.js.map