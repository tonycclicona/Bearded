# AGENTS.md — Reglas Universales del Proyecto

## 🏗️ Stack Tecnológico
- **Backend:** Node.js 22 + Express 5 + TypeScript 5.7 (strict mode)
- **Admin:** Express 5 + EJS views + TypeScript
- **Frontend:** React 19 + Next.js 16 (App Router) + TypeScript
- **DB:** PostgreSQL 16 + Prisma 6 (latest stable)
- **State:** Zustand 5 (client), TanStack Query 5 (server)
- **Styles:** Tailwind CSS 4

## 📁 Estructura del Monorepo
```
Antigravity/
├── apps/
│   ├── frontend/          # Next.js 16 (App Router)
│   ├── backend/           # Express 5 REST API + Prisma
│   └── admin/             # Express 5 + EJS views
├── packages/
│   └── shared/            # @antigravity/shared (types, utils)
├── .agent/rules/          # Reglas de desarrollo
└── .github/workflows/     # CI/CD
```

## 🔒 Servicios Canónicos
- `packages/shared/src/utils/errors.ts` — Clase `AppError`
- `packages/shared/src/utils/response.ts` — Clase `AppResponse`
- `apps/backend/src/lib/prisma.ts` — Cliente Prisma (única instancia)
- `apps/backend/src/lib/auth.ts` — Lógica de JWT

## 📐 Patrones Obligatorios
- **DB:** Prisma `findMany`/`findUnique` con `select` explícito. NUNCA `select: *`.
- **Errores:** Siempre `throw new AppError(code, message, statusCode)`. NUNCA `throw new Error()`.
- **Types:** `unknown` para datos externos. `zod` para validación. PROHIBIDO `any`.
- **Funciones:** Preferir composición funcional sobre bucles imperativos.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).

## ⚙️ Workflow de Ejecución
1. **Análisis:** Identificar tarea y archivos de reglas relevantes.
2. **Carga:** Leer reglas de `.agent/rules/`.
3. **Plan:** Plan de 3 pasos con archivos exactos a modificar.
4. **Validación:** Aprobación del usuario antes de escribir código.
5. **Implementación:** Código siguiendo TODAS las reglas cargadas.
6. **Verificación:** Sin duplicados ni violaciones de servicios canónicos.

## 🚫 Zonas de Alta Prioridad
- **Autenticación** → `.agent/rules/security.md`
- **Esquema de DB** → `.agent/rules/database.md`
- **APIs Públicas** → `.agent/rules/architecture.md`

## 🌐 Endpoints Principales
### Backend API (`apps/backend`)
- `GET /api/passes` — Hummingbird passes
- `GET /api/routes` — Avian routes
- `GET /api/rooms` — Lodge rooms
- `GET /api/experiences` — Lodge experiences
- `GET /api/photos` — Photo products
- `GET /api/workshops` — Photo workshops
- `POST /api/checkout` — Process checkout

### Admin Panel (`apps/admin`)
- `GET /admin` — Dashboard
- `GET /admin/passes` — Manage passes
- `GET /admin/routes` — Manage routes
- `GET /admin/rooms` — Manage rooms
- `GET /admin/experiences` — Manage experiences
- `GET /admin/photos` — Manage photos
- `GET /admin/workshops` — Manage workshops
