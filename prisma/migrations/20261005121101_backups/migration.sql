-- CreateEnum
CREATE TYPE "BackupKind" AS ENUM ('MANUAL', 'SCHEDULED', 'PRE_RESTORE', 'UPLOADED');

-- CreateEnum
CREATE TYPE "BackupStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "kind" "BackupKind" NOT NULL,
    "status" "BackupStatus" NOT NULL DEFAULT 'RUNNING',
    "sizeBytes" BIGINT,
    "checksum" TEXT,
    "manifest" JSONB,
    "error" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "restoredAt" TIMESTAMP(3),

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Backup_filename_key" ON "Backup"("filename");

-- CreateIndex
CREATE INDEX "Backup_kind_startedAt_idx" ON "Backup"("kind", "startedAt");

-- CreateIndex
CREATE INDEX "Backup_status_idx" ON "Backup"("status");

