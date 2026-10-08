/*
  Warnings:

  - You are about to drop the column `processed` on the `OutboxEvent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- DropIndex
DROP INDEX "OutboxEvent_processed_createdAt_idx";

-- AlterTable
ALTER TABLE "OutboxEvent" DROP COLUMN "processed",
ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");
