# 🦅 Antigravity — Plataforma de Avistamiento de Colibríes y Ecoturismo en Perú (GIS & Birdwatching)

Monorepo modular y escalable para la plataforma nacional de ecoturismo, expediciones ornitológicas y avistamiento de colibríes en el Perú, con georreferenciación GIS interactiva, catálogo taxonómico con bioacústica (cantos), reservas en línea y panel de administración visual.

---

## 🏗️ Arquitectura del Sistema (Monorrepo Modular)

```
Antigravity/
├── server.js              # Gateway Monorrepo unificado (Reverse Proxy Express para Producción)
├── ecosystem.config.cjs   # Orquestación de procesos PM2 para Producción
├── .env.development       # Variables para entorno de desarrollo local
├── .env.production        # Variables para entorno de producción (cPanel / VPS / Docker)
├── apps/
│   ├── frontend/          # Next.js 16 (App Router), Tailwind CSS 4, Leaflet GIS, Lucide, SWR / Query
│   ├── backend/           # Node.js + Express 5 REST API + Prisma ORM + JWT + Zod
│   └── admin/             # Express 5 + Vistas EJS + Multer + Sharp (Compresión WebP)
├── packages/
│   └── shared/            # @antigravity/shared (Types canónicos, AppError, AppResponse)
└── .agent/rules/          # Reglas de arquitectura, base de datos y estilo de código
```

---

## 🗺️ Módulos Principales & Funcionalidades

### 1. Mapa Interactivo GIS de Perú (`MapaPeruGIS.tsx`)
- **Macro-Rutas Ornitológicas:**
  - **Ruta Norte:** Amazonas / San Martín / Lambayeque / Cajamarca (Abra Patricia, Huembo Lodge, Bosque de Pómac).
  - **Ruta Centro:** Huánuco / Pasco / Junín / Lima (Carpish, Bosque Unchog, Santa Eulalia).
  - **Ruta Sur:** Cusco / Manu / Valle Sagrado / Arequipa (Santuario de San Salvador, Bosque Nuboso del Manu, Abra Málaga, Machu Picchu, Cañón del Colca).
- **Categorización de Marcadores GIS con Iconografía Diferenciada:**
  - 🟢 `HOTSPOT_COMEDERO` (Bebederos y jardines botánicos de alta densidad).
  - 🔵 `OBSERVATORIO_SILVESTRE` (Senderos de bosque nuboso y ceja de selva).
  - 🟣 `ESPECIE_ENDEMICA` (Hábitats de especies exclusivas peruanas en peligro / IUCN).
  - 🟠 `CAMPAMENTO_REFUGIO` (Campamentos de expedición y estaciones biológicas).
  - 🔴 `LOGISTICA_PUNTO_ENCUENTRO` (Puntos de partida y aeropuertos).
- **Filtros por Pisos Ecológicos:** Yunga (500–2,300 msnm), Quechua (2,300–3,500 msnm) y Suni/Puna (>3,500 msnm).
- **Geocodificación OpenStreetMap / Nominatim.**
- **Drawer interactivo** con fichas de especies presentes, reproductor de audio de cantos y botón de reserva de expedición.

### 2. Catálogo Taxonómico de Troquilinos (`TaxonomySection.tsx`)
- Catálogo taxonómico con estado de conservación IUCN (CR, EN, VU, NT, LC), badge de endemismo peruano y rango altitudinal.
- Reproductor de audio bioacústico en vivo para cada especie (*Loddigesia mirabilis*, *Ensifera ensifera*, *Oreonympha nobilis*, etc.).

### 3. Rutas & Expediciones Ornitológicas (`RoutesSection.tsx`)
- Expediciones guiadas con itinerario día a día, equipo óptico recomendado, servicios incluidos y cotización en línea.

### 4. Guías Ornitólogos Especialistas (`GuidesSection.tsx`)
- Perfiles de biólogos de campo y naturalistas con experiencia, idiomas y credenciales.

### 5. Panel de Administración Visual (`/admin`)
- Gestión integral sin código para:
  - Puntos y Hotspots GIS (`/admin/puntos-gis`)
  - Catálogo de Colibríes (`/admin/colibries`)
  - Tours y Expediciones (`/admin/tours`)
  - Guías Ornitólogos (`/admin/guias`)
  - Pases, Escenarios, Habitaciones, Fotos, Talleres y Pedidos.

---

## ⚡ Entornos de Ejecución

### A. Entorno de Desarrollo (`development`)
En desarrollo, cada servicio corre con recarga en vivo (hot-reloading):
- **Frontend:** `http://localhost:3000` (Next.js con Turbopack)
- **Backend API:** `http://localhost:3001/api` (Express + TSX watch)
- **Admin Panel:** `http://localhost:3002/admin` (Express EJS + TSX watch)

```bash
# Iniciar todos los servicios de desarrollo concurrentemente
npm run dev

# O iniciar con el gateway unificado de desarrollo
npm run dev:all
```

### B. Entorno de Producción (`production` / cPanel / VPS / Hostinger / Docker)
En producción, el **Gateway Monorrepo (`server.js`)** actúa como reverse proxy central y orquesta todo bajo un **único puerto público** (por defecto `8080` o `3000`):
- `http://tudominio.com/` → Servido por Next.js Frontend
- `http://tudominio.com/admin/*` → Servido por Admin Panel EJS
- `http://tudominio.com/api/*` → Servido por Backend REST API

```bash
# 1. Compilar todos los paquetes y aplicaciones
npm run build

# 2. Iniciar el Gateway de producción
npm run start:gateway

# O con PM2 en servidores de producción
pm2 start ecosystem.config.cjs
```

---

## 🛠️ Comandos y Scripts

```bash
# Base de Datos y Prisma
npm run prisma:generate     # Generar cliente de Prisma
npm run db:push             # Sincronizar esquema con la BD
npm run db:migrate          # Ejecutar migraciones
npm run db:seed             # Sembrar hotspots GIS, colibríes, tours y guías
npm run db:studio           # Prisma Studio visual

# Compilación y Tipado
npm run typecheck           # Verificación de TypeScript en todos los workspaces
npm run build               # Compilar shared, backend, admin y frontend
npm run lint                # Linter ESLint en todos los workspaces

# Ejecución
npm run dev                 # Iniciar desarrollo concurrente (3 puertos)
npm run start:gateway       # Iniciar Gateway unificado de producción
```

---

## 🔒 Variables de Entorno Clave

Configurables en `.env`, `.env.development` o `.env.production`:
- `DATABASE_URL`: Conexión a PostgreSQL / MySQL.
- `GATEWAY_PORT`: Puerto público del proxy inverso (ej: `8080` o `3000`).
- `JWT_SECRET`: Llave secreta para tokens de autenticación.
- `SESSION_SECRET`: Llave para sesiones de cookies httpOnly en el panel admin.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`: Credenciales del usuario administrador inicial.

---

© Bearded Mountaineer & Antigravity Ecoturismo — Conservación de Hábitats & Ornitología en Perú.