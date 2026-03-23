# Product Requirements Document (PRD)
## Poker Texas Build Plan v2

**Version:** 2.0
**Ngày tạo:** 15/03/2026
**Tác giả:** ToanNM

---

## 1. Tổng quan sản phẩm

**Poker Texas Build Plan** là ứng dụng web quản lý dự án nội bộ, được thiết kế chuyên biệt cho quy trình phát triển game Poker Texas. Ứng dụng cung cấp giao diện quản lý task dạng Gantt chart, Kanban board, và biên bản họp — tất cả trong một single-page application (SPA) không cần build step.

### 1.1 Mục tiêu
- Quản lý tiến độ dự án game theo từng sprint/tuần
- Phân công task theo team và thành viên
- Theo dõi dependencies giữa các task
- Hỗ trợ đa dự án (multi-project) trên cùng hệ thống
- Lưu biên bản họp gắn với từng dự án

### 1.2 Đối tượng sử dụng
- Project Manager (PM)
- Team Lead các nhóm: Design, Art, Dev, QC, Multimedia, OP
- Thành viên dự án cần theo dõi tiến độ

---

## 2. Kiến trúc hệ thống

### 2.1 Frontend
- **Framework:** React 18 via CDN + Babel standalone (không build step)
- **Cấu trúc:** Single file `index.html` (~2100 dòng)
- **Styling:** Inline CSS trong `<style>` tag, dark theme mặc định
- **Thư viện bên ngoài:**
  - ExcelJS 4.4.0 (CDN) — export Excel
  - SheetJS/xlsx 0.18.5 (CDN) — import Excel

### 2.2 Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Port:** 3001
- **Authentication:** JWT (30 ngày expiry) + bcryptjs password hashing
- **Thư viện:** pg (node-postgres), bcryptjs, jsonwebtoken, dotenv

### 2.3 Database
- **DBMS:** PostgreSQL 16
- **Host:** VPS Hostinger (76.13.213.204)
- **Database name:** `poker_texas`
- **Mô hình dữ liệu:** JSONB blob trong cột `projects.data` (KHÔNG normalized)

### 2.4 Infrastructure
- **VPS:** Hostinger (76.13.213.204)
- **Process manager:** PM2
- **App name:** `poker-plan`
- **Deploy:** SCP/SSH pipe file lên VPS

### 2.5 Bảng cơ sở dữ liệu

| Bảng | Mục đích |
|------|----------|
| `users` | Tài khoản đăng nhập (username, password_hash) |
| `projects` | Danh sách dự án (name, data JSONB, version, is_default, updated_by, updated_at) |
| `settings` | Cài đặt chung chia sẻ (members, teamColors) — 1 record duy nhất |

---

## 3. Tính năng chi tiết

### 3.1 Xác thực (Authentication)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| AUTH-01 | Đăng nhập | Form đăng nhập username/password, trả về JWT token |
| AUTH-02 | Lưu phiên | Token lưu localStorage, tự động gửi qua Authorization header |
| AUTH-03 | Đăng xuất | Xóa token khỏi localStorage, hiện lại form đăng nhập |
| AUTH-04 | Bảo vệ API | Mọi API endpoint (trừ login) yêu cầu Bearer token hợp lệ |

### 3.2 Quản lý đa dự án (Multi-Project)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| PROJ-01 | Danh sách dự án | Dropdown chọn dự án trên header |
| PROJ-02 | Tạo dự án | Tạo dự án mới với tên, data rỗng (tasks=[], meetings=[]) |
| PROJ-03 | Sửa tên dự án | Đổi tên dự án, inline edit trong Admin modal |
| PROJ-04 | Đặt dự án mặc định | Radio button chọn dự án mặc định khi đăng nhập |
| PROJ-05 | Xóa dự án | Xóa dự án và toàn bộ data, có confirm dialog. Không cho xóa dự án duy nhất |
| PROJ-06 | Chuyển dự án | Switch dự án, load data mới từ server, hiện loading overlay |

### 3.3 Quản lý Task

#### 3.3.1 Mô hình dữ liệu Task (Unified Task Model)

Mỗi task là một object JSON với cấu trúc thống nhất — bất kỳ task nào cũng có thể có `children` (trở thành parent task):

```json
{
  "id": 10,
  "name": "Game Design Document",
  "team": "PM",
  "assignee": "ToanNM",
  "priority": "High",         // High | Normal | Low
  "status": "Not Started",    // Not Started | In Progress | Completed | On Hold
  "start": "03/03/2026",      // DD/MM/YYYY
  "end": "06/03/2026",
  "pct": 0,                   // 0-100
  "deps": [{"id": 5, "type": "FS", "lag": 0}],
  "notes": "Mô tả task",
  "children": [],
  "expanded": true             // UI state cho parent tasks
}
```

**Quy tắc Parent Task:**
- Task có `children.length > 0` tự động trở thành parent task
- Parent task: `start`, `end`, `pct` được tính tự động từ children
- Parent task chỉ cho phép sửa: `name`, `notes`, `deps`, `expanded`
- Các trường `team`, `assignee`, `priority`, `status`, `start`, `end`, `pct` bị khóa (computed)

#### 3.3.2 CRUD Task

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| TASK-01 | Tạo task | Modal form: name, team, assignee, priority, start, end, duration, deps, notes. Hỗ trợ tạo dưới parent (parentId) |
| TASK-02 | Xem task | Click task row → Detail panel slide-in từ phải (380px) |
| TASK-03 | Sửa task | Inline edit trong detail panel, nhấn "Update" để lưu |
| TASK-04 | Xóa task | Confirm dialog. Xóa parent → xóa tất cả children. Tự động clean deps referencing |
| TASK-05 | Thêm task con | Button "+ Thêm task con" trong detail panel → mở Add Task modal với parentId |

#### 3.3.3 Tổ chức Task (Hierarchy)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| HIER-01 | Indent task | Đưa task thành con của task liền trên (sibling above) |
| HIER-02 | Outdent task | Đưa task lên cấp cha, siblings phía sau trở thành children |
| HIER-03 | Di chuyển task (Reparent) | Dropdown "Task cha" trong detail panel, chọn parent mới hoặc top-level |
| HIER-04 | Expand/Collapse | Click ▶/▼ trên parent task để ẩn/hiện children |
| HIER-05 | WBS numbering | Tự động đánh số WBS (1, 1.1, 1.2, 2, 2.1, ...) |
| HIER-06 | Không giới hạn depth | Task lồng nhau không giới hạn cấp (unlimited nesting) |
| HIER-07 | Kiểm tra circular | Không cho move task vào descendant của chính nó |

#### 3.3.4 Dependencies

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| DEP-01 | Dependency types | 4 loại: FS (Finish-Start), SS (Start-Start), FF (Finish-Finish), SF (Start-Finish) |
| DEP-02 | Lag | Số ngày delay sau dependency (có thể = 0) |
| DEP-03 | Thêm/xóa dependency | Dropdown chọn task, hiện danh sách deps hiện tại có thể xóa |
| DEP-04 | Auto-date khi thêm dep | Tự động điều chỉnh start date khi thêm dependency mới |
| DEP-05 | Auto-schedule | Tự động reschedule toàn bộ task tree khi thay đổi dates/deps |

#### 3.3.5 Lọc và tìm kiếm

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| FILTER-01 | Lọc theo Team | Dropdown filter trên toolbar |
| FILTER-02 | Lọc theo Status | Dropdown filter trên toolbar |
| FILTER-03 | Tìm kiếm | Search box: tìm theo task name hoặc assignee name |
| FILTER-04 | Critical Path | Checkbox toggle: highlight task nằm trên critical path (longest path) |
| FILTER-05 | Stats bar | Hiện số lượng: total, in progress, completed, on hold |

### 3.4 Chế độ xem (Views)

#### 3.4.1 Gantt View (mặc định)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| GANTT-01 | Split panel | Trái: Task list (480px). Phải: Gantt timeline |
| GANTT-02 | Gantt bar | Thanh ngang thể hiện thời gian task, màu theo team |
| GANTT-03 | Parent bar | Thanh mỏng hơn (6px), màu xám, viền trái/phải |
| GANTT-04 | Progress bar | Overlay trắng bên trong thanh, width = % hoàn thành |
| GANTT-05 | Today highlight | Cột tuần hiện tại có background khác |
| GANTT-06 | Sync scroll | Task list và Gantt body scroll đồng bộ vertical |
| GANTT-07 | Critical path highlight | Border đỏ quanh thanh Gantt của task trên critical path |
| GANTT-08 | Cấu hình thời gian | PROJECT_START = 03/03/2026, NUM_WEEKS = 9, WEEK_WIDTH = 180px |
| GANTT-09 | Task row info | Hiện: WBS, priority dot, team badge, task name, assignee, start, duration, end, status icon, % |

#### 3.4.2 Board View (Kanban)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| BOARD-01 | 4 cột status | Not Started, In Progress, Completed, On Hold |
| BOARD-02 | Task card | Hiện: name, team badge, assignee, priority, progress bar |
| BOARD-03 | Lọc áp dụng | Filter team và search áp dụng cho board view |
| BOARD-04 | Chỉ leaf tasks | Board chỉ hiện leaf tasks (không có children) |

#### 3.4.3 Minutes View (Biên bản họp)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| MIN-01 | Danh sách biên bản | Sắp xếp theo ngày giảm dần, hiện title, date, preview nội dung, số attendees |
| MIN-02 | Tạo biên bản | Form: tiêu đề, ngày họp, thành viên tham dự (chip selector), nội dung |
| MIN-03 | Sửa biên bản | Click để mở detail panel bên phải, edit inline |
| MIN-04 | Xóa biên bản | Button xóa trong detail panel, có confirm |
| MIN-05 | @mention | Gõ @ trong nội dung để tag thành viên, hiện dropdown autocomplete |
| MIN-06 | Render mentions | @MemberName hiện dạng highlighted span (xanh dương) |
| MIN-07 | Thông tin tạo | Hiện "Tạo bởi: username" và thời gian tạo |

### 3.5 Quản lý Members & Teams (Admin)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| ADMIN-01 | Admin modal | 3 tab: Members, Teams, Dự án |
| ADMIN-02 | Thêm member | Nhập tên + chọn team |
| ADMIN-03 | Sửa tên member | Inline edit, tự động cập nhật assignee trong tasks |
| ADMIN-04 | Chuyển team member | Dropdown đổi team, tự động cập nhật task.team |
| ADMIN-05 | Xóa member | Confirm nếu member đang được assign task, bỏ trống assignee |
| ADMIN-06 | Thêm team | Nhập tên + chọn màu |
| ADMIN-07 | Đổi màu team | Color picker inline |
| ADMIN-08 | Xóa team | Confirm với số members và tasks, bỏ trống team/assignee |
| ADMIN-09 | Shared settings | Members và Team Colors được chia sẻ giữa tất cả dự án |

**Teams mặc định:** PM, Design, Art, Dev, Client, Server, QC, Multimedia, OP

### 3.6 Import/Export

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| IO-01 | Export Excel | File .xlsx với formatting: team color, priority color, status color, WBS, frozen header |
| IO-02 | Export Jira CSV | CSV tương thích Jira import: Issue Type (Epic/Story/Sub-task), Priority, Estimate |
| IO-03 | Export JSON backup | Full project data (tasks, members, teamColors) dạng .json |
| IO-04 | Import JSON | Load từ file .json, thay thế hoặc merge data |
| IO-05 | Import Excel | Đọc .xlsx/.xls, auto-detect headers, rebuild hierarchy từ WBS, normalize dates/status/priority |

### 3.7 Lưu trữ và đồng bộ (Data Persistence)

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| SYNC-01 | LocalStorage cache | Lưu ngay lập tức vào localStorage khi thay đổi |
| SYNC-02 | Server save (debounced) | Gửi lên server sau 1 giây idle (debounce) |
| SYNC-03 | Version control | Mỗi lần save tăng version, detect conflict khi version client < server |
| SYNC-04 | Conflict resolution | Khi phát hiện conflict → confirm dialog hỏi tải lại data mới |
| SYNC-05 | Polling | Kiểm tra version mới mỗi 30 giây, auto-reload nếu có thay đổi từ user khác |
| SYNC-06 | Updated_by tracking | Lưu username người cập nhật cuối cùng |

### 3.8 Scheduling Engine

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| SCHED-01 | Auto-schedule | Tự động reschedule task dựa trên dependency chain |
| SCHED-02 | Working days | Tính toán chỉ ngày làm việc (bỏ T7/CN) |
| SCHED-03 | Skip weekend | Nếu ngày bắt đầu/kết thúc rơi vào weekend → tự động chuyển sang thứ 2 kế tiếp, có toast thông báo |
| SCHED-04 | Parent aggregation | Parent task: start = min(children.start), end = max(children.end), pct = weighted average theo duration |
| SCHED-05 | Critical path | Tính critical path: chuỗi task dài nhất (theo end date), trace ngược qua deps |
| SCHED-06 | Dependency types | Hỗ trợ 4 loại: FS (end→start), SS (start→start), FF (end→end), SF (start→end), với lag |

### 3.9 Date Picker

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| DATE-01 | Dual input | Text input (DD/MM/YYYY) + calendar icon picker |
| DATE-02 | Auto-format | Tự động thêm `/` khi gõ số |
| DATE-03 | Weekend skip | Tự động chuyển sang ngày làm việc nếu chọn ngày weekend |
| DATE-04 | Duration sync | Thay đổi start → cập nhật end (giữ duration). Thay đổi end → cập nhật duration |

### 3.10 Build Version

| Mã | Tính năng | Mô tả |
|----|-----------|-------|
| VER-01 | Footer version | Hiện BUILD_VERSION và BUILD_TIME ở footer cố định cuối trang |
| VER-02 | Nhận biết deploy | Giúp nhận biết code đã được deploy lên production chưa |

---

## 4. API Endpoints

### 4.1 Authentication
| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/api/login` | Đăng nhập, trả về JWT token |

### 4.2 Projects
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/projects` | Danh sách dự án |
| POST | `/api/projects` | Tạo dự án mới |
| PUT | `/api/projects/:id` | Sửa tên/đặt mặc định |
| DELETE | `/api/projects/:id` | Xóa dự án |

### 4.3 Project Data
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/project/:id` | Lấy data đầy đủ (tasks, meetings) |
| PUT | `/api/project/:id` | Lưu data (với version check) |
| GET | `/api/project/:id/version` | Kiểm tra version hiện tại |

### 4.4 Tasks
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/project/:id/tasks` | Danh sách task (flat, có filter) |
| GET | `/api/project/:id/tasks/:taskId` | Chi tiết 1 task |
| POST | `/api/project/:id/tasks` | Tạo task mới |
| PUT | `/api/project/:id/tasks/:taskId` | Sửa task |
| PATCH | `/api/project/:id/tasks/:taskId/status` | Cập nhật nhanh status |
| DELETE | `/api/project/:id/tasks/:taskId` | Xóa task (recursive) |
| POST | `/api/project/:id/tasks/:taskId/indent` | Indent task |
| POST | `/api/project/:id/tasks/:taskId/outdent` | Outdent task |
| POST | `/api/project/:id/tasks/:taskId/move` | Di chuyển task sang parent khác |
| GET | `/api/project/:id/summary` | Thống kê tổng hợp |

### 4.5 Meetings
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/project/:id/meetings` | Danh sách biên bản (hỗ trợ filter from/to) |
| POST | `/api/project/:id/meetings` | Tạo biên bản |
| PUT | `/api/project/:id/meetings/:meetingId` | Sửa biên bản |
| DELETE | `/api/project/:id/meetings/:meetingId` | Xóa biên bản |

### 4.6 Settings & Legacy
| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/settings` | Lấy shared settings (members, teamColors) |
| PUT | `/api/settings` | Lưu shared settings |
| GET | `/api/data` | Backward compatibility — lấy data dự án mặc định |
| POST | `/api/data` | Backward compatibility — lưu data dự án mặc định |
| GET | `/api/version` | Backward compatibility — version dự án mặc định |
| POST | `/api/migrate` | Chạy migration: xóa fields cũ, normalize status/priority/deps |

---

## 5. Responsive Design

| Breakpoint | Thay đổi |
|------------|----------|
| ≤ 768px (Tablet) | Ẩn Gantt panel, task panel full width, modal full width, ẩn stats, buttons lớn hơn |
| ≤ 480px (Phone) | Ẩn WBS/Start/Duration/End columns, ẩn export/jira/import buttons, login form full width |

---

## 6. Bảo mật

- JWT token với 30 ngày expiry
- Password hash bằng bcryptjs
- Mọi API (trừ login) yêu cầu valid token
- Auto logout khi token hết hạn (401 response)
- CORS enabled

---

## 7. Ràng buộc kỹ thuật

- **KHÔNG** normalize JSONB thành bảng quan hệ
- **KHÔNG** thêm build step (webpack, vite, etc.)
- **KHÔNG** tách index.html thành nhiều file
- **KHÔNG** thay đổi data structure mà không cập nhật cả frontend và seed.js
- Frontend giữ dạng single file HTML với React CDN + Babel standalone

---

## 8. Teams mặc định và thành viên

| Team | Thành viên |
|------|-----------|
| PM | ToanNM |
| Design | LocPT, QuynhNH, BinhNT |
| Art | HoaGTT, TuND4, NgocLA |
| Dev | CongNN, HuongBP, DienDQ, CongNT7, PhucNN, SonBNT |
| Client | (trống) |
| Server | (trống) |
| QC | NhanNT3 |
| Multimedia | HungVM2 |
| OP | NienND |

---

## 9. Trạng thái và biểu tượng

| Status | Icon | Màu |
|--------|------|-----|
| Not Started | ○ | Xám (surface2) |
| In Progress | ◐ | Xanh dương (primary) |
| Completed | ● | Xanh lá (green) |
| On Hold | ✕ | Đỏ (red) |

| Priority | Màu |
|----------|-----|
| High | Đỏ |
| Normal | Vàng |
| Low | Xanh lá |
