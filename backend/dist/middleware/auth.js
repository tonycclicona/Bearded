import { verifyToken, extractTokenFromHeader } from '../lib/auth.js';
export function authenticate(req, _res, next) {
    try {
        const token = extractTokenFromHeader(req.headers.authorization);
        req.user = verifyToken(token);
        next();
    }
    catch (error) {
        next(error);
    }
}
export function authorize(roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                data: null,
                error: {
                    code: 'FORBIDDEN',
                    message: 'No tienes permiso para realizar esta acción',
                    statusCode: 403
                }
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map