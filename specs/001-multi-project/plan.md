# Implementation Plan: Multi-Project Management for V2

**Branch**: `001-multi-project` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-project/spec.md`

## Summary

Thêm tính năng quản lý đa dự án cho v2, cho phép tạo/chuyển/sửa/xóa dự án và shared settings (members, teamColors). Cần mở rộng v2/server.js với các API endpoint mới (projects CRUD, per-project data, shared settings) và cập nhật v2/index.html để thêm project selector dropdown + Admin panel tab quản lý dự án. Tham chiếu từ v1 đã có đầy đủ tính năng này.

## Technical Context

**Language/Version**: JavaScript (Node.js 18+), React 18 via CDN + Babel standalone
**Primary Dependencies**: Express.js, pg (node-postgres), bcryptjs, jsonwebtoken, ExcelJS (CDN)
**Storage**: PostgreSQL 16 on VPS (76.13.213.204), DB: `poker_texas`, JSONB blob in `projects.data`
**Testing**: Manual testing via browser + curl for API endpoints
**Target Platform**: Web browser (desktop), Node.js server on Linux VPS
**Project Type**: Single-page web application (SPA) with REST API backend
**Performance Goals**: Project switch < 2s, API response < 500ms
**Constraints**: No build step, single index.html file, JSON blob storage (no normalization), deploy via SCP
**Scale/Scope**: 10+ dự án, 1-5 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clear Project Structure | PASS | Changes stay within v2/ directory (server.js + index.html) |
| II. Clean Code | PASS | New API routes follow RESTful conventions, frontend follows v1 patterns |
| III. Modular Testing | PASS | API endpoints testable via curl, seed.js updated for new schema |
| IV. Extensibility First | PASS | Additive changes - new API routes, new DB table (settings), extend existing projects table |

**Technical Constraints Check**:
- No build step: PASS (CDN React + Babel)
- Single-file frontend: PASS (all in v2/index.html)
- JSON blob storage: PASS (projects.data remains JSONB)
- Deploy via SCP: PASS
- Minimal dependencies: PASS (no new npm packages needed)

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-project/
├── plan.md              # This file
├── research.md          # Phase 0: Technical decisions
├── data-model.md        # Phase 1: Entity definitions
├── quickstart.md        # Phase 1: Integration scenarios
├── contracts/           # Phase 1: API contracts
│   └── api.md           # REST API endpoint specs
└── tasks.md             # Phase 2: Task breakdown
```

### Source Code (repository root)

```text
v2/
├── index.html           # Single-file SPA (React 18 + Babel CDN)
├── server.js            # Express API server (extend with new routes)
├── seed.js              # DB schema + seed data (add settings table)
├── package.json         # Node.js dependencies
├── .env                 # Environment variables
└── data/
    └── initial-tasks.json  # Seed data for default project
```

**Structure Decision**: Giữ nguyên cấu trúc v2 hiện tại. Chỉ mở rộng server.js (thêm API routes) và index.html (thêm UI components). Thêm bảng `settings` trong PostgreSQL qua seed.js.

## Key Implementation Decisions

### 1. Database Schema Changes

**Giữ nguyên bảng `projects`** (đã có id, name, data, version, updated_by, updated_at, is_default).

**Thêm bảng `settings`** để lưu shared data (members, teamColors):
```sql
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. API Design (mô phỏng từ v1)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects` | Liệt kê tất cả dự án |
| POST | `/api/projects` | Tạo dự án mới |
| PUT | `/api/projects/:id` | Sửa tên hoặc is_default |
| DELETE | `/api/projects/:id` | Xóa dự án |
| GET | `/api/project/:id` | Load data dự án cụ thể |
| PUT | `/api/project/:id` | Save data dự án (với version check) |
| GET | `/api/project/:id/version` | Check version cho polling |
| GET | `/api/settings` | Load shared settings |
| PUT | `/api/settings` | Save shared settings |

**Giữ lại** `/api/login` (không đổi), `/api/data` và `/api/version` (backward compat, redirect to default project).

### 3. Frontend Changes

- **Header**: Thêm `<select>` dropdown project selector (giống v1 line 1071-1076)
- **State**: Thêm `projects`, `currentProjectId`, `currentProjectName`, `projectsLoaded`
- **Init**: Khi login → load projects list + settings + default project data
- **Switch**: `switchProject(id)` → reset version, load project data, skip first save
- **Auto-save**: Per-project save (tasks, phaseColors) + shared settings save (members, teamColors)
- **localStorage**: Cache per project với key `ptb_p{id}`
- **Version polling**: Poll `/api/project/{id}/version` cho project đang active
- **AdminModal**: Thêm tab "Dự án" với CRUD projects (giống v1 lines 1668-1873)

### 4. Data Flow

```
Login → apiLoadProjects() → apiLoadSettings() → apiLoad(defaultProjectId)
         ↓                    ↓                    ↓
    setProjects()        setMembers()          setTasks()
                         setTeamColors()        setPhaseColors()

Switch → apiLoad(newProjectId) → setTasks() + setPhaseColors()

Save tasks → lsSave(data, projectId) + apiSave(data, projectId) [debounced 1s]
Save settings → apiSaveSettings(data) [debounced 1s, separate timer]
```

## Complexity Tracking

No constitution violations. All changes are additive and within existing constraints.
