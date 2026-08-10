-- CreateTable
CREATE TABLE "ChallanStatusHistory" (
    "id" TEXT NOT NULL,
    "challanId" TEXT NOT NULL,
    "fromStatus" "ChallanStatus",
    "toStatus" "ChallanStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallanStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallanStatusHistory_challanId_createdAt_idx" ON "ChallanStatusHistory"("challanId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChallanStatusHistory" ADD CONSTRAINT "ChallanStatusHistory_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "SalesChallan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallanStatusHistory" ADD CONSTRAINT "ChallanStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
