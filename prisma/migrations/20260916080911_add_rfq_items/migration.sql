-- CreateTable
CREATE TABLE "RfqItem" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "modelNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RfqItem_leadId_order_idx" ON "RfqItem"("leadId", "order");

-- CreateIndex
CREATE INDEX "RfqItem_productId_idx" ON "RfqItem"("productId");

-- AddForeignKey
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqItem" ADD CONSTRAINT "RfqItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
