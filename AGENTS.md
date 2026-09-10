# AGENTS.md — Reglas Universales del Proyecto

## 🏗️ Stack Tecnológico
- **Backend:** Node.js 22 + Express 5 + TypeScript 5.7 (strict mode)
- **Admin:** React 19 + Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 (SSG Static Export)
- **Frontend:** React 19 + Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 (SSG Static Export)
- **DB:** MySQL / PostgreSQL + Prisma 6 (latest stable)
- **State:** Zustand 5 (client), TanStack Query 5 (server)
- **Styles:** Tailwind CSS 4

## 📁 Estructura del Proyecto
```
Antigravity/
├── admin/             # Next.js 16 (App Router) SSG -> admin/out
├── backend/           # Express 5 REST API + Prisma -> backend/dist
├── frontend/          # Next.js 16 (App Router) SSG -> frontend/out
├── server.js          # Unified Node.js Gateway & Server
├── postinstall.cjs    # Build & Hostinger LiteSpeed Deployment Engine
└── .agent/rules/      # Reglas de desarrollo
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

## 🚀 Arquitectura de Despliegue y Dominios (Hostinger LiteSpeed)
### 1. Topología de Red y Dominios
- **Frontend Principal:** `https://beardedmountaineerlodge.com`
  - Contenido: Next.js SSG (`frontend/out`) servido directamente desde `public_html/`.
  - Fallback SPA controlado por `.htaccess` raíz.
- **Panel de Administración:** `https://admin.beardedmountaineerlodge.com`
  - Contenido: Next.js SSG (`admin/out`) servido desde `public_html/admin/`.
  - Autenticación: `localStorage` + `sessionStorage` + cookie (`SameSite=Lax`). Sin dependencias de scripts síncronos en `<head>`.
  - CRUD interactivo: Todos los módulos cuentan con `CrudModal.tsx` para alta, edición y baja directa.
- **Backend API REST:** `https://api.beardedmountaineerlodge.com`
  - Motor: Express 5 + Node.js 22 ejecutándose en puerto local (4000/3000) en el panel de aplicaciones Node de Hostinger.
  - Proxy Reverso: Gestionado mediante `public_html/api/index.php` + `public_html/api/.htaccess` para canalizar peticiones al Node.js interno con headers `X-Forwarded-*`.

### 2. Motor de Build y Automatización (`postinstall.cjs`)
1. **Backend:** Compila TypeScript con `scripts/build.cjs` hacia `backend/dist`. Genera cliente dinámico de Prisma y sanitización de payloads contra el esquema de base de datos.
2. **API Proxy:** Escribe `index.php` y `.htaccess` en `public_html/api/`.
3. **Frontend:** Si no existe `frontend/out`, compila y distribuye a `public_html/`.
4. **Admin:** Si no existe `admin/out`, compila y distribuye a `public_html/admin/`.
5. **Reinicio LiteSpeed:** Actualiza la marca de tiempo en `tmp/restart.txt` para forzar la recarga del proceso Node.js sin requerir reinicio manual del servidor.

