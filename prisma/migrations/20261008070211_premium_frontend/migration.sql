-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SectionType" ADD VALUE 'SOLUTION_GRID';
ALTER TYPE "SectionType" ADD VALUE 'APPLICATION_GRID';
ALTER TYPE "SectionType" ADD VALUE 'POST_GRID';

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "imageId" TEXT;

-- CreateIndex
CREATE INDEX "Application_imageId_idx" ON "Application"("imageId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
