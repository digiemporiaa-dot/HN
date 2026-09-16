-- CreateEnum
CREATE TYPE "ProductPointKind" AS ENUM ('HIGHLIGHT', 'FEATURE');

-- CreateTable
CREATE TABLE "ProductPoint" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "ProductPointKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPoint_productId_kind_order_idx" ON "ProductPoint"("productId", "kind", "order");

-- AddForeignKey
ALTER TABLE "ProductPoint" ADD CONSTRAINT "ProductPoint_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
