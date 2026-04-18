
-- ===== ENUMS =====
create type public.app_role as enum ('admin', 'user');
create type public.bet_status as enum ('pending', 'won', 'lost', 'void', 'cashout');
create type public.bet_type as enum ('single', 'parlay', 'system');
create type public.txn_type as enum ('deposit', 'withdraw', 'adjustment', 'bet_stake', 'bet_payout');

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- ===== USER ROLES =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_select_own" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== TRIGGER: create profile + default role on signup =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== updated_at helper =====
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.tg_set_updated_at();

-- ===== BANKROLLS =====
create table public.bankrolls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'BRL',
  initial_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bankrolls enable row level security;
create policy "bankrolls_own_all" on public.bankrolls for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger bankrolls_updated before update on public.bankrolls for each row execute function public.tg_set_updated_at();
create index bankrolls_user_idx on public.bankrolls(user_id);

-- ===== BANKROLL TRANSACTIONS =====
create table public.bankroll_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bankroll_id uuid not null references public.bankrolls(id) on delete cascade,
  type txn_type not null,
  amount numeric(14,2) not null,
  description text,
  bet_id uuid,
  created_at timestamptz not null default now()
);
alter table public.bankroll_transactions enable row level security;
create policy "bankroll_txn_own_all" on public.bankroll_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index bankroll_txn_bankroll_idx on public.bankroll_transactions(bankroll_id);

-- ===== BOOKMAKERS (shared) =====
create table public.bookmakers (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  name text not null,
  region text,
  created_at timestamptz not null default now()
);
alter table public.bookmakers enable row level security;
create policy "bookmakers_read_all" on public.bookmakers for select using (auth.role() = 'authenticated');
create policy "bookmakers_admin_write" on public.bookmakers for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== MATCHES (shared) =====
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  sport text not null,
  league text,
  home_team text not null,
  away_team text not null,
  commence_time timestamptz not null,
  status text not null default 'scheduled',
  home_score int,
  away_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.matches enable row level security;
create policy "matches_read_all" on public.matches for select using (auth.role() = 'authenticated');
create policy "matches_admin_write" on public.matches for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger matches_updated before update on public.matches for each row execute function public.tg_set_updated_at();
create index matches_commence_idx on public.matches(commence_time);
create index matches_sport_idx on public.matches(sport);

-- ===== ODDS SNAPSHOTS (shared) =====
create table public.odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  external_match_id text,
  bookmaker_id uuid references public.bookmakers(id) on delete set null,
  bookmaker_key text,
  market text not null,
  selection text not null,
  odd numeric(8,3) not null,
  captured_at timestamptz not null default now()
);
alter table public.odds_snapshots enable row level security;
create policy "odds_read_all" on public.odds_snapshots for select using (auth.role() = 'authenticated');
create policy "odds_admin_write" on public.odds_snapshots for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create index odds_match_idx on public.odds_snapshots(match_id, market, selection, captured_at desc);

-- ===== BETS =====
create table public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bankroll_id uuid references public.bankrolls(id) on delete set null,
  bet_type bet_type not null default 'single',
  sport text,
  league text,
  market text,
  selection text,
  match_description text,
  bookmaker text,
  odd numeric(10,3) not null,
  stake numeric(14,2) not null,
  estimated_probability numeric(6,4),
  ev numeric(10,4),
  status bet_status not null default 'pending',
  profit numeric(14,2) not null default 0,
  payout numeric(14,2),
  placed_at timestamptz not null default now(),
  settled_at timestamptz,
  notes text,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bets enable row level security;
create policy "bets_own_all" on public.bets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger bets_updated before update on public.bets for each row execute function public.tg_set_updated_at();
create index bets_user_placed_idx on public.bets(user_id, placed_at desc);
create index bets_user_status_idx on public.bets(user_id, status);

-- ===== BET LEGS =====
create table public.bet_legs (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text,
  league text,
  match_description text,
  market text,
  selection text,
  odd numeric(10,3) not null,
  estimated_probability numeric(6,4),
  status bet_status not null default 'pending',
  position int not null default 0
);
alter table public.bet_legs enable row level security;
create policy "bet_legs_own_all" on public.bet_legs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index bet_legs_bet_idx on public.bet_legs(bet_id);

-- ===== ALERTS =====
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  rule_type text not null, -- 'ev_threshold' | 'odds_movement'
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.alerts enable row level security;
create policy "alerts_own_all" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger alerts_updated before update on public.alerts for each row execute function public.tg_set_updated_at();

-- ===== NOTIFICATIONS =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete set null,
  title text not null,
  body text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_own_all" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- ===== API CACHE (no RLS, server-only via service role) =====
create table public.api_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.api_cache enable row level security;
-- no policies = nobody can read/write from client; only edge functions with service role
