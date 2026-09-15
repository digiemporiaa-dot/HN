-- CreateTable
CREATE TABLE "Solution" (
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

    CONSTRAINT "Solution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionCategory" (
    "solutionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mediaFolderId" TEXT,

    CONSTRAINT "SolutionCategory_pkey" PRIMARY KEY ("solutionId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Solution_slug_key" ON "Solution"("slug");

-- CreateIndex
CREATE INDEX "Solution_status_idx" ON "Solution"("status");

-- CreateIndex
CREATE INDEX "Solution_featured_idx" ON "Solution"("featured");

-- CreateIndex
CREATE INDEX "Solution_order_idx" ON "Solution"("order");

-- CreateIndex
CREATE INDEX "Solution_imageId_idx" ON "Solution"("imageId");

-- CreateIndex
CREATE INDEX "Solution_bannerId_idx" ON "Solution"("bannerId");

-- CreateIndex
CREATE INDEX "SolutionCategory_categoryId_idx" ON "SolutionCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Solution" ADD CONSTRAINT "Solution_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCategory" ADD CONSTRAINT "SolutionCategory_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "Solution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCategory" ADD CONSTRAINT "SolutionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionCategory" ADD CONSTRAINT "SolutionCategory_mediaFolderId_fkey" FOREIGN KEY ("mediaFolderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
