-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SnackCategory" AS ENUM ('SWEET', 'SAVOURY', 'DRINK', 'HEALTHY_ISH');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('RESTOCKED', 'CONSUMED');

-- CreateTable "users"
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable "snacks"
CREATE TABLE "snacks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SnackCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "snacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable "votes"
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable "activities"
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snackId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "snacks_name_key" ON "snacks"("name");
CREATE INDEX "snacks_category_idx" ON "snacks"("category");

CREATE INDEX "votes_userId_idx" ON "votes"("userId");
CREATE INDEX "votes_snackId_idx" ON "votes"("snackId");
CREATE UNIQUE INDEX "votes_userId_snackId_key" ON "votes"("userId", "snackId");

-- Activities Indexes
CREATE INDEX "activities_userId_idx" ON "activities"("userId");
CREATE INDEX "activities_snackId_idx" ON "activities"("snackId");
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_snackId_fkey" FOREIGN KEY ("snackId") REFERENCES "snacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activities" ADD CONSTRAINT "activities_snackId_fkey" FOREIGN KEY ("snackId") REFERENCES "snacks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL CHECK Constraints
-- 1. Ensure snack quantity cannot become negative
ALTER TABLE "snacks" ADD CONSTRAINT "snack_quantity_non_negative" CHECK ("quantity" >= 0);

-- 2. Ensure activity amount is positive (> 0)
ALTER TABLE "activities" ADD CONSTRAINT "activity_amount_positive" CHECK ("amount" > 0);

