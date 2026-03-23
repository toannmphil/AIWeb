# Research: Unified Task Model (Task Management Rewrite)

## Decision 1: Unified Task Type

**Decision**: Xóa hoàn toàn `type:'epic'`, `isEpic`, `isSummary`. Chỉ còn 1 loại: **Task**. Task nào có `children[]` không rỗng tự động trở thành parent task (summary). Task không có children là leaf task.

**Rationale**: Giống MS Project — khi indent 1 task dưới task khác, task cha tự động thành summary. Không cần flag riêng. Giảm 3 nhánh code (epic/summary/leaf) xuống 2 (parent/leaf), đơn giản hóa toàn bộ hệ thống.

**Alternatives considered**:
- Giữ `isSummary` flag → thừa, vì đã biết qua `children.length > 0`
- Giữ `type` field → thêm complexity không cần thiết

## Decision 2: Remove Phase Concept

**Decision**: Xóa hoàn toàn `phase`, `phaseColors`. Không thay thế bằng tags.

**Rationale**: Phase chỉ là tên của epic (Pre-production, Production, Testing). Khi epic trở thành task cha bình thường, phase mất ý nghĩa. Task cha cấp cao nhất đóng vai trò "phase". Không cần thêm tags system vì quá phức tạp cho use case hiện tại.

**Alternatives considered**:
- Chuyển phase → tags array → overengineering, user chưa cần
- Giữ phase như metadata → orphan field không ai dùng
- Dùng color per-task → có thể thêm sau nếu cần

## Decision 3: Data Migration Approach

**Decision**: Script `migrate.js` chạy 1 lần trên VPS, transform JSONB trực tiếp trong DB.

**Rationale**: Chỉ có 3 projects trong DB. Migration đơn giản: duyệt recursive, xóa fields cũ, giữ cấu trúc children. Không cần zero-downtime strategy.

**Migration logic**:
1. Load tất cả projects
2. Với mỗi project.data.tasks:
   - Epic → giữ nguyên children, xóa `type`, `phase`, `isEpic`
   - SummaryTask → giữ nguyên children, xóa `isSummary`
   - Leaf task → giữ nguyên, xóa `phase` nếu có
3. Xóa `phaseColors` khỏi project.data
4. Lưu lại với version bump

**Alternatives considered**:
- Migration trong app code (check cả 2 format) → permanent complexity
- Manual edit JSON → error-prone với 46+ tasks

## Decision 4: Parent Task Behavior

**Decision**: Task có `children.length > 0` tự động:
- Auto-compute: start, end, duration, pct
- Không cho edit: team, assignee, priority, status, start, end, pct
- Cho phép edit: name, notes, deps, expanded
- Hiển thị: bold, Gantt bar hình thang, expand/collapse toggle

**Rationale**: Theo chuẩn MS Project. Parent task là aggregation container, không phải work item. Gán resource vào parent gây confusion.

**Alternatives considered**:
- Cho phép gán assignee vào parent → vi phạm WBS principle
- Cho phép manual override dates → phức tạp, cần track "manual vs auto" mode

## Decision 5: Dependency Type Enhancement

**Decision**: Mở rộng `deps` từ `[taskId]` sang `[{id, type, lag}]`:
- `type`: "FS" (default), "SS", "FF", "SF"
- `lag`: số ngày (positive = lag, negative = lead)
- Backend hỗ trợ cả format cũ `[taskId]` (backward compat trong migration period)

**Rationale**: Spec yêu cầu 4 loại dependency + lag/lead. FS là default nên backward compat dễ.

**Alternatives considered**:
- Giữ chỉ FS → không đủ cho spec
- String format "10FS+2" → khó parse, error-prone

## Decision 6: Status Values

**Decision**: Đổi status values theo spec:
- Old: `To Do | In Progress | Review | Done | Blocked`
- New: `Not Started | In Progress | Completed | On Hold`

**Migration**: `To Do` → `Not Started`, `Done` → `Completed`, `Blocked` → `On Hold`, `Review` → `In Progress`

**Rationale**: Theo spec TaskManagement_Specs.md. Giảm từ 5 → 4 statuses, đơn giản hơn.

## Decision 7: WBS Code Generation

**Decision**: Giữ nguyên approach: tính WBS on-the-fly khi render. Không lưu vào data. Format: `1`, `1.1`, `1.1.2`, etc.

**Rationale**: Đã hoạt động tốt. Tính on-the-fly đảm bảo luôn đúng khi reorder/add/delete.

## Decision 8: Gantt Bar Rendering

**Decision**:
- Parent task (có children): thanh Gantt đen, hình thang, height 6px
- Leaf task (không children): thanh Gantt màu team, height 22px, border-radius
- Giữ expand/collapse, dependency lines

**Rationale**: Phân biệt rõ parent vs leaf. Đã có CSS sẵn từ summary task implementation.

## Decision 9: API Changes

**Decision**:
- Xóa `POST /tasks/summary` (không cần endpoint riêng)
- `POST /tasks` tạo task mới dưới parent (parentId), có thể tạo kèm children
- `PUT /tasks/:id` cho phép tất cả fields cho leaf, hạn chế cho parent
- Xóa `GET /epics` (không còn epic concept)
- Giữ `GET /summary` nhưng đổi stats (không có epicCount, thay bằng parentTaskCount)

**Rationale**: API đơn giản hơn khi chỉ có 1 loại task.

## Decision 10: Indent/Outdent

**Decision**: Implement indent (Tab hoặc button) và outdent (Shift+Tab hoặc button):
- **Indent**: Task trở thành con của task liền trên nó
- **Outdent**: Task được đưa lên cùng cấp với task cha hiện tại

**Rationale**: Đây là cách chính để tạo hierarchy trong MS Project. Quan trọng hơn button "Add Summary".

## Decision 11: Keyboard Shortcuts

**Decision**: Theo spec:
- `Insert` hoặc `+ Add Task` button: tạo task mới
- `Shift+Alt+→`: Indent (task → con của task trên)
- `Shift+Alt+←`: Outdent (task → cùng cấp cha)
- `Delete`: Xóa task (với confirm nếu có children)

**Rationale**: Theo chuẩn MS Project shortcuts. Phím Insert tạo task nhanh hơn click button.

## Decision 12: Jira CSV Parent-Child Format

**Decision**: Sử dụng `Issue Id` + `Parent` columns thay vì deprecated `Epic Link` + `Epic Name`

**Rationale**:
- Jira Cloud (từ tháng 4/2024) deprecate `Epic Link` field, thay bằng `Parent` field thống nhất
- `Parent` field hoạt động cho tất cả hierarchy levels: Epic→Story, Story→Sub-task
- Format: mỗi row có `Issue Id` (unique number = task.id), child rows reference parent qua `Parent` column
- Parents phải xuất hiện TRƯỚC children trong CSV (Jira requirement) — `getAllTasks()` đã đúng thứ tự DFS

**Alternatives considered**:
- `Epic Link` + `Epic Name`: Deprecated, chỉ hỗ trợ 1 cấp (Epic→Story)
- Jira REST API import: Phức tạp, cần API token

## Decision 13: Jira Issue Type Mapping

**Decision**: Map task tree hierarchy → Jira issue types theo depth:
- depth 0 + has children → **Epic**
- depth 0 + no children → **Task** (standalone)
- depth 1 (any) → **Story**
- depth 2+ (any) → **Sub-task**

**Rationale**:
- Jira mặc định hỗ trợ 3 cấp: Epic → Story → Sub-task
- App task tree có thể sâu hơn 3 cấp, nhưng Jira giới hạn → flatten depth 2+ thành Sub-task
- Mapping theo depth đơn giản và predictable

**Alternatives considered**:
- Map theo isParent/isLeaf: Mất thông tin về depth, không phân biệt Story vs Sub-task
- Custom Issue Types: Cần cấu hình Jira project, không portable

## Decision 14: Excel Export — All Tasks vs Expanded Only

**Decision**: Export ALL tasks (bao gồm collapsed children), không phụ thuộc expanded state

**Rationale**:
- User kỳ vọng export đầy đủ data
- Cần tạo helper riêng: `flattenAllTasks()` recursive ignoring `expanded` flag
- Giữ nguyên WBS numbering, level indentation, formatting

**Alternatives considered**:
- Export chỉ visible tasks: Gây miss data nếu user collapse sections
- Dialog hỏi "Export all / visible": Over-engineering

## Decision 15: Jira Priority Mapping

**Decision**: Map `Normal` → `Medium` khi export Jira CSV

**Rationale**: Jira dùng Highest/High/Medium/Low/Lowest. App dùng High/Normal/Low. `Normal` ↔ `Medium` là mapping phù hợp nhất.

## Decision 16: Mobile-Friendly Layout Approach

**Decision**: CSS-first responsive design sử dụng `@media` queries với 2 breakpoints: `768px` (tablet) và `480px` (phone). Không dùng JS resize listeners.

**Rationale**:
- Hiện tại v2/index.html hoàn toàn desktop-only: task-panel 480px cố định, gantt-panel, header buttons overflow trên mobile
- CSS media queries là giải pháp đơn giản nhất, không cần build step, không phá vỡ single-file constraint
- 2 breakpoints đủ cho app này: tablet (ẩn gantt, task-panel full-width) và phone (compact header)

**Alternatives considered**:
- JS-based responsive (window.addEventListener('resize')) → thêm complexity, re-render không cần thiết
- React component switching (desktop vs mobile version) → duplicate code, khó maintain
- CSS Container Queries → browser support chưa universal

### Mobile Layout Strategy

**Breakpoint 768px (tablet/mobile):**
1. **Header**: Logo và project selector 1 dòng, action buttons wrap xuống dòng 2. Buttons nhỏ hơn.
2. **Toolbar**: Filters stack vertically hoặc scroll horizontal. Stats ẩn.
3. **Gantt View**: Ẩn gantt-panel, chỉ hiển thị task-panel full-width. Task panel chiếm 100% width.
4. **Board View**: Columns stack vertical thay vì horizontal (mỗi status là 1 section collapse/expand).
5. **Detail Overlay**: Full-width thay vì 380px.
6. **Minutes View**: Đã gần responsive rồi, chỉ cần padding nhỏ hơn.
7. **Modals**: Full-width trên mobile (max-width: 100vw, margin: 8px).

**Breakpoint 480px (phone):**
1. **Header**: Hamburger menu cho action buttons (hoặc chỉ show essential buttons).
2. **Task rows**: Ẩn bớt columns (WBS, duration, dates). Chỉ hiển thị: expand/team/name/status/%.
3. **Touch targets**: Min height 44px cho task rows (từ 32px hiện tại).

### Responsive CSS Changes

| Component | Desktop (>768px) | Mobile (≤768px) |
|-----------|-------------------|-----------------|
| `.header` | `flex-direction: row` | `flex-wrap: wrap` |
| `.header-actions` | Single row | Wrap, smaller buttons |
| `.toolbar` | Single row | `flex-wrap: wrap`, stats hidden |
| `.main` | `display: flex` (task+gantt side by side) | `flex-direction: column`, gantt hidden |
| `.task-panel` | `width: 480px` | `width: 100%`, no min-width |
| `.gantt-panel` | Visible | `display: none` |
| `.detail-overlay` | `width: 380px`, slide from right | `width: 100%` |
| `.modal` | `width: 500px` | `width: calc(100vw - 16px)` |
| `.task-row` | `height: 32px` | `height: 40px`, hide some columns |
| Board columns | Horizontal flex | Vertical stack |

### Touch Optimization

- Tất cả interactive elements: min 44x44px touch target
- Task row height tăng từ 32px → 40px trên mobile
- Buttons: padding tăng nhẹ
- Detail overlay: swipe-to-close không cần (nút X đủ)

## Decision 17: Gantt View on Mobile

**Decision**: Ẩn gantt-panel trên mobile, task-panel chiếm full-width. Không cố gắng render gantt chart trên mobile.

**Rationale**:
- Gantt chart cần min ~1200px horizontal space (9 weeks × 180px = 1620px)
- Trên mobile không thể hiển thị gantt có ý nghĩa
- Task list view đủ thông tin cần thiết (tên, team, dates, status, %)
- User có thể dùng Board view trên mobile thay cho Gantt

**Alternatives considered**:
- Horizontal scroll gantt trên mobile → UX rất kém, khó interact
- Compact gantt (1 row = 1 bar, vertical timeline) → phức tạp, ít giá trị
- Separate "Timeline" view → overengineering

## Decision 18: Board View on Mobile

**Decision**: Board view trên mobile: scroll horizontal giữ nguyên 4 columns nhưng mỗi column min-width giảm từ 220px → 160px. User swipe ngang để xem.

**Rationale**:
- Kanban board quen thuộc với swipe gesture trên mobile (Trello, Jira mobile)
- Stack vertical (mỗi status là section) mất visual comparison giữa columns
- Min-width 160px đủ hiển thị card content

**Alternatives considered**:
- Vertical stack → mất kanban feel
- Tab per status → thêm UI complexity
