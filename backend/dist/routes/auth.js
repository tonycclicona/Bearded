import { Router } from 'express';
import { generateToken } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';
const router = Router();
router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        res.status(400).json({
            success: false,
            error: 'Usuario y contraseña son requeridos'
        });
        return;
    }
    const rawUser = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || 'admin';
    const rawEmail = process.env.ADMIN_EMAIL || 'admin@beardedmountaineerlodge.com';
    const rawPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || process.env.ADMIN_PWD || 'admin';
    const cleanUser = rawUser.trim().replace(/^["']|["']$/g, '');
    const cleanEmail = rawEmail.trim().replace(/^["']|["']$/g, '');
    const cleanPass = rawPass.trim().replace(/^["']|["']$/g, '');
    const inputUser = String(username).trim();
    const inputPass = String(password);
    // 1. Validar contra variables de entorno (Superadmin / Variables de Hostinger)
    const userMatches = inputUser.toLowerCase() === cleanUser.toLowerCase() ||
        inputUser.toLowerCase() === cleanEmail.toLowerCase() ||
        inputUser === 'admin';
    const passMatches = inputPass === cleanPass ||
        inputPass.trim() === cleanPass ||
        inputPass === rawPass;
    if (userMatches && passMatches) {
        const token = generateToken({
            username: cleanUser,
            email: cleanEmail,
            role: 'ADMIN'
        });
        res.json({
            success: true,
            token,
            user: {
                username: cleanUser,
                email: cleanEmail,
                role: 'ADMIN'
            }
        });
        return;
    }
    // 2. Validar contra tabla de usuarios en Prisma si existe
    try {
        const prisma = getPrisma();
        if (prisma && typeof prisma.user?.findFirst === 'function') {
            const user = await prisma.user.findFirst({
                where: {
                    OR: [
                        { username: username },
                        { email: username }
                    ]
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    password: true,
                    role: true
                }
            });
            if (user && user.password === password) {
                const token = generateToken({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role || 'ADMIN'
                });
                res.json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role || 'ADMIN'
                    }
                });
                return;
            }
        }
    }
    catch (_) { }
    res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
    });
});
router.get('/me', (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        res.status(401).json({ success: false, error: 'No autenticado' });
        return;
    }
    res.json({ success: true, authenticated: true });
});
export default router;
//# sourceMappingURL=auth.js.map