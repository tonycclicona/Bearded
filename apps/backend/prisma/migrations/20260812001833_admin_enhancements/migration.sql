-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('FACIL', 'MODERADO', 'DIFICIL');

-- CreateEnum
CREATE TYPE "PhotographCategory" AS ENUM ('NATURALEZA', 'AVES', 'PAISAJES', 'OTROS');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('AVES', 'PAISAJE');

-- AlterTable
ALTER TABLE "hummingbird_passes" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lodge_experiences" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "photo_products" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "PhotoType" NOT NULL DEFAULT 'AVES';

-- Backfill photo type based on whether the subject is a species
UPDATE "photo_products" SET "type" = 'PAISAJE' WHERE "species" IS NULL;

-- AlterTable
ALTER TABLE "photo_workshops" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Normalize existing category values to the enum labels before casting
UPDATE "photo_workshops" SET "category" = 'NATURALEZA' WHERE "category" = 'Naturaleza';
UPDATE "photo_workshops" SET "category" = 'AVES' WHERE "category" = 'Aves';
UPDATE "photo_workshops" SET "category" = 'PAISAJES' WHERE "category" = 'Paisajes';
UPDATE "photo_workshops" SET "category" = 'OTROS' WHERE "category" = 'Otros';

-- AlterTable
ALTER TABLE "photo_workshops" ALTER COLUMN "category" SET DATA TYPE "PhotographCategory" USING ("category"::"PhotographCategory");

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Normalize existing difficulty values to the enum labels before casting
UPDATE "routes" SET "difficulty" = 'FACIL' WHERE "difficulty" = 'Fácil';
UPDATE "routes" SET "difficulty" = 'MODERADO' WHERE "difficulty" = 'Moderado';
UPDATE "routes" SET "difficulty" = 'DIFICIL' WHERE "difficulty" = 'Difícil';

-- AlterTable
ALTER TABLE "routes" ALTER COLUMN "difficulty" SET DATA TYPE "Difficulty" USING ("difficulty"::"Difficulty");