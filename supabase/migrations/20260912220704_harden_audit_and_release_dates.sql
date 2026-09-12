begin;
alter function private.immutable() set search_path='';
alter function private.donation_immutable() set search_path='';
-- Explicit deny policies document the intentionally server-only event/inbox tables.
create policy deny_client_access on public.payment_events for all to anon,authenticated using(false) with check(false);
create policy deny_client_access on public.provider_callbacks for all to anon,authenticated using(false) with check(false);
create policy deny_client_access on private.rate_limits for all to anon,authenticated using(false) with check(false);
alter table public.disbursements add column paid_at timestamptz;
create function private.release_timestamp() returns trigger language plpgsql set search_path='' as $$ begin
 if new.status='paid' and old.status<>'paid' then new.paid_at:=now(); end if;return new;
end $$;
revoke all on function private.release_timestamp() from public;
create trigger release_timestamp before update on public.disbursements for each row execute function private.release_timestamp();
-- Index referencing columns without duplicating an existing leading-column index.
do $$ declare r record; begin
 for r in select distinct t.relname as tab,a.attname as col,t.oid as tid,a.attnum
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
 join pg_attribute a on a.attrelid=t.oid and a.attnum=any(c.conkey)
 where c.contype='f' and n.nspname='public'
 loop
  if not exists(select 1 from pg_index i where i.indrelid=r.tid and i.indkey[0]=r.attnum and i.indisvalid) then
   execute format('create index %I on public.%I(%I)','fk_'||r.tab||'_'||r.col,r.tab,r.col);
  end if;
 end loop;
end $$;
commit;
