# Data Model: Unified Task Management

## Entities

### Project (bảng `projects` — không đổi schema)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(200) | NOT NULL | Tên dự án |
| data | JSONB | NOT NULL | Chứa `{tasks, version, savedAt}` |
| version | INTEGER | NOT NULL, DEFAULT 1 | Version cho conflict detection |
| updated_by | VARCHAR(50) | | Username người cập nhật cuối |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật cuối |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |
| is_default | BOOLEAN | DEFAULT FALSE | Dự án mặc định |

### project.data JSONB structure (CHANGED)

```json
{
  "tasks": [Task, ...],
  "meetings": [Meeting, ...],
  "version": 1,
  "savedAt": "ISO date"
}
```

**Removed**: `phaseColors` (không còn phase concept)
**Added**: `meetings` array (meeting minutes per project)

### Task (unified — thay thế Epic, SummaryTask, và leaf Task)

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
  "children": []
}
```

| Field | Type | Required | Leaf Task | Parent Task | Description |
|-------|------|----------|-----------|-------------|-------------|
| id | number | ✅ | ✅ | ✅ | Unique ID (global sequence) |
| name | string | ✅ | ✅ editable | ✅ editable | Tên task |
| team | string | | ✅ editable | ❌ (derived) | Team: PM, Design, Art, Dev, etc. |
| assignee | string | | ✅ editable | ❌ (derived) | Người thực hiện |
| priority | string | | ✅ editable | ❌ (derived) | "High" \| "Normal" \| "Low" |
| status | string | | ✅ editable | ❌ (derived) | "Not Started" \| "In Progress" \| "Completed" \| "On Hold" |
| start | string | | ✅ editable | ❌ auto-computed | DD/MM/YYYY |
| end | string | | ✅ editable | ❌ auto-computed | DD/MM/YYYY |
| pct | number | | ✅ editable (0-100) | ❌ auto-computed | % hoàn thành |
| deps | Dep[] | | ✅ editable | ✅ editable | Dependencies |
| notes | string | | ✅ editable | ✅ editable | Ghi chú |
| expanded | boolean | | ignored | ✅ editable | UI expand/collapse state |
| children | Task[] | | `[]` hoặc omit | ✅ | Mảng task con |

**Rule**: `children.length > 0` → parent task (auto-computed fields). `children` rỗng hoặc không có → leaf task.

### Dependency Object (NEW format)

```json
{"id": 15, "type": "FS", "lag": 0}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | ✅ | ID của task phụ thuộc |
| type | string | | "FS" (default), "SS", "FF", "SF" |
| lag | number | | Số ngày lag (+) hoặc lead (-), default 0 |

**Backward compat**: Nếu `deps` chứa number thay vì object, coi như `{id: number, type: "FS", lag: 0}`.

### Auto-Computed Fields cho Parent Task

| Field | Computation | Description |
|-------|-------------|-------------|
| start | `min(children.start)` | Ngày bắt đầu sớm nhất |
| end | `max(children.end)` | Ngày kết thúc muộn nhất |
| duration | `workingDays(start, end)` | Số ngày làm việc (computed on render) |
| pct | `Σ(child.pct × child.duration) / Σ(child.duration)` | Weighted average |

### Computed Fields (on render, không lưu)

| Field | Computation | All Tasks |
|-------|-------------|-----------|
| `_wbs` | `"{parentIndex}.{childIndex}"` | WBS code: 1, 1.1, 1.1.2 |
| `_level` | Depth in tree (0-based) | Indent level |
| `_isParent` | `children && children.length > 0` | Boolean, for rendering logic |

---

### Ví dụ cấu trúc mới (unified)

```json
{
  "tasks": [
    {
      "id": 1, "name": "Pre-production", "expanded": true,
      "children": [
        {"id": 10, "name": "GDD", "team": "PM", "assignee": "ToanNM", "priority": "High", "status": "Not Started", "start": "03/03/2026", "end": "06/03/2026", "pct": 0, "deps": [], "notes": ""},
        {
          "id": 100, "name": "UI/UX Design", "expanded": true,
          "children": [
            {"id": 101, "name": "Wireframe Lobby", "team": "Design", "assignee": "LocPT", "start": "04/03/2026", "end": "09/03/2026", "pct": 50, "deps": [{"id": 10, "type": "FS", "lag": 0}]},
            {"id": 102, "name": "Wireframe Gameplay", "team": "Design", "assignee": "QuynhNH", "start": "04/03/2026", "end": "09/03/2026", "pct": 30, "deps": [{"id": 10, "type": "FS", "lag": 0}]}
          ]
        },
        {"id": 15, "name": "Tech Architecture", "team": "Dev", "assignee": "CongNN", "start": "04/03/2026", "end": "09/03/2026", "pct": 0, "deps": [{"id": 10, "type": "FS", "lag": 0}]}
      ]
    },
    {
      "id": 2, "name": "Production", "expanded": true,
      "children": [
        {"id": 20, "name": "Card Design", "team": "Art", "assignee": "HoaGTT", "start": "18/03/2026", "end": "27/03/2026", "pct": 0, "deps": [{"id": 14, "type": "FS", "lag": 0}]}
      ]
    }
  ]
}
```

WBS codes:
- `1` → Pre-production (parent, auto-computed)
- `1.1` → GDD (leaf)
- `1.2` → UI/UX Design (parent, auto-computed)
- `1.2.1` → Wireframe Lobby (leaf)
- `1.2.2` → Wireframe Gameplay (leaf)
- `1.3` → Tech Architecture (leaf)
- `2` → Production (parent, auto-computed)
- `2.1` → Card Design (leaf)

---

### Data Migration: Old → New

| Old Field | Action | New Equivalent |
|-----------|--------|----------------|
| `type: 'epic'` | REMOVE | Parent task (has children) |
| `isEpic: true` | REMOVE | Parent task (has children) |
| `isSummary: true` | REMOVE | Parent task (has children) |
| `phase: "..."` | REMOVE | (task name serves as group name) |
| `phaseColors: {...}` | REMOVE from project.data | N/A |
| `deps: [10, 15]` | CONVERT | `deps: [{id:10,type:"FS",lag:0}, {id:15,type:"FS",lag:0}]` |
| `status: "To Do"` | CONVERT | `status: "Not Started"` |
| `status: "Done"` | CONVERT | `status: "Completed"` |
| `status: "Blocked"` | CONVERT | `status: "On Hold"` |
| `status: "Review"` | CONVERT | `status: "In Progress"` |
| `priority: "Medium"` | CONVERT | `priority: "Normal"` |

---

### Meeting (NEW — trong project.data.meetings[])

```json
{
  "id": 1,
  "title": "Sprint Review - Week 10",
  "date": "10/03/2026",
  "content": "Reviewed @CongNN card engine. @HuongBP reported betting 70% done.\n\nDecisions:\n- Postpone AI bot to sprint 4\n\nAction items:\n- @ToanNM update timeline by 12/03",
  "attendees": ["ToanNM", "CongNN", "HuongBP"],
  "createdBy": "admin",
  "createdAt": "2026-03-10T07:00:00.000Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | number | Yes | Unique ID trong project (auto-increment) |
| title | string | Yes | Tiêu đề cuộc họp |
| date | string | Yes | Ngày họp DD/MM/YYYY (match task date format) |
| content | string | Yes | Nội dung biên bản, hỗ trợ `@MemberName` mentions |
| attendees | string[] | No | Array tên thành viên tham dự (reference từ shared members) |
| createdBy | string | No | Username người tạo (từ JWT) |
| createdAt | string | No | ISO 8601 timestamp |

**@Mention convention**:
- Trong `content`, text dạng `@MemberName` được coi là mention
- Khi hiển thị: parse regex `/@(\w+)/g` → highlight nếu name tồn tại trong members list
- Khi lưu: giữ nguyên plain text, không transform

**ID generation**: `Math.max(...meetings.map(m => m.id), 0) + 1` (giống pattern collectAllIds cho tasks)

---

### Settings (bảng `settings` — không đổi)

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL | Luôn chỉ có 1 row |
| data | JSONB | `{members, teamColors}` |
| updated_at | TIMESTAMPTZ | |

### User (bảng `users` — không đổi)

| Field | Type | Description |
|-------|------|-------------|
| id | SERIAL | |
| username | VARCHAR(50) | UNIQUE |
| password_hash | VARCHAR(255) | Bcrypt |
| display_name | VARCHAR(100) | |
| created_at | TIMESTAMPTZ | |

## Relationships

```
User (1) ──updates──> (N) Project
User (1) ──updates──> (1) Settings
Settings (1) ──shared across──> (N) Project

Project.data.tasks hierarchy (unified):
  Task (root-level parent)
    ├── Task (leaf)
    ├── Task (parent)
    │   ├── Task (leaf)
    │   ├── Task (parent, nested)
    │   │   └── Task (leaf)
    │   └── Task (leaf)
    └── Task (leaf)

Project.data.meetings (flat list):
  Meeting ──@mentions──> Member (from Settings)
  Meeting.attendees[] ──references──> Member.name (from Settings)
```

## State Transitions

### Task Status Flow
```
Not Started → In Progress → Completed
     ↕             ↕
  On Hold       On Hold
```

### Parent Task Lifecycle
```
Created (children:[]) → Indent child into it → Auto-compute active → All children completed → pct=100
```
Note: Empty parent task (children:[]) behaves as leaf until children added.
