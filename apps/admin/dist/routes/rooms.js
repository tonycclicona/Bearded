import { prisma } from '../lib/prisma.js';
import { uploadMedia } from '../lib/upload.js';
import { processImagesMiddleware } from '../lib/image.js';
import { createCrudRouter, str, num, bool, lineArray, galleryUrlsFrom } from './crud.js';
export default createCrudRouter({
    model: prisma.room,
    listPath: '/admin/rooms',
    viewDir: 'rooms',
    upload: [
        uploadMedia.fields([
            { name: 'image', maxCount: 1 },
            { name: 'galleryImages', maxCount: 10 }
        ]),
        processImagesMiddleware
    ],
    toInput: (body, file, files) => {
        let mainImageUrl = str(body.imageUrl);
        if (files && !Array.isArray(files) && files['image']?.[0]) {
            mainImageUrl = `/admin/uploads/${files['image'][0].filename}`;
        }
        else if (file) {
            mainImageUrl = `/admin/uploads/${file.filename}`;
        }
        const gallery = galleryUrlsFrom(body.gallery, files, 'galleryImages');
        const priceUSD = body.pricePerNightUSD ? num(body.pricePerNightUSD) : null;
        return {
            name: str(body.name),
            pricePerNight: num(body.pricePerNight),
            pricePerNightUSD: priceUSD,
            showPEN: bool(body.showPEN),
            showUSD: bool(body.showUSD),
            capacity: num(body.capacity),
            amenities: lineArray(body.amenities),
            imageUrl: mainImageUrl,
            gallery,
            featured: bool(body.featured),
            sortOrder: num(body.sortOrder)
        };
    }
});
//# sourceMappingURL=rooms.js.map