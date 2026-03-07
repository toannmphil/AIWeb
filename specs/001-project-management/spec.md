# Feature Specification: Poker Texas Build Plan - Project Management

**Feature Branch**: `001-project-management`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "Build ung dung quan ly du an chuyen dung cho viec phat trien game Poker Texas Hold'em"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quan ly Task co Gantt Chart (Priority: P1)

Nguoi dung (PM/Lead) dang nhap vao he thong, thay danh sach task phan cap theo 3 phase (Pre-production, Production, Testing & QA). Moi task hien thi tren Gantt chart theo timeline 9 tuan. PM co the tao/sua/xoa task, gan assignee, dat priority, va he thong tu dong tinh lai lich trinh khi thay doi dependency.

**Why this priority**: Day la chuc nang cot loi cua ung dung. Khong co quan ly task va Gantt chart thi ung dung khong co gia tri su dung.

**Independent Test**: Co the kiem tra bang cach dang nhap, tao task moi, gan dependency, va xac nhan Gantt chart hien thi dung timeline va tu dong cap nhat ngay.

**Acceptance Scenarios**:

1. **Given** nguoi dung da dang nhap, **When** tao task moi trong phase Production voi duration 5 ngay, **Then** task xuat hien trong danh sach va thanh Gantt hien thi dung 5 ngay lam viec.
2. **Given** task A co end date la thu 6, **When** task B co dependency la task A, **Then** task B tu dong bat dau vao thu 2 tuan sau (bo qua cuoi tuan).
3. **Given** task con thay doi ngay, **When** he thong chay autoSchedule, **Then** Epic cha tu dong cap nhat ngay bat dau/ket thuc bao trum tat ca task con.
4. **Given** nguoi dung click vao thanh Gantt, **When** detail panel mo ra, **Then** co the chinh sua tat ca thuoc tinh task va luu thanh cong.

---

### User Story 2 - Xac thuc va Dong bo du lieu (Priority: P2)

Nhieu nguoi dung cung truy cap ung dung dong thoi. Moi nguoi dang nhap bang username/password, du lieu duoc luu len server va dong bo giua cac phien lam viec. Khi co conflict (2 nguoi sua cung luc), he thong thong bao va cho tai lai.

**Why this priority**: Xac thuc va dong bo la nen tang de nhieu thanh vien team cung lam viec. Khong co dong bo thi du lieu se bi mat hoac ghi de.

**Independent Test**: Mo 2 tab trinh duyet, dang nhap, sua task o tab 1, xac nhan tab 2 nhan duoc cap nhat trong vong 30 giay.

**Acceptance Scenarios**:

1. **Given** man hinh dang nhap, **When** nhap dung username/password, **Then** dang nhap thanh cong va hien thi du lieu du an.
2. **Given** nguoi dung da dang nhap, **When** token het han (30 ngay), **Then** tu dong chuyen ve man hinh dang nhap.
3. **Given** nguoi dung A sua task, **When** nguoi dung B cung sua task khac, **Then** ca 2 thay doi deu duoc luu thanh cong.
4. **Given** nguoi dung A va B sua cung 1 task, **When** conflict xay ra, **Then** he thong thong bao va cho tai lai phien ban moi nhat.
5. **Given** nguoi dung sua task, **When** dong tab truoc khi save xong, **Then** du lieu duoc luu vao localStorage va phuc hoi khi mo lai.

---

### User Story 3 - Board View (Kanban) va Bo loc (Priority: P3)

Nguoi dung chuyen sang che do Kanban board de xem tong quan trang thai task theo 4 cot (To Do, In Progress, Done, Blocked). Co the loc theo team, phase, status va tim kiem theo ten task/member.

**Why this priority**: Kanban bo sung goc nhin trang thai tong hop, giup team nhanh chong nhan biet task bi blocked hoac dang tien hanh.

**Independent Test**: Chuyen sang Board view, xac nhan task hien thi dung cot theo status, su dung filter theo team va xac nhan ket qua loc chinh xac.

**Acceptance Scenarios**:

1. **Given** co 30 task voi cac status khac nhau, **When** chuyen sang Board view, **Then** task hien thi dung trong 4 cot tuong ung.
2. **Given** Board view dang hien thi, **When** loc theo team "Dev", **Then** chi hien thi task cua team Dev.
3. **Given** Board view dang hien thi, **When** tim kiem "CongNN", **Then** hien thi tat ca task duoc gan cho CongNN.
4. **Given** Board view, **When** xem thong ke tong hop, **Then** hien thi dung so luong total, in progress, done, blocked.

---

### User Story 4 - Admin quan ly Team/Member/Phase (Priority: P4)

PM hoac Admin quan ly danh sach thanh vien, team va phase. Co the them/sua/xoa member, doi team, them team moi voi mau sac tuy chinh, them/xoa phase (tu dong tao Epic tuong ung).

**Why this priority**: Quan ly team va phase can thiet de cau hinh du an, nhung it thay doi sau khi setup ban dau.

**Independent Test**: Mo Admin panel, them member moi vao team Dev, xac nhan member xuat hien trong dropdown assignee khi tao task.

**Acceptance Scenarios**:

1. **Given** Admin panel, **When** them member "TestUser" vao team QC, **Then** member xuat hien trong danh sach team QC va co the gan vao task.
2. **Given** Admin panel, **When** tao team moi "Audio" voi mau xanh, **Then** team xuat hien trong bo loc va Gantt chart dung mau.
3. **Given** Admin panel, **When** them phase moi "Beta Testing", **Then** Epic tuong ung tu dong duoc tao trong danh sach task.

---

### User Story 5 - Import/Export du lieu (Priority: P5)

Nguoi dung export du lieu du an ra file JSON (backup), Excel (bao cao co mau sac), hoac Jira CSV (chuyen sang Jira). Nguoi dung cung co the import du lieu tu file JSON hoac Excel da co.

**Why this priority**: Import/Export la tinh nang ho tro, khong anh huong den luong lam viec chinh nhung rat huu ich cho bao cao va backup.

**Independent Test**: Export ra file Excel, mo file xac nhan co du task voi mau sac dung, sau do import lai tu file JSON va xac nhan du lieu khop.

**Acceptance Scenarios**:

1. **Given** du an co 34 task, **When** export JSON, **Then** file JSON chua day du du lieu va co the import lai khong mat du lieu.
2. **Given** du an co task voi cac team khac nhau, **When** export Excel, **Then** file .xlsx co header styled, mau sac theo team/status/priority.
3. **Given** du an co Epics, **When** export Jira CSV, **Then** file CSV co Epic rows, Epic Link, ISO date format, Original Estimate tuong thich Jira.
4. **Given** file Excel tu ben ngoai, **When** import, **Then** he thong tu dong nhan dien cot, normalize date/status/priority/team va nhom theo phase.

---

### Edge Cases

- Khi task co dependency vong tron (A -> B -> A) thi he thong xu ly the nao?
- Khi import file Excel co cot khong dung dinh dang hoac thieu cot bat buoc?
- Khi nhieu nguoi dung cung sua 1 task trong cung 1 giay?
- Khi server mat ket noi giua luc dang luu du lieu?
- Khi xoa 1 task ma task khac dang dependency vao no?
- Khi phase bi xoa nhung van con task con ben trong?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: He thong MUST cho phep dang nhap bang username/password va duy tri phien bang token (30 ngay).
- **FR-002**: He thong MUST luu tru du lieu du an dang JSON blob, bao gom tasks, members, teamColors, phaseColors, version, savedAt.
- **FR-003**: He thong MUST to chuc task theo cau truc phan cap: Epic (phase) chua cac task con.
- **FR-004**: Moi task MUST co cac thuoc tinh: id, name, team, assignee, priority (High/Medium/Low), status (To Do/In Progress/Done/Blocked), start, end, duration (working days), progress (0-100%), dependencies, notes.
- **FR-005**: He thong MUST tu dong tinh lai lich trinh (autoSchedule) khi thay doi dependency, bo qua ngay cuoi tuan.
- **FR-006**: He thong MUST hien thi Gantt chart voi timeline 9 tuan, thanh Gantt mau theo team, highlight tuan hien tai.
- **FR-007**: He thong MUST hien thi Critical Path tren Gantt chart (duong toi han anh huong deadline).
- **FR-008**: He thong MUST cung cap Board view (Kanban) voi 4 cot trang thai.
- **FR-009**: He thong MUST ho tro loc theo Phase, Team, Status va tim kiem theo ten task/member.
- **FR-010**: He thong MUST hien thi thong ke tong hop: total, in progress, done, blocked.
- **FR-011**: He thong MUST cung cap detail panel (slide-in) de xem va chinh sua task.
- **FR-012**: He thong MUST ho tro DatePicker nhap DD/MM/YYYY hoac chon tu lich.
- **FR-013**: He thong MUST ho tro chon dependency bang text input hoac multi-select.
- **FR-014**: He thong MUST cung cap Admin panel de quan ly Member, Team (voi mau sac), va Phase.
- **FR-015**: He thong MUST ho tro export JSON, Excel (co styled headers, color-coded), va Jira CSV.
- **FR-016**: He thong MUST ho tro import tu file JSON va Excel (tu dong nhan dien cot, normalize du lieu).
- **FR-017**: He thong MUST luu tuc thi vao localStorage va debounced (1 giay) len server.
- **FR-018**: He thong MUST phat hien conflict version khi nhieu nguoi cung sua, thong bao va cho tai lai.
- **FR-019**: He thong MUST tu dong kiem tra version moi moi 30 giay va tai lai neu co thay doi.
- **FR-020**: He thong MUST luu du lieu vao localStorage truoc khi nguoi dung dong tab (beforeunload).
- **FR-021**: He thong MUST dong bo scroll giua Task Panel va Gantt Panel.
- **FR-022**: He thong MUST cho phep reset du lieu ve trang thai mac dinh (INITIAL_TASKS).

### Key Entities

- **Project**: Du an tong the, chua toan bo du lieu (tasks, members, teamColors, phaseColors). Moi user co the truy cap project cua minh.
- **Task**: Don vi cong viec co the la Epic (phase container) hoac task con. Co day du thuoc tinh: ten, team, assignee, priority, status, thoi gian, tien do, dependencies, ghi chu.
- **Member**: Thanh vien du an, thuoc ve 1 team. Co the duoc gan vao nhieu task.
- **Team**: Nhom lam viec (PM, Design, Art, Dev, QC, Multimedia, OP). Co mau sac rieng hien thi tren Gantt chart.
- **Phase**: Giai doan du an (Pre-production, Production, Testing & QA). Tuong ung voi 1 Epic trong danh sach task. Co mau sac rieng.
- **User**: Nguoi dung he thong, dang nhap bang username/password. Co quyen truy cap va chinh sua du lieu du an.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Nguoi dung co the tao task moi va thay no xuat hien tren Gantt chart trong vong 2 giay.
- **SC-002**: AutoSchedule tinh toan lai lich trinh cho 50+ task trong vong 1 giay sau khi thay doi dependency.
- **SC-003**: Du lieu duoc dong bo giua 2 phien lam viec dong thoi trong vong 30 giay.
- **SC-004**: Nguoi dung co the tim kiem va loc task trong danh sach 50+ task va nhan ket qua trong vong 500ms.
- **SC-005**: Export Excel cho 50 task tao file co dinh dang mau sac chinh xac trong vong 5 giay.
- **SC-006**: Import file Excel 50 task tu dong nhan dien va normalize du lieu chinh xac it nhat 95% truong hop.
- **SC-007**: He thong phat hien va thong bao conflict khi 2 nguoi cung sua trong vong 30 giay.
- **SC-008**: Giao dien phan hoi muot ma, khong giat lag khi thao tac voi 50+ task tren Gantt chart.
- **SC-009**: 100% task trong Gantt chart phai hien thi dung ngay lam viec (khong tinh T7, CN).

## Assumptions

- Mac dinh su dung 9 teams: PM, Design, Art, Dev, Client, Server, QC, Multimedia, OP.
- Mac dinh su dung 3 phases: Pre-production (W1-W2), Production (W3-W6), Testing & QA (W7-W8).
- Ngay bat dau du an mac dinh la 03/03/2026, tong thoi gian 9 tuan.
- Moi du an co danh sach member mac dinh theo bang teams & members trong project.info.md.
- Giao dien su dung tieng Viet cho tat ca text hien thi.
- Dark theme la giao dien mac dinh.
- He thong khong yeu cau phan quyen chi tiet (role-based access) - tat ca nguoi dung dang nhap co quyen nhu nhau.
