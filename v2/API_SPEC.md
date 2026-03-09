# Poker Plan v2 - API Specification

Base URL: `http://76.13.213.204:3001`

## Authentication

Tất cả endpoint (trừ `/api/login`) yêu cầu header:
```
Authorization: Bearer <token>
```

### POST /api/login
Đăng nhập lấy token.
```json
// Request
{ "username": "admin", "password": "admin123" }

// Response 200
{ "token": "eyJhbG...", "username": "admin" }

// Response 401
{ "error": "Invalid credentials" }
```

---

## Projects

### GET /api/projects
Danh sách tất cả projects.
```json
// Response 200
[
  { "id": 1, "name": "Poker Texas Build Plan", "is_default": true, "updated_at": "2026-03-09T..." }
]
```

### POST /api/projects
Tạo project mới.
```json
// Request
{ "name": "New Project" }

// Response 201
{ "id": 2, "name": "New Project", "is_default": false }
```

### PUT /api/projects/:id
Đổi tên hoặc set default.
```json
// Request (cả 2 field đều optional)
{ "name": "Renamed", "is_default": true }

// Response 200
{ "id": 1, "name": "Renamed", "is_default": true }
```

### DELETE /api/projects/:id
Xoá project (không xoá được nếu chỉ còn 1).
```json
// Response 200
{ "ok": true }

// Response 400
{ "error": "Cannot delete the only project" }
```

---

## Project Data (full blob)

### GET /api/project/:id
Lấy toàn bộ data của project.
```json
// Response 200
{
  "data": {
    "tasks": [...],
    "members": [...],
    "teamColors": {...},
    "phaseColors": {...}
  },
  "version": 5
}
```

### PUT /api/project/:id
Lưu toàn bộ data (có version check chống conflict).
```json
// Request
{ "data": { "tasks": [...], "members": [...], "teamColors": {...}, "phaseColors": {...} }, "version": 5 }

// Response 200
{ "ok": true, "version": 6, "savedAt": "2026-03-09T10:00:00.000Z" }

// Response 409 (conflict)
{ "error": "Version conflict", "serverVersion": 6, "clientVersion": 5 }
```

### GET /api/project/:id/version
Check version nhanh (polling).
```json
// Response 200
{ "version": 5, "updated_by": "admin", "updated_at": "2026-03-09T..." }
```

---

## Tasks

Task object:
```json
{
  "id": 10,
  "name": "Game Design Document",
  "team": "PM",
  "assignee": "ToanNM",
  "priority": "High",       // "High" | "Medium" | "Low"
  "status": "To Do",        // "To Do" | "In Progress" | "Review" | "Done" | "Blocked"
  "start": "03/03/2026",    // DD/MM/YYYY
  "end": "06/03/2026",      // DD/MM/YYYY
  "pct": 0,                 // 0-100
  "deps": [15],             // array of task IDs
  "notes": "Ghi chu",
  "epicId": 1,              // ID của epic chứa task (chỉ khi GET)
  "epicName": "Pre-production",
  "phase": "Pre-production"
}
```

### GET /api/project/:id/tasks
Danh sách tasks (flat, đã gộp từ tất cả epics). Hỗ trợ filter qua query params.

| Query Param | Ví dụ | Mô tả |
|-------------|-------|-------|
| `status` | `?status=In Progress` | Lọc theo trạng thái |
| `team` | `?team=Dev` | Lọc theo team |
| `assignee` | `?assignee=CongNN` | Lọc theo người được giao |
| `priority` | `?priority=High` | Lọc theo độ ưu tiên |
| `epicId` | `?epicId=1` | Lọc theo epic |

```json
// GET /api/project/1/tasks?status=To Do&team=Dev

// Response 200
{
  "tasks": [
    { "id": 30, "name": "Core Engine - Card Logic", "team": "Dev", "assignee": "CongNN", "priority": "High", "status": "To Do", "start": "18/03/2026", "end": "27/03/2026", "pct": 0, "deps": [15,16], "notes": "Card engine", "epicId": 2, "epicName": "Production", "phase": "Production" }
  ],
  "total": 1,
  "version": 5
}
```

### GET /api/project/:id/tasks/:taskId
Lấy 1 task theo ID.
```json
// GET /api/project/1/tasks/30

// Response 200
{
  "task": { "id": 30, "name": "Core Engine - Card Logic", "team": "Dev", ... },
  "version": 5
}
```

### POST /api/project/:id/tasks
Tạo task mới trong 1 epic.
```json
// Request (epicId + name bắt buộc, còn lại optional)
{
  "epicId": 2,
  "name": "New Feature",
  "team": "Dev",
  "assignee": "CongNN",
  "priority": "High",
  "status": "To Do",
  "start": "10/03/2026",
  "end": "15/03/2026",
  "pct": 0,
  "deps": [30],
  "notes": "Mo ta"
}

// Response 201
{
  "task": { "id": 58, "name": "New Feature", "team": "Dev", ... , "epicId": 2, "epicName": "Production", "phase": "Production" },
  "version": 6
}
```

### PUT /api/project/:id/tasks/:taskId
Cập nhật task (partial update - chỉ gửi field cần thay đổi).
```json
// Request (chỉ gửi field muốn đổi)
{ "assignee": "HuongBP", "priority": "Medium", "notes": "Ghi chu moi" }

// Response 200
{ "task": { "id": 30, "name": "Core Engine - Card Logic", "assignee": "HuongBP", "priority": "Medium", ... }, "version": 6 }
```

### PATCH /api/project/:id/tasks/:taskId/status
Cập nhật nhanh trạng thái. Set `Done` sẽ tự động pct=100.
```json
// Request
{ "status": "In Progress", "pct": 30 }

// Response 200
{ "task": { "id": 30, "status": "In Progress", "pct": 30, ... }, "version": 6 }
```

Giá trị `status` hợp lệ: `To Do`, `In Progress`, `Review`, `Done`, `Blocked`

### DELETE /api/project/:id/tasks/:taskId
Xoá task (hoặc epic).
```json
// Response 200
{ "ok": true, "version": 6 }
```

---

## Epics

Epic là nhóm task (phase), chứa danh sách `children`.

### GET /api/project/:id/epics
Danh sách epics.
```json
// Response 200
{
  "epics": [
    { "id": 1, "name": "Pre-production", "phase": "Pre-production", "taskCount": 8 },
    { "id": 2, "name": "Production", "phase": "Production", "taskCount": 22 },
    { "id": 3, "name": "Testing & QA", "phase": "Testing & QA", "taskCount": 8 }
  ],
  "version": 5
}
```

### POST /api/project/:id/epics
Tạo epic mới.
```json
// Request
{ "name": "Post-launch", "phase": "Post-launch" }

// Response 201
{ "epic": { "id": 4, "name": "Post-launch", "isEpic": true, "phase": "Post-launch", "expanded": true, "children": [] }, "version": 6 }
```

---

## Members

### GET /api/project/:id/members
Danh sách thành viên và màu team trong project.
```json
// Response 200
{
  "members": [
    { "name": "ToanNM", "team": "PM" },
    { "name": "CongNN", "team": "Dev" },
    ...
  ],
  "teamColors": {
    "PM": "#34495e",
    "Dev": "#2980b9",
    "Design": "#e67e22",
    ...
  }
}
```

---

## Summary

### GET /api/project/:id/summary
Thống kê tổng quan project.
```json
// Response 200
{
  "totalTasks": 38,
  "avgProgress": 12,
  "byStatus": { "To Do": 30, "In Progress": 5, "Done": 3 },
  "byTeam": { "Dev": 12, "Art": 6, "Design": 7, "PM": 3, "QC": 2, "Multimedia": 3, "OP": 3 },
  "byAssignee": { "CongNN": 3, "HuongBP": 3, ... },
  "epicCount": 3,
  "version": 5
}
```

---

## Settings (shared, không thuộc project)

### GET /api/settings
```json
// Response 200
{ "members": {}, "teamColors": {} }
```

### PUT /api/settings
```json
// Request
{ "data": { "members": {...}, "teamColors": {...} } }

// Response 200
{ "ok": true }
```

---

## Error Responses

Tất cả lỗi trả về format:
```json
{ "error": "Mô tả lỗi" }
```

| HTTP Code | Ý nghĩa |
|-----------|---------|
| 400 | Bad request (thiếu field bắt buộc, giá trị không hợp lệ) |
| 401 | Chưa login hoặc token hết hạn |
| 404 | Project/Task/Epic không tồn tại |
| 409 | Version conflict (cần reload data rồi thử lại) |
| 500 | Server error |

---

## Ví dụ flow cho bot

```bash
# 1. Login
TOKEN=$(curl -s -X POST /api/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 2. List projects
curl -s /api/projects -H "Authorization: Bearer $TOKEN"

# 3. Xem summary project 1
curl -s /api/project/1/summary -H "Authorization: Bearer $TOKEN"

# 4. Lấy tasks đang In Progress của team Dev
curl -s "/api/project/1/tasks?status=In%20Progress&team=Dev" -H "Authorization: Bearer $TOKEN"

# 5. Cập nhật status task 30 sang Done
curl -s -X PATCH /api/project/1/tasks/30/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Done"}'

# 6. Tạo task mới
curl -s -X POST /api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"epicId":2,"name":"Hotfix login bug","team":"Dev","assignee":"CongNN","priority":"High","status":"To Do","start":"10/03/2026","end":"11/03/2026"}'
```
