export class AppResponse {
    data;
    error;
    meta;
    constructor(data, error = null, meta = null) {
        this.data = data;
        this.error = error;
        this.meta = meta;
    }
    static success(data, meta = null) {
        return new AppResponse(data, null, meta);
    }
    static fail(code, message, statusCode = 500, meta = null) {
        return new AppResponse(null, { code, message, statusCode }, meta);
    }
}
//# sourceMappingURL=response.js.map