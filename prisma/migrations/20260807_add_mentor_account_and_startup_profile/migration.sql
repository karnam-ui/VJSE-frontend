-- Add mentor experience fields to User
ALTER TABLE "User" ADD COLUMN "designation" TEXT;
ALTER TABLE "User" ADD COLUMN "experience" TEXT;
ALTER TABLE "User" ADD COLUMN "linkedIn" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "hasSeenWelcome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "hasLinkedAccount" BOOLEAN NOT NULL DEFAULT false;

-- Add mentor user link to Lead
ALTER TABLE "Lead" ADD COLUMN "mentorUserId" INTEGER;

-- Add enhanced fields to StartupProfile
ALTER TABLE "StartupProfile" ADD COLUMN "tagline" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "problemStatement" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "solution" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "teamSize" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "helpNeeded" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "website" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "demoLink" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "achievement" TEXT;
ALTER TABLE "StartupProfile" ADD COLUMN "trlLevel" TEXT;
