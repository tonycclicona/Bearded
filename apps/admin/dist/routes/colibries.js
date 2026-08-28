import { prisma } from '../lib/prisma.js';
import { uploadMedia } from '../lib/upload.js';
import { optimizeToWebp } from '../lib/image.js';
import { createCrudRouter, str, num, bool, fileOrFieldUrl } from './crud.js';
export default createCrudRouter({
    model: prisma.especieColibri,
    listPath: '/admin/colibries',
    viewDir: 'colibries',
    idType: 'number',
    upload: [
        uploadMedia.fields([
            { name: 'image', maxCount: 1 },
            { name: 'audioFile', maxCount: 1 }
        ]),
        async (req, _res, next) => {
            try {
                const files = req.files;
                if (files && files['image'] && files['image'][0]) {
                    const webpName = await optimizeToWebp(files['image'][0].filename);
                    files['image'][0].filename = webpName;
                }
                next();
            }
            catch (err) {
                next(err);
            }
        }
    ],
    toInput: (body, file, files) => ({
        nombreComun: str(body.nombreComun),
        nombreCientifico: str(body.nombreCientifico),
        familia: str(body.familia) || 'Trochilidae',
        estadoIUCN: str(body.estadoIUCN) || 'Preocupación Menor (LC)',
        endemicoPeru: bool(body.endemicoPeru),
        altitudMinMsnm: num(body.altitudMinMsnm) || 1500,
        altitudMaxMsnm: num(body.altitudMaxMsnm) || 3500,
        descripcion: str(body.descripcion),
        fotoPrincipal: fileOrFieldUrl(body.fotoPrincipal, file, files, 'image'),
        audioCantoUrl: fileOrFieldUrl(body.audioCantoUrl, undefined, files, 'audioFile')
    })
});
//# sourceMappingURL=colibries.js.map