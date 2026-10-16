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
├── admin/             # Next.js 16 (App Router) SSG -> admin/out (admin.beardedmountaineerlodge.com)
├── backend/           # Express 5 REST API + Prisma -> backend/dist (api.beardedmountaineerlodge.com)
├── frontend/          # Next.js 16 (App Router) SSG -> frontend/out (beardedmountaineerlodge.com)
├── uploads/           # Directorio canónico único de subida de medios
├── postinstall.cjs    # Motor de build y preservación de DB para la App Node.js
└── .agent/rules/      # Reglas de desarrollo
```

## 🔒 Servicios Canónicos
- `backend/src/utils/errors.ts` — Clase `AppError`
- `backend/src/utils/response.ts` — Clase `AppResponse`
- `backend/src/lib/prisma.ts` — Cliente Prisma (única instancia)
- `backend/src/lib/auth.ts` — Lógica de JWT

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
### Backend API (`https://api.beardedmountaineerlodge.com`)
- `GET /api/passes` — Hummingbird passes
- `GET /api/routes` — Avian routes
- `GET /api/rooms` — Lodge rooms
- `GET /api/experiences` — Lodge experiences
- `GET /api/photos` — Photo products
- `GET /api/workshops` — Photo workshops
- `GET /api/spots` — Hummingbird spots
- `POST /api/checkout` — Process checkout
- `POST /api/upload` — Media uploads
- `GET /uploads/:filename` — Servir archivos estáticos subidos

### Admin Panel (`https://admin.beardedmountaineerlodge.com`)
- `GET /` — Dashboard
- `GET /passes` — Manage passes
- `GET /routes` — Manage routes
- `GET /rooms` — Manage rooms
- `GET /experiences` — Manage experiences
- `GET /photos` — Manage photos
- `GET /workshops` — Manage workshops

## 🚀 Arquitectura de Despliegue y Dominios (Hostinger Web Business)
### 1. Topología de Red y Dominios
- **Frontend Principal:** `https://beardedmountaineerlodge.com`
  - Tipo: PHP / HTML estático.
  - Contenido: Next.js SSG (`frontend/out`) exportado a la carpeta `public_html/` del dominio principal.
  - Enrutamiento: Controlado por `frontend/.htaccess` con fallback SPA.
- **Panel de Administración:** `https://admin.beardedmountaineerlodge.com`
  - Tipo: PHP / HTML estático.
  - Contenido: Next.js SSG (`admin/out`) exportado a la carpeta `public_html/` del subdominio admin.
  - Enrutamiento: Controlado por `admin/.htaccess` con fallback SPA.
  - Autenticación: `localStorage` + `sessionStorage` + cookie (`SameSite=Lax`).
- **Backend API REST:** `https://api.beardedmountaineerlodge.com`
  - Tipo: Web App Node.js (Node 22 LTS).
  - Raíz del proyecto en Hostinger: Carpeta del subdominio `api` (o directorio de la app Node).
  - Archivo de inicio: `backend/dist/index.js` (o `npm start`).
  - Carpeta única de medios: `uploads/` (servida directamente en `/uploads/*`).

### 2. Motor de Build y Automatización (`postinstall.cjs`)
1. **Preservación Inmutable:** Genera copia de seguridad `db.backup.[timestamp].json` antes de cualquier compilación.
2. **Directorio de Medios:** Verifica y asegura la existencia de `uploads/`.
3. **Backend:** Compila TypeScript mediante `backend/scripts/build.cjs` hacia `backend/dist/index.js`.
4. **Reinicio LiteSpeed:** Actualiza `tmp/restart.txt` para forzar la recarga automática del proceso Node.js en Hostinger.

### 3. Regla Inmutable de Base de Datos y Uploads en Despliegues
- **CERO BORRADO DE BD:** Bajo NINGUNA circunstancia se debe ejecutar `prisma migrate reset`, `db push --force-reset` ni eliminar/reemplazar `backend/data/db.json` o tablas en MySQL/PostgreSQL. Contienen información crítica de producción.
- **Backup Preventivo:** `postinstall.cjs` genera una copia de seguridad `db.backup.[timestamp].json` antes de cualquier paso de compilación.
- **Persistencia de Archivos Subidos:** La carpeta `uploads/` nunca debe ser purgada ni sobrescrita.
