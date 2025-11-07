-- Verify completed sessions are properly marked
    SELECT
        'Completed Sessions' as status,
        COUNT(*) as count
    FROM "FlashcardStudySession"
    WHERE "completedAt" IS NOT NULL AND completed = true

UNION ALL

    SELECT
        'Broken Sessions (completedAt but not completed)' as status,
        COUNT(*) as count
    FROM "FlashcardStudySession"
    WHERE "completedAt" IS NOT NULL AND completed = false

UNION ALL

    SELECT
        'Active Sessions' as status,
        COUNT(*) as count
    FROM "FlashcardStudySession"
    WHERE "completedAt" IS NULL AND completed = false;
