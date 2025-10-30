# Canvas Search Feature - CNN Integration

## Overview
This feature allows users to search for kanji by drawing them on a canvas. The backend integrates with a CNN (Convolutional Neural Network) model to predict kanji from canvas drawings.

## Architecture

```
Mobile App → Backend API → CNN Service → Backend → Mobile App
(Canvas)     (NestJS)      (FastAPI)     (Database)  (Results)
```

## API Endpoint

### POST `/kanji/search/canvas`

Search for kanji by drawing on canvas.

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "image": "data:image/png;base64,iVBORw0KGgo..." // Base64 encoded image
}
```

**Response** (Status 201):
```json
{
  "data": {
    "predictions": [
      {
        "id": 1,
        "character": "山",
        "meanings": "mountain",
        "onyomi": "サン",
        "kunyomi": "やま",
        "jlpt": 5,
        "grade": 1,
        "strokeCount": 3,
        "frequency": 24,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      // ... up to 5 predictions
    ],
    "total": 5
  },
  "statusCode": 201,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**:
- **401 Unauthorized**: Missing or invalid authentication token
- **400 Bad Request**: Invalid base64 image format
- **502 Bad Gateway**: CNN API service unavailable or returned error
- **500 Internal Server Error**: Unexpected server error

## User Flow

1. **User opens search screen**
   - User sees search bar with text input
   - Search bar has a "pen" icon button

2. **User taps pen icon**
   - Canvas modal/screen appears
   - User can draw kanji with finger/stylus

3. **User submits drawing**
   - Frontend converts canvas to base64 PNG image
   - Sends POST request to `/kanji/search/canvas`

4. **Backend processes request**
   - Validates authentication
   - Forwards base64 image to CNN API at `${AI_SERVER_URL}/api/v1/predict`
   - CNN returns top 5 character predictions

5. **Backend enriches results**
   - Fetches full kanji data from database for top 5 predictions
   - Returns sorted results matching prediction order

6. **User sees results**
   - Top 5 kanji displayed with full information
   - User can tap any result to view details

## Configuration

### Environment Variables

Add to `.env` file:
```bash
# AI Service Configuration
AI_SERVER_URL=http://localhost:8000
```

Default: `http://localhost:8000` if not specified

### CNN API Endpoint

The backend calls: `${AI_SERVER_URL}/api/v1/predict`

Expected CNN API response format:
```json
{
  "character": "山",
  "confidence": 0.95,
  "top5": [
    {
      "character": "山",
      "confidence": 0.95
    },
    {
      "character": "川",
      "confidence": 0.85
    },
    // ... 3 more predictions
  ]
}
```

## Implementation Details

### Backend Service (`kanji.service.ts`)

```typescript
async searchByCanvas(base64Image: string) {
  // 1. Call CNN API
  const response = await fetch(`${this.CNN_API_URL}/api/v1/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image }),
  });

  // 2. Extract top 5 characters
  const prediction = await response.json();
  const top5Characters = prediction.top5.map(item => item.character);

  // 3. Fetch full kanji data from database
  const kanjiResults = await this.prisma.kanji.findMany({
    where: { character: { in: top5Characters } },
  });

  // 4. Sort to match prediction order
  const sortedResults = top5Characters
    .map(char => kanjiResults.find(k => k.character === char))
    .filter(k => k !== undefined);

  return {
    predictions: sortedResults,
    total: sortedResults.length,
  };
}
```

### Authentication Guard

The endpoint uses `@UseGuards(JwtAuthGuard)` to require authentication. Regular users can use this feature (no ADMIN role required).

## Testing

### Integration Tests

Location: `test/kanji-module.e2e-spec.ts`

Tests cover:
1. ✅ **Successful canvas search** - Returns top 5 predictions with full kanji data (169ms)
2. ✅ **Authentication required** - Returns 401 without token (44ms)
3. ✅ **CNN API error handling** - Returns 502 when CNN fails (58ms)
   - Test sends invalid base64 data (`invalid-base64-data`)
   - CNN API returns 400 Bad Request
   - Backend wraps error as 502 Bad Gateway for client

**Why 502 instead of 400?**
- 400 Bad Request = Client error (client sent bad data to backend)
- 502 Bad Gateway = Backend successfully received client request, but upstream service (CNN) failed
- This follows HTTP spec: backend acts as gateway to CNN service

Run tests:
```bash
npm run test:e2e -- kanji-module.e2e-spec.ts --testNamePattern="POST /kanji/search/canvas"
```

### Test Results
```
POST /kanji/search/canvas
  ✓ should search kanji by canvas drawing (base64 image) (169 ms)
  ✓ should require authentication (44 ms)
  ✓ should handle CNN API errors gracefully (58 ms)

Tests: 40 passed, 40 total (100%)
```

### Manual Testing with Real Kanji Image

Test CNN API directly:
```bash
# Load real kanji image and convert to base64
$imagePath = "path/to/kanji.png"
$bytes = [System.IO.File]::ReadAllBytes($imagePath)
$base64 = [System.Convert]::ToBase64String($bytes)
$base64Image = "data:image/png;base64,$base64"

# Call CNN API
curl -X POST http://localhost:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$base64Image\"}"
```

Expected response for "一" (one):
```json
{
  "character": "一",
  "confidence": 0.9452,
  "top5": [
    {"character": "一", "confidence": 0.9452},
    {"character": "二", "confidence": 0.0489},
    {"character": "つ", "confidence": 0.0041},
    {"character": "工", "confidence": 0.0009},
    {"character": "丁", "confidence": 0.0004}
  ]
}
```

## Mobile App Implementation Guide

### 1. Add Canvas Drawing Library

**Flutter example** (using `signature` package):
```dart
import 'package:signature/signature.dart';

final SignatureController _controller = SignatureController(
  penStrokeWidth: 5,
  penColor: Colors.black,
  exportBackgroundColor: Colors.white,
);
```

### 2. Display Canvas

```dart
Signature(
  controller: _controller,
  width: 300,
  height: 300,
  backgroundColor: Colors.white,
)
```

### 3. Convert to Base64 and Send

```dart
Future<void> searchByCanvas() async {
  // Get canvas image
  final signature = await _controller.toPngBytes();
  
  // Convert to base64
  final base64Image = 'data:image/png;base64,${base64Encode(signature!)}';
  
  // Send to API
  final response = await http.post(
    Uri.parse('$baseUrl/kanji/search/canvas'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    },
    body: jsonEncode({'image': base64Image}),
  );
  
  if (response.statusCode == 201) {
    final data = jsonDecode(response.body);
    final predictions = data['data']['predictions'] as List;
    // Display results
  }
}
```

### 4. Clear Canvas

```dart
IconButton(
  icon: Icon(Icons.clear),
  onPressed: () => _controller.clear(),
)
```

## Performance Considerations

1. **Image Size**: Canvas should be reasonable size (e.g., 300x300px) to reduce payload
2. **Timeout**: CNN prediction typically takes 100-500ms
3. **Caching**: Consider caching recent predictions to avoid repeated CNN calls
4. **Loading State**: Show loading indicator during prediction (can take up to 1 second)

## Error Handling

### Frontend Should Handle:

1. **Network errors**: Show "Connection failed" message
2. **401 Unauthorized**: Redirect to login
3. **502 Bad Gateway**: Show "AI service unavailable, please try again"
4. **500 errors**: Show generic error message

### Example Error Handling:

```dart
try {
  final response = await searchByCanvas();
  // Handle success
} catch (e) {
  if (e is UnauthorizedException) {
    // Redirect to login
  } else if (e is BadGatewayException) {
    showError('AI service is currently unavailable');
  } else {
    showError('An error occurred. Please try again.');
  }
}
```

## Future Enhancements

1. **History**: Save recent canvas searches
2. **Confidence Display**: Show prediction confidence scores
3. **Multiple Canvas**: Allow drawing multiple strokes/characters
4. **Auto-clear**: Clear canvas after successful search
5. **Undo/Redo**: Add stroke undo/redo functionality
6. **Stroke Guidelines**: Show grid/guidelines for better drawing
7. **Offline Mode**: Cache CNN model for offline predictions

## Troubleshooting

### CNN API Not Responding

Check if CNN service is running:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"msg": "ok"}
```

### Invalid Predictions

1. Ensure database has kanji for predicted characters
2. Check CNN model is properly loaded
3. Verify base64 encoding is correct

**Note on "Bad Request" Errors:**
- The CNN API may return 400 Bad Request for:
  * Invalid base64 format (not a valid image)
  * Image too small (< 10x10 pixels recommended)
  * Corrupted image data
- Backend wraps these as 502 Bad Gateway errors
- Very small images (1x1 pixel) may still get predictions but with low accuracy

### Slow Response Times

1. Check CNN service performance
2. Verify network latency between services
3. Consider adding Redis cache for predictions

## Related Documentation

- [CNN Kanji Model README](../../cnn-kanji/README.md)
- [Kanji Module API](./API_DOCUMENTATION.md)
- [Authentication Guide](./AUTHENTICATION.md)
