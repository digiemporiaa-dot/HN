-- Drops four columns that were never meant to exist.
--
-- MediaFolder had carried list fields for BrandCategory, CategorySpecialty,
-- SolutionCategory and Product. None of them means anything — a media folder
-- does not contain join rows or products — and each one caused `prisma format`
-- to add a matching mediaFolderId foreign key to the other model, once per
-- phase since the brand tables landed.
--
-- Nothing ever wrote these columns: no application code referenced them, and
-- every row in all four tables held NULL, which was checked before this
-- migration was written. Dropping them loses nothing and stops the next model
-- inheriting a fifth copy.

/*
  Warnings:

  - You are about to drop the column `mediaFolderId` on the `BrandCategory` table. All the data in the column will be lost.
  - You are about to drop the column `mediaFolderId` on the `CategorySpecialty` table. All the data in the column will be lost.
  - You are about to drop the column `mediaFolderId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `mediaFolderId` on the `SolutionCategory` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BrandCategory" DROP CONSTRAINT "BrandCategory_mediaFolderId_fkey";

-- DropForeignKey
ALTER TABLE "CategorySpecialty" DROP CONSTRAINT "CategorySpecialty_mediaFolderId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_mediaFolderId_fkey";

-- DropForeignKey
ALTER TABLE "SolutionCategory" DROP CONSTRAINT "SolutionCategory_mediaFolderId_fkey";

-- AlterTable
ALTER TABLE "BrandCategory" DROP COLUMN "mediaFolderId";

-- AlterTable
ALTER TABLE "CategorySpecialty" DROP COLUMN "mediaFolderId";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "mediaFolderId";

-- AlterTable
ALTER TABLE "SolutionCategory" DROP COLUMN "mediaFolderId";
