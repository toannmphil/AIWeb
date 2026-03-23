# API Contract: Unified Task Management

Base URL: `http://76.13.213.204:3001`
Auth: Bearer JWT token in `Authorization` header (except `/api/login`)

---

## Authentication (unchanged)

### POST /api/login
```json
// Request
{ "username": "admin", "password": "admin123" }
// Response 200
{ "token": "eyJhbG...", "username": "admin" }
```

---

## Projects (unchanged)

### GET /api/projects
```json
[{ "id": 1, "name": "Poker Texas Build Plan", "is_default": true, "updated_at": "..." }]
```

### POST /api/projects
```json
// Request: { "name": "New Project" }
// Response 201: { "id": 2, "name": "New Project", "is_default": false }
```

### PUT /api/projects/:id
```json
// Request: { "name": "Renamed", "is_default": true }
// Response 200: { "id": 1, "name": "Renamed", "is_default": true }
```

### DELETE /api/projects/:id
```json
// Response 200: { "ok": true }
// Response 400: { "error": "Cannot delete the only project" }
```

---

## Project Data (CHANGED — phaseColors removed)

### GET /api/project/:id
```json
{
  "data": { "tasks": [Task, ...] },
  "version": 5
}
```

### PUT /api/project/:id
```json
// Request
{ "data": { "tasks": [...] }, "version": 5 }
// Response 200
{ "ok": true, "version": 6, "savedAt": "2026-03-09T10:00:00.000Z" }
// Response 409
{ "error": "Version conflict", "serverVersion": 6, "clientVersion": 5 }
```

### GET /api/project/:id/version
```json
{ "version": 5, "updated_by": "admin", "updated_at": "..." }
```

---

## Task Object (unified)

```json
{
  "id": 10,
  "name": "Game Design Document",
  "team": "PM",
  "assignee": "ToanNM",
  "priority": "High",
  "status": "Not Started",
  "start": "03/03/2026",
  "end": "06/03/2026",
  "pct": 0,
  "deps": [{"id": 15, "type": "FS", "lag": 0}],
  "notes": "Ghi chu",
  "expanded": true,
  "children": [],
  "parentId": 1,
  "parentName": "Pre-production"
}
```

- **Status**: `Not Started` | `In Progress` | `Completed` | `On Hold`
- **Priority**: `High` | `Normal` | `Low`
- **Dep type**: `FS` (default) | `SS` | `FF` | `SF`
- **Parent task** = any task with `children.length > 0` (auto-computed: start, end, pct)
- **Leaf task** = task with `children: []` or no children (user-editable fields)

---

## Tasks Endpoints

### GET /api/project/:id/tasks
Flat list of all tasks. Supports filters:

| Param | Example | Description |
|-------|---------|-------------|
| `status` | `?status=In Progress` | By status |
| `team` | `?team=Dev` | By team |
| `assignee` | `?assignee=CongNN` | By assignee |
| `priority` | `?priority=High` | By priority |
| `parentId` | `?parentId=1` | By parent |
| `leaf` | `?leaf=true` | Only leaf tasks |

```json
{
  "tasks": [{ "id": 10, "name": "GDD", ..., "parentId": 1, "parentName": "Pre-production" }],
  "total": 38,
  "version": 5
}
```

### GET /api/project/:id/tasks/:taskId
```json
{ "task": { "id": 10, ... }, "version": 5 }
```

### POST /api/project/:id/tasks
Create task. `parentId` required (null for top-level).

```json
// Request
{
  "parentId": 1,
  "name": "New Task",
  "team": "Dev",
  "assignee": "CongNN",
  "priority": "High",
  "status": "Not Started",
  "start": "10/03/2026",
  "end": "15/03/2026"
}
// Response 201
{ "task": { "id": 58, ... }, "version": 6 }
```

### PUT /api/project/:id/tasks/:taskId
Partial update. Parent tasks: only `name`, `notes`, `deps`, `expanded`.

```json
// Leaf: any field
{ "assignee": "HuongBP", "status": "In Progress" }
// Parent: restricted
{ "name": "Renamed Group" }
// Response 200
{ "task": { ... }, "version": 6 }
// Response 400 (parent, computed field)
{ "error": "Cannot edit computed fields on parent task" }
```

### PATCH /api/project/:id/tasks/:taskId/status
Quick status update. Not for parent tasks.

```json
// Request
{ "status": "In Progress", "pct": 30 }
// Response 200
{ "task": { ... }, "version": 6 }
// Response 400 (parent)
{ "error": "Cannot set status on parent task" }
```

### POST /api/project/:id/tasks/:taskId/indent
Move task under the sibling above it.

```json
// Response 200
{ "task": { ..., "parentId": 9 }, "version": 6 }
// Response 400
{ "error": "Cannot indent: no sibling above" }
```

### POST /api/project/:id/tasks/:taskId/outdent
Move task up one level.

```json
// Response 200
{ "task": { ..., "parentId": null }, "version": 6 }
// Response 400
{ "error": "Cannot outdent: already at top level" }
```

### DELETE /api/project/:id/tasks/:taskId
Delete task + all children.

```json
{ "ok": true, "version": 6 }
```

---

## Meetings — Minutes with @Mention

### Meeting Object

```json
{
  "id": 1,
  "title": "Sprint Review - Week 10",
  "date": "10/03/2026",
  "content": "Reviewed @CongNN card engine. @HuongBP reported betting 70% done.\n\nDecisions:\n- Postpone AI bot\n\nAction items:\n- @ToanNM update timeline",
  "attendees": ["ToanNM", "CongNN", "HuongBP"],
  "createdBy": "admin",
  "createdAt": "2026-03-10T07:00:00.000Z"
}
```

- `content`: plain text, `@MemberName` được parse khi render thành mention highlight
- `attendees`: array of member names từ shared members list
- `date`: format `DD/MM/YYYY` (giống task dates)

### GET /api/project/:id/meetings
Danh sách meetings. Hỗ trợ filter.

| Param | Example | Description |
|-------|---------|-------------|
| `from` | `?from=01/03/2026` | Meetings từ ngày này |
| `to` | `?to=31/03/2026` | Meetings đến ngày này |

```json
// Response 200
{
  "meetings": [
    { "id": 1, "title": "Sprint Review", "date": "10/03/2026", "attendees": ["ToanNM", "CongNN"], "createdBy": "admin", "createdAt": "..." }
  ],
  "total": 1,
  "version": 5
}
```

### POST /api/project/:id/meetings
Tạo meeting mới.

```json
// Request
{
  "title": "Sprint Review - Week 10",
  "date": "10/03/2026",
  "content": "@CongNN demo card engine. @HuongBP review betting system.",
  "attendees": ["ToanNM", "CongNN", "HuongBP"]
}

// Response 201
{
  "meeting": { "id": 1, "title": "Sprint Review - Week 10", ... },
  "version": 6
}
```

### PUT /api/project/:id/meetings/:meetingId
Cập nhật meeting (partial update).

```json
// Request
{ "content": "Updated content with @NewMember mention", "attendees": ["ToanNM", "CongNN", "HuongBP", "NewMember"] }

// Response 200
{ "meeting": { ... }, "version": 6 }
```

### DELETE /api/project/:id/meetings/:meetingId
Xoá meeting.

```json
// Response 200
{ "ok": true, "version": 6 }
```

---

## REMOVED Endpoints

| Endpoint | Reason |
|----------|--------|
| `POST /api/project/:id/tasks/summary` | No summary type; create task with parentId |
| `GET /api/project/:id/epics` | No epic type; use `GET /tasks?parentId=null` |

---

## Summary Stats (CHANGED)

### GET /api/project/:id/summary
```json
{
  "totalTasks": 38,
  "totalLeafTasks": 30,
  "totalParentTasks": 8,
  "avgProgress": 12,
  "byStatus": { "Not Started": 20, "In Progress": 10, "Completed": 5, "On Hold": 3 },
  "byTeam": { "Dev": 12, "Art": 6 },
  "byAssignee": { "CongNN": 3 },
  "maxDepth": 3,
  "version": 5
}
```

---

## Migration (one-time)

### POST /api/migrate
Convert all projects from old format to unified format.

```json
{ "ok": true, "migratedProjects": 3, "totalTasksMigrated": 120 }
```

---

## Members (unchanged)

### GET /api/project/:id/members
```json
{ "members": [{"name": "CongNN", "team": "Dev"}], "teamColors": {"Dev": "#2980b9"} }
```

---

## Settings (unchanged)

### GET /api/settings
```json
{ "members": {}, "teamColors": {} }
```

### PUT /api/settings
```json
// Request: { "data": { "members": {...}, "teamColors": {...} } }
// Response: { "ok": true }
```

---

## Bot Flow Example

```bash
# Login
TOKEN=$(curl -s -X POST /api/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# Get top-level tasks (replaces "get epics")
curl -s "/api/project/1/tasks?parentId=null" -H "Authorization: Bearer $TOKEN"

# Create child task
curl -s -X POST /api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"parentId":1,"name":"New Task","team":"Dev","status":"Not Started"}'

# Indent task 10 under task 9
curl -s -X POST /api/project/1/tasks/10/indent -H "Authorization: Bearer $TOKEN"

# Update status
curl -s -X PATCH /api/project/1/tasks/10/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"Completed"}'
```
