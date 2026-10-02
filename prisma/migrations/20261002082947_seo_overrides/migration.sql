-- CreateTable
CREATE TABLE "SeoOverride" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "titleAbsolute" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "canonical" TEXT,
    "noindex" BOOLEAN NOT NULL DEFAULT false,
    "ogImageId" TEXT,
    "note" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoOverride_path_key" ON "SeoOverride"("path");

-- CreateIndex
CREATE INDEX "SeoOverride_noindex_idx" ON "SeoOverride"("noindex");

-- AddForeignKey
ALTER TABLE "SeoOverride" ADD CONSTRAINT "SeoOverride_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoOverride" ADD CONSTRAINT "SeoOverride_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

