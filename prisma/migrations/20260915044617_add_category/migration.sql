-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "shortDescription" TEXT,
    "description" TEXT,
    "imageId" TEXT,
    "bannerId" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_parentId_order_idx" ON "Category"("parentId", "order");

-- CreateIndex
CREATE INDEX "Category_status_idx" ON "Category"("status");

-- CreateIndex
CREATE INDEX "Category_depth_idx" ON "Category"("depth");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

-- CreateIndex
CREATE INDEX "Category_featured_idx" ON "Category"("featured");

-- CreateIndex
CREATE INDEX "Category_imageId_idx" ON "Category"("imageId");

-- CreateIndex
CREATE INDEX "Category_bannerId_idx" ON "Category"("bannerId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_parentId_slug_key" ON "Category"("parentId", "slug");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A composite unique over a nullable column does not constrain top-level rows:
-- Postgres treats NULLs as distinct, so ("parentId" NULL, 'icu') could be
-- inserted twice and produce two categories at the same public URL. The partial
-- index below closes that gap; Prisma cannot express it in the schema.
CREATE UNIQUE INDEX "Category_root_slug_key"
  ON "Category" ("slug")
  WHERE "parentId" IS NULL;
