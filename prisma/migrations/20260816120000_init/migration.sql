-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProfileGoal" AS ENUM ('GROW_AUDIENCE', 'SELL_PRODUCT');

-- CreateEnum
CREATE TYPE "ToneOfVoice" AS ENUM ('DIRECT', 'HUMOROUS', 'EXPERT', 'STORYTELLING');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'START', 'PRO', 'AGENCY');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'QUEUED', 'SCRAPING', 'TRANSCRIBING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('YOOKASSA', 'CLOUDPAYMENTS');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CREDITED', 'PAID_OUT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT,
    "photoUrl" TEXT,
    "socialHandle" TEXT,
    "platform" TEXT,
    "profileGoal" "ProfileGoal",
    "websiteUrl" TEXT,
    "offerSummary" TEXT,
    "toneOfVoice" "ToneOfVoice",
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "referralBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referrerId" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAccount" (
    "id" TEXT NOT NULL,
    "agencyUserId" TEXT NOT NULL,
    "label" TEXT,
    "socialHandle" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientAccountId" TEXT,
    "socialHandle" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "niche" TEXT,
    "targetAudience" TEXT,
    "contentPillars" JSONB,
    "profileAuditTips" JSONB,
    "rawProfileData" JSONB,
    "transcriptions" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "hookOptions" JSONB NOT NULL,
    "teleprompterScript" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "isTeaser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'YOOKASSA',
    "providerPaymentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "paymentId" TEXT,
    "creditAmount" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.3,
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_referrerId_idx" ON "User"("referrerId");

-- CreateIndex
CREATE INDEX "ClientAccount_agencyUserId_idx" ON "ClientAccount"("agencyUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAccount_agencyUserId_socialHandle_key" ON "ClientAccount"("agencyUserId", "socialHandle");

-- CreateIndex
CREATE INDEX "ProfileAnalysis_userId_idx" ON "ProfileAnalysis"("userId");

-- CreateIndex
CREATE INDEX "ProfileAnalysis_status_idx" ON "ProfileAnalysis"("status");

-- CreateIndex
CREATE INDEX "ProfileAnalysis_clientAccountId_idx" ON "ProfileAnalysis"("clientAccountId");

-- CreateIndex
CREATE INDEX "Script_userId_idx" ON "Script"("userId");

-- CreateIndex
CREATE INDEX "Script_analysisId_idx" ON "Script"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_paymentId_key" ON "Referral"("paymentId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referredId_idx" ON "Referral"("referredId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccount" ADD CONSTRAINT "ClientAccount_agencyUserId_fkey" FOREIGN KEY ("agencyUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAnalysis" ADD CONSTRAINT "ProfileAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileAnalysis" ADD CONSTRAINT "ProfileAnalysis_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ProfileAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

