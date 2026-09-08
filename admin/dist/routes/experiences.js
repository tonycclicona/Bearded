import { prisma } from '../lib/prisma.js';
import { uploadImage } from '../lib/upload.js';
import { processImageMiddleware } from '../lib/image.js';
import { createCrudRouter, str, num, bool, lineArray, imageUrlFrom } from './crud.js';
export default createCrudRouter({
    model: prisma.lodgeExperience,
    listPath: '/admin/experiences',
    viewDir: 'experiences',
    upload: [uploadImage.single('image'), processImageMiddleware],
    toInput: (body, file) => ({
        title: str(body.title),
        price: num(body.price),
        priceUSD: body.priceUSD ? num(body.priceUSD) : null,
        showPEN: bool(body.showPEN),
        showUSD: bool(body.showUSD),
        duration: str(body.duration),
        description: str(body.description),
        included: lineArray(body.included),
        imageUrl: imageUrlFrom(body.imageUrl, file),
        sortOrder: num(body.sortOrder)
    })
});
//# sourceMappingURL=experiences.js.map