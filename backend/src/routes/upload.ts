import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

const router = Router();

// Directorio canónico de subidas
const rootDir = fs.existsSync(path.resolve(process.cwd(), 'admin'))
  ? process.cwd()
  : path.resolve(process.cwd(), '..');

export const uploadsDir = path.resolve(rootDir, 'admin/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// También sincronizar a root/uploads si existe para acceso directo
const secondaryUploadsDir = path.resolve(rootDir, 'uploads');
if (!fs.existsSync(secondaryUploadsDir)) {
  try { fs.mkdirSync(secondaryUploadsDir, { recursive: true }); } catch (_) {}
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '';
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = /\.(jpg|jpeg|png|webp|gif|svg|mp3|wav|ogg|m4a|aac|flac|mp4|webm|pdf)$/i;
    const isMimeAllowed = 
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype === 'application/pdf';

    if (allowedExtensions.test(file.originalname) || isMimeAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Se permiten imágenes, audios, videos y PDFs.'));
    }
  }
});

// Aceptar campos comunes tanto individuales como múltiples
const uploadHandler = upload.fields([
  { name: 'file', maxCount: 20 },
  { name: 'files', maxCount: 20 },
  { name: 'image', maxCount: 20 },
  { name: 'images', maxCount: 20 },
  { name: 'imagen', maxCount: 20 },
  { name: 'imagenes', maxCount: 20 },
  { name: 'gallery', maxCount: 20 },
  { name: 'audio', maxCount: 5 }
]);

/**
 * Optimiza una imagen a formato WebP (1200px max, calidad 80, rotación EXIF)
 */
async function optimizeImage(filePath: string, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  // No procesar SVGs ni GIFs animados con resize estático
  if (ext === '.svg' || ext === '.gif') {
    return filename;
  }

  const webpFilename = `${path.basename(filename, ext)}.webp`;
  const destPath = path.join(uploadsDir, webpFilename);

  try {
    await sharp(filePath)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(destPath);

    // Si el nombre cambió (ej: de .jpg a .webp), eliminar el original
    if (destPath !== filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    // Copiar al directorio secundario para redundancia
    if (fs.existsSync(secondaryUploadsDir)) {
      try {
        fs.copyFileSync(destPath, path.join(secondaryUploadsDir, webpFilename));
      } catch (_) {}
    }

    return webpFilename;
  } catch (err) {
    console.warn('[UPLOAD] Sharp optimization warning, keeping original:', err);
    return filename;
  }
}

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  uploadHandler(req, res, async (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar el archivo';
      return next(new AppError('UPLOAD_ERROR', message, 400));
    }

    const filesDict = req.files as Record<string, Express.Multer.File[]> | undefined;
    const fileList: Express.Multer.File[] = [];

    if (filesDict) {
      Object.values(filesDict).forEach((arr) => {
        if (Array.isArray(arr)) {
          fileList.push(...arr);
        }
      });
    }

    if (fileList.length === 0) {
      return next(new AppError('NO_FILE', 'No se ha proporcionado ningún archivo para subir', 400));
    }

    try {
      const processedResults = await Promise.all(
        fileList.map(async (file) => {
          const filePath = path.join(uploadsDir, file.filename);
          let finalFilename = file.filename;

          if (file.mimetype.startsWith('image/')) {
            finalFilename = await optimizeImage(filePath, file.filename);
          } else if (fs.existsSync(secondaryUploadsDir)) {
            try {
              fs.copyFileSync(filePath, path.join(secondaryUploadsDir, file.filename));
            } catch (_) {}
          }

          const url = `/uploads/${finalFilename}`;
          return {
            url,
            filename: finalFilename,
            originalName: file.originalname,
            size: file.size,
            mimetype: file.mimetype.startsWith('image/') ? 'image/webp' : file.mimetype
          };
        })
      );

      const primary = processedResults[0];
      const allUrls = processedResults.map((r) => r.url);

      res.status(200).json(
        AppResponse.success({
          url: primary.url,
          filename: primary.filename,
          originalName: primary.originalName,
          size: primary.size,
          mimetype: primary.mimetype,
          urls: allUrls,
          items: processedResults
        })
      );
    } catch (processErr: unknown) {
      const message = processErr instanceof Error ? processErr.message : 'Error al optimizar archivos';
      return next(new AppError('OPTIMIZE_ERROR', message, 500));
    }
  });
});

export default router;
