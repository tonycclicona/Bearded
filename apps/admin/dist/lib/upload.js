import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadsDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '';
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext.toLowerCase()}`);
    },
});
export const uploadMedia = multer({
    storage,
    limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') ||
            file.mimetype.startsWith('audio/') ||
            file.mimetype.startsWith('video/') ||
            /\.(mp3|wav|ogg|m4a|aac|flac|webp|jpg|jpeg|png|gif|mp4|webm)$/i.test(file.originalname)) {
            cb(null, true);
        }
        else {
            cb(new Error('Formato de archivo no soportado. Se permiten imágenes, audios y videos.'));
        }
    },
});
// Alias para compatibilidad con código existente
export const uploadImage = uploadMedia;
//# sourceMappingURL=upload.js.map