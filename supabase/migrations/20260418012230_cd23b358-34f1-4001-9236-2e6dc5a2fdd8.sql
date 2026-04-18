
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- explicit deny-all policy on api_cache (server-only via service role bypasses RLS)
create policy "api_cache_no_client_access" on public.api_cache for select using (false);
