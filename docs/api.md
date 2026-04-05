# REST API Reference

ServerlessKit auto-generates REST API endpoints for every registered collection.

## Endpoints

For a collection with slug `posts`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/content/posts` | List entries (paginated) |
| `GET` | `/api/v1/content/posts/:id` | Get single entry |
| `POST` | `/api/v1/content/posts` | Create entry |
| `PUT` | `/api/v1/content/posts/:id` | Full update |
| `PATCH` | `/api/v1/content/posts/:id` | Partial update |
| `DELETE` | `/api/v1/content/posts/:id` | Delete entry |

## Query Parameters

### Filtering

```
GET /api/v1/content/posts?filter[status]=published
GET /api/v1/content/posts?filter[views][gte]=100
GET /api/v1/content/posts?filter[views][gte]=10&filter[views][lte]=1000
GET /api/v1/content/posts?filter[status][in]=draft,published
```

Operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `startsWith`, `in`, `notIn`

### Sorting

```
GET /api/v1/content/posts?sort=-createdAt        # Descending
GET /api/v1/content/posts?sort=title,-views       # Multi-field
```

Prefix with `-` for descending order.

### Pagination

```
GET /api/v1/content/posts?page=2&limit=25
```

Default: page 1, limit 25. Maximum limit: 100.

### Field Selection

```
GET /api/v1/content/posts?fields=id,title,status
```

### Relation Population

```
GET /api/v1/content/posts?populate=author,category
```

## Authentication

### Bearer Token

```
Authorization: Bearer <session-token>
```

### API Key

```
X-API-Key: sk_live_<key>
```

API keys use `sk_live_` prefix for production and `sk_test_` for development.

## Response Format

### Success

```json
{
  "ok": true,
  "data": { "id": "abc123", "title": "Hello" },
  "meta": { "durationMs": 12 }
}
```

### Paginated

```json
{
  "ok": true,
  "data": [{ "id": "abc123", "title": "Hello" }],
  "meta": {
    "pagination": { "page": 1, "limit": 25, "total": 42, "totalPages": 2 },
    "durationMs": 15
  }
}
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field \"title\" is required"
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `NOT_FOUND` | 404 | Entry not found |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `RATE_LIMITED` | 429 | Too many requests |
| `DB_ERROR` | 500 | Database operation failed |
