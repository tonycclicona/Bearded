import crypto from 'crypto';
import { AppError } from '../utils/errors.js';
const JWT_SECRET = process.env.JWT_SECRET || 'bearded-secret-key-fallback-min-32-chars';
function base64UrlEncode(str) {
    return Buffer.from(str).toString('base64url');
}
function base64UrlDecode(str) {
    return Buffer.from(str, 'base64url').toString('utf8');
}
export function generateToken(payload) {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 días
    const body = base64UrlEncode(JSON.stringify({ ...payload, exp }));
    const signature = crypto.createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}
export function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new AppError('INVALID_TOKEN', 'Token inválido', 401);
        }
        const [header, body, signature] = parts;
        const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
            .update(`${header}.${body}`)
            .digest('base64url');
        if (signature !== expectedSig) {
            throw new AppError('INVALID_TOKEN', 'Firma de token inválida', 401);
        }
        const payload = JSON.parse(base64UrlDecode(body));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            throw new AppError('TOKEN_EXPIRED', 'Token expirado', 401);
        }
        return payload;
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError('INVALID_TOKEN', 'Token inválido o corrupto', 401);
    }
}
export function extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('MISSING_TOKEN', 'Token de autorización requerido', 401);
    }
    return authHeader.split(' ')[1];
}
//# sourceMappingURL=auth.js.map