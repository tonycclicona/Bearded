import { AppError } from '../utils/errors.js';
export function errorHandler(err, _req, res, _next) {
    console.error('Error:', err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            data: null,
            error: {
                code: err.code,
                message: err.message,
                statusCode: err.statusCode
            }
        });
    }
    const statusCode = err.status || err.statusCode || 500;
    return res.status(statusCode).json({
        data: null,
        error: {
            code: err.code || 'INTERNAL_ERROR',
            message: err.message || 'Error interno del servidor',
            statusCode
        }
    });
}
//# sourceMappingURL=error-handler.js.map