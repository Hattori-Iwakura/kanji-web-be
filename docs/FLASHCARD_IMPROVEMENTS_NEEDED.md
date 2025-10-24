# 🔧 Flashcard System - Improvements Needed

## 🐛 Current Issues

### Issue #1: Study Session Shows "Completed" Immediately
**Symptom:** User clicks "Start Study Session" but gets completion message despite deck having 4 cards.

**Root Cause:**
```typescript
// In flashcard.repo.ts - buildStudyCardFilter()
// Currently only returns cards that are:
// - is_new: true  OR
// - next_review_at: { lte: now }  (due cards)

// Problem: If all 4 cards were already reviewed once,
// they are NOT new (is_new = false)
// and NOT due yet (next_review_at > now)
// Result: filter returns 0 cards
```

**Impact:** Users can't practice/review cards until they become "due" again.

---

## 📋 Missing Endpoints & Features

### 1. **GET /flashcard/decks/:id/cards** - List all cards in deck
**Purpose:** View all cards in a deck regardless of study status

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "cards": [
      {
        "id": 123,
        "frontContent": "一",
        "backContent": { "meanings": "one", "onyomi": "イチ", ... },
        "isNew": false,
        "difficulty": 0,
        "repetitions": 2,
        "nextReviewAt": "2025-10-20T10:00:00Z",
        "lastReviewedAt": "2025-10-17T10:00:00Z",
        "orderIndex": 0,
        "kanji": {
          "id": 1,
          "character": "一",
          "meanings": "one"
        }
      }
    ],
    "totalCards": 4,
    "cardsNew": 0,
    "cardsDue": 0,
    "cardsLearning": 4
  }
}
```

**Why needed:** Users need to see what cards are in their deck and their status.

---

### 2. **Study Mode: "practice_all"** - Practice any/all cards
**Problem:** Current modes (new, due, hard, mixed) all filter cards. No way to study cards that aren't due yet.

**Solution:** Add new mode to `StudySessionMode` enum:
```typescript
export enum StudySessionMode {
  MIXED = 'mixed',
  NEW = 'new',
  DUE = 'due',
  HARD = 'hard',
  CUSTOM = 'custom',
  PRACTICE_ALL = 'practice_all', // NEW: Study all cards regardless of status
}
```

**Implementation in buildStudyCardFilter:**
```typescript
case StudySessionMode.PRACTICE_ALL:
  return {
    ...base,
    // No filters - return all cards in deck
  };
```

**Why needed:** Users want to practice/review cards even if they're not "due" yet.

---

### 3. **GET /flashcard/decks/:id/stats** - Detailed deck statistics
**Purpose:** Show comprehensive deck info before starting study session

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "deckId": 1,
    "deckName": "JLPT N5 Kanji",
    "totalCards": 80,
    "breakdown": {
      "new": 20,
      "learning": 35,
      "young": 15,
      "mature": 10
    },
    "due": {
      "now": 5,
      "today": 12,
      "tomorrow": 8
    },
    "difficulty": {
      "easy": 40,
      "medium": 30,
      "hard": 10
    },
    "recentActivity": {
      "lastStudied": "2025-10-17T14:30:00Z",
      "cardsStudiedToday": 15,
      "streakDays": 3
    },
    "estimatedTime": {
      "newCards": 10,  // minutes
      "dueCards": 3,
      "allCards": 45
    }
  }
}
```

**Why needed:** Users should see what they're about to study before starting.

---

### 4. **PATCH /flashcard/cards/:id/reset** - Reset card progress
**Purpose:** Allow users to restart learning a specific card

**Request Body:**
```json
{
  "resetType": "full" | "keep_difficulty" | "keep_repetitions"
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "id": 123,
    "isNew": true,
    "difficulty": 0,
    "repetitions": 0,
    "nextReviewAt": null,
    "message": "Card reset successfully"
  }
}
```

**Why needed:** Users might want to re-learn cards they're struggling with.

---

### 5. **GET /flashcard/decks/:id/due-count** - Quick check for due cards
**Purpose:** Show due card count on deck list without fetching full deck

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "deckId": 1,
    "dueNow": 5,
    "dueToday": 12,
    "newCards": 20,
    "nextReviewAt": "2025-10-17T16:00:00Z"
  }
}
```

**Why needed:** Efficient way to show badges/counts on deck cards in UI.

---

### 6. **POST /flashcard/decks/:id/cards/batch-update** - Update multiple cards
**Purpose:** Bulk operations on cards (reset, delete, change difficulty)

**Request Body:**
```json
{
  "cardIds": [1, 2, 3, 4],
  "action": "reset" | "delete" | "set_difficulty",
  "params": {
    "difficulty": 2
  }
}
```

**Why needed:** Managing individual cards one by one is tedious.

---

## 🎯 Recommended Implementation Priority

### Priority 1 (Critical - Fixes blocking bug):
1. ✅ Add `PRACTICE_ALL` mode to study session
2. ✅ Update `buildStudyCardFilter` to handle new mode
3. ✅ Add to Flutter: dropdown option "Practice All"

### Priority 2 (High - Essential for UX):
4. ✅ Implement `GET /flashcard/decks/:id/cards`
5. ✅ Implement `GET /flashcard/decks/:id/stats`
6. ✅ Update Flutter deck detail page to show card list
7. ✅ Update Flutter session setup to show stats

### Priority 3 (Medium - Quality of Life):
8. ⏳ Implement `GET /flashcard/decks/:id/due-count`
9. ⏳ Add due count badges to deck cards in Flutter
10. ⏳ Implement `PATCH /flashcard/cards/:id/reset`
11. ⏳ Add "Reset Progress" button in card detail view

### Priority 4 (Low - Nice to have):
12. ⏳ Implement `POST /flashcard/decks/:id/cards/batch-update`
13. ⏳ Add batch operations UI in Flutter

---

## 🔄 Quick Fix for Immediate Issue

**Temporary Solution:** Default to `include_new=true` AND `include_due=true` AND add fallback logic:

```typescript
// In startStudySession after filter returns empty
if (!selectedCards.length) {
  // Fallback: try getting ANY cards from deck
  const fallbackCards = await this.dbClient.flashcardCard.findMany({
    where: { deck_id: deckId },
    include: { Kanji: true },
    take: max_cards,
  });
  
  if (!fallbackCards.length) {
    return {
      message: 'No cards in deck',
      cards: [],
      session: null,
    };
  }
  
  selectedCards = fallbackCards;
}
```

**Better Solution:** Implement Priority 1 items above.

---

## 📊 Expected User Flow

### Before Fix:
1. User creates deck from kanji list (4 cards)
2. User clicks "Start Study"
3. Backend filters: `is_new=true OR next_review_at <= now`
4. All cards already reviewed once → not new, not due yet
5. Filter returns 0 cards
6. ❌ User sees "Session Completed"

### After Fix:
1. User creates deck from kanji list (4 cards)
2. User clicks "Start Study"
3. User selects mode "Practice All"
4. Backend returns all 4 cards regardless of status
5. ✅ User can study all cards

---

## 🧪 Testing Checklist

- [ ] Create new deck with 4 cards
- [ ] Study all cards once (rate each 3-5)
- [ ] Immediately try to start new session with "Mixed" mode
  - Expected: Shows "No cards due" or very few cards
- [ ] Switch to "Practice All" mode
  - Expected: Shows all 4 cards available
- [ ] Complete study session
- [ ] Check card status via `GET /decks/:id/cards`
  - Expected: All cards show next_review_at in future
- [ ] Check deck stats via `GET /decks/:id/stats`
  - Expected: Accurate breakdown of card statuses

---

*Last Updated: October 17, 2025, 6:30 PM*
