
-- Catálogo sync: tabela de estado compartilhado
create table if not exists public.catalog_sync (
  id int primary key default 1,
  url text,
  version int not null default 0,
  synced_at timestamptz not null default now(),
  constraint catalog_sync_singleton check (id = 1)
);

insert into public.catalog_sync (id, url, version) values (1, null, 0)
on conflict (id) do nothing;

alter table public.catalog_sync enable row level security;

-- Leitura pública (qualquer visitante pode ver a versão atual)
drop policy if exists "catalog_sync_public_read" on public.catalog_sync;
create policy "catalog_sync_public_read"
on public.catalog_sync for select
to anon, authenticated
using (true);

-- Sem policies de insert/update/delete: somente service role pode escrever

-- Habilita realtime
alter publication supabase_realtime add table public.catalog_sync;

-- Cron diário às 22:00 UTC (19:00 BRT)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('catalog-sync-daily-1900-brt') where exists (
  select 1 from cron.job where jobname = 'catalog-sync-daily-1900-brt'
);

select cron.schedule(
  'catalog-sync-daily-1900-brt',
  '0 22 * * *',
  $$
  select net.http_post(
    url := 'https://project--8a9cbdd0-0f96-496f-a6f5-051a0934174a.lovable.app/api/public/hooks/sync-catalog',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnY3l5cHlkd21rcmRudGJ6ZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzUyMDcsImV4cCI6MjA5NDMxMTIwN30.4Ugke5teJUQiAyP1hqzhJ3MlkfTfXq2AcKpMaLOyDiY"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);
