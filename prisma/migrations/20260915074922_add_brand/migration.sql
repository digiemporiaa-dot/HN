-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "websiteUrl" TEXT,
    "logoId" TEXT,
    "bannerId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandCategory" (
    "brandId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaFolderId" TEXT,

    CONSTRAINT "BrandCategory_pkey" PRIMARY KEY ("brandId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_status_idx" ON "Brand"("status");

-- CreateIndex
CREATE INDEX "Brand_featured_idx" ON "Brand"("featured");

-- CreateIndex
CREATE INDEX "Brand_order_idx" ON "Brand"("order");

-- CreateIndex
CREATE INDEX "Brand_logoId_idx" ON "Brand"("logoId");

-- CreateIndex
CREATE INDEX "Brand_bannerId_idx" ON "Brand"("bannerId");

-- CreateIndex
CREATE INDEX "BrandCategory_categoryId_idx" ON "BrandCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandCategory" ADD CONSTRAINT "BrandCategory_mediaFolderId_fkey" FOREIGN KEY ("mediaFolderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
