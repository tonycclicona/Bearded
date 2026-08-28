import { Router } from 'express';
import { requireAuth } from './auth.js';
export function createCrudRouter(options) {
    const { model, listPath, viewDir, toInput, upload, idType = 'string' } = options;
    const router = Router();
    const uploads = Array.isArray(upload) ? upload : upload ? [upload] : [];
    const withUpload = (handler) => [...uploads, handler];
    const parseId = (rawId) => {
        const strId = String(rawId ?? '');
        return idType === 'number' ? parseInt(strId, 10) || 0 : strId;
    };
    router.get('/', requireAuth, async (_req, res) => {
        const rows = (await model.findMany());
        res.render(`${viewDir}/index`, { rows, listPath });
    });
    router.get('/create', requireAuth, (_req, res) => {
        res.render(`${viewDir}/create`, { listPath });
    });
    router.post('/create', requireAuth, ...withUpload(async (req, res) => {
        await model.create({
            data: toInput(req.body, req.file, req.files)
        });
        res.redirect(listPath);
    }));
    router.get('/:id/edit', requireAuth, async (req, res) => {
        const id = parseId(req.params.id);
        const row = await model.findUnique({ where: { id } });
        res.render(`${viewDir}/edit`, { row, listPath });
    });
    router.post('/:id/edit', requireAuth, ...withUpload(async (req, res) => {
        const id = parseId(req.params.id);
        await model.update({
            where: { id },
            data: toInput(req.body, req.file, req.files)
        });
        res.redirect(listPath);
    }));
    router.post('/:id/delete', requireAuth, async (req, res) => {
        const id = parseId(req.params.id);
        await model.delete({ where: { id } });
        res.redirect(listPath);
    });
    return router;
}
export function str(value) {
    if (typeof value === 'string')
        return value.trim();
    return value == null ? '' : String(value);
}
export function num(value) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
}
export function lineArray(value) {
    if (Array.isArray(value))
        return value.map(str).filter(Boolean);
    return str(value)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
}
export function bool(value) {
    return value === 'on' || value === 'true' || value === true || value === 1 || value === '1';
}
export function imageUrlFrom(value, file) {
    if (file)
        return `/admin/uploads/${file.filename}`;
    return str(value);
}
export function fileOrFieldUrl(bodyValue, file, files, fieldName) {
    if (files && !Array.isArray(files) && fieldName && files[fieldName]?.[0]) {
        return `/admin/uploads/${files[fieldName][0].filename}`;
    }
    if (file) {
        return `/admin/uploads/${file.filename}`;
    }
    return str(bodyValue);
}
export function galleryUrlsFrom(bodyUrls, files, fieldName = 'galleryImages') {
    const existing = lineArray(bodyUrls);
    const uploaded = [];
    if (files) {
        if (!Array.isArray(files) && files[fieldName]) {
            files[fieldName].forEach((f) => uploaded.push(`/admin/uploads/${f.filename}`));
        }
        else if (Array.isArray(files)) {
            files.forEach((f) => uploaded.push(`/admin/uploads/${f.filename}`));
        }
    }
    return [...existing, ...uploaded];
}
//# sourceMappingURL=crud.js.map