-- CreateTable
CREATE TABLE "NotFoundHit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReferrer" TEXT,
    "ignored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotFoundHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotFoundHit_path_key" ON "NotFoundHit"("path");

-- CreateIndex
CREATE INDEX "NotFoundHit_ignored_hits_idx" ON "NotFoundHit"("ignored", "hits");

-- CreateIndex
CREATE INDEX "NotFoundHit_lastSeenAt_idx" ON "NotFoundHit"("lastSeenAt");

