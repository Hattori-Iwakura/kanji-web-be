-- Fix completed sessions that have completedAt but completed = false
-- This updates all sessions that were marked as complete but the boolean flag wasn't set

UPDATE "FlashcardStudySession"
SET completed = true
WHERE "completedAt" IS NOT NULL
    AND completed = false;

-- Verify the update
SELECT
    COUNT(*) as total_fixed,
    COUNT(DISTINCT "userId") as users_affected
FROM "FlashcardStudySession"
WHERE "completedAt" IS NOT NULL
    AND completed = true;
