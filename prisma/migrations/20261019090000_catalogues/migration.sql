-- CreateTable
CREATE TABLE "Catalogue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileId" TEXT NOT NULL,
    "coverId" TEXT,
    "gated" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Catalogue_status_order_idx" ON "Catalogue"("status", "order");

-- CreateIndex
CREATE INDEX "Catalogue_fileId_idx" ON "Catalogue"("fileId");

-- CreateIndex
CREATE INDEX "Catalogue_coverId_idx" ON "Catalogue"("coverId");

-- CreateIndex
CREATE INDEX "Catalogue_deletedAt_idx" ON "Catalogue"("deletedAt");

-- AddForeignKey
ALTER TABLE "Catalogue" ADD CONSTRAINT "Catalogue_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catalogue" ADD CONSTRAINT "Catalogue_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

