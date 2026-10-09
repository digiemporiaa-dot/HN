-- CreateEnum
CREATE TYPE "PopupType" AS ENUM ('ENQUIRY', 'PRODUCT_SPOTLIGHT', 'RESOURCE', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "PopupTrigger" AS ENUM ('DELAY', 'SCROLL', 'EXIT_INTENT', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "PopupDevice" AS ENUM ('ALL', 'DESKTOP', 'MOBILE');

-- CreateEnum
CREATE TYPE "PopupTargetMode" AS ENUM ('EXCLUDE', 'INCLUDE');

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'POPUPS';

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PopupType" NOT NULL DEFAULT 'ANNOUNCEMENT',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "eyebrow" TEXT,
    "heading" TEXT NOT NULL,
    "description" TEXT,
    "imageId" TEXT,
    "productId" TEXT,
    "formId" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "trigger" "PopupTrigger" NOT NULL DEFAULT 'DELAY',
    "delaySeconds" INTEGER NOT NULL DEFAULT 8,
    "scrollPercent" INTEGER NOT NULL DEFAULT 50,
    "device" "PopupDevice" NOT NULL DEFAULT 'ALL',
    "frequencyDays" INTEGER NOT NULL DEFAULT 7,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "targetMode" "PopupTargetMode" NOT NULL DEFAULT 'EXCLUDE',
    "targetRules" JSONB NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Popup_active_deletedAt_idx" ON "Popup"("active", "deletedAt");

-- CreateIndex
CREATE INDEX "Popup_imageId_idx" ON "Popup"("imageId");

-- CreateIndex
CREATE INDEX "Popup_productId_idx" ON "Popup"("productId");

-- CreateIndex
CREATE INDEX "Popup_formId_idx" ON "Popup"("formId");

-- AddForeignKey
ALTER TABLE "Popup" ADD CONSTRAINT "Popup_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Popup" ADD CONSTRAINT "Popup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Popup" ADD CONSTRAINT "Popup_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;
