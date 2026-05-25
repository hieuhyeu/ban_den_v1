create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
as $$
declare
  v_username text;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', null);
  if v_username is null or length(trim(v_username)) = 0 then
    v_username := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, username)
  values (new.id, v_username)
  on conflict (id) do update set username = excluded.username;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

