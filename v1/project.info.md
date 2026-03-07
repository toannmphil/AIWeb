# Poker Texas Build Plan - Project Specification

## 1. Tong quan (Overview)

**Ten du an:** Poker Texas Build Plan (PTB)
**Muc dich:** Ung dung quan ly du an (Project Management) chuyen dung cho viec phat trien game Poker Texas Hold'em. Cung cap Gantt chart, Kanban board, quan ly task/team/member va dong bo du lieu real-time qua server.

**Ngay bat dau du an:** 03/03/2026
**Thoi gian:** 9 tuan (Pre-production -> Production -> Testing & QA)

---

## 2. Kien truc he thong (Architecture)

### Frontend
- **Single-page application** trong 1 file `index.html` duy nhat
- **React 18** (CDN) + **Babel standalone** - khong co build step
- UI dark theme, responsive, giao dien tieng Viet
- Thu vien: ExcelJS (export Excel), SheetJS/XLSX (import Excel)

### Backend
- **Node.js + Express** tai `/opt/poker-plan/server.js` tren VPS
- **PostgreSQL 16** - luu du lieu dang JSON blob (JSONB column) trong bang `projects`
- **JWT authentication** (30 ngay het han), bcryptjs hash password
- **PM2** quan ly process

### Data Model
- Du lieu luu dang JSON blob (khong normalize thanh nhieu bang)
- Cau truc: `{ tasks, members, teamColors, phaseColors, version, savedAt }`
- Tasks to chuc theo cay: Epic (phase) -> Children (task con)
- Moi task co: id, name, team, assignee, priority, status, start, end, pct, deps, notes

---

## 3. Tinh nang chi tiet (Features)

### 3.1 Xac thuc (Authentication)
- Man hinh dang nhap voi username/password
- JWT token luu trong localStorage, tu dong logout khi het han
- Da nguoi dung co the truy cap dong thoi

### 3.2 Quan ly Task (Task Management)
- **CRUD task:** Tao, xem, sua, xoa task
- **Cau truc phan cap:** 3 Epic (Pre-production, Production, Testing & QA) chua cac task con
- **Thuoc tinh task:**
  - Ten task, Team, Assignee (nguoi thuc hien)
  - Priority: High / Medium / Low
  - Status: To Do / In Progress / Done / Blocked
  - Ngay bat dau (Start), ngay ket thuc (End), Duration (working days)
  - Tien do (Progress %): slider 0-100%
  - Dependencies: lien ket phu thuoc giua cac task
  - Notes: ghi chu

### 3.3 Auto Schedule (Tu dong lap lich)
- Tu dong tinh lai ngay bat dau/ket thuc dua tren dependencies
- Bo qua ngay cuoi tuan (T7, CN) - tu dong chuyen sang Thu 2
- Tu dong cap nhat ngay cua Epic dua tren task con
- Tinh toan working days (chi tinh ngay lam viec)

### 3.4 Gantt Chart
- Hien thi timeline theo tuan (9 tuan)
- Thanh Gantt mau theo team, hien thi tien do
- Highlight tuan hien tai (today)
- Critical Path: danh dau duong toi han (task co anh huong den deadline cuoi)
- Dong bo scroll giua Task Panel va Gantt Panel
- Click vao thanh Gantt de xem/sua chi tiet task

### 3.5 Board View (Kanban)
- 4 cot: To Do, In Progress, Done, Blocked
- Card hien thi ten task, team, assignee, priority, progress bar
- Filter theo team va search

### 3.6 Bo loc va Tim kiem (Filters & Search)
- Loc theo Phase (Pre-production / Production / Testing & QA)
- Loc theo Team (PM, Design, Art, Dev, Client, Server, QC, Multimedia, OP)
- Loc theo Status
- Tim kiem theo ten task hoac ten member
- Thong ke tong hop: total, in progress, done, blocked

### 3.7 Detail Panel (Bang chi tiet)
- Slide-in panel ben phai khi click vao task
- Chinh sua tat ca thuoc tinh task
- DatePicker: nhap DD/MM/YYYY hoac chon tu lich
- DepsSelector: chon dependency bang text input hoac multi-select
- Tu dong cap nhat ngay khi thay doi dependency
- Nut Update (luu thay doi), Delete Task

### 3.8 Admin Panel
- **Quan ly Member:** Them/sua/xoa thanh vien, doi team, doi ten
- **Quan ly Team:** Them/xoa team, doi mau team
- **Quan ly Phase:** Them/sua/xoa phase, doi mau phase, tu dong tao Epic tuong ung

### 3.9 Import / Export
- **Export JSON:** Backup toan bo du lieu ra file `.json`
- **Export Excel:** Xuat file `.xlsx` co dinh dang mau sac (ExcelJS), styled headers, team/status/priority color-coded
- **Export Jira CSV:** Xuat CSV tuong thich Jira import (Epic rows, Epic Link, ISO date, Original Estimate)
- **Import JSON:** Tai du lieu tu file `.json` backup
- **Import Excel:** Doc file `.xlsx`/`.xls`, tu dong nhan dien cot (detectHeaders), normalize date/status/priority/team, nhom theo phase

### 3.10 Luu tru va Dong bo (Data Persistence & Sync)
- **localStorage cache:** Luu tuc thi (lsSave) de load nhanh khi mo lai
- **API save:** Debounced 1 giay, gui du lieu len server
- **Version conflict detection:** Khi 2 nguoi sua cung luc, thong bao va cho tai lai
- **Auto-poll:** Kiem tra version moi moi 30 giay, tu dong tai lai neu co thay doi
- **beforeunload:** Luu localStorage truoc khi dong tab

### 3.11 Quan ly du lieu
- **Reset:** Khoi phuc du lieu ve mac dinh (INITIAL_TASKS)
- **ID management:** Tu dong tang ID (initNextId, genId)

---

## 4. Teams & Members (Mac dinh)

| Team        | Members                                            |
|-------------|-----------------------------------------------------|
| PM          | ToanNM                                              |
| Design      | LocPT, QuynhNH, BinhNT                              |
| Art         | HoaGTT, TuND4, NgocLA                               |
| Dev         | CongNN, HuongBP, DienDQ, CongNT7, PhucNN, SonBNT   |
| QC          | NhanNT3                                             |
| Multimedia  | HungVM2                                             |
| OP          | NienND                                              |

---

## 5. Phases & Task tong quan

### Pre-production (W1-W2): 8 tasks
- GDD, Resource Planning, UI/UX Wireframes, Art Style Guide
- Technical Architecture, Prototype, QA Test Plan

### Production (W3-W6): 18 tasks
- Art: Card Design, Table/Background, Character/Avatar, Chip/Token
- Design: Ban choi, UI Lobby/Gameplay/Shop, Animation Specs
- Dev: Core Engine, Betting, Multiplayer, UI Implementation, Backend API, AI Bot, Shop/IAP
- Multimedia: SFX, BGM, Card Animation/VFX
- PM: Sprint Review, OP: Build & Deployment

### Testing & QA (W7-W8): 8 tasks
- Functional Testing, Integration Testing, Performance Testing
- Bug Fixing, UI/UX Polish, Art Polish
- Final Build & Release, Release Sign-off

---

## 6. Cong nghe su dung (Tech Stack)

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 18 (CDN), Babel standalone, CSS custom  |
| Backend   | Node.js, Express                              |
| Database  | PostgreSQL 16 (JSONB)                         |
| Auth      | JWT, bcryptjs                                 |
| Process   | PM2                                           |
| Libraries | ExcelJS, SheetJS/XLSX                         |
| Hosting   | VPS (76.13.213.204)                           |

---

## 7. Deploy Workflow

1. Chinh sua `index.html` tai may local
2. SCP upload len VPS: `scp index.html root@VPS:/opt/poker-plan/public/`
3. Khong can restart (static file). Chi restart khi thay doi `server.js`: `pm2 restart poker-plan`
