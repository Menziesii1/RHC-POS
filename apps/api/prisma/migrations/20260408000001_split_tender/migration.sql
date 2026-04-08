-- AlterEnum
ALTER TYPE "TenderType" ADD VALUE 'split';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "splitCardCents" INTEGER,
                      ADD COLUMN "splitCashCents" INTEGER,
                      ADD COLUMN "paidCents" INTEGER;
