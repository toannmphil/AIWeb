# Feature Specification: Multi-Project Management for V2

**Feature Branch**: `001-multi-project`
**Created**: 2026-03-08
**Status**: Draft
**Input**: Thêm tính năng quản lý đa dự án cho v2 - cho phép tạo, chuyển, sửa, xóa dự án và shared settings (phân tích từ v1)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Chuyển đổi dự án (Priority: P1)

Người dùng đã đăng nhập muốn chuyển nhanh giữa các dự án khác nhau mà không cần đăng xuất. Ở header hiển thị dropdown chọn dự án, khi chọn dự án khác thì toàn bộ tasks, phaseColors được tải lại cho dự án đó.

**Why this priority**: Đây là tính năng cốt lõi - không có nó thì multi-project không có ý nghĩa. Người dùng cần thấy và chuyển giữa các dự án ngay lập tức.

**Independent Test**: Có thể test bằng cách tạo 2 dự án với dữ liệu khác nhau, switch qua lại và kiểm tra dữ liệu hiển thị đúng.

**Acceptance Scenarios**:

1. **Given** người dùng đã đăng nhập và có 2+ dự án, **When** chọn dự án khác trong dropdown, **Then** tasks và phaseColors được tải lại từ server cho dự án đó
2. **Given** người dùng đang ở dự án A và sửa tasks, **When** switch sang dự án B rồi quay lại A, **Then** dữ liệu dự án A vẫn giữ nguyên như đã sửa
3. **Given** người dùng mới đăng nhập, **When** trang load, **Then** dự án mặc định (is_default=true) được chọn tự động
4. **Given** chỉ có 1 dự án, **When** trang load, **Then** dropdown vẫn hiển thị nhưng chỉ có 1 option

---

### User Story 2 - Tạo dự án mới (Priority: P2)

Người dùng muốn tạo dự án mới từ Admin panel. Nhập tên dự án, bấm tạo, dự án mới xuất hiện trong danh sách với dữ liệu trống.

**Why this priority**: Cần có khả năng tạo dự án trước khi quản lý chúng. Đây là bước đầu tiên để có nhiều dự án.

**Independent Test**: Tạo dự án mới, kiểm tra nó xuất hiện trong dropdown và có thể switch tới.

**Acceptance Scenarios**:

1. **Given** người dùng ở Admin panel tab Dự án, **When** nhập tên và bấm Tạo, **Then** dự án mới được tạo trên server và thêm vào danh sách
2. **Given** tên dự án trống, **When** bấm Tạo, **Then** không có gì xảy ra (validation)
3. **Given** tạo dự án thành công, **When** kiểm tra dropdown header, **Then** dự án mới xuất hiện trong danh sách

---

### User Story 3 - Quản lý dự án (sửa, xóa, đặt mặc định) (Priority: P3)

Người dùng muốn đổi tên dự án, xóa dự án không cần thiết, hoặc đặt một dự án làm mặc định (dự án được load đầu tiên khi đăng nhập).

**Why this priority**: Quản lý lifecycle dự án - cần thiết nhưng không blocking các tính năng khác.

**Independent Test**: Sửa tên dự án, kiểm tra tên mới hiển thị trong dropdown. Xóa dự án, kiểm tra nó biến mất. Đặt mặc định, đăng nhập lại kiểm tra dự án đó load đầu tiên.

**Acceptance Scenarios**:

1. **Given** dự án đang hiển thị trong Admin, **When** bấm edit và sửa tên, **Then** tên mới được lưu và hiển thị ở dropdown
2. **Given** dự án không phải dự án duy nhất, **When** bấm xóa và xác nhận, **Then** dự án bị xóa, nếu đang active thì switch sang dự án khác
3. **Given** chỉ có 1 dự án, **When** bấm xóa, **Then** hiển thị cảnh báo "Không thể xóa dự án duy nhất"
4. **Given** đang ở Admin tab Dự án, **When** chọn radio "mặc định" cho 1 dự án, **Then** dự án đó được đánh dấu is_default trên server

---

### User Story 4 - Shared Settings (members, teamColors) (Priority: P4)

Members (danh sách thành viên theo team) và teamColors được chia sẻ giữa tất cả dự án. Khi sửa members/teamColors ở dự án nào thì tất cả dự án đều dùng chung.

**Why this priority**: Tách biệt dữ liệu shared vs per-project. Members/teamColors dùng chung giữa các dự án vì cùng một tổ chức.

**Independent Test**: Sửa members ở dự án A, switch sang dự án B, kiểm tra members giống nhau.

**Acceptance Scenarios**:

1. **Given** sửa members ở dự án A, **When** switch sang dự án B, **Then** members giống nhau vì là shared
2. **Given** thêm teamColor mới, **When** switch dự án, **Then** teamColor vẫn hiển thị ở dự án khác
3. **Given** đăng nhập lần đầu, **When** load xong, **Then** shared settings (members, teamColors) được tải từ `/api/settings`

---

### Edge Cases

- Khi server trả lỗi khi tạo/sửa/xóa dự án → hiển thị toast lỗi, không crash
- Khi switch dự án mà mất mạng → fallback sang localStorage cache nếu có
- Khi 2 user cùng sửa 1 dự án → version conflict detection (đã có sẵn trong v2)
- Khi xóa dự án đang active → auto switch sang dự án mặc định hoặc dự án đầu tiên
- Khi không có dự án nào → cho phép tạo dự án mới (không crash)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST hiển thị dropdown chọn dự án ở header khi có ít nhất 1 dự án
- **FR-002**: System MUST tải danh sách dự án từ server khi đăng nhập thành công
- **FR-003**: System MUST tự động chọn dự án mặc định (is_default=true) khi đăng nhập
- **FR-004**: System MUST cho phép tạo dự án mới với tên từ Admin panel
- **FR-005**: System MUST cho phép đổi tên dự án từ Admin panel
- **FR-006**: System MUST cho phép xóa dự án (trừ dự án duy nhất) với xác nhận
- **FR-007**: System MUST cho phép đặt dự án mặc định từ Admin panel
- **FR-008**: System MUST lưu tasks và phaseColors riêng cho từng dự án (per-project data)
- **FR-009**: System MUST lưu members và teamColors chung cho tất cả dự án (shared settings)
- **FR-010**: System MUST cache dữ liệu dự án vào localStorage theo projectId (key: `ptb_p{id}`)
- **FR-011**: System MUST poll version cho dự án đang active mỗi 30 giây
- **FR-012**: System MUST hiển thị toast thông báo khi có người khác cập nhật dự án đang xem

### Key Entities

- **Project**: Đại diện cho một dự án quản lý. Có id, name, is_default, data (JSONB chứa tasks + phaseColors), version, updated_by, updated_at
- **Settings**: Dữ liệu chia sẻ giữa các dự án. Chứa members (object team→[names]) và teamColors (object team→color)
- **User**: Người dùng hệ thống. Có id, username, password_hash, display_name

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Người dùng chuyển đổi giữa các dự án trong dưới 2 giây
- **SC-002**: Tạo dự án mới hoàn tất trong dưới 3 giây
- **SC-003**: Dữ liệu shared (members, teamColors) nhất quán 100% giữa tất cả dự án
- **SC-004**: Không mất dữ liệu khi switch dự án (tasks giữ nguyên khi quay lại)
- **SC-005**: Hệ thống hoạt động ổn định với 10+ dự án đồng thời
