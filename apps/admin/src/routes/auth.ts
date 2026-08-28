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
