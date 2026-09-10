import fs from 'fs';
import path from 'path';
import { FALLBACK_PASSES, FALLBACK_SPOTS, FALLBACK_ROUTES, FALLBACK_ROOMS, FALLBACK_EXPERIENCES, FALLBACK_PHOTOS, FALLBACK_WORKSHOPS, FALLBACK_COLIBRIES, FALLBACK_PUNTOS_GIS, FALLBACK_TOURS, FALLBACK_GUIAS } from './fallbacks.js';
const rootDir = fs.existsSync(path.resolve(process.cwd(), 'admin'))
    ? process.cwd()
    : path.resolve(process.cwd(), '..');
const dataDir = path.resolve(rootDir, 'backend/data');
const storePath = path.resolve(dataDir, 'db.json');
let storeCache = null;
let lastMtime = 0;
export function normalizeCollection(col) {
    if (!col)
        return 'unknown';
    const c = col.toLowerCase().replace(/^\/+|\/+$/g, '').trim();
    if (c === 'pases' || c === 'hummingbird_passes' || c === 'passes')
        return 'passes';
    if (c === 'escenarios' || c === 'hummingbird-spots' || c === 'hummingbird_spots' || c === 'spots')
        return 'spots';
    if (c === 'rutas' || c === 'routes')
        return 'routes';
    if (c === 'habitaciones' || c === 'rooms')
        return 'rooms';
    if (c === 'experiencias' || c === 'lodge_experiences' || c === 'experiences')
        return 'experiences';
    if (c === 'fotos' || c === 'photo_products' || c === 'photos')
        return 'photos';
    if (c === 'talleres' || c === 'photo_workshops' || c === 'workshops')
        return 'workshops';
    if (c === 'especies_colibries' || c === 'colibries')
        return 'colibries';
    if (c === 'puntos_gis' || c === 'puntos-gis')
        return 'puntos-gis';
    if (c === 'tours')
        return 'tours';
    if (c === 'guias')
        return 'guias';
    return c;
}
function getInitialStore() {
    return {
        passes: JSON.parse(JSON.stringify(FALLBACK_PASSES)),
        spots: JSON.parse(JSON.stringify(FALLBACK_SPOTS)),
        routes: JSON.parse(JSON.stringify(FALLBACK_ROUTES)),
        rooms: JSON.parse(JSON.stringify(FALLBACK_ROOMS)),
        experiences: JSON.parse(JSON.stringify(FALLBACK_EXPERIENCES)),
        photos: JSON.parse(JSON.stringify(FALLBACK_PHOTOS)),
        workshops: JSON.parse(JSON.stringify(FALLBACK_WORKSHOPS)),
        colibries: JSON.parse(JSON.stringify(FALLBACK_COLIBRIES)),
        'puntos-gis': JSON.parse(JSON.stringify(FALLBACK_PUNTOS_GIS)),
        tours: JSON.parse(JSON.stringify(FALLBACK_TOURS)),
        guias: JSON.parse(JSON.stringify(FALLBACK_GUIAS))
    };
}
export function loadStore() {
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        if (fs.existsSync(storePath)) {
            const stats = fs.statSync(storePath);
            if (storeCache && stats.mtimeMs === lastMtime) {
                return storeCache;
            }
            const raw = fs.readFileSync(storePath, 'utf8');
            storeCache = JSON.parse(raw);
            lastMtime = stats.mtimeMs;
            // Limpiar posibles alias duplicados dentro del JSON
            if (storeCache['habitaciones']) {
                if (!storeCache['rooms'])
                    storeCache['rooms'] = [];
                for (const h of storeCache['habitaciones']) {
                    if (!storeCache['rooms'].find((r) => r.id === h.id || r.name === h.name)) {
                        storeCache['rooms'].unshift(h);
                    }
                }
                delete storeCache['habitaciones'];
            }
            const init = getInitialStore();
            for (const k of Object.keys(init)) {
                if (!storeCache[k] || !Array.isArray(storeCache[k]) || storeCache[k].length === 0) {
                    storeCache[k] = init[k];
                }
            }
            return storeCache;
        }
    }
    catch (err) {
        console.warn('[Store] Error leyendo store.json, re-inicializando con fallbacks:', err);
    }
    storeCache = getInitialStore();
    persistStore();
    return storeCache;
}
export function persistStore() {
    if (!storeCache)
        return;
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(storePath, JSON.stringify(storeCache, null, 2), 'utf8');
        const stats = fs.statSync(storePath);
        lastMtime = stats.mtimeMs;
    }
    catch (err) {
        console.error('[Store] Error guardando store.json:', err);
    }
}
export const LocalStore = {
    getAll(collection) {
        const store = loadStore();
        const col = normalizeCollection(collection);
        return store[col] || [];
    },
    getById(collection, id, key = 'id') {
        const items = this.getAll(collection);
        return items.find((item) => String(item[key]) === String(id) || String(item.id) === String(id) || (item.slug && String(item.slug) === String(id))) || null;
    },
    create(collection, data) {
        const store = loadStore();
        const col = normalizeCollection(collection);
        if (!store[col])
            store[col] = [];
        let newId = data.id;
        if (!newId) {
            if (col === 'colibries' || col === 'puntos-gis' || col === 'tours' || col === 'guias') {
                const maxId = store[col].reduce((max, item) => {
                    const n = parseInt(item.id, 10);
                    return !isNaN(n) && n > max ? n : max;
                }, 0);
                newId = maxId + 1;
            }
            else {
                newId = `${col.slice(0, 4)}-${Date.now()}`;
            }
        }
        const newItem = {
            ...data,
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        store[col].unshift(newItem);
        persistStore();
        return newItem;
    },
    update(collection, id, changes, key = 'id') {
        const store = loadStore();
        const col = normalizeCollection(collection);
        if (!store[col])
            store[col] = [];
        const index = store[col].findIndex((item) => String(item[key]) === String(id) || String(item.id) === String(id) || (item.slug && String(item.slug) === String(id)));
        if (index !== -1) {
            const existing = store[col][index];
            const updated = {
                ...existing,
                ...changes,
                id: existing.id,
                updatedAt: new Date().toISOString()
            };
            store[col][index] = updated;
            persistStore();
            return updated;
        }
        return this.create(col, { ...changes, id });
    },
    delete(collection, id, key = 'id') {
        const store = loadStore();
        const col = normalizeCollection(collection);
        if (!store[col])
            return false;
        const prevLen = store[col].length;
        store[col] = store[col].filter((item) => String(item[key]) !== String(id) && String(item.id) !== String(id));
        const deleted = store[col].length < prevLen;
        if (deleted) {
            persistStore();
        }
        return deleted;
    },
    getSettings(key, defaultValue = {}) {
        const store = loadStore();
        return store[key] || defaultValue;
    },
    setSettings(key, value) {
        const store = loadStore();
        store[key] = { ...value, updatedAt: new Date().toISOString() };
        persistStore();
        return store[key];
    }
};
//# sourceMappingURL=store.js.map