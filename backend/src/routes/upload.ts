import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppResponse } from '../utils/response.js';
import { AppError } from '../utils/errors.js';

const router = Router();

// Directorio oficial de subidas (admin/uploads)
const uploadsDir = path.resolve(process.cwd(), 'admin/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.webp';
    cb(null, `${timestamp}-${random}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|svg|pdf/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype.toLowerCase();
    if (allowedTypes.test(ext) || allowedTypes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido.'));
    }
  }
});

const uploadFields = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'imagen', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  uploadFields(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar el archivo';
      return next(new AppError('UPLOAD_ERROR', message, 400));
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const file = files?.file?.[0] || files?.imagen?.[0] || files?.image?.[0];

    if (!file) {
      return next(new AppError('NO_FILE', 'No se ha proporcionado ningún archivo para subir', 400));
    }

    const relativeUrl = `/uploads/${file.filename}`;

    res.status(200).json(
      AppResponse.success({
        url: relativeUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype
      })
    );
  });
});

export default router;
