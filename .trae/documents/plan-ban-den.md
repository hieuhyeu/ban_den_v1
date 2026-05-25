# Plan dự án “Bắn đền” (Web mobile tính điểm)

## 0) Trae Mastery (để làm nhanh và đúng ngay từ đầu)

### Builder Mode (cách mình sẽ triển khai)
- Mình sẽ tạo nguyên bộ skeleton (FE/BE/Supabase SQL) theo từng “module” để bạn review sớm: UI trước → tích hợp DB/Auth sau.
- Mỗi module sẽ có: UI + state + API + migration/RLS + test tối thiểu + cập nhật README.

### Context Management (bạn đưa ngữ cảnh cho AI bằng @)
- @Workspace: cho phép mình nhìn toàn repo (hiện tại đang trống).
- @Files: kéo thả PRD/ảnh UI tham khảo/brand guideline (nếu có).
- @Docs: bạn có thể dán luật chơi mở rộng (nếu có), hoặc yêu cầu UI style (iOS-like / Material / “casino”).

### Tool Integration (Terminal & cấu trúc project)
- Mình sẽ dùng terminal để scaffold Vite/Vue, cài deps, chạy dev server, build, test.
- Tạo cấu trúc monorepo gọn: frontend (Netlify) + backend (Render) + supabase (SQL migrations/RLS).

## 1) Tóm tắt mục tiêu
- Xây web app mobile-first để tính điểm trò “Bắn đền” (9 bi).
- Luật điểm:
  - Bi 3 = +1 điểm
  - Bi 6 = +2 điểm
  - Bi 9 = +3 điểm
  - Khi người A ăn bi của người B: A +v, B -v; luôn đảm bảo tổng điểm của 4 người = 0.
- Flow:
  - Route mặc định: Trang tính điểm (nếu chưa login → chuyển Login).
  - Trang chính: header có menu (Tính điểm / Vòng xoay random), Undo/Redo, History, Add player.
  - Mỗi account lưu tối đa 4 người chơi.
- Ưu tiên UX nhanh, không giật lag, tối ưu cho điện thoại (responsive).

## 2) Tiêu chí thành công (Definition of Done)
- Login/Register bằng username + password (trải nghiệm giống username/password).
- Mỗi user có 1 bảng điểm riêng, lưu lịch sử thao tác.
- Thêm tối đa 4 player; mặc định tên “chó ngu 1..4”; cho sửa tên inline.
- Thao tác tính điểm:
  - Bấm vào điểm của 1 player → popup/bottom-sheet:
    - Chọn bi (3/6/9)
    - Chọn “người bị trừ” từ danh sách sắp xếp điểm cao → thấp
    - Xác nhận → cập nhật điểm + thêm vào lịch sử
- Undo/Redo hoạt động chuẩn (stack), thêm event mới sẽ clear redo.
- Vòng xoay random:
  - Quay chọn thứ tự; mỗi lần quay popup “ai trúng”
  - Có tùy chọn “giữ người này” để loại khỏi lần quay tiếp theo, hoặc “xóa” để vẫn tham gia vòng sau
- Không lộ secrets, áp dụng Supabase RLS đúng: user chỉ đọc/ghi dữ liệu của mình.
- Deploy:
  - FE lên Netlify
  - BE lên Render

## 3) Current State Analysis (grounded)
- Workspace hiện tại trống, chưa có mã nguồn/skeleton dự án.
- Chưa có Supabase project/schema/migrations.

## 4) Quyết định kỹ thuật (decision complete)

### 4.1 Frontend
- Framework: Vue 3 + Vite + TypeScript
- State: Pinia
- Styling: TailwindCSS (mobile-first)
- Router: Vue Router (guard chuyển Login)
- Data fetching: fetch + typed API client (không dùng lib nặng nếu chưa cần)
- PWA: bật ở mức cơ bản (installable) để trải nghiệm “app-like” trên điện thoại

### 4.2 Backend
- Node.js + TypeScript
- Framework: Fastify (nhẹ, nhanh, dễ scale)
- Supabase: dùng `@supabase/supabase-js`
- Auth strategy (username/password “giống email/password”):
  - Dùng Supabase Auth email/password ở backend, nhưng FE hiển thị trường “username”
  - Quy ước map: `email = ${username}@ban-den.local` (chặn ký tự không hợp lệ)
  - Lưu `username` thật trong bảng `profiles` để hiển thị và đảm bảo unique
  - Lý do chọn: đơn giản nhất để có session/JWT chuẩn + RLS dựa trên `auth.uid()`

### 4.3 Database (Supabase Postgres)
- Dữ liệu theo user:
  - players (tối đa 4)
  - score_events (log)
  - user_cursor (undo/redo cursor)
  - player_scores (materialized để đọc nhanh)
- Atomicity:
  - Dùng RPC Postgres function để “apply event / undo / redo” trong 1 transaction (tránh lệch điểm do race condition).
- Security:
  - Bật RLS cho toàn bộ bảng user-data
  - Policy: `user_id = auth.uid()`
  - RPC dùng `SECURITY DEFINER` tối thiểu + kiểm tra user_id nội bộ

### 4.4 Deployment
- FE/Netlify:
  - Build command: vite build
  - Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
- BE/Render:
  - Env: SUPABASE_URL, SUPABASE_ANON_KEY, (không dùng service role trong MVP)
  - Backend nhận `Authorization: Bearer <access_token>` và gọi Supabase với header đó để RLS có hiệu lực

## 5) Thiết kế dữ liệu (schema + invariants)

### 5.1 Tables
- `profiles`
  - `id uuid pk references auth.users(id)`
  - `username text unique not null`
  - `created_at timestamptz default now()`
- `players`
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null`
  - `name text not null`
  - `sort_order int not null` (1..4)
  - `created_at`, `updated_at`
- `player_scores`
  - `player_id uuid pk references players(id)`
  - `user_id uuid not null`
  - `score int not null default 0`
- `score_events`
  - `id uuid pk default gen_random_uuid()`
  - `user_id uuid not null`
  - `seq int not null` (tăng dần per user)
  - `actor_player_id uuid not null`
  - `target_player_id uuid not null`
  - `ball int not null` (3|6|9)
  - `value int not null` (1|2|3)
  - `created_at timestamptz default now()`
  - `is_deleted boolean not null default false` (để clear redo khi tạo nhánh mới)
- `user_cursors`
  - `user_id uuid pk`
  - `cursor_seq int not null default 0` (0 = chưa có event nào được apply)

### 5.2 Invariants
- Mỗi event luôn tác động 2 người: actor +value, target -value → tổng điểm luôn 0.
- Undo/Redo chỉ thay đổi “cursor_seq” + cập nhật materialized score tương ứng.
- Khi thêm event mới trong lúc đang ở quá khứ (cursor_seq < max seq):
  - Mark các event có `seq > cursor_seq` thành `is_deleted=true` (clear redo)
  - Tạo event mới với seq tiếp theo, set cursor_seq = seq mới.

## 6) API & Data Flow

### 6.1 API (backend)
- `POST /auth/register` { username, password }
- `POST /auth/login` { username, password }
- `GET /me` → trả profile + trạng thái board (players + scores + cursor + history)
- `POST /players` → tạo player mặc định (tối đa 4)
- `PATCH /players/:id` { name }
- `POST /events` { actorPlayerId, targetPlayerId, ball } → apply event
- `POST /undo`
- `POST /redo`
- `GET /history?limit=...&beforeSeq=...` (phục vụ history modal, pagination nhẹ)

### 6.2 Data Flow (mô tả luồng)
- FE login → nhận session/access_token → lưu (Pinia) → gọi backend kèm Authorization header.
- Backend validate token bằng gọi Supabase với header Authorization (RLS kiểm soát).
- Mọi thao tác điểm/undo/redo đi qua RPC trong DB để đảm bảo transaction & invariant.

## 7) UI/UX spec (mobile-first)

### 7.1 Route
- `/` Scoreboard (guard: nếu chưa login → `/login`)
- `/login` Login/Register
- `/random` Random wheel

### 7.2 Header (Scoreboard)
- Left: icon “hamburger” → mở bottom-sheet menu:
  - “Tính điểm” (route `/`)
  - “Vòng xoay random” (route `/random`)
- Middle: tiêu đề ngắn “Bắn đền”
- Right actions (ưu tiên thumb-friendly):
  - Undo
  - Redo
  - History
  - Add Player

### 7.3 Player Card
- Hiển thị: Name (editable), Score (tap để tính điểm)
- Tap Name → inline edit (enter để lưu, blur để cancel/save theo spec)
- Tap Score → mở bottom-sheet “Ghi điểm”

### 7.4 Bottom-sheet “Ghi điểm”
- Step 1: chọn bi 3/6/9 (chip to, tap nhanh)
- Step 2: chọn người bị trừ (list sort score desc)
- CTA: “Xác nhận”
- Sau confirm: đóng sheet + animate score tăng/giảm nhẹ (không giật)

### 7.5 History modal
- List event:
  - “A ăn bi 6 của B” (+2/-2) + timestamp
  - Highlight event nào đang “được apply” theo cursor (phần tương lai = mờ)
- Cho phép tap 1 event để “jump” không làm (MVP: chỉ view; Undo/Redo dùng nút)

### 7.6 Random wheel
- Hiển thị danh sách player còn trong pool
- Nút “Quay”
- Kết quả popup: “Trúng: <player>”
  - “Giữ (remove khỏi pool)” hoặc “Giữ lại (không remove)”
- Khi pool còn 0 → nút “Reset pool”

## 8) Kế hoạch triển khai theo “Phòng Ban” (module-by-module)

### Phase A — Solution Architect: xác lập kiến trúc & schema
- Tạo monorepo structure:
  - `/frontend` (Vue)
  - `/backend` (Fastify)
  - `/supabase` (SQL migrations + policies + rpc)
- Viết SQL migrations:
  - tables + indexes
  - RLS policies
  - RPC: `create_player`, `apply_event`, `undo`, `redo`, `get_board_state`

### Phase B — UI-first (đa task để bạn review sớm)
- Dựng FE UI mock (không cần backend thật):
  - Login page
  - Scoreboard header + player cards + bottom-sheets
  - Random wheel screen
  - History modal
- Dùng mock store Pinia để simulate scoring + undo/redo (pure reducer) nhằm test UX mượt.
- Bạn review UI/UX; chốt layout, spacing, font-size, hành vi sheet/popup.

### Phase C — Senior Dev: tích hợp Supabase + Backend
- Implement backend endpoints + auth mapping username→pseudo-email
- FE chuyển từ mock store sang API store:
  - login/register lấy token
  - load board state
  - add player / edit name
  - apply event / undo / redo / history

### Phase D — Tech Lead/Reviewer: harden security & RLS
- Rà soát:
  - Không dùng service role ở client
  - RLS không lộ cross-user
  - RPC kiểm tra actor/target thuộc user
  - Rate-limit nhẹ (optional) tại backend

### Phase E — QA/Tester: test & acceptance
- Unit test (backend):
  - mapping username→email
  - validate payload (ball chỉ 3/6/9)
  - undo/redo edge cases (cursor=0, redo khi không có)
- UI sanity checklist (manual):
  - add 4 players, không add được player thứ 5
  - ghi điểm liên tục, history đúng
  - undo/redo nhiều lần, cursor đúng, redo bị clear khi tạo event mới sau undo
  - random wheel remove/keep đúng

### Phase F — Technical Writer: docs
- README:
  - setup env
  - chạy FE/BE local
  - deploy Netlify/Render
  - hướng dẫn tạo Supabase project + chạy migrations

## 9) Edge cases & Non-goals (MVP)
- MVP không làm:
  - +/- 1 điểm trên card (đang tạm bỏ theo yêu cầu mới)
  - Multi-board per account (chỉ 1 bảng)
  - Multi-device realtime sync (chưa bật realtime; có thể thêm sau)
- Edge cases cần xử lý:
  - actor == target (không cho)
  - chọn bi xong nhưng cancel
  - rename rỗng/too long
  - user chưa có player nào (empty state)

## 10) Verification (cách kiểm chứng hoàn thành)
- FE:
  - Lighthouse mobile performance > 90 (mục tiêu), tránh bundle nặng
  - Interaction: tap→sheet mở < 100ms cảm nhận (không block main thread)
- BE:
  - API responses < 200ms trong điều kiện bình thường (không commit số liệu, chỉ checklist)
- DB:
  - RLS: thử user A không đọc/ghi user B

## 11) Assumptions đã chốt từ bạn
- Auth: username + password (đăng ký bằng tay)
- Mỗi account có 1 bảng riêng để lưu lịch sử
- Random: quay chọn thứ tự; popup người trúng; có “giữ tên để quay tiếp” hoặc “xóa để chọn người còn lại”
- Undo/Redo: có cả undo và redo

