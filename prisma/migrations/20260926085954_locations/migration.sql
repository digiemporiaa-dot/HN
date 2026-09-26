-- CreateEnum
CREATE TYPE "StateKind" AS ENUM ('STATE', 'UNION_TERRITORY');

-- AlterTable
ALTER TABLE "PageSection" ADD COLUMN     "cityId" TEXT,
ALTER COLUMN "pageId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "kind" "StateKind" NOT NULL DEFAULT 'STATE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "heroImageId" TEXT,
    "intro" TEXT,
    "content" TEXT,
    "coverage" TEXT,
    "ctaHeading" TEXT,
    "ctaBody" TEXT,
    "ctaLabel" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CityCategory" (
    "cityId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CityCategory_pkey" PRIMARY KEY ("cityId","categoryId")
);

-- CreateTable
CREATE TABLE "CityProduct" (
    "cityId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CityProduct_pkey" PRIMARY KEY ("cityId","productId")
);

-- CreateTable
CREATE TABLE "CitySpecialty" (
    "cityId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CitySpecialty_pkey" PRIMARY KEY ("cityId","specialtyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_slug_key" ON "State"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE INDEX "State_active_order_idx" ON "State"("active", "order");

-- CreateIndex
CREATE INDEX "City_status_idx" ON "City"("status");

-- CreateIndex
CREATE INDEX "City_deletedAt_idx" ON "City"("deletedAt");

-- CreateIndex
CREATE INDEX "City_indexable_idx" ON "City"("indexable");

-- CreateIndex
CREATE UNIQUE INDEX "City_stateId_slug_key" ON "City"("stateId", "slug");

-- CreateIndex
CREATE INDEX "CityCategory_categoryId_idx" ON "CityCategory"("categoryId");

-- CreateIndex
CREATE INDEX "CityProduct_productId_idx" ON "CityProduct"("productId");

-- CreateIndex
CREATE INDEX "CitySpecialty_specialtyId_idx" ON "CitySpecialty"("specialtyId");

-- CreateIndex
CREATE INDEX "PageSection_cityId_order_idx" ON "PageSection"("cityId", "order");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityCategory" ADD CONSTRAINT "CityCategory_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityCategory" ADD CONSTRAINT "CityCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityProduct" ADD CONSTRAINT "CityProduct_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CityProduct" ADD CONSTRAINT "CityProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitySpecialty" ADD CONSTRAINT "CitySpecialty_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitySpecialty" ADD CONSTRAINT "CitySpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A section belongs to exactly one owner. Prisma cannot express this, so it is
-- enforced by the database: a row with no owner would render nowhere and never
-- be cleaned up, and a row with two would be edited on one page and silently
-- change another.
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_exactly_one_owner"
  CHECK (num_nonnulls("pageId", "cityId") = 1);
