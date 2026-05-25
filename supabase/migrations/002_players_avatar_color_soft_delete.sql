alter table public.players
  add column if not exists color_key text not null default 'violet',
  add column if not exists avatar_url text null,
  add column if not exists deleted_at timestamptz null;

alter table public.players
  drop constraint if exists players_color_key_check;

alter table public.players
  add constraint players_color_key_check
  check (color_key in ('violet', 'indigo', 'cyan', 'teal', 'lime', 'yellow', 'orange', 'rose'));

drop index if exists public.players_user_sort_order_uq;
create unique index if not exists players_user_sort_order_active_uq
on public.players (user_id, sort_order)
where deleted_at is null;

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
          'colorKey', p.color_key,
          'avatarUrl', p.avatar_url,
          'score', ps.score
        )
        order by p.sort_order asc
      )
      from public.players p
      join public.player_scores ps on ps.player_id = p.id
      where p.user_id = auth.uid() and p.deleted_at is null
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

create or replace function public.create_player()
returns public.players
language plpgsql
as $$
declare
  v_count int;
  v_order int;
  v_name text;
  v_color text;
  v_player public.players;
begin
  select count(*) into v_count from public.players where user_id = auth.uid() and deleted_at is null;
  if v_count >= 4 then
    raise exception 'max_players_reached';
  end if;

  select x.n into v_order
  from (values (1),(2),(3),(4)) as x(n)
  where not exists (
    select 1 from public.players p
    where p.user_id = auth.uid() and p.deleted_at is null and p.sort_order = x.n
  )
  order by x.n asc
  limit 1;

  v_name := 'chó ngu ' || v_order::text;

  v_color := case v_order
    when 1 then 'violet'
    when 2 then 'indigo'
    when 3 then 'cyan'
    else 'teal'
  end;

  insert into public.players (user_id, name, sort_order, color_key, avatar_url)
  values (auth.uid(), v_name, v_order, v_color, null)
  returning * into v_player;

  insert into public.player_scores (player_id, user_id, score)
  values (v_player.id, auth.uid(), 0);

  return v_player;
end;
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

  if not exists (
    select 1 from public.players where id = actor_player_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'invalid_actor';
  end if;

  if not exists (
    select 1 from public.players where id = target_player_id and user_id = auth.uid() and deleted_at is null
  ) then
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
    select coalesce(max(seq), 0) into v_prev
    from public.score_events
    where user_id = auth.uid() and seq < v_cursor.cursor_seq and is_deleted = false;

    update public.user_cursors set cursor_seq = v_prev where user_id = auth.uid();
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

create or replace function public.delete_player(p_player_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_cursor public.user_cursors;
  v_old_cursor int;
  v_event public.score_events;
  v_new_cursor int;
begin
  v_cursor := public.ensure_cursor_row();
  v_old_cursor := v_cursor.cursor_seq;

  if not exists (
    select 1 from public.players p
    where p.id = p_player_id and p.user_id = auth.uid() and p.deleted_at is null
  ) then
    raise exception 'player_not_found';
  end if;

  for v_event in
    select *
    from public.score_events e
    where e.user_id = auth.uid()
      and e.is_deleted = false
      and e.seq <= v_old_cursor
      and (e.actor_player_id = p_player_id or e.target_player_id = p_player_id)
    order by e.seq desc
  loop
    update public.player_scores
    set score = score - v_event.value
    where user_id = auth.uid() and player_id = v_event.actor_player_id;

    update public.player_scores
    set score = score + v_event.value
    where user_id = auth.uid() and player_id = v_event.target_player_id;
  end loop;

  update public.score_events
  set is_deleted = true
  where user_id = auth.uid()
    and is_deleted = false
    and (actor_player_id = p_player_id or target_player_id = p_player_id);

  update public.player_scores
  set score = 0
  where user_id = auth.uid() and player_id = p_player_id;

  select coalesce(max(seq), 0) into v_new_cursor
  from public.score_events
  where user_id = auth.uid() and is_deleted = false and seq < v_old_cursor;

  update public.user_cursors
  set cursor_seq = v_new_cursor
  where user_id = auth.uid();

  update public.players
  set deleted_at = now()
  where id = p_player_id and user_id = auth.uid();

  return public.get_board_state();
end;
$$;
