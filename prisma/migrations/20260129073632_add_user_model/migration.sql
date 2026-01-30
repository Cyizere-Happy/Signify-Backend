/*
  Warnings:

  - You are about to drop the column `country` on the `Response` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `Response` table. All the data in the column will be lost.
  - You are about to drop the column `sector` on the `Response` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Response" DROP COLUMN "country",
DROP COLUMN "district",
DROP COLUMN "sector",
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "name" TEXT,
    "country" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_number_key" ON "User"("phone_number");

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
