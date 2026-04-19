create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  background_color text not null default '#ffffff',
  grid_enabled boolean not null default false,
  thumbnail_path text,
  duplicate_warning_suppressed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  body text not null default '',
  tag_names text[] not null default '{}',
  color text not null default '#f4f1e8',
  is_locked boolean not null default false,
  x double precision not null,
  y double precision not null,
  child_count integer not null default 0 check (child_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hierarchy_links (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases(id) on delete cascade,
  parent_card_id uuid not null references public.cards(id) on delete cascade,
  child_card_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint hierarchy_links_not_self check (parent_card_id <> child_card_id),
  constraint hierarchy_links_unique unique (canvas_id, parent_card_id, child_card_id)
);

create table if not exists public.related_links (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases(id) on delete cascade,
  card_a_id uuid not null references public.cards(id) on delete cascade,
  card_b_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint related_links_not_self check (card_a_id <> card_b_id),
  constraint related_links_sorted check (card_a_id::text < card_b_id::text),
  constraint related_links_unique unique (canvas_id, card_a_id, card_b_id)
);

create table if not exists public.card_attachments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  kind text not null check (kind in ('image', 'pdf', 'txt')),
  created_at timestamptz not null default now()
);

create index if not exists canvases_user_id_updated_at_idx on public.canvases(user_id, updated_at desc);
create index if not exists cards_canvas_id_idx on public.cards(canvas_id);
create index if not exists cards_canvas_id_updated_at_idx on public.cards(canvas_id, updated_at desc);
create index if not exists cards_tag_names_idx on public.cards using gin(tag_names);
create index if not exists hierarchy_links_canvas_id_idx on public.hierarchy_links(canvas_id);
create index if not exists hierarchy_links_parent_card_id_idx on public.hierarchy_links(parent_card_id);
create index if not exists hierarchy_links_child_card_id_idx on public.hierarchy_links(child_card_id);
create index if not exists related_links_canvas_id_idx on public.related_links(canvas_id);
create index if not exists card_attachments_card_id_created_at_idx on public.card_attachments(card_id, created_at asc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_canvases_updated_at on public.canvases;
create trigger set_canvases_updated_at
before update on public.canvases
for each row
execute function public.set_updated_at();

drop trigger if exists set_cards_updated_at on public.cards;
create trigger set_cards_updated_at
before update on public.cards
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.canvases enable row level security;
alter table public.cards enable row level security;
alter table public.hierarchy_links enable row level security;
alter table public.related_links enable row level security;
alter table public.card_attachments enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "canvases_own_all"
on public.canvases
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "cards_own_all"
on public.cards
for all
using (
  exists (
    select 1
    from public.canvases
    where canvases.id = cards.canvas_id
      and canvases.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.canvases
    where canvases.id = cards.canvas_id
      and canvases.user_id = auth.uid()
  )
);

create policy "hierarchy_links_own_all"
on public.hierarchy_links
for all
using (
  exists (
    select 1
    from public.canvases
    where canvases.id = hierarchy_links.canvas_id
      and canvases.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.canvases
    where canvases.id = hierarchy_links.canvas_id
      and canvases.user_id = auth.uid()
  )
);

create policy "related_links_own_all"
on public.related_links
for all
using (
  exists (
    select 1
    from public.canvases
    where canvases.id = related_links.canvas_id
      and canvases.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.canvases
    where canvases.id = related_links.canvas_id
      and canvases.user_id = auth.uid()
  )
);

create policy "card_attachments_own_all"
on public.card_attachments
for all
using (
  exists (
    select 1
    from public.cards
    join public.canvases on canvases.id = cards.canvas_id
    where cards.id = card_attachments.card_id
      and canvases.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.cards
    join public.canvases on canvases.id = cards.canvas_id
    where cards.id = card_attachments.card_id
      and canvases.user_id = auth.uid()
  )
);
