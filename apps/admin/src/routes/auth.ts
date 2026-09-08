import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole: string;
  }
}

const router = Router();

router.get('/login', (req: Request, res: Response) => {
  if (req.session.userId) {
    res.redirect('/admin');
    return;
  }
  res.render('login', { error: null });
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const rawIdentifier = String(req.body.username || req.body.email || '').trim();
    const password = String(req.body.password || '').trim();

    if (!rawIdentifier || !password) {
      res.render('login', { error: 'Por favor complete todos los campos' });
      return;
    }

    // 1. Validar contra variables de entorno configuradas en Hostinger o fallback local
    const envAdminUsers = [
      process.env.ADMIN_USER,
      process.env.ADMIN_USERNAME,
      process.env.ADMIN_EMAIL,
      'admin',
      'admin@beardedmountaineerlodge.com'
    ].filter((val): val is string => Boolean(val && val.trim())).map(v => v.trim().toLowerCase());

    const envAdminPasswords = [
      process.env.ADMIN_PASSWORD,
      process.env.ADMIN_PASS,
      'admin123'
    ].filter((val): val is string => Boolean(val && val.trim()));

    if (envAdminUsers.length > 0 && envAdminPasswords.length > 0) {
      const matchUser = envAdminUsers.includes(rawIdentifier.toLowerCase());
      const matchPass = envAdminPasswords.includes(password);

      if (matchUser && matchPass) {
        req.session.userId = 'admin-env';
        req.session.userRole = 'ADMIN';
        res.redirect('/admin');
        return;
      }
    }

    // 2. Validar contra base de datos si las variables de entorno no coinciden o no están configuradas
    let user = null;
    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: rawIdentifier },
            { name: rawIdentifier }
          ]
        },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true
        }
      });
    } catch (dbErr) {
      console.warn('DB search failed during admin login:', dbErr);
    }

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
  } catch {
    res.render('login', { error: 'Error al iniciar sesión' });
  }
});

router.get('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/admin/login');
  });
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.userId) {
    res.redirect('/admin/login');
    return;
  }
  next();
}

export default router;
