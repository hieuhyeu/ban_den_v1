create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists players_user_sort_order_uq on public.players (user_id, sort_order);

create table if not exists public.player_scores (
  player_id uuid primary key references public.players (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score int not null default 0
);

create index if not exists player_scores_user_id_idx on public.player_scores (user_id);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  seq int not null,
  actor_player_id uuid not null references public.players (id) on delete cascade,
  target_player_id uuid not null references public.players (id) on delete cascade,
  ball int not null,
  value int not null,
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

create unique index if not exists score_events_user_seq_uq on public.score_events (user_id, seq);
create index if not exists score_events_user_created_at_idx on public.score_events (user_id, created_at desc);

create table if not exists public.user_cursors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cursor_seq int not null default 0,
  next_seq int not null default 1
);

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.player_scores enable row level security;
alter table public.score_events enable row level security;
alter table public.user_cursors enable row level security;

create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());

create policy players_select on public.players for select using (user_id = auth.uid());
create policy players_insert on public.players for insert with check (user_id = auth.uid());
create policy players_update on public.players for update using (user_id = auth.uid());
create policy players_delete on public.players for delete using (user_id = auth.uid());

create policy player_scores_select on public.player_scores for select using (user_id = auth.uid());
create policy player_scores_insert on public.player_scores for insert with check (user_id = auth.uid());
create policy player_scores_update on public.player_scores for update using (user_id = auth.uid());
create policy player_scores_delete on public.player_scores for delete using (user_id = auth.uid());

create policy score_events_select on public.score_events for select using (user_id = auth.uid());
create policy score_events_insert on public.score_events for insert with check (user_id = auth.uid());
create policy score_events_update on public.score_events for update using (user_id = auth.uid());
create policy score_events_delete on public.score_events for delete using (user_id = auth.uid());

create policy user_cursors_select on public.user_cursors for select using (user_id = auth.uid());
create policy user_cursors_insert on public.user_cursors for insert with check (user_id = auth.uid());
create policy user_cursors_update on public.user_cursors for update using (user_id = auth.uid());

create or replace function public.ensure_cursor_row()
returns public.user_cursors
language plpgsql
as $$
declare
  v_row public.user_cursors;
begin
  insert into public.user_cursors (user_id) values (auth.uid())
  on conflict (user_id) do nothing;

  select * into v_row from public.user_cursors where user_id = auth.uid();
  return v_row;
end;
$$;

create or replace function public.create_player()
returns public.players
language plpgsql
as $$
declare
  v_count int;
  v_order int;
  v_name text;
  v_player public.players;
begin
  select count(*) into v_count from public.players where user_id = auth.uid();
  if v_count >= 4 then
    raise exception 'max_players_reached';
  end if;

  v_order := v_count + 1;
  v_name := 'chó ngu ' || v_order::text;

  insert into public.players (user_id, name, sort_order)
  values (auth.uid(), v_name, v_order)
  returning * into v_player;

  insert into public.player_scores (player_id, user_id, score)
  values (v_player.id, auth.uid(), 0);

  return v_player;
end;
$$;

create or replace function public.get_board_state()
returns jsonb
language sql
as $$
select jsonb_build_object(
  'cursor', (select cursor_seq from public.user_cursors where user_id = auth.uid()),
  'players', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'sortOrder', p.sort_order,
          'score', ps.score
        )
        order by p.sort_order asc
      )
      from public.players p
      join public.player_scores ps on ps.player_id = p.id
      where p.user_id = auth.uid()
    ),
    '[]'::jsonb
  ),
  'history', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'seq', e.seq,
          'actorPlayerId', e.actor_player_id,
          'targetPlayerId', e.target_player_id,
          'ball', e.ball,
          'value', e.value,
          'createdAt', e.created_at,
          'isDeleted', e.is_deleted
        )
        order by e.seq desc
      )
      from public.score_events e
      where e.user_id = auth.uid() and e.is_deleted = false
      limit 200
    ),
    '[]'::jsonb
  )
);
$$;

create or replace function public.apply_event(actor_player_id uuid, target_player_id uuid, ball int)
returns jsonb
language plpgsql
as $$
declare
  v_cursor public.user_cursors;
  v_value int;
  v_seq int;
  v_event public.score_events;
begin
  if actor_player_id = target_player_id then
    raise exception 'actor_equals_target';
  end if;

  if not exists (select 1 from public.players where id = actor_player_id and user_id = auth.uid()) then
    raise exception 'invalid_actor';
  end if;

  if not exists (select 1 from public.players where id = target_player_id and user_id = auth.uid()) then
    raise exception 'invalid_target';
  end if;

  if ball = 3 then v_value := 1;
  elsif ball = 6 then v_value := 2;
  elsif ball = 9 then v_value := 3;
  else
    raise exception 'invalid_ball';
  end if;

  v_cursor := public.ensure_cursor_row();

  update public.user_cursors
  set cursor_seq = cursor_seq,
      next_seq = next_seq
  where user_id = auth.uid()
  returning * into v_cursor;

  if v_cursor.cursor_seq < (v_cursor.next_seq - 1) then
    update public.score_events
    set is_deleted = true
    where user_id = auth.uid() and seq > v_cursor.cursor_seq and is_deleted = false;
  end if;

  v_seq := v_cursor.next_seq;

  insert into public.score_events (
    user_id, seq, actor_player_id, target_player_id, ball, value
  ) values (
    auth.uid(), v_seq, actor_player_id, target_player_id, ball, v_value
  ) returning * into v_event;

  update public.player_scores
  set score = score + v_value
  where user_id = auth.uid() and player_id = actor_player_id;

  update public.player_scores
  set score = score - v_value
  where user_id = auth.uid() and player_id = target_player_id;

  update public.user_cursors
  set cursor_seq = v_seq,
      next_seq = v_seq + 1
  where user_id = auth.uid();

  return public.get_board_state();
end;
$$;

create or replace function public.undo()
returns jsonb
language plpgsql
as $$
declare
  v_cursor public.user_cursors;
  v_event public.score_events;
  v_prev int;
begin
  v_cursor := public.ensure_cursor_row();

  if v_cursor.cursor_seq <= 0 then
    return public.get_board_state();
  end if;

  select * into v_event
  from public.score_events
  where user_id = auth.uid() and seq = v_cursor.cursor_seq and is_deleted = false;

  if not found then
    update public.user_cursors set cursor_seq = 0 where user_id = auth.uid();
    return public.get_board_state();
  end if;

  update public.player_scores
  set score = score - v_event.value
  where user_id = auth.uid() and player_id = v_event.actor_player_id;

  update public.player_scores
  set score = score + v_event.value
  where user_id = auth.uid() and player_id = v_event.target_player_id;

  select coalesce(max(seq), 0) into v_prev
  from public.score_events
  where user_id = auth.uid() and seq < v_event.seq and is_deleted = false;

  update public.user_cursors set cursor_seq = v_prev where user_id = auth.uid();

  return public.get_board_state();
end;
$$;

create or replace function public.redo()
returns jsonb
language plpgsql
as $$
declare
  v_cursor public.user_cursors;
  v_event public.score_events;
begin
  v_cursor := public.ensure_cursor_row();

  select * into v_event
  from public.score_events
  where user_id = auth.uid() and seq > v_cursor.cursor_seq and is_deleted = false
  order by seq asc
  limit 1;

  if not found then
    return public.get_board_state();
  end if;

  update public.player_scores
  set score = score + v_event.value
  where user_id = auth.uid() and player_id = v_event.actor_player_id;

  update public.player_scores
  set score = score - v_event.value
  where user_id = auth.uid() and player_id = v_event.target_player_id;

  update public.user_cursors set cursor_seq = v_event.seq where user_id = auth.uid();

  return public.get_board_state();
end;
$$;
