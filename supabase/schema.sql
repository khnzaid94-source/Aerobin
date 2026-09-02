-- AeroBin — Supabase schema (Phase 6c)
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Fully idempotent: safe to re-run any time; a partial application
-- self-heals by running the whole file again.
--
-- Trust model: the anon key is public in the client bundle (same as the
-- OpenWeatherMap key). RLS below is the actual security layer — anonymous
-- visitors may INSERT feedback and dispatch rows and SELECT dispatch rows,
-- but can never UPDATE or DELETE anything. Demo-mode actions are stored
-- with demo = true so Phase 8 analytics can exclude them from the corpus.

-- ── tables ─────────────────────────────────────────────────────────────

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  ward_id text not null,
  ward_name text,
  vote text not null check (vote in ('yes', 'no')),
  burn_risk_score numeric,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.dispatch_log (
  id text primary key,
  ward_id text not null,
  ward_name text,
  score numeric,
  action text not null,
  result text,
  session boolean,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists dispatch_log_created_at_idx
  on public.dispatch_log (created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────

alter table public.feedback enable row level security;
alter table public.dispatch_log enable row level security;

-- Policies are drop-then-recreated so this file is fully idempotent:
-- partial pastes or re-runs can never leave a half-applied state, and a
-- missing policy self-heals by re-running the whole file.
-- (PostgreSQL has no "create policy if not exists".)

-- feedback: anonymous inserts only (no select — votes are private corpus)
drop policy if exists "anon can insert feedback" on public.feedback;
create policy "anon can insert feedback"
  on public.feedback for insert
  to anon
  with check (true);

-- dispatch_log: anonymous inserts + reads (officers need cross-device view)
drop policy if exists "anon can insert dispatch log" on public.dispatch_log;
create policy "anon can insert dispatch log"
  on public.dispatch_log for insert
  to anon
  with check (true);

drop policy if exists "anon can read dispatch log" on public.dispatch_log;
create policy "anon can read dispatch log"
  on public.dispatch_log for select
  to anon
  using (true);

-- NOTE: no update/delete policies on purpose — append-only audit trail.
