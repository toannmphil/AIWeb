# TASK MANAGEMENT
**Feature Specification Document**
Version 1.0 | 09/03/2026

---

## 1. Tổng quan

Module quản lý task cho phép người dùng tạo, phân cấp, theo dõi và hoàn thành công việc theo cấu trúc WBS (Work Breakdown Structure) tương tự Microsoft Project.

---

## 2. Cấu trúc Task

### 2.1 Phân cấp Task

- **Task thường (Leaf Task):** đơn vị công việc nhỏ nhất, có thể gán người thực hiện và nhập duration
- **Summary Task (Task cha):** nhóm chứa các task con, thời gian và tiến độ tự tính từ con
- **Project Summary Task (Task 0):** cấp cao nhất, đại diện toàn dự án
- Hỗ trợ lồng nhiều cấp không giới hạn

### 2.2 Trường thông tin của Task

| Trường | Kiểu dữ liệu | Mô tả |
|---|---|---|
| Task Name | String (255) | Tên task, bắt buộc nhập |
| WBS Code | Auto | Mã tự sinh theo cấu trúc (1, 1.1, 1.1.2...) |
| Start Date | Date | Ngày bắt đầu (tự tính với Summary Task) |
| Finish Date | Date | Ngày kết thúc (tự tính với Summary Task) |
| Duration | Number (ngày) | Thời lượng thực hiện, không nhập được ở Summary |
| % Complete | 0–100% | Tiến độ; Summary Task tự tính theo weight duration |
| Assigned To | User(s) | Người thực hiện; không áp dụng cho Summary Task |
| Priority | Low/Normal/High | Mức độ ưu tiên |
| Status | Enum | Not Started / In Progress / Completed / On Hold |
| Predecessor | Task ID(s) | Task phải hoàn thành trước; hỗ trợ FS, SS, FF, SF |
| Notes | Text | Ghi chú tự do |

---

## 3. Summary Task — Hành vi đặc biệt

- **Start** = min(Start của tất cả task con)
- **Finish** = max(Finish của tất cả task con)
- **Duration** = Finish − Start (tự tính, không cho phép sửa thủ công)
- **% Complete** = Σ(Duration_con × %Complete_con) / Σ(Duration_con)
- **Cost & Work** = tổng cộng từ tất cả task con
- Hiển thị in đậm, thanh Gantt dạng hình thang màu đậm
- Có nút ▶/▼ để thu gọn / mở rộng danh sách con
- Cảnh báo nếu người dùng cố gán resource trực tiếp vào Summary Task

---

## 4. Thao tác người dùng

### 4.1 CRUD Task

- **Tạo task mới:** nhấn nút `[+ Add Task]` hoặc phím `Insert`
- **Thụt lề (Indent):** `Shift+Alt+→` → chuyển task thành con của task phía trên
- **Lùi lề (Outdent):** `Shift+Alt+←` → nâng cấp task lên cấp cha
- **Kéo thả (Drag & Drop):** di chuyển task hoặc thay đổi cấp bậc
- **Xoá task:** xoá task cha sẽ xoá toàn bộ cây con, hiển thị cảnh báo xác nhận
- **Duplicate:** nhân đôi task và cây con

### 4.2 Dependency (Liên kết)

| Loại | Ký hiệu | Mô tả |
|---|---|---|
| Finish-to-Start | FS | B bắt đầu sau khi A kết thúc *(mặc định)* |
| Start-to-Start | SS | B bắt đầu cùng lúc A bắt đầu |
| Finish-to-Finish | FF | B kết thúc cùng lúc A kết thúc |
| Start-to-Finish | SF | B kết thúc trước khi A bắt đầu *(ít dùng)* |

- Hỗ trợ **Lag (+)** và **Lead (−)** tính theo ngày
- Phát hiện và cảnh báo **Circular Dependency**

---

## 5. Gantt Chart

- Thanh ngang thể hiện thời gian: màu xanh = Leaf Task, màu đen/hình thang = Summary Task
- Đường nối mũi tên thể hiện dependency giữa các task
- Click vào thanh Gantt để kéo thay đổi Start / Duration
- Thanh màu đỏ = task trễ deadline (so sánh với Baseline)
- Zoom: Ngày / Tuần / Tháng / Quý
- Hiển thị đường **Today** (đường dọc màu đỏ)

---

## 6. Phân quyền

| Hành động | Admin | PM | Member | Viewer |
|---|:---:|:---:|:---:|:---:|
| Tạo / Xoá / Sửa task | ✓ | ✓ | ✗ | ✗ |
| Cập nhật % Complete | ✓ | ✓ | ✓ *(task của mình)* | ✗ |
| Xem Gantt | ✓ | ✓ | ✓ | ✓ |
| Gán resource | ✓ | ✓ | ✗ | ✗ |
| Export / Import | ✓ | ✓ | ✗ | ✗ |

---

## 7. Import / Export

- **Export sang:** Excel (.xlsx), CSV, PDF, MPP (Microsoft Project)
- **Import từ:** Excel template chuẩn, CSV, MPP
- Template Excel gồm các cột: WBS, Task Name, Duration, Start, Finish, Predecessor, Assigned To, % Complete

---

## 8. Thông báo & Cảnh báo

- Nhắc nhở trước deadline: 1 ngày, 3 ngày, 7 ngày (cấu hình được)
- Cảnh báo task con chưa hoàn thành khi Summary Task đã quá hạn
- Thông báo khi được gán task mới
- Thông báo khi task bị thay đổi bởi người khác

---

## 9. Yêu cầu phi chức năng

- **Hiệu năng:** load danh sách 10,000 task trong < 2 giây
- **Realtime:** cập nhật đồng bộ khi nhiều người cùng chỉnh sửa (WebSocket)
- **Lịch sử:** lưu audit log toàn bộ thay đổi, hỗ trợ Undo/Redo
- **Mobile:** responsive, hỗ trợ thao tác cơ bản trên tablet
- **Offline:** cache dữ liệu, đồng bộ lại khi có mạng

---

*— End of Document —*
