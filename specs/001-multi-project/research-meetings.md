# Research: Meeting Minutes with @Mention

## Decision 1: Data Storage Location

**Decision**: Thêm `meetings[]` array vào `project.data` JSONB blob, cùng cấp với `tasks[]`.

**Rationale**:
- Tuân thủ constitution: "Do NOT normalize the JSON blob into relational tables"
- Meetings là per-project data, thuộc về project giống tasks
- Tận dụng được version conflict detection có sẵn qua `saveProjectData()`
- `GET /api/project/:id` tự động trả meetings kèm tasks, không cần thêm API call khi load
- Blob size manageable: ~50-100 meetings/project, mỗi meeting ~1-2KB

**Alternatives considered**:
- Bảng `meetings` riêng → vi phạm constitution, cần thêm versioning mechanism
- Lưu trong `settings` → meetings là per-project, không phải shared data

## Decision 2: Meeting Data Structure

**Decision**: Cấu trúc gọn, tập trung vào ghi chú + @mention:

```json
{
  "id": 1,
  "title": "Sprint Review - Week 10",
  "date": "10/03/2026",
  "content": "Reviewed @CongNN card engine. @HuongBP reported betting 70% done.\n\nDecisions:\n- Postpone AI bot to sprint 4\n\nAction items:\n- @ToanNM update timeline by 12/03",
  "attendees": ["ToanNM", "CongNN", "HuongBP"],
  "createdBy": "admin",
  "createdAt": "2026-03-10T07:00:00.000Z"
}
```

**Rationale**:
- `content` chứa tất cả: nội dung, decisions, action items dạng free-text → đơn giản, linh hoạt
- `attendees` là array of member names (reference từ shared members list)
- Không tách `decisions[]`, `actionItems[]` thành array riêng → tránh over-engineering, user ghi tự do trong content
- Không cần `time`, `duration`, `location`, `tags` → có thể ghi trong content nếu cần

**Alternatives considered**:
- Tách actionItems thành structured array → phức tạp UI, user chưa yêu cầu
- Rich text format (HTML) → overkill, plain text + @mention đủ dùng

## Decision 3: @Mention Implementation

**Decision**: `<textarea>` + floating autocomplete dropdown khi gõ `@`. Lưu dạng plain text `@MemberName`. Render highlight khi hiển thị.

**Rationale**:
- App dùng React 18 CDN + Babel standalone, không có build step → không dùng npm package
- `contentEditable` + React có known friction (React issue #2047) → quá phức tạp cho MVP
- `<textarea>` đã được dùng cho task notes → consistent
- Khi gõ `@` + ký tự → filter members list → show dropdown → chọn → insert `@MemberName` vào textarea
- Khi hiển thị (read mode), parse regex `@(\w+)` → wrap trong `<span class="mention">` → highlight xanh

**Implementation details**:
1. Textarea `onInput` → detect `@` + partial text trước cursor
2. Filter members từ shared settings theo prefix
3. Show dropdown positioned dưới textarea (không cần caret position trong textarea)
4. Arrow keys + Enter để chọn, Escape để đóng
5. Insert `@FullName` vào textarea value tại cursor position

**Alternatives considered**:
- `contentEditable` div → phức tạp React integration, caret management
- react-mentions npm → cần build step, vi phạm constraint
- Không có autocomplete, user gõ tay `@Name` → dễ typo, UX kém

## Decision 4: UI Placement

**Decision**: Tab "Minutes" riêng trong view switcher (cạnh Gantt/Board), detail panel slide-out khi click meeting.

**Rationale**:
- Meeting minutes là project-level feature, không phải task-level → cần space riêng
- App đã có pattern tab switching → thêm tab tự nhiên
- Slide-out detail panel tái sử dụng pattern có sẵn từ task detail
- List view cho phép browse, search, filter theo date

**Alternatives considered**:
- Modal → kém cho browsing danh sách meetings
- Sidebar → chiếm space Gantt/table
- Sub-tab trong task panel → meetings không thuộc về 1 task cụ thể

## Decision 5: API Endpoints

**Decision**: 4 endpoints CRUD theo pattern giống tasks API:

```
GET    /api/project/:id/meetings              → list (filter ?from=&to=)
POST   /api/project/:id/meetings              → create
PUT    /api/project/:id/meetings/:meetingId    → update
DELETE /api/project/:id/meetings/:meetingId    → delete
```

**Rationale**:
- Theo đúng pattern tasks API đã có (constitution: RESTful conventions)
- Server đọc JSONB blob, mutate `meetings[]`, gọi `saveProjectData()`
- Dùng chung helper `getProjectData()`, `saveProjectData()` → code reuse

## Decision 6: @Mention Rendering

**Decision**: Hai chế độ hiển thị:
- **Edit mode**: Plain text trong textarea, `@MemberName` là text thường
- **View mode**: Parse `@MemberName` → `<span class="mention">@MemberName</span>` với background xanh nhạt, font-weight bold

**Rationale**:
- Đơn giản nhất: lưu plain text, chỉ format khi hiển thị
- Không cần lưu structured mention data (offset, length) → tránh desync khi edit
- Regex parse đủ chính xác vì member names là unique identifiers

**Parse logic**:
```javascript
function renderMentions(text, members) {
  const memberNames = members.map(m => m.name);
  return text.replace(/@(\w+)/g, (match, name) => {
    if (memberNames.includes(name)) {
      return `<span class="mention">${match}</span>`;
    }
    return match;
  });
}
```
