import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/upload.js';
import { processImageMiddleware } from '../lib/image.js';
import { createCrudRouter, str, num, lineArray, imageUrlFrom } from './crud.js';
export default createCrudRouter({
    model: prisma.hummingbirdSpot,
    listPath: '/admin/spots',
    viewDir: 'spots',
    upload: [uploadImage.single('image'), processImageMiddleware],
    toInput: (body, file) => ({
        title: str(body.title),
        description: str(body.description),
        benefits: lineArray(body.benefits),
        imageUrl: imageUrlFrom(body.imageUrl, file),
        sortOrder: num(body.sortOrder)
    })
});
//# sourceMappingURL=spots.js.map