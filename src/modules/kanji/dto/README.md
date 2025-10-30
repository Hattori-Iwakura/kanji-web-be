# Kanji Module DTOs

This directory contains Data Transfer Objects (DTOs) for the Kanji Module with validation using `class-validator`.

## Available DTOs

### SearchKanjiDto
Used for advanced kanji search with multiple filters.

**Endpoint:** `GET /kanji/search`

**Properties:**
- `query?: string` - Text search query (kanji, meaning, reading)
- `jlptLevels?: number[]` - Array of JLPT levels (1-5). Can be passed as comma-separated string: `jlptLevels=1,2,3`
- `grades?: number[]` - Array of school grades (1-6). Can be passed as comma-separated string: `grades=1,2`
- `minStrokes?: number` - Minimum stroke count (>= 1)
- `maxStrokes?: number` - Maximum stroke count (>= 1)
- `page?: number` - Page number for pagination (default: 1)
- `limit?: number` - Items per page (default: 20)
- `sortBy?: string` - Sort field: `character`, `strokes`, `jlpt`, or `grade`

**Example:**
```typescript
GET /kanji/search?query=水&jlptLevels=5,4&minStrokes=1&maxStrokes=10&page=1&limit=20
```

### SearchByCanvasDto
Used for kanji recognition from canvas drawings.

**Endpoint:** `POST /kanji/search/canvas`

**Properties:**
- `image: string` - Base64 encoded image (required). Must include data URI scheme: `data:image/png;base64,...`

**Example:**
```typescript
POST /kanji/search/canvas
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### FindAllKanjiDto
Used for basic kanji listing with filters.

**Endpoint:** `GET /kanji`

**Properties:**
- `jlpt?: number` - JLPT level (1-5)
- `grade?: number` - School grade (1-6)
- `search?: string` - Text search query
- `limit?: number` - Items per page
- `offset?: number` - Pagination offset (>= 0)

**Example:**
```typescript
GET /kanji?jlpt=5&search=水&limit=50&offset=0
```

## Validation

All DTOs use `class-validator` decorators for automatic validation:

- **Type conversion:** Query parameters are automatically converted from strings to numbers/arrays
- **Range validation:** Numeric fields have min/max constraints
- **Enum validation:** `sortBy` only accepts valid values
- **Required fields:** `image` in `SearchByCanvasDto` is required

## Array Parameters

For array parameters like `jlptLevels` and `grades`, you can pass:
- **Query string:** `jlptLevels=1,2,3` (comma-separated)
- **Array format:** `jlptLevels[]=1&jlptLevels[]=2&jlptLevels[]=3`

Both formats are automatically transformed to arrays.

## Error Responses

Invalid input returns `400 Bad Request` with validation errors:

```json
{
  "statusCode": 400,
  "message": [
    "jlpt must be an integer number",
    "minStrokes must not be less than 1"
  ],
  "error": "Bad Request"
}
```
