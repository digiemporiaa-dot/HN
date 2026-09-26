-- DropIndex
DROP INDEX "City_stateId_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_stateId_idx" ON "City"("stateId");

