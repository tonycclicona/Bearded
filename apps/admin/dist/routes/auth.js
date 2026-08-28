import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
const router = Router();
router.get('/login', (req, res) => {
    if (req.session.userId) {
        res.redirect('/admin');
        return;
    }
    res.render('login', { error: null });
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            res.render('login', { error: 'Credenciales inválidas' });
            return;
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.render('login', { error: 'Credenciales inválidas' });
            return;
        }
        req.session.userId = user.id;
        req.session.userRole = user.role;
        res.redirect('/admin');
    }
    catch {
        res.render('login', { error: 'Error al iniciar sesión' });
    }
});
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/admin/login');
    });
});
export function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        res.redirect('/admin/login');
        return;
    }
    next();
}
export default router;
//# sourceMappingURL=auth.js.map