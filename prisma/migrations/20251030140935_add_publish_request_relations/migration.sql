-- AddForeignKey
ALTER TABLE "KanjiListPublishRequest" ADD CONSTRAINT "KanjiListPublishRequest_listId_fkey" FOREIGN KEY ("listId") REFERENCES "KanjiList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiListPublishRequest" ADD CONSTRAINT "KanjiListPublishRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KanjiListPublishRequest" ADD CONSTRAINT "KanjiListPublishRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeckPublishRequest" ADD CONSTRAINT "FlashcardDeckPublishRequest_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeckPublishRequest" ADD CONSTRAINT "FlashcardDeckPublishRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardDeckPublishRequest" ADD CONSTRAINT "FlashcardDeckPublishRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
