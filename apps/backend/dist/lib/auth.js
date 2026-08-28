import jwt from 'jsonwebtoken';
import { AppError } from '@antigravity/shared/utils/errors';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch {
        throw new AppError('INVALID_TOKEN', 'Token inválido o expirado', 401);
    }
}
export function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('MISSING_TOKEN', 'Token de autorización requerido', 401);
    }
    return authHeader.split(' ')[1];
}
//# sourceMappingURL=auth.js.map