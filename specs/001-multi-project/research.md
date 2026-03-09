# Research: Multi-Project Management

## Decision 1: Shared Settings Storage

**Decision**: Tạo bảng `settings` riêng trong PostgreSQL để lưu members và teamColors dưới dạng JSONB.

**Rationale**: V1 đã dùng cách này (`/api/settings` endpoint riêng). Members và teamColors là dữ liệu tổ chức, không thuộc riêng dự án nào. Lưu riêng giúp tránh duplicate data khi có nhiều dự án.

**Alternatives considered**:
- Lưu members/teamColors trong mỗi project.data → duplicate, khó sync
- Lưu trong bảng users → không phù hợp về mặt logic

## Decision 2: API Backward Compatibility

**Decision**: Giữ `/api/data` và `/api/version` (v2 cũ) hoạt động song song với API mới. Chúng sẽ proxy đến default project.

**Rationale**: Nếu có client cũ chưa update, vẫn hoạt động được. Không breaking change.

**Alternatives considered**:
- Xóa API cũ hoàn toàn → breaking change cho client chưa update
- Chỉ dùng API cũ → không hỗ trợ multi-project

## Decision 3: Per-Project localStorage Caching

**Decision**: Dùng key `ptb_p{projectId}` cho localStorage cache mỗi dự án (giống v1).

**Rationale**: Cho phép offline fallback per-project. Key riêng tránh conflict giữa các dự án.

**Alternatives considered**:
- Single localStorage key → ghi đè khi switch project, mất cache
- IndexedDB → overkill cho use case này

## Decision 4: Version Polling Per-Project

**Decision**: Poll `/api/project/{currentProjectId}/version` mỗi 30s, chỉ cho project đang active.

**Rationale**: Giống v1. Chỉ poll project đang xem để tránh request thừa. Reset interval khi switch project.

**Alternatives considered**:
- WebSocket → phức tạp hơn, cần thêm dependency
- Poll tất cả projects → lãng phí bandwidth

## Decision 5: Frontend State Management

**Decision**: Dùng React hooks (useState) cho project state, module-level variable `CURRENT_PROJECT_ID` cho API layer (giống v1).

**Rationale**: V1 pattern đã chứng minh hoạt động tốt. Module-level var cần cho debounced save (closure issue).

**Alternatives considered**:
- useContext → overkill cho single-file app
- useReducer → thêm boilerplate không cần thiết
