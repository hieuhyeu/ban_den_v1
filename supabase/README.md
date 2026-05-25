# Supabase (schema + RLS + RPC)

## Setup nhanh
- Tạo Supabase project mới
- Vào SQL Editor → chạy các migration theo thứ tự:
  - `supabase/migrations/001_init.sql`
  - `supabase/migrations/002_players_avatar_color_soft_delete.sql`
  - `supabase/migrations/003_storage_avatars_bucket.sql`
  - `supabase/migrations/004_profiles_trigger.sql`
  - `supabase/migrations/005_storage_avatars_policy_fix.sql`
- Lấy `SUPABASE_URL` và `SUPABASE_ANON_KEY`

## Auth (MVP)
- Authentication → Providers → Email: tắt Confirm email (khuyến nghị) để username/password hoạt động mượt
- Backend signUp sẽ gửi `user_metadata.username`; trigger sẽ insert vào `public.profiles`

## RPC dùng bởi backend
- `create_player()`
- `apply_event(actor_player_id uuid, target_player_id uuid, ball int)`
- `undo()`
- `redo()`
- `get_board_state()`
 - `delete_player(p_player_id uuid)`

## RLS
- Tất cả bảng đều bật RLS và giới hạn theo `auth.uid()`

## Avatar storage
- Bucket: `avatars` (public read)
- Quy ước path khuyến nghị: `${userId}/${playerId}.jpg`
- FE upload trực tiếp lên Storage, sau đó PATCH lưu `avatarUrl` vào `players.avatar_url`
