# Data Model: Multi-Project Management

## Entities

### Project (bảng `projects` - đã tồn tại)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| name | VARCHAR(200) | NOT NULL, DEFAULT 'Poker Texas Build Plan' | Tên dự án |
| data | JSONB | NOT NULL | Chứa {tasks, phaseColors, version, savedAt} |
| version | INTEGER | NOT NULL, DEFAULT 1 | Version number cho conflict detection |
| updated_by | VARCHAR(50) | | Username người cập nhật cuối |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật cuối |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |
| is_default | BOOLEAN | DEFAULT FALSE | Dự án mặc định load khi đăng nhập |

**project.data JSONB structure**:
```json
{
  "tasks": [
    {
      "id": "T001",
      "name": "Task name",
      "type": "epic|task",
      "phase": "Phase name",
      "priority": "Critical|High|Medium|Low",
      "status": "Not Started|In Progress|Done|Blocked",
      "team": "Team name",
      "assignee": "Member name",
      "start": "DD/MM/YYYY",
      "duration": 5,
      "end": "DD/MM/YYYY",
      "pct": 0,
      "deps": ["T002"],
      "children": [],
      "expanded": true
    }
  ],
  "phaseColors": {
    "Phase name": "#hex"
  },
  "version": 1,
  "savedAt": "ISO date"
}
```

### Settings (bảng `settings` - MỚI)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Luôn chỉ có 1 row (id=1) |
| data | JSONB | NOT NULL, DEFAULT '{}' | Chứa {members, teamColors} |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm cập nhật cuối |

**settings.data JSONB structure**:
```json
{
  "members": {
    "Team A": ["Member 1", "Member 2"],
    "Team B": ["Member 3"]
  },
  "teamColors": {
    "Team A": "#3b82f6",
    "Team B": "#10b981"
  }
}
```

### User (bảng `users` - đã tồn tại, không đổi)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Auto-increment ID |
| username | VARCHAR(50) | UNIQUE, NOT NULL | Tên đăng nhập |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt hash |
| display_name | VARCHAR(100) | | Tên hiển thị |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Thời điểm tạo |

## Relationships

```
User (1) ──updates──> (N) Project
User (1) ──updates──> (1) Settings
Settings (1) ──shared across──> (N) Project
```

- Một User có thể tạo/sửa nhiều Project
- Settings là singleton (1 row), chia sẻ cho tất cả Project
- Project.data chứa tasks và phaseColors (per-project)
- Settings.data chứa members và teamColors (shared)
