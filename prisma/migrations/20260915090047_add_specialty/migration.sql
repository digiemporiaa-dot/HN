-- CreateTable
CREATE TABLE "Specialty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "imageId" TEXT,
    "bannerId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorySpecialty" (
    "categoryId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaFolderId" TEXT,

    CONSTRAINT "CategorySpecialty_pkey" PRIMARY KEY ("categoryId","specialtyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_slug_key" ON "Specialty"("slug");

-- CreateIndex
CREATE INDEX "Specialty_status_idx" ON "Specialty"("status");

-- CreateIndex
CREATE INDEX "Specialty_featured_idx" ON "Specialty"("featured");

-- CreateIndex
CREATE INDEX "Specialty_order_idx" ON "Specialty"("order");

-- CreateIndex
CREATE INDEX "Specialty_imageId_idx" ON "Specialty"("imageId");

-- CreateIndex
CREATE INDEX "Specialty_bannerId_idx" ON "Specialty"("bannerId");

-- CreateIndex
CREATE INDEX "CategorySpecialty_specialtyId_idx" ON "CategorySpecialty"("specialtyId");

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySpecialty" ADD CONSTRAINT "CategorySpecialty_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySpecialty" ADD CONSTRAINT "CategorySpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorySpecialty" ADD CONSTRAINT "CategorySpecialty_mediaFolderId_fkey" FOREIGN KEY ("mediaFolderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
