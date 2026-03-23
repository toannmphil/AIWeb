# Poker Plan v2 - API Specification (Unified Task Model)

Base URL: `https://hoaivanapt.online`

## Authentication

Tất cả endpoint (trừ `/api/login`) yêu cầu header:
```
Authorization: Bearer <token>
```

### POST /api/login
Đăng nhập lấy token (JWT, hạn 30 ngày).
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
Tạo project mới (data khởi tạo: `{ tasks: [] }`).
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
    "teamColors": {...}
  },
  "version": 5
}
```

### PUT /api/project/:id
Lưu toàn bộ data (có version check chống conflict).
```json
// Request
{ "data": { "tasks": [...], "members": [...], "teamColors": {...} }, "version": 5 }

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

## Tasks — Unified Task Model

### Task Object

Tất cả đều là **Task**. Task có `children.length > 0` được coi là **parent task** (auto-computed fields). Không còn epic, summary, phase.

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
  "deps": [{ "id": 15, "type": "FS", "lag": 0 }],
  "notes": "Ghi chu",
  "children": [],
  "expanded": true
}
```

**Field details:**

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | number | ID duy nhất trong project |
| `name` | string | Tên task |
| `team` | string | Team phụ trách |
| `assignee` | string | Người thực hiện |
| `priority` | string | `"High"` \| `"Normal"` \| `"Low"` |
| `status` | string | `"Not Started"` \| `"In Progress"` \| `"Completed"` \| `"On Hold"` |
| `start` | string | Ngày bắt đầu (DD/MM/YYYY) |
| `end` | string | Ngày kết thúc (DD/MM/YYYY) |
| `pct` | number | Tiến độ 0-100 |
| `deps` | array | Dependency objects (xem bên dưới) |
| `notes` | string | Ghi chú |
| `children` | array | Danh sách task con (mảng rỗng = leaf task) |
| `expanded` | boolean | Trạng thái mở/đóng (cho parent task) |

**Dependency object:**

```json
{ "id": 15, "type": "FS", "lag": 0 }
```

| Field | Type | Mô tả |
|-------|------|-------|
| `id` | number | ID task phụ thuộc |
| `type` | string | `"FS"` (Finish-Start) \| `"SS"` (Start-Start) \| `"FF"` (Finish-Finish) \| `"SF"` (Start-Finish) |
| `lag` | number | Số ngày trễ (có thể âm) |

**Parent task rules:**
- Task có `children.length > 0` là parent task
- Parent task tự động tính: `start` = min(leaves.start), `end` = max(leaves.end), `pct` = weighted avg theo duration
- Không thể edit trực tiếp các computed fields (`team`, `assignee`, `priority`, `status`, `start`, `end`, `pct`) trên parent task
- Chỉ edit được: `name`, `notes`, `deps`, `expanded` trên parent task

**Flat response format** (khi GET /tasks trả flat list):

```json
{
  "id": 10,
  "name": "Game Design Document",
  "parentId": 1,
  "parentName": "Pre-production",
  ...
}
```

Khi trả flat list, mỗi task có thêm `parentId` và `parentName` (null nếu top-level). Field `children` bị loại bỏ.

### GET /api/project/:id/tasks
Danh sách tasks (flat). Hỗ trợ filter qua query params.

| Query Param | Ví dụ | Mô tả |
|-------------|-------|-------|
| `status` | `?status=In Progress` | Lọc theo trạng thái |
| `team` | `?team=Dev` | Lọc theo team |
| `assignee` | `?assignee=CongNN` | Lọc theo người được giao |
| `priority` | `?priority=High` | Lọc theo độ ưu tiên |
| `parentId` | `?parentId=1` hoặc `?parentId=null` | Lọc theo task cha (null = top-level) |
| `leaf` | `?leaf=true` hoặc `?leaf=false` | Chỉ leaf tasks hoặc chỉ parent tasks |

```json
// GET /api/project/1/tasks?status=Not Started&team=Dev

// Response 200
{
  "tasks": [
    {
      "id": 30, "name": "Core Engine - Card Logic", "team": "Dev", "assignee": "CongNN",
      "priority": "High", "status": "Not Started", "start": "18/03/2026", "end": "27/03/2026",
      "pct": 0, "deps": [{"id":15,"type":"FS","lag":0}], "notes": "Card engine",
      "parentId": 2, "parentName": "Production"
    }
  ],
  "total": 1,
  "version": 5
}
```

### GET /api/project/:id/tasks/:taskId
Lấy 1 task theo ID (giữ nguyên cấu trúc tree với children).
```json
// Response 200
{
  "task": {
    "id": 30, "name": "Core Engine - Card Logic", "team": "Dev",
    "parentId": 2, "parentName": "Production", ...
  },
  "version": 5
}
```

### POST /api/project/:id/tasks
Tạo task mới. `parentId = null` hoặc bỏ trống → task top-level. `parentId = <id>` → task con.

Bất kỳ task nào cũng có thể là parent — khi thêm task con vào task đang là leaf, nó tự trở thành parent.

```json
// Request — tạo task con của task 2
{
  "parentId": 2,
  "name": "New Feature",
  "team": "Dev",
  "assignee": "CongNN",
  "priority": "High",
  "status": "Not Started",
  "start": "10/03/2026",
  "end": "15/03/2026",
  "pct": 0,
  "deps": [{"id": 30, "type": "FS", "lag": 0}],
  "notes": "Mo ta"
}

// Response 201
{
  "task": { "id": 58, "name": "New Feature", "children": [], ... },
  "version": 6
}
```

```json
// Request — tạo task top-level
{
  "name": "Post-launch Support",
  "team": "PM"
}

// Response 201
{
  "task": { "id": 59, "name": "Post-launch Support", "children": [], ... },
  "version": 6
}
```

### PUT /api/project/:id/tasks/:taskId
Cập nhật task (partial update).

**Leaf task**: cho phép `name`, `team`, `assignee`, `priority`, `status`, `start`, `end`, `pct`, `deps`, `notes`.
**Parent task**: chỉ cho phép `name`, `notes`, `deps`, `expanded`. Các fields khác là computed → trả 400 nếu cố edit.

```json
// Request leaf task
{ "assignee": "HuongBP", "priority": "Normal", "notes": "Ghi chu moi" }

// Request parent task
{ "name": "UI/UX Development", "expanded": false }

// Response 200
{ "task": { ... }, "version": 6 }

// Response 400 (edit computed field trên parent)
{ "error": "Cannot edit computed fields on parent task" }
```

### PATCH /api/project/:id/tasks/:taskId/status
Cập nhật nhanh trạng thái. Set `Completed` sẽ tự động pct=100.

**Không dùng được cho parent task** (trả 400).
```json
// Request
{ "status": "In Progress", "pct": 30 }

// Response 200
{ "task": { "id": 30, "status": "In Progress", "pct": 30, ... }, "version": 6 }

// Response 400 (nếu là parent task)
{ "error": "Cannot set status on parent task" }
```

Giá trị `status` hợp lệ: `Not Started`, `In Progress`, `Completed`, `On Hold`

### DELETE /api/project/:id/tasks/:taskId
Xoá task. Xoá parent task sẽ xoá tất cả children đệ quy.
```json
// Response 200
{ "ok": true, "version": 6 }
```

---

## Task Operations

### POST /api/project/:id/tasks/:taskId/indent
Indent task — biến thành con của sibling phía trên (previous sibling trở thành parent).

```json
// Response 200
{ "task": { "id": 30, "parentId": 29, ... }, "version": 6 }

// Response 400 (không có sibling phía trên)
{ "error": "Cannot indent: no sibling above" }
```

### POST /api/project/:id/tasks/:taskId/outdent
Outdent task — đưa lên cùng cấp với parent hiện tại (chèn sau parent trong siblings của grandparent).

```json
// Response 200
{ "task": { "id": 30, "parentId": null, ... }, "version": 6 }

// Response 400 (đã ở top-level)
{ "error": "Cannot outdent: already at top level" }
```

### POST /api/project/:id/tasks/:taskId/move
Di chuyển/reparent task — đổi task cha. Bất kỳ task nào cũng có thể đổi parent.

```json
// Request — chuyển thành con của task 5
{ "parentId": 5 }

// Request — chuyển lên top-level
{ "parentId": null }

// Response 200
{ "task": { ... }, "parentId": 5, "version": 6 }

// Response 200 (đã đúng vị trí)
{ "task": { ... }, "message": "Already under this parent", "version": 5 }

// Response 400 (tự vào chính mình)
{ "error": "Cannot move task into itself" }

// Response 400 (vào con cháu → circular)
{ "error": "Cannot move task into its own descendant" }

// Response 404 (parent không tồn tại)
{ "error": "Target parent not found" }
```

---

## Migration

### POST /api/migrate
Chạy migration toàn bộ projects: chuyển từ format cũ (epic/summary/phase) sang unified task model.

Thực hiện:
- Xoá `type`, `isEpic`, `isSummary`, `phase` khỏi task
- Xoá `phaseColors` khỏi project data
- Convert deps từ `[number]` sang `[{id, type:"FS", lag:0}]`
- Convert status: `To Do → Not Started`, `Review → In Progress`, `Done → Completed`, `Blocked → On Hold`
- Convert priority: `Medium → Normal`
- Bump version

```json
// Response 200
{ "ok": true, "migratedProjects": 3, "totalTasksMigrated": 66 }
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
    { "name": "CongNN", "team": "Dev" }
  ],
  "teamColors": {
    "PM": "#34495e",
    "Dev": "#2980b9",
    "Design": "#e67e22"
  }
}
```

---

## Summary

### GET /api/project/:id/summary
Thống kê tổng quan project (chỉ tính leaf tasks cho stats).
```json
// Response 200
{
  "totalTasks": 45,
  "totalLeafTasks": 38,
  "totalParentTasks": 7,
  "avgProgress": 12,
  "byStatus": { "Not Started": 30, "In Progress": 5, "Completed": 3 },
  "byTeam": { "Dev": 12, "Art": 6, "Design": 7, "PM": 3, "QC": 2, "Multimedia": 3, "OP": 3 },
  "byAssignee": { "CongNN": 3, "HuongBP": 3 },
  "maxDepth": 3,
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

## Legacy Compatibility

Các endpoint cũ vẫn hoạt động, tự động dùng default project.

| Endpoint | Tương đương |
|----------|-------------|
| `GET /api/data` | `GET /api/project/:defaultId` |
| `POST /api/data` | `PUT /api/project/:defaultId` |
| `GET /api/version` | `GET /api/project/:defaultId/version` |

---

## Error Responses

Tất cả lỗi trả về format:
```json
{ "error": "Mô tả lỗi" }
```

| HTTP Code | Ý nghĩa |
|-----------|---------|
| 400 | Bad request (thiếu field bắt buộc, giá trị không hợp lệ, edit computed fields trên parent) |
| 401 | Chưa login hoặc token hết hạn |
| 404 | Project/Task không tồn tại |
| 409 | Version conflict (cần reload data rồi thử lại) |
| 500 | Server error |

---

## Ví dụ flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST https://hoaivanapt.online/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

# 2. List projects
curl -s https://hoaivanapt.online/api/projects -H "Authorization: Bearer $TOKEN"

# 3. Xem summary project 1
curl -s https://hoaivanapt.online/api/project/1/summary -H "Authorization: Bearer $TOKEN"

# 4. Lấy tasks đang In Progress của team Dev
curl -s "https://hoaivanapt.online/api/project/1/tasks?status=In%20Progress&team=Dev" \
  -H "Authorization: Bearer $TOKEN"

# 5. Chỉ lấy leaf tasks
curl -s "https://hoaivanapt.online/api/project/1/tasks?leaf=true" \
  -H "Authorization: Bearer $TOKEN"

# 6. Cập nhật status task 30 sang Completed
curl -s -X PATCH https://hoaivanapt.online/api/project/1/tasks/30/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"Completed"}'

# 7. Tạo task top-level
curl -s -X POST https://hoaivanapt.online/api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Post-launch","team":"PM"}'

# 8. Tạo task con
curl -s -X POST https://hoaivanapt.online/api/project/1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId":2,"name":"Hotfix login bug","team":"Dev","assignee":"CongNN","priority":"High","status":"Not Started"}'

# 9. Indent task (biến thành con của sibling trên)
curl -s -X POST https://hoaivanapt.online/api/project/1/tasks/30/indent \
  -H "Authorization: Bearer $TOKEN"

# 10. Outdent task (đưa lên cùng cấp với parent)
curl -s -X POST https://hoaivanapt.online/api/project/1/tasks/30/outdent \
  -H "Authorization: Bearer $TOKEN"

# 11. Move/reparent task (đổi parent)
curl -s -X POST https://hoaivanapt.online/api/project/1/tasks/30/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId":1}'

# 12. Move lên top-level
curl -s -X POST https://hoaivanapt.online/api/project/1/tasks/30/move \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentId":null}'

# 13. Chạy migration (từ format cũ sang unified)
curl -s -X POST https://hoaivanapt.online/api/migrate \
  -H "Authorization: Bearer $TOKEN"
```
