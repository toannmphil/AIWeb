# API Contracts: Multi-Project Management

Base URL: `http://76.13.213.204:3001`
Auth: Bearer JWT token in `Authorization` header (except `/api/login`)

## Authentication

### POST /api/login
*(Existing - no change)*

**Request**:
```json
{ "username": "admin", "password": "admin123" }
```

**Response 200**:
```json
{ "token": "jwt-token", "username": "admin" }
```

**Response 401**:
```json
{ "error": "Invalid credentials" }
```

---

## Projects Management

### GET /api/projects
List all projects.

**Response 200**:
```json
[
  { "id": 1, "name": "Poker Texas Build Plan", "is_default": true, "updated_at": "2026-03-08T10:00:00Z" },
  { "id": 2, "name": "Another Project", "is_default": false, "updated_at": "2026-03-08T09:00:00Z" }
]
```

### POST /api/projects
Create a new project.

**Request**:
```json
{ "name": "New Project Name" }
```

**Response 201**:
```json
{ "id": 3, "name": "New Project Name", "is_default": false }
```

**Response 400** (empty name):
```json
{ "error": "Project name is required" }
```

### PUT /api/projects/:id
Update project name or set as default.

**Request** (rename):
```json
{ "name": "Updated Name" }
```

**Request** (set default):
```json
{ "is_default": true }
```

**Response 200**:
```json
{ "id": 1, "name": "Updated Name", "is_default": true }
```

**Response 404**:
```json
{ "error": "Project not found" }
```

### DELETE /api/projects/:id
Delete a project. Cannot delete the last project.

**Response 200**:
```json
{ "ok": true }
```

**Response 400** (last project):
```json
{ "error": "Cannot delete the only project" }
```

**Response 404**:
```json
{ "error": "Project not found" }
```

---

## Project Data

### GET /api/project/:id
Load project data.

**Response 200**:
```json
{
  "data": {
    "tasks": [...],
    "phaseColors": {...},
    "version": 5,
    "savedAt": "2026-03-08T10:00:00Z"
  },
  "version": 5
}
```

**Response 404**:
```json
{ "error": "Project not found" }
```

### PUT /api/project/:id
Save project data with version conflict detection.

**Request**:
```json
{
  "data": {
    "tasks": [...],
    "phaseColors": {...}
  },
  "version": 5
}
```

**Response 200**:
```json
{ "ok": true, "version": 6, "savedAt": "2026-03-08T10:01:00Z" }
```

**Response 409** (version conflict):
```json
{ "error": "Version conflict", "serverVersion": 6, "clientVersion": 5 }
```

### GET /api/project/:id/version
Check current version for polling.

**Response 200**:
```json
{ "version": 5, "updated_by": "admin", "updated_at": "2026-03-08T10:00:00Z" }
```

---

## Shared Settings

### GET /api/settings
Load shared settings (members, teamColors).

**Response 200**:
```json
{
  "members": {
    "Frontend": ["Alice", "Bob"],
    "Backend": ["Charlie"]
  },
  "teamColors": {
    "Frontend": "#3b82f6",
    "Backend": "#10b981"
  }
}
```

### PUT /api/settings
Save shared settings.

**Request**:
```json
{
  "data": {
    "members": {...},
    "teamColors": {...}
  }
}
```

**Response 200**:
```json
{ "ok": true }
```

---

## Backward Compatibility

### GET /api/data
*(Existing - redirects to default project)*

Internally calls `GET /api/project/:defaultId` and returns `data` directly with version injected.

### POST /api/data
*(Existing - redirects to default project)*

Internally calls `PUT /api/project/:defaultId`.

### GET /api/version
*(Existing - redirects to default project)*

Internally calls `GET /api/project/:defaultId/version`.
