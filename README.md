# Bắn đền

Web app mobile-first để tính điểm khi chơi “Bắn đền” (9 bi).

## UI đã có
- Player card có màu (8 palette) + avatar (chọn/chụp ảnh)
- Trang Edit Player riêng (back + xoá + chọn avatar + chọn màu)
- Scoreboard: ghi điểm bằng bottom-sheet, có Undo/Redo, History
- Random wheel: hiển thị theo màu player

## Monorepo structure
- `frontend/` Vue 3 + Vite + Pinia + Tailwind
- `backend/` Node.js + Fastify + TypeScript
- `supabase/` SQL migrations + RLS + RPC

## Chạy local (UI mock)
### Frontend
```bash
cd frontend
npm install
npm run dev
```

Tạo file env (bắt buộc để FE gọi được backend + upload avatar):
```bash
cp .env.example .env.local
npm run dev
Điền `VITE_API_BASE_URL` và Supabase keys trong `.env.local`.
Mặc định đang chạy mock login và mock board logic (localStorage), chưa cần Supabase.

### Backend (stub cho phase Supabase)
```bash
cd backend
cp .env.example .env
npm install
npm run dev

## Supabase setup
- Tạo Supabase project
- Chạy migration: `supabase/migrations/001_init.sql`
- Điền env:
  - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
  - Backend: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

Chi tiết xem [supabase/README.md](file:///c:/Users/Admin/Desktop/trae/ban_den/supabase/README.md)
