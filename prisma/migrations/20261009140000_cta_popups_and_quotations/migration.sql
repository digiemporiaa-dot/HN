-- Call-to-action popups, gated catalogue downloads and quotation requests.
--
-- Additive only: new enums, new tables, new nullable columns and one relaxed
-- NOT NULL. No existing row is changed or deleted. The data that goes with
-- it (permission rows and grants, quotation rows for existing RFQs) is in the
-- next migration, because PostgreSQL refuses to use an enum value in the
-- transaction that added it.

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'QUOTED', 'WON', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "CtaKind" AS ENUM ('DOWNLOAD_BROCHURE', 'DOWNLOAD_CATALOGUE', 'REQUEST_QUOTATION', 'CONTACT_US', 'GET_PRICE', 'REQUEST_DEMO', 'ENQUIRE_NOW', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CtaPopupType" AS ENUM ('LEAD_CAPTURE', 'GATED_DOWNLOAD', 'REQUEST_QUOTATION', 'CUSTOM_FORM');

-- CreateEnum
CREATE TYPE "CtaMode" AS ENUM ('POPUP', 'DIRECT');

-- CreateEnum
CREATE TYPE "CtaAfterSubmit" AS ENUM ('MESSAGE', 'DOWNLOAD', 'REDIRECT');

-- AlterEnum
ALTER TYPE "DocumentKind" ADD VALUE 'CATALOGUE';

-- AlterEnum
ALTER TYPE "PermissionModule" ADD VALUE 'CTA_POPUPS';

-- AlterTable
ALTER TABLE "DocumentGrant" ADD COLUMN     "mediaId" TEXT,
ALTER COLUMN "documentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "country" TEXT,
ADD COLUMN     "ctaKey" TEXT,
ADD COLUMN     "ctaPlacement" TEXT,
ADD COLUMN     "submissionKey" TEXT;

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'NEW',
    "deliveryLocation" TEXT,
    "expectedDeliveryDate" DATE,
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CtaConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CtaKind" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "mode" "CtaMode" NOT NULL DEFAULT 'POPUP',
    "popupType" "CtaPopupType" NOT NULL DEFAULT 'LEAD_CAPTURE',
    "heading" TEXT NOT NULL,
    "description" TEXT,
    "submitLabel" TEXT,
    "successMessage" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "consentText" TEXT,
    "privacyHref" TEXT,
    "afterSubmit" "CtaAfterSubmit" NOT NULL DEFAULT 'MESSAGE',
    "redirectHref" TEXT,
    "directHref" TEXT,
    "placements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetProductId" TEXT,
    "targetPaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fileId" TEXT,
    "formId" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CtaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_leadId_key" ON "QuoteRequest"("leadId");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_createdAt_idx" ON "QuoteRequest"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CtaConfig_key_key" ON "CtaConfig"("key");

-- CreateIndex
CREATE INDEX "CtaConfig_kind_isDefault_active_idx" ON "CtaConfig"("kind", "isDefault", "active");

-- CreateIndex
CREATE INDEX "CtaConfig_active_deletedAt_idx" ON "CtaConfig"("active", "deletedAt");

-- CreateIndex
CREATE INDEX "CtaConfig_targetProductId_idx" ON "CtaConfig"("targetProductId");

-- CreateIndex
CREATE INDEX "CtaConfig_fileId_idx" ON "CtaConfig"("fileId");

-- CreateIndex
CREATE INDEX "CtaConfig_formId_idx" ON "CtaConfig"("formId");

-- CreateIndex
CREATE INDEX "DocumentGrant_mediaId_idx" ON "DocumentGrant"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_submissionKey_key" ON "Lead"("submissionKey");

-- CreateIndex
CREATE INDEX "Lead_ctaKey_idx" ON "Lead"("ctaKey");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaConfig" ADD CONSTRAINT "CtaConfig_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaConfig" ADD CONSTRAINT "CtaConfig_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaConfig" ADD CONSTRAINT "CtaConfig_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CtaConfig" ADD CONSTRAINT "CtaConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A grant hands out exactly one file: a product document or a media asset.
-- Every existing grant names a document, so this holds for the current rows.
ALTER TABLE "DocumentGrant" ADD CONSTRAINT "DocumentGrant_one_file_check"
  CHECK (("documentId" IS NOT NULL) <> ("mediaId" IS NOT NULL));
