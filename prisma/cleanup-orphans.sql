-- Delete orphan KanjiListPublishRequest records
DELETE FROM "KanjiListPublishRequest"
WHERE "listId" NOT IN (SELECT id
FROM "KanjiList");

-- Delete orphan FlashcardDeckPublishRequest records
DELETE FROM "FlashcardDeckPublishRequest"
WHERE "deckId" NOT IN (SELECT id
FROM "FlashcardDeck");
