-- CreateEnum
CREATE TYPE "LeadNoteKind" AS ENUM ('NOTE', 'INTERNAL');

ALTER TYPE "LeadActivityKind" ADD VALUE 'COMMENT_ADDED' AFTER 'NOTE_ADDED';

-- AlterTable
-- Everything written before this migration is a note: internal comments did not
-- exist, so nothing already on a lead can have been one.
ALTER TABLE "LeadNote" ADD COLUMN     "kind" "LeadNoteKind" NOT NULL DEFAULT 'NOTE';

-- CreateIndex
CREATE INDEX "LeadNote_leadId_kind_createdAt_idx" ON "LeadNote"("leadId", "kind", "createdAt");
