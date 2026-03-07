# Research: Poker Texas Build Plan v2 - Modular Architecture

**Date**: 2026-03-07
**Branch**: `001-project-management`

## R1: Modular Code Organization trong Single-File Constraint

**Decision**: To chuc code thanh 8 logical modules trong 1 file
index.html, su dung comment block headers de phan vung.

**Rationale**: Constitution yeu cau single-file frontend. Khong
the dung ES modules (import/export) vi can build step. Comment
block headers + consistent ordering tao ranh gioi module ro rang.
Moi module co dependency direction tu tren xuong duoi (MODULE 1
khong phu thuoc gi, MODULE 8 phu thuoc tat ca).

**Alternatives considered**:
- ES Modules via CDN (es-module-shims) - can polyfill, phuc tap
  deployment, khong phu hop SCP constraint
- IIFE pattern per module - them boilerplate, scope issues voi
  React components can share state
- Tach nhieu file JS - vi pham constitution single-file constraint
- Web Components - khong tuong thich tot voi React state management

**Module dependency graph**:
```
M1 CONFIG        → (khong phu thuoc gi)
M2 DATE UTILS    → M1
M3 TASK LOGIC    → M1, M2
M4 PERSISTENCE   → M1
M5 IMPORT/EXPORT → M1, M2, M3
M6 UI COMPONENTS → M1, M2, M3, M4, M5
M7 APP CONTAINER → M1, M2, M3, M4, M5, M6
M8 BOOTSTRAP     → M7
```

## R2: React 18 CDN + Babel Standalone

**Decision**: Giu nguyen React 18 qua CDN voi Babel standalone.

**Rationale**: V1 da chung minh hoat dong tot. Khong can thay doi.
React 18 ho tro concurrent features nhung ta khong su dung -
createRoot + hooks la du.

**Alternatives considered**: (xem v1 research - khong thay doi)

## R3: CSS Organization Strategy

**Decision**: CSS chia thanh sections matching JS modules, su dung
CSS custom properties (variables) de centralize theme.

**Rationale**: V1 CSS ~145 dong khong co section. V2 chia CSS theo
component giup dev tim code nhanh hon. CSS variables da co trong v1
(:root) nhung v2 mo rong them variables cho spacing, typography.

**V2 CSS sections**:
```
1. THEME & VARIABLES - :root, colors, spacing, typography
2. LAYOUT - .app, .header, .main, .toolbar
3. TASK PANEL - .task-panel, .task-row, .task-list
4. GANTT PANEL - .gantt-panel, .gantt-bar, .gantt-cell
5. BOARD VIEW - .board, .board-column, .board-card
6. DETAIL PANEL - .detail-overlay, .field
7. ADMIN PANEL - .admin-tabs, .admin-table
8. MODALS & TOASTS - .modal, .toast, .confirm-dialog
```

## R4: Custom Hooks cho Data Persistence

**Decision**: Tach data persistence logic thanh custom hooks:
useAutoSave(), useVersionPoll(), useLocalStorage().

**Rationale**: V1 tron lan apiSave/lsLoad code voi component
render logic. Custom hooks cho phep:
- Tach side-effect logic rieng
- Reuse persistence logic
- Test logic doc lap (co the mock)
- Code App component ngan gon hon

**Custom hooks**:
- `useAutoSave(data, token)` - debounced API save + lsSave
- `useVersionPoll(token, currentVersion, onConflict)` - poll
  GET /api/version moi 30s
- `useAuth()` - token management, login, logout, token check

## R5: Component Decomposition Strategy

**Decision**: Tach components lon thanh components nho co 1
trach nhiem duy nhat.

**Rationale**: V1 co components lon (VD: Detail panel code
nam trong App component, ~200 dong). V2 tach thanh:

**V1 → V2 component mapping**:
```
V1 (monolithic)          V2 (modular)
─────────────────────    ──────────────────────
App (tat ca trong 1)  →  LoginScreen (auth UI)
                          Header (title, actions, view toggle)
                          FilterBar (dropdowns, search, stats)
                          TaskPanel (task list container)
                            TaskRow (single task row)
                          GanttPanel (gantt container)
                            GanttBar (single gantt bar)
                          BoardView (kanban container)
                            BoardCard (single kanban card)
                          DetailPanel (task edit slide-in)
                            DatePicker (date input + calendar)
                            DepsSelector (dependency multi-select)
                          AdminPanel (admin modal)
                          ConfirmDialog (reusable confirm)
                          Toast (notification)
                          App (state + glue only)
```

## R6: Auto-Schedule Algorithm (khong thay doi)

**Decision**: Topological sort + forward pass, circular dep
detection via DFS. (Giu nguyen tu v1 research)

## R7: Critical Path (khong thay doi)

**Decision**: CPM reverse pass, float=0 = critical. (Giu nguyen)

## R8: Data Persistence (khong thay doi)

**Decision**: Dual-layer localStorage + API debounced. (Giu nguyen)

## R9: Import/Export (khong thay doi)

**Decision**: ExcelJS export, SheetJS import. (Giu nguyen)

## R10: Auth Flow (khong thay doi)

**Decision**: JWT 30d, bcryptjs, localStorage token. (Giu nguyen)

## R11: Conflict Resolution (khong thay doi)

**Decision**: Version check, last-write-wins + conflict dialog.
(Giu nguyen)
