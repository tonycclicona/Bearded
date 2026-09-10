interface DatabaseStore {
    passes: any[];
    spots: any[];
    routes: any[];
    rooms: any[];
    experiences: any[];
    photos: any[];
    workshops: any[];
    colibries: any[];
    'puntos-gis': any[];
    tours: any[];
    guias: any[];
    [key: string]: any[];
}
export declare function normalizeCollection(col: string): string;
export declare function loadStore(): DatabaseStore;
export declare function persistStore(): void;
export declare const LocalStore: {
    getAll(collection: string): any[];
    getById(collection: string, id: any, key?: string): any | null;
    create(collection: string, data: any): any;
    update(collection: string, id: any, changes: any, key?: string): any;
    delete(collection: string, id: any, key?: string): boolean;
    getSettings(key: string, defaultValue?: any): any;
    setSettings(key: string, value: any): any;
};
export {};
//# sourceMappingURL=store.d.ts.map