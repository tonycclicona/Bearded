// ==============================================================================
// init-db.ts — Auto-Sincronización y Reparación de Esquema MySQL (Patrón Unu-Raymi)
// ==============================================================================

import { prisma } from './prisma.js';
import {
  FALLBACK_PASSES,
  FALLBACK_SPOTS,
  FALLBACK_ROUTES,
  FALLBACK_ROOMS,
  FALLBACK_EXPERIENCES,
  FALLBACK_PHOTOS,
  FALLBACK_WORKSHOPS,
  FALLBACK_COLIBRIES,
  FALLBACK_PUNTOS_GIS,
  FALLBACK_TOURS,
  FALLBACK_GUIAS
} from './fallbacks.js';

export async function ensureTablesExist(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl || dbUrl.includes('dummy')) {
    return;
  }

  try {
    // 1. users
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`email\` VARCHAR(191) NOT NULL UNIQUE,
        \`name\` VARCHAR(191) NOT NULL,
        \`password\` VARCHAR(191) NOT NULL,
        \`role\` VARCHAR(191) NOT NULL DEFAULT 'admin',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. hummingbird_passes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`hummingbird_passes\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`price\` DOUBLE NOT NULL,
        \`priceUSD\` DOUBLE NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`description\` TEXT NOT NULL,
        \`features\` JSON NOT NULL,
        \`featured\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. hummingbird_spots
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`hummingbird_spots\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`benefits\` JSON NOT NULL,
        \`imageUrl\` VARCHAR(500) NOT NULL DEFAULT '',
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. routes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`routes\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`difficulty\` ENUM('FACIL', 'MODERADO', 'DIFICIL') NOT NULL DEFAULT 'MODERADO',
        \`duration\` VARCHAR(100) NOT NULL,
        \`price\` DOUBLE NOT NULL,
        \`priceUSD\` DOUBLE NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`description\` TEXT NOT NULL,
        \`startPoint\` VARCHAR(255) NOT NULL,
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. rooms
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`rooms\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`pricePerNight\` DOUBLE NOT NULL,
        \`pricePerNightUSD\` DOUBLE NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`capacity\` INT NOT NULL,
        \`amenities\` JSON NOT NULL,
        \`imageUrl\` VARCHAR(500) NOT NULL,
        \`gallery\` JSON NOT NULL,
        \`featured\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. lodge_experiences
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`lodge_experiences\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`price\` DOUBLE NOT NULL,
        \`priceUSD\` DOUBLE NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`duration\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`included\` JSON NOT NULL,
        \`imageUrl\` VARCHAR(500) NULL,
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. photo_products
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`photo_products\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(191) NOT NULL UNIQUE,
        \`price\` DOUBLE NOT NULL,
        \`priceUSD\` DOUBLE NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`description\` TEXT NOT NULL,
        \`imageUrl\` VARCHAR(500) NOT NULL,
        \`species\` VARCHAR(255) NULL,
        \`location\` VARCHAR(255) NULL,
        \`camera\` VARCHAR(255) NULL,
        \`resolution\` VARCHAR(255) NULL,
        \`type\` ENUM('AVES', 'PAISAJE') NOT NULL DEFAULT 'AVES',
        \`featured\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. photo_workshops
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`photo_workshops\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`category\` ENUM('NATURALEZA', 'AVES', 'PAISAJES', 'OTROS') NOT NULL DEFAULT 'AVES',
        \`price\` DOUBLE NOT NULL,
        \`priceUSD\` DOUBLE NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`duration\` VARCHAR(100) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`included\` JSON NOT NULL,
        \`featured\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`sortOrder\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. orders
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`orders\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
        \`total\` DOUBLE NOT NULL,
        \`customerName\` VARCHAR(255) NOT NULL,
        \`customerEmail\` VARCHAR(255) NOT NULL,
        \`customerPhone\` VARCHAR(100) NOT NULL,
        \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'transfer',
        \`paymentStatus\` VARCHAR(50) NOT NULL DEFAULT 'pending',
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. order_items
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`order_items\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`productId\` VARCHAR(191) NOT NULL,
        \`quantity\` INT NOT NULL,
        \`price\` DOUBLE NOT NULL,
        \`orderId\` VARCHAR(191) NOT NULL,
        INDEX \`order_items_orderId_idx\` (\`orderId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. bookings
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`bookings\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`bookingCode\` VARCHAR(191) NOT NULL UNIQUE,
        \`serviceType\` VARCHAR(50) NOT NULL,
        \`serviceId\` VARCHAR(191) NULL,
        \`serviceTitle\` VARCHAR(255) NOT NULL,
        \`bookingDate\` DATETIME(3) NOT NULL,
        \`guestCount\` INT NOT NULL DEFAULT 1,
        \`unitPrice\` DOUBLE NOT NULL,
        \`totalAmount\` DOUBLE NOT NULL,
        \`currency\` VARCHAR(10) NOT NULL DEFAULT 'PEN',
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE_PAGO',
        \`paymentMethod\` VARCHAR(50) NOT NULL DEFAULT 'YAPE',
        \`primaryName\` VARCHAR(255) NOT NULL,
        \`primaryEmail\` VARCHAR(255) NOT NULL,
        \`primaryPhone\` VARCHAR(100) NOT NULL,
        \`primaryDoc\` VARCHAR(100) NULL,
        \`notes\` TEXT NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. booking_guests
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`booking_guests\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`bookingId\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`documentId\` VARCHAR(100) NULL,
        \`isPrimary\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`booking_guests_bookingId_idx\` (\`bookingId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. especies_colibries
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`especies_colibries\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nombreComun\` VARCHAR(255) NOT NULL,
        \`nombreCientifico\` VARCHAR(191) NOT NULL UNIQUE,
        \`familia\` VARCHAR(100) NOT NULL DEFAULT 'Trochilidae',
        \`estadoIUCN\` VARCHAR(100) NOT NULL DEFAULT 'En Peligro (EN)',
        \`endemicoPeru\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`altitudMinMsnm\` INT NOT NULL DEFAULT 1500,
        \`altitudMaxMsnm\` INT NOT NULL DEFAULT 3200,
        \`descripcion\` TEXT NOT NULL,
        \`fotoPrincipal\` VARCHAR(500) NOT NULL,
        \`galeriaFotos\` TEXT NULL,
        \`audioCantoUrl\` VARCHAR(500) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 14. puntos_gis
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`puntos_gis\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nombre\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(191) NOT NULL UNIQUE,
        \`categoria\` VARCHAR(100) NOT NULL,
        \`departamento\` VARCHAR(100) NOT NULL,
        \`latitud\` DECIMAL(10, 7) NOT NULL,
        \`longitud\` DECIMAL(10, 7) NOT NULL,
        \`altitudMsnm\` INT NOT NULL DEFAULT 2000,
        \`mejorTemporada\` VARCHAR(100) NOT NULL,
        \`acceso\` TEXT NOT NULL,
        \`descripcion\` TEXT NOT NULL,
        \`fotoUrl\` VARCHAR(500) NULL,
        \`activo\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 15. tours
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`tours\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nombre\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(191) NOT NULL UNIQUE,
        \`descripcion\` TEXT NOT NULL,
        \`itinerario\` TEXT NULL,
        \`regionRuta\` VARCHAR(100) NOT NULL,
        \`nivelCaminata\` VARCHAR(100) NOT NULL DEFAULT 'Fácil / Fotografía',
        \`equipoOpticoReq\` VARCHAR(255) NULL,
        \`precio_adulto\` DECIMAL(10, 2) NOT NULL,
        \`precio_adulto_usd\` DECIMAL(10, 2) NULL,
        \`precio_nino\` DECIMAL(10, 2) NULL,
        \`precio_nino_usd\` DECIMAL(10, 2) NULL,
        \`showPEN\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`showUSD\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`duracion_dias\` INT NOT NULL,
        \`cupos_disponibles\` INT NOT NULL,
        \`servicios_incluidos\` TEXT NOT NULL,
        \`servicios_excluidos\` TEXT NOT NULL,
        \`que_llevar\` TEXT NOT NULL,
        \`activo\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`destacado\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 16. tour_imagenes
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`tour_imagenes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`tourId\` INT NOT NULL,
        \`url\` VARCHAR(500) NOT NULL,
        \`esPortada\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`tour_imagenes_tourId_idx\` (\`tourId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 17. guias
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`guias\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`nombre\` VARCHAR(255) NOT NULL,
        \`especialidad\` VARCHAR(255) NOT NULL,
        \`experiencia\` VARCHAR(255) NOT NULL,
        \`idiomas\` VARCHAR(255) NOT NULL,
        \`foto\` VARCHAR(500) NOT NULL,
        \`descripcion\` TEXT NOT NULL,
        \`activo\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`orden\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 18. Tablas intermedias de relaciones Many-to-Many
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`_EspecieHotspots\` (
        \`A\` INT NOT NULL,
        \`B\` INT NOT NULL,
        UNIQUE INDEX \`_EspecieHotspots_AB_unique\` (\`A\`, \`B\`),
        INDEX \`_EspecieHotspots_B_index\` (\`B\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`_TourHotspots\` (
        \`A\` INT NOT NULL,
        \`B\` INT NOT NULL,
        UNIQUE INDEX \`_TourHotspots_AB_unique\` (\`A\`, \`B\`),
        INDEX \`_TourHotspots_B_index\` (\`B\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[init-db] ✅ Verificación y auto-creación de tablas MySQL completada.');

    // ── AUTO-POBLADO INICIAL SI ESTÁN VACÍAS (Evita listas en 0 en producción) ──
    try {
      const roomCount = await prisma.room.count();
      if (roomCount === 0 && FALLBACK_ROOMS.length > 0) {
        console.log('[init-db] Sembrando habitaciones iniciales...');
        for (const r of FALLBACK_ROOMS) {
          await prisma.room.create({
            data: {
              name: r.name,
              pricePerNight: r.pricePerNight,
              pricePerNightUSD: r.pricePerNightUSD,
              showPEN: r.showPEN,
              showUSD: r.showUSD,
              capacity: r.capacity,
              amenities: (r.amenities || []) as any,
              imageUrl: r.imageUrl,
              gallery: (r.gallery || []) as any,
              featured: r.featured,
              sortOrder: r.sortOrder
            }
          });
        }
      }

      const guiasCount = await prisma.guia.count();
      if (guiasCount === 0 && FALLBACK_GUIAS.length > 0) {
        console.log('[init-db] Sembrando guías iniciales...');
        for (const g of FALLBACK_GUIAS) {
          await prisma.guia.create({
            data: {
              nombre: g.nombre,
              especialidad: g.especialidad,
              experiencia: g.experiencia,
              idiomas: g.idiomas,
              foto: g.foto,
              descripcion: g.descripcion,
              activo: g.activo,
              orden: g.orden
            }
          });
        }
      }

      const colibriesCount = await prisma.especieColibri.count();
      if (colibriesCount === 0 && FALLBACK_COLIBRIES.length > 0) {
        console.log('[init-db] Sembrando colibríes iniciales...');
        for (const c of FALLBACK_COLIBRIES) {
          await prisma.especieColibri.create({
            data: {
              nombreComun: c.nombreComun,
              nombreCientifico: c.nombreCientifico,
              familia: c.familia || 'Trochilidae',
              estadoIUCN: c.estadoIUCN || 'En Peligro (EN)',
              endemicoPeru: !!c.endemicoPeru,
              altitudMinMsnm: c.altitudMinMsnm || 1500,
              altitudMaxMsnm: c.altitudMaxMsnm || 3200,
              descripcion: c.descripcion,
              fotoPrincipal: c.fotoPrincipal,
              galeriaFotos: c.galeriaFotos || null,
              audioCantoUrl: c.audioCantoUrl || null
            }
          });
        }
      }

      const puntosCount = await prisma.puntoGIS.count();
      if (puntosCount === 0 && FALLBACK_PUNTOS_GIS.length > 0) {
        console.log('[init-db] Sembrando puntos GIS iniciales...');
        for (const p of FALLBACK_PUNTOS_GIS) {
          await prisma.puntoGIS.create({
            data: {
              nombre: p.nombre,
              slug: p.slug,
              categoria: p.categoria,
              departamento: p.departamento,
              latitud: p.latitud,
              longitud: p.longitud,
              altitudMsnm: p.altitudMsnm,
              mejorTemporada: p.mejorTemporada,
              acceso: p.acceso,
              descripcion: p.descripcion,
              fotoUrl: p.fotoUrl,
              activo: p.activo
            }
          });
        }
      }

      const passesCount = await prisma.hummingbirdPass.count();
      if (passesCount === 0 && FALLBACK_PASSES.length > 0) {
        console.log('[init-db] Sembrando pases iniciales...');
        for (const p of FALLBACK_PASSES) {
          await prisma.hummingbirdPass.create({
            data: {
              title: p.title,
              price: p.price,
              priceUSD: p.priceUSD,
              showPEN: p.showPEN,
              showUSD: p.showUSD,
              description: p.description,
              features: (p.features || []) as any,
              featured: p.featured,
              sortOrder: p.sortOrder
            }
          });
        }
      }
    } catch (seedErr) {
      console.warn('[init-db] Aviso sembrado inicial:', seedErr instanceof Error ? seedErr.message : seedErr);
    }
  } catch (err: unknown) {
    console.warn('[init-db] ⚠️ Aviso en auto-sincronización MySQL:', err instanceof Error ? err.message : err);
  }
}
