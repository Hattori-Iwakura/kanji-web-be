# Admin Dashboard Module

Complete admin dashboard implementation with statistics, publish request management, and system monitoring.

## Overview

The Admin Module provides comprehensive administrative tools for:
- **Dashboard Overview**: System-wide statistics and metrics
- **User Analytics**: User growth, registration patterns, activity tracking
- **Content Management**: Quiz/List/Deck statistics and trends
- **Publish Request Workflow**: Unified content moderation across all types
- **System Monitoring**: Health checks and performance metrics

## Features

### 1. Dashboard & Statistics (6 endpoints)

#### GET `/api/admin/dashboard/overview`
Get aggregated system overview with all key metrics.

**Authentication:** Required (Admin only)

**Response:**
```json
{
  "users": {
    "total": 1250,
    "active": 342,
    "new": 45,
    "byRole": {
      "ADMIN": 3,
      "USER": 1247
    }
  },
  "content": {
    "quizzes": 89,
    "lists": 156,
    "decks": 203
  },
  "activity": {
    "quizAttempts": 4521,
    "flashcardSessions": 8934,
    "pendingPublishRequests": 12
  }
}
```

#### GET `/api/admin/dashboard/stats/users?period=week`
Get detailed user statistics with growth analysis.

**Query Parameters:**
- `period`: `day` | `week` | `month` | `year` (default: `week`)

**Response:**
```json
{
  "total": 1250,
  "newUsers": 45,
  "activeUsers": 342,
  "byRole": [
    { "role": "ADMIN", "count": 3 },
    { "role": "USER", "count": 1247 }
  ],
  "growth": 3.73
}
```

#### GET `/api/admin/dashboard/stats/content?period=month`
Get content statistics across all types.

**Query Parameters:**
- `period`: `day` | `week` | `month` | `year` (default: `month`)

**Response:**
```json
{
  "quizzes": {
    "total": 89,
    "new": 8,
    "public": 67,
    "private": 22
  },
  "lists": {
    "total": 156,
    "new": 12,
    "public": 134,
    "private": 22
  },
  "decks": {
    "total": 203,
    "new": 15,
    "public": 178,
    "private": 25
  }
}
```

#### GET `/api/admin/dashboard/stats/activity?period=week&limit=10`
Get activity statistics with recent active users.

**Query Parameters:**
- `period`: `day` | `week` | `month` | `year` (default: `week`)
- `limit`: Number of recent users to return (default: `10`)

**Response:**
```json
{
  "quizAttempts": 342,
  "flashcardSessions": 678,
  "totalActivities": 1020,
  "recentUsers": [
    {
      "id": 42,
      "email": "user@example.com",
      "username": "user123",
      "lastActive": "2025-10-24T10:30:00Z",
      "activityCount": 45
    }
  ]
}
```

#### GET `/api/admin/dashboard/charts/users?period=30d`
Get user growth chart data for visualization.

**Query Parameters:**
- `period`: `7d` | `30d` | `90d` | `1y` (default: `30d`)

**Response:**
```json
{
  "dates": ["2025-09-24", "2025-09-25", "..."],
  "values": [1205, 1210, 1215, "..."],
  "newUsers": [5, 10, 8, "..."]
}
```

#### GET `/api/admin/dashboard/charts/activity?period=30d`
Get activity trends chart data.

**Query Parameters:**
- `period`: `7d` | `30d` | `90d` | `1y` (default: `30d`)

**Response:**
```json
{
  "dates": ["2025-09-24", "2025-09-25", "..."],
  "quizAttempts": [45, 52, 38, "..."],
  "flashcardSessions": [89, 95, 102, "..."]
}
```

### 2. Publish Request Management (4 endpoints)

#### GET `/api/admin/publish/requests?status=pending&type=quiz&limit=20&offset=0`
Get all publish requests with filtering and pagination.

**Query Parameters:**
- `status`: `pending` | `approved` | `rejected` (optional)
- `type`: `quiz` | `list` | `deck` (optional)
- `limit`: Number of results (default: `20`)
- `offset`: Pagination offset (default: `0`)

**Response:**
```json
{
  "requests": [
    {
      "id": 42,
      "type": "quiz",
      "title": "JLPT N3 Grammar Quiz",
      "status": "pending",
      "userId": 123,
      "userName": "user123",
      "requestedAt": "2025-10-24T10:30:00Z",
      "reviewedAt": null,
      "reviewedBy": null,
      "reviewerName": null,
      "reviewMessage": null
    }
  ],
  "total": 12
}
```

#### GET `/api/admin/publish/requests/42?type=quiz`
Get detailed publish request with full content.

**Query Parameters:**
- `type`: `quiz` | `list` | `deck` (required)

**Response:**
```json
{
  "id": 42,
  "status": "pending",
  "requestedAt": "2025-10-24T10:30:00Z",
  "reviewedAt": null,
  "reviewedBy": null,
  "reviewMessage": null,
  "user": {
    "id": 123,
    "email": "user@example.com",
    "username": "user123"
  },
  "reviewer": null,
  "quiz": {
    "id": 89,
    "title": "JLPT N3 Grammar Quiz",
    "description": "Test your N3 grammar knowledge",
    "difficulty": "MEDIUM",
    "isPublic": false,
    "questions": [
      {
        "id": 1,
        "questionText": "Choose the correct particle",
        "questionType": "MULTIPLE_CHOICE",
        "options": ["は", "が", "を", "に"]
      }
    ]
  }
}
```

#### PATCH `/api/admin/publish/requests/42/review?type=quiz`
Review publish request (approve/reject).

**Query Parameters:**
- `type`: `quiz` | `list` | `deck` (required)

**Body:**
```json
{
  "status": "approved",
  "reviewMessage": "Great content! Approved for publication."
}
```

**Status Options:** `approved` | `rejected`

**Response:**
```json
{
  "id": 42,
  "status": "approved",
  "reviewedAt": "2025-10-24T11:00:00Z",
  "reviewedBy": 1,
  "reviewMessage": "Great content! Approved for publication."
}
```

**Note:** When approved, the content (quiz/list/deck) is automatically published (`isPublic: true`).

#### GET `/api/admin/publish/statistics`
Get publish request statistics overview.

**Response:**
```json
{
  "total": 145,
  "pending": 12,
  "approved": 120,
  "rejected": 13,
  "byType": {
    "quiz": { "total": 45, "pending": 4 },
    "list": { "total": 56, "pending": 5 },
    "deck": { "total": 44, "pending": 3 }
  }
}
```

### 3. System Monitoring (2 endpoints)

#### GET `/api/admin/system/health`
Get system health check status.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-24T11:00:00Z",
  "checks": {
    "users": true,
    "kanji": true
  }
}
```

#### GET `/api/admin/system/metrics?period=24h`
Get system performance metrics.

**Query Parameters:**
- `period`: `1h` | `24h` | `7d` (default: `24h`)

**Response:**
```json
{
  "period": "24h",
  "requests": 8934,
  "avgResponseTime": 145,
  "memory": {
    "rss": 89234432,
    "heapTotal": 45678912,
    "heapUsed": 34567890,
    "external": 1234567
  },
  "uptime": 86400
}
```

## Authentication & Authorization

All admin endpoints require:
1. **JWT Authentication**: Valid access token in `Authorization: Bearer <token>` header
2. **Admin Role**: User must have `role: ADMIN`

**Guards Applied:**
- `JwtAuthGuard`: Validates JWT token and loads user
- `AdminGuard`: Checks user role is ADMIN

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/admin/dashboard/overview \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (Non-Admin)
```json
{
  "statusCode": 403,
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Publish request not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid request type"
}
```

## Implementation Details

### Service Layer (`admin.service.ts`)

**Key Methods:**
- `getDashboardOverview()` - Aggregates system-wide stats
- `getUserStatistics(period)` - User analytics with growth
- `getContentStatistics(period)` - Content metrics
- `getActivityStatistics(period, limit)` - Activity tracking
- `getUserChartData(period)` - User growth chart
- `getActivityChartData(period)` - Activity trends chart
- `getPublishRequests(filters)` - List publish requests
- `getPublishRequestById(id, type)` - Get request details
- `reviewPublishRequest(id, type, adminId, status, message)` - Approve/reject
- `getPublishStatistics()` - Publish stats overview
- `getSystemHealth()` - Health check
- `getSystemMetrics(period)` - Performance metrics

**Database Optimization:**
- Uses `Promise.all()` for parallel queries
- Proper Prisma aggregations with `groupBy`
- Transaction support for publish reviews
- Indexed queries on all foreign keys

### Controller Layer (`admin.controller.ts`)

**Route Structure:**
- `/api/admin/dashboard/*` - Dashboard endpoints
- `/api/admin/publish/*` - Publish management
- `/api/admin/system/*` - System monitoring

**Validation:**
- All DTOs use `class-validator`
- Query parameters properly typed
- ParseIntPipe for ID parameters

## Testing

### Manual Testing with Swagger

1. Start server: `npm run start:dev`
2. Navigate to: `http://localhost:3000/api`
3. Authenticate with admin user
4. Test each endpoint under "Admin Dashboard" section

### Example Test Flow

```bash
# 1. Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kanji.com","password":"admin123"}'

# Response: { "accessToken": "...", "user": {...} }

# 2. Get dashboard overview
curl -X GET http://localhost:3000/api/admin/dashboard/overview \
  -H "Authorization: Bearer <token>"

# 3. Get pending publish requests
curl -X GET "http://localhost:3000/api/admin/publish/requests?status=pending" \
  -H "Authorization: Bearer <token>"

# 4. Review a request
curl -X PATCH "http://localhost:3000/api/admin/publish/requests/42/review?type=quiz" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","reviewMessage":"Approved!"}'

# 5. Check system health
curl -X GET http://localhost:3000/api/admin/system/health \
  -H "Authorization: Bearer <token>"
```

## Performance Considerations

### Caching Strategy (Recommended)

Add caching layer for improved performance:

```typescript
// In admin.module.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes
      max: 100, // max items
    }),
    AuthModule,
  ],
  // ...
})
```

**Recommended TTLs:**
- Dashboard overview: 5 minutes
- Statistics: 15 minutes
- Chart data: 10 minutes
- Publish requests: No cache (real-time)
- System health: 1 minute
- System metrics: 5 minutes

### Query Optimization

All queries are optimized with:
- Proper indexing on foreign keys
- Efficient aggregations using `groupBy`
- Parallel query execution with `Promise.all()`
- Date-based filtering with indexed timestamps

## Future Enhancements

1. **Activity Logs**
   - Track admin actions (approve/reject)
   - User activity timeline
   - Audit trail for compliance

2. **Advanced Analytics**
   - Retention rate calculations
   - Cohort analysis
   - Conversion funnels

3. **Notifications**
   - Email admins for new publish requests
   - Alert on system health issues
   - Daily/weekly summary reports

4. **Batch Operations**
   - Bulk approve/reject
   - User management actions
   - Content moderation tools

## Module Structure

```
src/modules/admin/
├── README.md                    # This file
├── admin.module.ts             # Module definition
├── admin.controller.ts         # REST API endpoints
├── admin.service.ts            # Business logic
└── dto/
    └── admin.dto.ts           # Request/response DTOs
```

## Dependencies

- `@nestjs/common` - Core NestJS decorators
- `@nestjs/swagger` - API documentation
- `@prisma/client` - Database access
- `class-validator` - DTO validation
- `class-transformer` - Type transformation

## Related Modules

- **AuthModule**: Provides JWT authentication and guards
- **UserModule**: User management (separate from admin dashboard)
- **QuizModule**: Quiz content (reviewed via publish requests)
- **KanjiListModule**: List content (reviewed via publish requests)
- **FlashcardDeckModule**: Deck content (reviewed via publish requests)

## Status

✅ **Complete** - All 13 endpoints implemented and tested
- Dashboard & Statistics: 6 endpoints
- Publish Management: 4 endpoints
- System Monitoring: 2 endpoints
- Authentication & Authorization: Working
- Documentation: Complete

## Support

For issues or questions, contact the backend team or check:
- Swagger UI: `http://localhost:3000/api`
- Source code: `src/modules/admin/`
- Implementation plan: `IMPLEMENTATION_PLAN.md`
