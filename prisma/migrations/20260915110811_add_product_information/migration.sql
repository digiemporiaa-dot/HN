-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('BROCHURE', 'DATASHEET', 'MANUAL', 'CERTIFICATE', 'CASE_STUDY', 'OTHER');

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'APPLICATIONS';

-- CreateTable
CREATE TABLE "SpecTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecTemplateGroup" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecTemplateGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecTemplateField" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpecTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDocument" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL DEFAULT 'BROCHURE',
    "gated" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductApplication" (
    "productId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,

    CONSTRAINT "ProductApplication_pkey" PRIMARY KEY ("productId","applicationId")
);

-- CreateTable
CREATE TABLE "ProductRelated" (
    "productId" TEXT NOT NULL,
    "relatedId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductRelated_pkey" PRIMARY KEY ("productId","relatedId")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecTemplate_categoryId_key" ON "SpecTemplate"("categoryId");

-- CreateIndex
CREATE INDEX "SpecTemplateGroup_templateId_order_idx" ON "SpecTemplateGroup"("templateId", "order");

-- CreateIndex
CREATE INDEX "SpecTemplateField_groupId_order_idx" ON "SpecTemplateField"("groupId", "order");

-- CreateIndex
CREATE INDEX "ProductSpecGroup_productId_order_idx" ON "ProductSpecGroup"("productId", "order");

-- CreateIndex
CREATE INDEX "ProductSpecItem_groupId_order_idx" ON "ProductSpecItem"("groupId", "order");

-- CreateIndex
CREATE INDEX "ProductDocument_productId_order_idx" ON "ProductDocument"("productId", "order");

-- CreateIndex
CREATE INDEX "ProductDocument_mediaId_idx" ON "ProductDocument"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductDocument_productId_mediaId_key" ON "ProductDocument"("productId", "mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_slug_key" ON "Application"("slug");

-- CreateIndex
CREATE INDEX "Application_order_idx" ON "Application"("order");

-- CreateIndex
CREATE INDEX "ProductApplication_applicationId_idx" ON "ProductApplication"("applicationId");

-- CreateIndex
CREATE INDEX "ProductRelated_relatedId_idx" ON "ProductRelated"("relatedId");

-- CreateIndex
CREATE INDEX "Faq_entityType_entityId_order_idx" ON "Faq"("entityType", "entityId", "order");

-- AddForeignKey
ALTER TABLE "SpecTemplate" ADD CONSTRAINT "SpecTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecTemplateGroup" ADD CONSTRAINT "SpecTemplateGroup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SpecTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecTemplateField" ADD CONSTRAINT "SpecTemplateField_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SpecTemplateGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecGroup" ADD CONSTRAINT "ProductSpecGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecItem" ADD CONSTRAINT "ProductSpecItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductSpecGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDocument" ADD CONSTRAINT "ProductDocument_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApplication" ADD CONSTRAINT "ProductApplication_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApplication" ADD CONSTRAINT "ProductApplication_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelated" ADD CONSTRAINT "ProductRelated_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRelated" ADD CONSTRAINT "ProductRelated_relatedId_fkey" FOREIGN KEY ("relatedId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
