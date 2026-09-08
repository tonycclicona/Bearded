import { Router, Request, Response } from 'express';
import { generateToken } from '../lib/auth.js';
import { getPrisma } from '../lib/prisma.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400).json({
      success: false,
      error: 'Usuario y contraseña son requeridos'
    });
    return;
  }

  const expectedUser = process.env.ADMIN_USER || 'admin';
  const expectedEmail = process.env.ADMIN_EMAIL || 'admin@beardedmountaineerlodge.com';
  const expectedPass = process.env.ADMIN_PASSWORD || 'admin';

  // 1. Validar contra variables de entorno (Superadmin / Fallback)
  const matchesEnv =
    (username === expectedUser || username === expectedEmail) &&
    password === expectedPass;

  if (matchesEnv) {
    const token = generateToken({
      username: expectedUser,
      email: expectedEmail,
      role: 'ADMIN'
    });
    res.json({
      success: true,
      token,
      user: {
        username: expectedUser,
        email: expectedEmail,
        role: 'ADMIN'
      }
    });
    return;
  }

  // 2. Validar contra tabla de usuarios en Prisma si existe
  try {
    const prisma = getPrisma();
    if (prisma && typeof (prisma as any).user?.findFirst === 'function') {
      const user = await (prisma as any).user.findFirst({
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
  } catch (_) {}

  res.status(401).json({
    success: false,
    error: 'Credenciales inválidas'
  });
});

router.get('/me', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ success: false, error: 'No autenticado' });
    return;
  }
  res.json({ success: true, authenticated: true });
});

export default router;
