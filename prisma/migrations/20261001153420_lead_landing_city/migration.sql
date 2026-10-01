-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "landingCityId" TEXT,
ADD COLUMN     "landingCityName" TEXT;

-- CreateIndex
CREATE INDEX "Lead_landingCityId_idx" ON "Lead"("landingCityId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_landingCityId_fkey" FOREIGN KEY ("landingCityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

