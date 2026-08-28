import { Router, Request, Response } from 'express';
import type { RequestHandler } from 'express';
import { requireAuth } from './auth.js';

interface KeyedRow {
  id: string | number;
  [key: string]: unknown;
}

export interface UploadedFile {
  filename: string;
  originalname?: string;
  mimetype?: string;
}

export type MultiFiles = { [fieldname: string]: UploadedFile[] } | UploadedFile[];

interface CrudModel {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
}

interface CrudRouterOptions {
  model: CrudModel;
  listPath: string;
  viewDir: string;
  toInput: (body: Record<string, unknown>, file?: UploadedFile, files?: MultiFiles) => unknown;
  upload?: RequestHandler | RequestHandler[];
  idType?: 'string' | 'number';
}

export function createCrudRouter(options: CrudRouterOptions): Router {
  const { model, listPath, viewDir, toInput, upload, idType = 'string' } = options;
  const router = Router();
  const uploads = Array.isArray(upload) ? upload : upload ? [upload] : [];
  const withUpload = (handler: RequestHandler): RequestHandler[] => [...uploads, handler];

  const parseId = (rawId: unknown) => {
    const strId = String(rawId ?? '');
    return idType === 'number' ? parseInt(strId, 10) || 0 : strId;
  };

  router.get('/', requireAuth, async (_req: Request, res: Response) => {
    const rows = (await model.findMany()) as KeyedRow[];
    res.render(`${viewDir}/index`, { rows, listPath });
  });

  router.get('/create', requireAuth, (_req: Request, res: Response) => {
    res.render(`${viewDir}/create`, { listPath });
  });

  router.post('/create', requireAuth, ...withUpload(async (req: Request, res: Response) => {
    await model.create({
      data: toInput(
        req.body as Record<string, unknown>,
        req.file as UploadedFile | undefined,
        req.files as MultiFiles | undefined
      )
    });
    res.redirect(listPath);
  }));

  router.get('/:id/edit', requireAuth, async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    const row = await model.findUnique({ where: { id } });
    res.render(`${viewDir}/edit`, { row, listPath });
  });

  router.post('/:id/edit', requireAuth, ...withUpload(async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    await model.update({
      where: { id },
      data: toInput(
        req.body as Record<string, unknown>,
        req.file as UploadedFile | undefined,
        req.files as MultiFiles | undefined
      )
    });
    res.redirect(listPath);
  }));

  router.post('/:id/delete', requireAuth, async (req: Request, res: Response) => {
    const id = parseId(req.params.id);
    await model.delete({ where: { id } });
    res.redirect(listPath);
  });

  return router;
}

export function str(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  return value == null ? '' : String(value);
}

export function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function lineArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(str).filter(Boolean);
  return str(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function bool(value: unknown): boolean {
  return value === 'on' || value === 'true' || value === true || value === 1 || value === '1';
}

export function imageUrlFrom(value: unknown, file: UploadedFile | undefined): string {
  if (file) return `/admin/uploads/${file.filename}`;
  return str(value);
}

export function fileOrFieldUrl(
  bodyValue: unknown,
  file: UploadedFile | undefined,
  files: MultiFiles | undefined,
  fieldName?: string
): string {
  if (files && !Array.isArray(files) && fieldName && files[fieldName]?.[0]) {
    return `/admin/uploads/${files[fieldName][0].filename}`;
  }
  if (file) {
    return `/admin/uploads/${file.filename}`;
  }
  return str(bodyValue);
}

export function galleryUrlsFrom(
  bodyUrls: unknown,
  files: MultiFiles | undefined,
  fieldName: string = 'galleryImages'
): string[] {
  const existing = lineArray(bodyUrls);
  const uploaded: string[] = [];
  if (files) {
    if (!Array.isArray(files) && files[fieldName]) {
      files[fieldName].forEach((f) => uploaded.push(`/admin/uploads/${f.filename}`));
    } else if (Array.isArray(files)) {
      files.forEach((f) => uploaded.push(`/admin/uploads/${f.filename}`));
    }
  }
  return [...existing, ...uploaded];
}