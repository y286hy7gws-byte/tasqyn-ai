-- ============================================================
-- TASQYN AI — миграция Supabase / PostgreSQL
-- Intelligent Urban Flood Monitoring & Risk Intelligence Platform
-- Порядок применения: supabase db push или выполнение в SQL Editor.
-- ============================================================

-- Основная таблица инцидентов
create table if not exists public.flood_reports (
  id                uuid primary key default gen_random_uuid(),
  title             text not null constraint title_len check (char_length(title) between 5 and 120),
  description       text not null constraint desc_len check (char_length(description) between 10 and 2000),
  latitude          double precision not null check (latitude between -90 and 90),
  longitude         double precision not null check (longitude between -180 and 180),
  photo_url         text,
  water_depth       double precision check (water_depth between 0 and 300),
  accessibility     text check (accessibility in ('free', 'limited', 'blocked')),
  severity          text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  risk_score        double precision not null default 0 check (risk_score between 0 and 100),
  confidence        double precision not null default 0 check (confidence between 0 and 1),
  status            text not null default 'new' check (status in ('new', 'reviewing', 'confirmed', 'resolved')),
  ai_analysis       jsonb,
  is_demo           boolean not null default false,
  district          text,
  risk_factors      jsonb,
  reporter_contact  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists flood_reports_created_at_idx on public.flood_reports (created_at desc);
create index if not exists flood_reports_status_idx    on public.flood_reports (status);
create index if not exists flood_reports_severity_idx  on public.flood_reports (severity);
create index if not exists flood_reports_geo_idx       on public.flood_reports (latitude, longitude);

-- Комментарии служб и жителей
create table if not exists public.report_comments (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.flood_reports (id) on delete cascade,
  author      text not null default 'Житель' check (char_length(author) between 1 and 60),
  text        text not null check (char_length(text) between 3 and 500),
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists report_comments_report_idx on public.report_comments (report_id, created_at);

-- История изменений статуса (аудит)
create table if not exists public.report_history (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.flood_reports (id) on delete cascade,
  old_status  text,
  new_status  text not null,
  changed_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists report_history_report_idx on public.report_history (report_id, created_at);

-- Профили (расширение на будущее: роли админ/житель)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        text not null default 'citizen' check (role in ('citizen', 'moderator', 'admin')),
  created_at  timestamptz not null default now()
);

-- updated_at триггер
create or replace function public.tasqyn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists flood_reports_touch on public.flood_reports;
create trigger flood_reports_touch
  before update on public.flood_reports
  for each row execute function public.tasqyn_touch_updated_at();

-- Автологирование смены статуса
create or replace function public.tasqyn_log_status_change()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    insert into public.report_history (report_id, old_status, new_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end $$;

drop trigger if exists flood_reports_history on public.flood_reports;
create trigger flood_reports_history
  after update on public.flood_reports
  for each row execute function public.tasqyn_log_status_change();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.flood_reports   enable row level security;
alter table public.report_comments enable row level security;
alter table public.report_history  enable row level security;
alter table public.profiles        enable row level security;

-- Публичное чтение инцидентов
drop policy if exists "public read reports" on public.flood_reports;
create policy "public read reports" on public.flood_reports
  for select using (true);

-- Любой может отправить сообщение (вставку) об инциденте
drop policy if exists "public insert reports" on public.flood_reports;
create policy "public insert reports" on public.flood_reports
  for insert with check (
    is_demo = false
    and char_length(title) between 5 and 120
    and char_length(description) between 10 and 2000
  );

-- Обновление (статусы, комментарий) — только авторизованным службам
drop policy if exists "staff update reports" on public.flood_reports;
create policy "staff update reports" on public.flood_reports
  for update to authenticated using (true) with check (true);

drop policy if exists "public delete none" on public.flood_reports;
create policy "public delete none" on public.flood_reports
  for delete to authenticated using (true);

-- Комментарии: чтение всем, вставка всем (модерация — задача служб)
drop policy if exists "public read comments" on public.report_comments;
create policy "public read comments" on public.report_comments
  for select using (true);

drop policy if exists "anyone comment" on public.report_comments;
create policy "anyone comment" on public.report_comments
  for insert with check (char_length(text) between 3 and 500);

-- История: только чтение службами
drop policy if exists "staff read history" on public.report_history;
create policy "staff read history" on public.report_history
  for select to authenticated using (true);

-- Профили: пользователь читает/ведёт только свой
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ------------------------------------------------------------
-- Storage: bucket для фотографий подтоплений
-- Выполните отдельно, если bucket не создан:
--   insert into storage.buckets (id, name, public)
--   values ('flood-photos', 'flood-photos', true);
-- Public-read политика:
--   create policy "public read flood photos" on storage.objects
--     for select using (bucket_id = 'flood-photos');
--   create policy "public upload flood photos" on storage.objects
--     for insert with check (bucket_id = 'flood-photos'
--       and char_length(name) < 200);
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('flood-photos', 'flood-photos', true)
on conflict (id) do nothing;

create policy "public read flood photos" on storage.objects
  for select using (bucket_id = 'flood-photos');

create policy "public upload flood photos" on storage.objects
  for insert with check (
    bucket_id = 'flood-photos'
    and char_length(name) < 200
  );

-- ------------------------------------------------------------
-- Демо-данные (is_demo = true). НЕ являются реальными подтоплениями!
-- ------------------------------------------------------------
insert into public.flood_reports
  (id, title, description, latitude, longitude, water_depth, accessibility,
   severity, risk_score, confidence, status, district, is_demo, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111',
   'Скопление воды у пешеходного перехода',
   'После ночных осадков вода стоит у бордюра, переход подтоплен, люди переходят дорогу по обочине.',
   52.2893, 76.9507, 15, 'limited', 'high', 71, 0.9, 'confirmed', 'Набережная Иртыша',
   true, now() - interval '20 hours', now() - interval '18 hours'),
  ('22222222-2222-2222-2222-222222222222',
   'Затопление дворовой территории',
   'Вода заливает двор между домами, дорожки непроходимы. Жители просят проверить ливневую канализацию.',
   52.3021, 76.9452, 25, 'blocked', 'critical', 88, 0.92, 'new', 'Центр',
   true, now() - interval '8 hours', now() - interval '8 hours'),
  ('33333333-3333-3333-3333-333333333333',
   'Подтопление обочины вдоль дороги',
   'Длинный участок у стройки: вода стоит вдоль обочины, сужается проезжая часть.',
   52.2704, 76.9223, 10, 'limited', 'medium', 52, 0.85, 'confirmed', 'Сортировка',
   true, now() - interval '36 hours', now() - interval '30 hours')
on conflict (id) do nothing;
