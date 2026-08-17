-- Honesty fields (NEEDS_FACTS / sourceStrength / sourceFacts) were in schema
-- but missing from migrate deploy. Shoot-loop adds voiceHeard + shot/published.

DO $$ BEGIN
  ALTER TYPE "AnalysisStatus" ADD VALUE 'NEEDS_FACTS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ProfileAnalysis" ADD COLUMN IF NOT EXISTS "sourceStrength" TEXT;
ALTER TABLE "ProfileAnalysis" ADD COLUMN IF NOT EXISTS "sourceFacts" JSONB;
ALTER TABLE "ProfileAnalysis" ADD COLUMN IF NOT EXISTS "voiceHeard" BOOLEAN;

ALTER TABLE "Script" ADD COLUMN IF NOT EXISTS "shotAt" TIMESTAMP(3);
ALTER TABLE "Script" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastNudgeAt" TIMESTAMP(3);
