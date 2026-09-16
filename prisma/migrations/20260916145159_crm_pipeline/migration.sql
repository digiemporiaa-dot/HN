-- Written by hand rather than generated. Prisma sees a renamed enum value as a
-- drop and a create, which would discard the stage of every lead already sitting
-- at QUOTED. Postgres can rename the value in place, so it does.
ALTER TYPE "LeadStatus" RENAME VALUE 'QUOTED' TO 'QUOTATION_SENT';
ALTER TYPE "LeadStatus" ADD VALUE 'NEGOTIATION' AFTER 'QUOTATION_SENT';

ALTER TYPE "LeadSource" ADD VALUE 'CATEGORY_ENQUIRY' AFTER 'PRODUCT_ENQUIRY';
ALTER TYPE "LeadSource" ADD VALUE 'CUSTOM_FORM' AFTER 'CONTACT_FORM';
ALTER TYPE "LeadSource" ADD VALUE 'CITY_LANDING' AFTER 'CUSTOM_FORM';
ALTER TYPE "LeadSource" ADD VALUE 'WHATSAPP' AFTER 'RFQ';

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "LeadActivityKind" AS ENUM ('CREATED', 'STAGE_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNED', 'NOTE_ADDED', 'DOCUMENT_DOWNLOADED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "categoryName" TEXT,
ADD COLUMN     "landingPage" TEXT,
ADD COLUMN     "utmSource" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmTerm" TEXT,
ADD COLUMN     "utmContent" TEXT,
ADD COLUMN     "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "formSubmissionId" TEXT;

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "LeadActivityKind" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_formSubmissionId_key" ON "Lead"("formSubmissionId");

-- CreateIndex
CREATE INDEX "Lead_categoryId_idx" ON "Lead"("categoryId");

-- CreateIndex
CREATE INDEX "Lead_priority_createdAt_idx" ON "Lead"("priority", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_formSubmissionId_fkey" FOREIGN KEY ("formSubmissionId") REFERENCES "FormSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
