create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  display_name text not null default 'Redaksi Kanal',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_sessions (
  token uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '12 hours',
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('Publik', 'Budaya', 'Komunitas', 'Opini')),
  author text not null default 'Redaksi Kanal',
  excerpt text not null,
  content text not null,
  image text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.news enable row level security;

drop policy if exists "public can read published news" on public.news;
create policy "public can read published news"
on public.news
for select
to anon, authenticated
using (published = true);

insert into public.admin_users (username, password_hash, display_name)
values ('admin', crypt('kab2026', gen_salt('bf')), 'Redaksi Kanal')
on conflict (username) do update
set password_hash = excluded.password_hash,
    display_name = excluded.display_name,
    active = true;

create or replace function public.touch_news_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_news_updated_at on public.news;
create trigger touch_news_updated_at
before update on public.news
for each row execute function public.touch_news_updated_at();

create or replace function public.login_admin(input_username text, input_password text)
returns table(token uuid, display_name text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_user public.admin_users%rowtype;
  created_token uuid;
  session_expiry timestamptz;
begin
  select *
  into matched_user
  from public.admin_users
  where username = input_username
    and active = true
    and password_hash = crypt(input_password, password_hash);

  if matched_user.id is null then
    raise exception 'Username atau password salah';
  end if;

  delete from public.admin_sessions where expires_at < now();

  insert into public.admin_sessions (admin_user_id)
  values (matched_user.id)
  returning admin_sessions.token, admin_sessions.expires_at
  into created_token, session_expiry;

  return query select created_token, matched_user.display_name, session_expiry;
end;
$$;

create or replace function public.require_admin(session_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
begin
  select admin_user_id
  into admin_id
  from public.admin_sessions
  where token = session_token
    and expires_at > now();

  if admin_id is null then
    raise exception 'Session admin tidak valid';
  end if;

  return admin_id;
end;
$$;

create or replace function public.logout_admin(session_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_sessions where token = session_token;
end;
$$;

create or replace function public.get_admin_news(session_token uuid)
returns setof public.news
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin(session_token);

  return query
  select *
  from public.news
  order by updated_at desc;
end;
$$;

create or replace function public.save_admin_news(
  session_token uuid,
  input_id uuid,
  input_title text,
  input_category text,
  input_author text,
  input_excerpt text,
  input_content text,
  input_image text,
  input_published boolean
)
returns public.news
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_news public.news%rowtype;
begin
  perform public.require_admin(session_token);

  if input_id is null then
    insert into public.news (title, category, author, excerpt, content, image, published)
    values (
      trim(input_title),
      input_category,
      trim(input_author),
      trim(input_excerpt),
      trim(input_content),
      nullif(trim(coalesce(input_image, '')), ''),
      input_published
    )
    returning * into saved_news;
  else
    update public.news
    set title = trim(input_title),
        category = input_category,
        author = trim(input_author),
        excerpt = trim(input_excerpt),
        content = trim(input_content),
        image = nullif(trim(coalesce(input_image, '')), ''),
        published = input_published
    where id = input_id
    returning * into saved_news;
  end if;

  return saved_news;
end;
$$;

create or replace function public.toggle_admin_news(session_token uuid, input_id uuid)
returns public.news
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_news public.news%rowtype;
begin
  perform public.require_admin(session_token);

  update public.news
  set published = not published
  where id = input_id
  returning * into saved_news;

  return saved_news;
end;
$$;

create or replace function public.delete_admin_news(session_token uuid, input_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_admin(session_token);

  delete from public.news where id = input_id;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.news to anon, authenticated;
grant execute on function public.login_admin(text, text) to anon, authenticated;
grant execute on function public.logout_admin(uuid) to anon, authenticated;
grant execute on function public.get_admin_news(uuid) to anon, authenticated;
grant execute on function public.save_admin_news(uuid, uuid, text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.toggle_admin_news(uuid, uuid) to anon, authenticated;
grant execute on function public.delete_admin_news(uuid, uuid) to anon, authenticated;
