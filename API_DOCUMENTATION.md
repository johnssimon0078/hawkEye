# HawkEye Brand Protection API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
All API endpoints (except authentication) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

## Domain Monitoring Endpoints

### List Domains
```http
GET /domains?page=1&limit=10&status=active
Authorization: Bearer <jwt-token>
```

### Add Domain
```http
POST /domains
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "example.com",
  "scanInterval": 6,
  "description": "Main company domain"
}
```

## Alert Endpoints

### List Alerts
```http
GET /alerts?page=1&limit=10&severity=high&status=open
Authorization: Bearer <jwt-token>
```

### Update Alert Status
```http
PUT /alerts/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "resolved",
  "notes": "Issue has been resolved"
}
```

## Dashboard Endpoints

### Get Dashboard Overview
```http
GET /dashboard/overview
Authorization: Bearer <jwt-token>
```

## Report Endpoints

### Security Report
```http
GET /reports/security?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt-token>
```

### Export Report
```http
POST /reports/export
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "reportType": "security",
  "format": "pdf",
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Authentication Error
```json
{
  "success": false,
  "message": "Authentication failed",
  "error": "Invalid token"
}
```

## Rate Limiting

The API implements rate limiting:
- **Window**: 15 minutes
- **Limit**: 100 requests per window

## WebSocket Events

Connect to `/socket.io` for real-time updates:

### Join Dashboard
```javascript
socket.emit('join-dashboard', userId);
```

### Listen for Alerts
```javascript
socket.on('new-alert', (alert) => {
  console.log('New alert:', alert);
});
```

## Testing the API

### Using curl
```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Support

For API support and questions:
- Check the documentation
- Review error messages
- Contact the development team 