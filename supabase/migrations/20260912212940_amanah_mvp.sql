-- Amanah MVP. Amounts are integer KES minor units. No demonstration money is seeded.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id), display_name text not null default '',
  language text not null default 'en' check(language in ('en','sw')),
  marketing_opt_in boolean not null default false, created_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid references auth.users(id), role text check(role in ('admin','finance','verifier','shariah','auditor','support')),
  primary key(user_id, role)
);
create function private.staff(roles text[]) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and auth.jwt()->>'aal' = 'aal2' and exists
 (select 1 from public.user_roles where user_id = auth.uid() and role = any(roles));
$$;
revoke all on function private.staff(text[]) from public;
grant execute on function private.staff(text[]) to authenticated;
create function private.require_role(actor uuid, roles text[]) returns void language plpgsql set search_path = '' as $$
begin
 if not exists(select 1 from public.user_roles where user_id=actor and role=any(roles)) then
   raise exception 'Permission denied' using errcode='42501';
 end if;
end $$;

create table public.organizations (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 3 and 120), registration text not null unique,
 location text not null, description text not null, status text not null default 'pending' check(status in ('pending','verified','rejected','suspended')),
 verification_summary text, reviewed_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.policy_versions (
 id uuid primary key default gen_random_uuid(), title text not null, content text not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.verification_documents (
 id uuid primary key, organization_id uuid not null references public.organizations(id),
 owner_id uuid not null references auth.users(id), storage_path text not null unique,
 mime text not null check(mime in ('application/pdf','image/png','image/jpeg')), size integer not null check(size between 1 and 2000000),
 created_at timestamptz not null default now()
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('amanah-evidence','amanah-evidence',false,2100000,array['application/octet-stream']) on conflict(id) do nothing;
-- No client storage policies: only the authenticated, audited server download endpoint decrypts evidence.
create table public.campaigns (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 title text not null check(length(title) between 8 and 150), title_sw text not null, story text not null, story_sw text not null,
 category text not null check(category in ('Food','Water','Orphans','Mosque','Education','Emergency','Health')),
 location text not null, goal bigint not null check(goal between 10000 and 100000000000),
 end_date date not null, image text not null default '/water-community.jpg',
 budget jsonb not null check(jsonb_typeof(budget)='array'),
 status text not null default 'pending' check(status in ('pending','published','rejected','closed','suspended')),
 zakat_eligible boolean not null default false, zakat_review_by uuid references auth.users(id),
 policy_id uuid references public.policy_versions(id), verification_summary text,
 raised bigint not null default 0 check(raised>=0), donor_count integer not null default 0,
 created_at timestamptz not null default now(), unique(organization_id,title)
);
create table public.campaign_updates (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id),
 author_id uuid not null references auth.users(id), title text not null, title_sw text not null,
 body text not null, body_sw text not null, status text not null default 'pending' check(status in ('pending','published','rejected')),
 reviewed_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.verification_records (
 id uuid primary key default gen_random_uuid(), entity_id uuid not null, entity_type text not null,
 actor_id uuid not null references auth.users(id), decision text not null, notes text not null,
 created_at timestamptz not null default now()
);
create table public.donations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 campaign_id uuid not null references public.campaigns(id), amount bigint not null check(amount between 10000 and 100000000),
 giving_type text not null check(giving_type in ('SADAQAH','ZAKAT')), policy_id uuid references public.policy_versions(id),
 anonymous boolean not null default true, dedication text not null default '',
 provider text not null check(provider in ('mpesa','stripe')), status text not null default 'pending' check(status in ('pending','confirmed','failed','refunded')),
 idempotency_key uuid not null, provider_id text unique, provider_reference text unique, phone_hash text, checkout_url text,
 created_at timestamptz not null default now(), confirmed_at timestamptz,
 unique(user_id,idempotency_key), check(giving_type<>'ZAKAT' or policy_id is not null)
);
create table public.payment_events (
 id text primary key, donation_id uuid not null references public.donations(id), provider text not null,
 created_at timestamptz not null default now()
);
create table public.provider_callbacks (
 checkout_id text primary key, success boolean not null, result_code integer not null default 0, amount bigint not null,
 phone_hash text not null, reference text not null, created_at timestamptz not null default now()
);
create table public.journal_entries (
 id uuid primary key default gen_random_uuid(), source text not null unique,
 description text not null, created_at timestamptz not null default now(), transaction_id bigint not null default txid_current()
);
create table public.journal_lines (
 id uuid primary key default gen_random_uuid(), entry_id uuid not null references public.journal_entries(id),
 campaign_id uuid not null references public.campaigns(id), giving_type text not null check(giving_type in ('SADAQAH','ZAKAT')),
 account text not null check(account in ('provider_receivable','bank','restricted_fund')),
 debit bigint not null default 0 check(debit>=0), credit bigint not null default 0 check(credit>=0),
 check((debit>0 and credit=0) or (credit>0 and debit=0))
);
create function private.immutable() returns trigger language plpgsql as $$ begin raise exception 'Append-only record'; end $$;
create function private.balanced() returns trigger language plpgsql set search_path = '' as $$
begin
 if (select count(*)<>2 or coalesce(sum(debit-credit),1)<>0 or count(distinct (campaign_id,giving_type))<>1 from public.journal_lines where entry_id=new.id) then
  raise exception 'Unbalanced journal';
 end if;
 return new;
end $$;
create constraint trigger journal_balanced after insert on public.journal_entries deferrable initially deferred for each row execute function private.balanced();
create function private.new_journal_line() returns trigger language plpgsql set search_path='' as $$ begin
 if not exists(select 1 from public.journal_entries where id=new.entry_id and transaction_id=txid_current()) then raise exception 'Cannot append to an existing journal'; end if;return new;
end $$;
create trigger new_journal_line before insert on public.journal_lines for each row execute function private.new_journal_line();
create table public.settlements (
 id uuid primary key default gen_random_uuid(), donation_id uuid not null unique references public.donations(id),
 bank_reference text not null unique, actor_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.disbursements (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id),
 giving_type text not null check(giving_type in ('SADAQAH','ZAKAT')), amount bigint not null check(amount>0),
 purpose text not null, recipient_reference text not null,
 maker_id uuid not null references auth.users(id), checker_id uuid references auth.users(id), approver_id uuid references auth.users(id),
 status text not null default 'requested' check(status in ('requested','checked','approved','paid','rejected')),
 bank_reference text unique, created_at timestamptz not null default now(),
 check(maker_id is distinct from checker_id and maker_id is distinct from approver_id and (checker_id is null or checker_id is distinct from approver_id))
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 title text not null, title_sw text not null, body text not null, body_sw text not null,
 read_at timestamptz, created_at timestamptz not null default now()
);
create table public.favorites (
 user_id uuid references auth.users(id), campaign_id uuid references public.campaigns(id), primary key(user_id,campaign_id)
);
create table public.complaints (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 campaign_id uuid references public.campaigns(id), body text not null, status text not null default 'open' check(status in ('open','resolved')),
 resolution text, created_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
 action text not null, entity_id text not null, created_at timestamptz not null default now()
);
create table public.fraud_flags (
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id),
 reason text not null, resolved_by uuid references auth.users(id), resolution text, created_at timestamptz not null default now()
);
create table public.refunds (
 id uuid primary key default gen_random_uuid(), donation_id uuid not null unique references public.donations(id),
 requester_id uuid not null references auth.users(id), reason text not null,
 checker_id uuid references auth.users(id), approver_id uuid references auth.users(id),
 status text not null default 'requested' check(status in ('requested','checked','approved','refunded','rejected')),
 provider_reference text unique, created_at timestamptz not null default now(),
 check(requester_id is distinct from checker_id and requester_id is distinct from approver_id and (checker_id is null or checker_id is distinct from approver_id))
);
create function private.donation_immutable() returns trigger language plpgsql as $$ begin
 if row(new.user_id,new.campaign_id,new.amount,new.giving_type,new.policy_id,new.provider,new.idempotency_key,new.anonymous,new.dedication)
 is distinct from row(old.user_id,old.campaign_id,old.amount,old.giving_type,old.policy_id,old.provider,old.idempotency_key,old.anonymous,old.dedication)
 or (old.status in ('confirmed','refunded') and (row(new.confirmed_at,new.provider_reference,new.provider_id) is distinct from row(old.confirmed_at,old.provider_reference,old.provider_id) or new.status not in ('confirmed','refunded') or (old.status='refunded' and new.status<>'refunded'))) then raise exception 'Donation financial identity is immutable'; end if; return new;
end $$;
create trigger donation_immutable before update on public.donations for each row execute function private.donation_immutable();
create trigger donation_no_delete before delete on public.donations for each row execute function private.immutable();
create table private.rate_limits (key text primary key, hits integer not null, expires_at timestamptz not null);

-- Reads use the authenticated JWT, including MFA assurance. Writes go through validated server RPCs only.
do $$ declare t text; begin
 foreach t in array array['profiles','user_roles','organizations','policy_versions','verification_documents','campaigns','campaign_updates','verification_records','donations','payment_events','provider_callbacks','journal_entries','journal_lines','settlements','disbursements','refunds','notifications','favorites','complaints','audit_logs','fraud_flags'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['journal_entries','journal_lines','settlements','audit_logs','verification_records','policy_versions','payment_events'] loop
  execute format('create trigger immutable before update or delete on public.%I for each row execute function private.immutable()',t);
 end loop;
end $$;
alter table private.rate_limits enable row level security;
grant select on public.organizations, public.campaigns, public.campaign_updates, public.policy_versions to anon;
grant usage, select on sequence public.audit_logs_id_seq to service_role;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy documents_read on public.verification_documents for select to authenticated using(owner_id=(select auth.uid()) or private.staff(array['admin','verifier']));
create policy own_roles on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
create policy organizations_read on public.organizations for select using(status='verified' or owner_id=(select auth.uid()) or private.staff(array['admin','verifier','auditor']));
create policy campaigns_read on public.campaigns for select using(status='published' or exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=(select auth.uid())) or private.staff(array['admin','verifier','finance','shariah','auditor']));
create policy updates_read on public.campaign_updates for select using((status='published' and exists(select 1 from public.campaigns c where c.id=campaign_id and c.status='published')) or author_id=(select auth.uid()) or private.staff(array['admin','verifier','auditor']));
create policy policies_read on public.policy_versions for select using(true);
create policy donations_read on public.donations for select to authenticated using(user_id=(select auth.uid()) or private.staff(array['finance','auditor']));
create policy notifications_read on public.notifications for select to authenticated using(user_id=(select auth.uid()));
create policy favorites_read on public.favorites for select to authenticated using(user_id=(select auth.uid()));
create policy refunds_read on public.refunds for select to authenticated using(requester_id=(select auth.uid()) or private.staff(array['admin','finance','auditor']));
create policy complaints_read on public.complaints for select to authenticated using(user_id=(select auth.uid()) or private.staff(array['support','admin']));
create policy disbursements_read on public.disbursements for select to authenticated using(maker_id=(select auth.uid()) or private.staff(array['finance','admin','verifier','auditor']));
create policy verification_read on public.verification_records for select to authenticated using(private.staff(array['admin','verifier','shariah','auditor']));
create policy audit_read on public.audit_logs for select to authenticated using(private.staff(array['admin','auditor']));
create policy flags_read on public.fraud_flags for select to authenticated using(private.staff(array['admin','finance','auditor']));
create policy journal_read on public.journal_entries for select to authenticated using(private.staff(array['finance','auditor']));
create policy lines_read on public.journal_lines for select to authenticated using(private.staff(array['finance','auditor']));
create policy settlements_read on public.settlements for select to authenticated using(private.staff(array['finance','auditor']));

-- Anonymous callers must be able to evaluate the public read policies; the helper returns false without a session.
grant usage on schema private to anon;
grant execute on function private.staff(text[]) to anon;
create index donations_user on public.donations(user_id,created_at desc);
create index donations_campaign on public.donations(campaign_id);
create index campaigns_org on public.campaigns(organization_id);
create index notifications_user on public.notifications(user_id,created_at desc);
create index journal_fund on public.journal_lines(campaign_id,giving_type,account);
create index disbursements_fund on public.disbursements(campaign_id,giving_type,status);
create index updates_campaign on public.campaign_updates(campaign_id);
create index documents_org on public.verification_documents(organization_id);

create function public.active_session(p_user uuid,p_session uuid) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from auth.sessions where id=p_session and user_id=p_user and (not_after is null or not_after>now()));
$$;
revoke all on function public.active_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.active_session(uuid,uuid) to service_role;
create function public.donor_summary(p_user uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('total',coalesce(sum(amount),0),'projects',count(distinct campaign_id),'gifts',count(*)) from public.donations where user_id=p_user and status='confirmed';
$$;
revoke all on function public.donor_summary(uuid) from public,anon,authenticated;
grant execute on function public.donor_summary(uuid) to service_role;

create function public.take_rate_limit(p_key text, p_limit integer, p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; begin
 insert into private.rate_limits values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set hits=case when rate_limits.expires_at<now() then 1 else rate_limits.hits+1 end,
 expires_at=case when rate_limits.expires_at<now() then now()+make_interval(secs=>p_seconds) else rate_limits.expires_at end returning hits into n;
 return n<=p_limit;
end $$;
create function private.journal(source text, description text, campaign uuid, kind text, amount bigint, debit_account text, credit_account text) returns void language plpgsql set search_path='' as $$
declare entry uuid; begin
 insert into public.journal_entries(source,description) values(source,description) returning id into entry;
 insert into public.journal_lines(entry_id,campaign_id,giving_type,account,debit,credit) values
 (entry,campaign,kind,debit_account,amount,0),(entry,campaign,kind,credit_account,0,amount);
end $$;

create function public.create_donation(p_actor uuid,p_campaign uuid,p_amount bigint,p_type text,p_anonymous boolean,p_dedication text,p_provider text,p_key uuid) returns public.donations language plpgsql security definer set search_path='' as $$
declare c public.campaigns; d public.donations; begin
 if not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) then raise exception 'Verify your email first'; end if;
 select * into c from public.campaigns where id=p_campaign for update;
 select * into d from public.donations where user_id=p_actor and idempotency_key=p_key;
 if found then
  if d.campaign_id<>p_campaign or d.amount<>p_amount or d.giving_type<>p_type or d.provider<>p_provider or d.anonymous<>p_anonymous or d.dedication<>p_dedication then raise exception 'Idempotency key reused with different details'; end if;
  return d;
 end if;
 if c.id is null or c.status<>'published' or c.end_date<current_date or c.raised>=c.goal or not exists(select 1 from public.organizations where id=c.organization_id and status='verified') then raise exception 'Campaign is not accepting gifts'; end if;
 if p_type='ZAKAT' and not c.zakat_eligible then raise exception 'This campaign is not Zakat eligible'; end if;
 if length(p_dedication)>160 then raise exception 'Dedication too long'; end if;
 insert into public.donations(user_id,campaign_id,amount,giving_type,policy_id,anonymous,dedication,provider,idempotency_key)
 values(p_actor,p_campaign,p_amount,p_type,case when p_type='ZAKAT' then c.policy_id else null end,p_anonymous,p_dedication,p_provider,p_key) returning * into d;
 insert into public.audit_logs(actor_id,action,entity_id) values(p_actor,'donation.created',d.id::text);
 return d;
end $$;

create function public.confirm_payment(p_donation uuid,p_provider_id text,p_reference text,p_event text,p_amount bigint,p_provider text) returns void language plpgsql security definer set search_path='' as $$
declare d public.donations; begin
 select * into d from public.donations where id=p_donation for update;
 if d.id is null or d.provider<>p_provider or d.provider_id is distinct from p_provider_id or d.amount<>p_amount or length(p_reference)<5 then raise exception 'Payment mismatch'; end if;
 if d.status in ('confirmed','refunded') then
  if d.provider_reference<>p_reference then raise exception 'Conflicting confirmation'; end if;
  return;
 end if;
 insert into public.payment_events(id,donation_id,provider) values(p_event,d.id,p_provider);
 update public.donations set status='confirmed',confirmed_at=now(),provider_reference=p_reference where id=d.id;
 perform private.journal('payment:'||d.id,'Verified donation',d.campaign_id,d.giving_type,d.amount,'provider_receivable','restricted_fund');
 update public.campaigns set raised=raised+d.amount,donor_count=donor_count+case when exists(select 1 from public.donations where campaign_id=d.campaign_id and user_id=d.user_id and status='confirmed' and id<>d.id) then 0 else 1 end where id=d.campaign_id;
 insert into public.notifications(user_id,title,title_sw,body,body_sw) values(d.user_id,'Donation confirmed','Mchango umethibitishwa','Your receipt is ready in My Giving.','Risiti yako iko katika Sadaka zangu.');
 if d.amount>=25000000 then insert into public.fraud_flags(campaign_id,reason) values(d.campaign_id,'High-value payment: independent review required before disbursement'); end if;
 insert into public.audit_logs(action,entity_id) values('payment.confirmed',d.id::text);
end $$;
create function public.fail_payment(p_donation uuid,p_provider_id text) returns void language plpgsql security definer set search_path='' as $$
declare d public.donations; begin
 select * into d from public.donations where id=p_donation for update;
 if d.id is null or d.provider_id is distinct from p_provider_id then raise exception 'Payment mismatch'; end if;
 if d.status<>'pending' then return; end if;
 update public.donations set status='failed' where id=d.id;
 insert into public.notifications(user_id,title,title_sw,body,body_sw) values(d.user_id,'Payment not completed','Malipo hayajakamilika','The provider reported that this payment did not complete.','Mtoa huduma ameripoti kuwa malipo haya hayajakamilika.');
 insert into public.audit_logs(action,entity_id) values('payment.failed',d.id::text);
end $$;
revoke all on function public.fail_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.fail_payment(uuid,text) to service_role;
create function public.flag_provider_event(p_reference text,p_event text) returns void language plpgsql security definer set search_path='' as $$
declare d public.donations; begin
 select * into d from public.donations where provider_reference=p_reference and provider='stripe';
 if d.id is null then return; end if;
 insert into public.payment_events(id,donation_id,provider) values(p_event,d.id,'stripe') on conflict do nothing;
 if not found then return; end if;
 insert into public.fraud_flags(campaign_id,reason) values(d.campaign_id,'Provider refund or dispute reported. Reconcile original payment '||d.id||' and its reversal before releasing funds.');
 insert into public.audit_logs(action,entity_id) values('provider.reversal_flagged',d.id::text);
end $$;
revoke all on function public.flag_provider_event(text,text) from public,anon,authenticated;
grant execute on function public.flag_provider_event(text,text) to service_role;

create function public.mutate_mvp(p_actor uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare oid uuid; cid uuid; eid uuid; c public.campaigns; d public.donations; dis public.disbursements; ref public.refunds;
 balance bigint; reserved bigint; result jsonb; owner uuid; notes text; decision text;
begin
 if not exists(select 1 from auth.users where id=p_actor and email_confirmed_at is not null) then raise exception 'Verified account required'; end if;
 notes:=trim(coalesce(p_data->>'notes','')); decision:=p_data->>'decision';
 case p_action
 when 'profile' then
  insert into public.profiles(id,display_name,language,marketing_opt_in) values(p_actor,left(p_data->>'name',80),p_data->>'language',coalesce((p_data->>'marketing')::boolean,false))
  on conflict(id) do update set display_name=excluded.display_name,language=excluded.language,marketing_opt_in=excluded.marketing_opt_in;
 when 'favorite' then
  cid:=(p_data->>'campaign_id')::uuid;
  if (p_data->>'saved')::boolean then insert into public.favorites values(p_actor,cid) on conflict do nothing;
  else delete from public.favorites where user_id=p_actor and campaign_id=cid; end if;
 when 'read_notifications' then update public.notifications set read_at=now() where user_id=p_actor and read_at is null;
 when 'organization' then
  insert into public.organizations(owner_id,name,registration,location,description) values(p_actor,p_data->>'name',p_data->>'registration',p_data->>'location',p_data->>'description') returning id into eid;
 when 'campaign' then
  oid:=(p_data->>'organization_id')::uuid;
  if not exists(select 1 from public.organizations where id=oid and owner_id=p_actor and status='verified') then raise exception 'Verified organization ownership required'; end if;
  if (select coalesce(sum((x->>'amount')::bigint),0) from jsonb_array_elements(p_data->'budget') x) <> (p_data->>'goal')::bigint or exists(select 1 from jsonb_array_elements(p_data->'budget') x where (x->>'amount')::bigint<=0 or length(x->>'label')<2) then raise exception 'Budget must match the fundraising goal'; end if;
  insert into public.campaigns(organization_id,title,title_sw,story,story_sw,category,location,goal,end_date,budget)
  values(oid,p_data->>'title',p_data->>'title_sw',p_data->>'story',p_data->>'story_sw',p_data->>'category',p_data->>'location',(p_data->>'goal')::bigint,(p_data->>'end_date')::date,p_data->'budget') returning id into eid;
 when 'policy' then
  perform private.require_role(p_actor,array['shariah']);
  insert into public.policy_versions(title,content,created_by) values(p_data->>'title',p_data->>'content',p_actor) returning id into eid;
 when 'review' then
  if length(notes)<20 then raise exception 'Record the evidence checked and a meaningful decision'; end if;
  eid:=(p_data->>'id')::uuid;
  if decision not in ('approve','reject','suspend') then raise exception 'Invalid decision'; end if;
  if p_data->>'entity'='organization' then
   perform private.require_role(p_actor,array['admin','verifier']);
   select owner_id into owner from public.organizations where id=eid for update;
   if owner is null or owner=p_actor then raise exception 'Independent reviewer required'; end if;
   if decision='approve' and not exists(select 1 from public.verification_documents where organization_id=eid) then raise exception 'Screened verification evidence required'; end if;
   update public.organizations set status=case decision when 'approve' then 'verified' when 'suspend' then 'suspended' else 'rejected' end,verification_summary=notes,reviewed_by=p_actor where id=eid;
  elsif p_data->>'entity'='zakat' then
   perform private.require_role(p_actor,array['shariah']);
   select * into c from public.campaigns where id=eid for update;
   select owner_id into owner from public.organizations where id=c.organization_id;
   if owner is null or owner=p_actor then raise exception 'Independent reviewer required'; end if;
   if decision='approve' and not exists(select 1 from public.policy_versions where id=(p_data->>'policy_id')::uuid) then raise exception 'Select an approved policy'; end if;
   update public.campaigns set zakat_eligible=(decision='approve'),zakat_review_by=p_actor,policy_id=(p_data->>'policy_id')::uuid where id=eid;
  elsif p_data->>'entity'='campaign' then
   perform private.require_role(p_actor,array['admin','verifier']);
   select * into c from public.campaigns where id=eid for update;
   select owner_id into owner from public.organizations where id=c.organization_id and status='verified';
   if owner is null or owner=p_actor then raise exception 'Independent reviewer and verified organization required'; end if;
   update public.campaigns set status=case decision when 'approve' then 'published' when 'suspend' then 'suspended' else 'rejected' end,verification_summary=notes where id=eid;
  elsif p_data->>'entity'='update' then
   perform private.require_role(p_actor,array['admin','verifier']);
   select author_id into owner from public.campaign_updates where id=eid for update;
   if owner is null or owner=p_actor then raise exception 'Independent reviewer required'; end if;
   update public.campaign_updates set status=case decision when 'approve' then 'published' else 'rejected' end,reviewed_by=p_actor where id=eid;
   if decision='approve' then
    insert into public.notifications(user_id,title,title_sw,body,body_sw)
    select distinct gift.user_id,'Project update','Habari za mradi','A supported project has a verified update.','Mradi uliounga mkono una taarifa iliyothibitishwa.' from public.donations gift join public.campaign_updates u on u.campaign_id=gift.campaign_id where u.id=eid and gift.status='confirmed';
   end if;
  else raise exception 'Invalid review target'; end if;
  insert into public.verification_records(entity_id,entity_type,actor_id,decision,notes) values(eid,p_data->>'entity',p_actor,decision,notes);
  insert into public.notifications(user_id,title,title_sw,body,body_sw) values(owner,'Review completed','Ukaguzi umekamilika','Your submission has been reviewed. Open your workspace for the decision.','Ombi lako limekaguliwa. Fungua akaunti yako kuona uamuzi.');
 when 'update' then
  cid:=(p_data->>'campaign_id')::uuid;
  if not exists(select 1 from public.campaigns campaign_row join public.organizations o on o.id=campaign_row.organization_id where campaign_row.id=cid and o.owner_id=p_actor and o.status='verified') then raise exception 'Organization ownership required'; end if;
  insert into public.campaign_updates(campaign_id,author_id,title,title_sw,body,body_sw) values(cid,p_actor,p_data->>'title',p_data->>'title_sw',p_data->>'body',p_data->>'body_sw') returning id into eid;
 when 'settle' then
  perform private.require_role(p_actor,array['finance']);
  select * into d from public.donations where id=(p_data->>'donation_id')::uuid for update;
  if d.id is null or d.status<>'confirmed' then raise exception 'Confirmed payment required'; end if;
  if length(p_data->>'bank_reference')<6 then raise exception 'Bank statement reference required'; end if;
  insert into public.settlements(donation_id,bank_reference,actor_id) values(d.id,p_data->>'bank_reference',p_actor) returning id into eid;
  perform private.journal('settlement:'||d.id,'Bank statement reconciled',d.campaign_id,d.giving_type,d.amount,'bank','provider_receivable');
 when 'disbursement' then
  cid:=(p_data->>'campaign_id')::uuid;
  select * into c from public.campaigns where id=cid for update;
  if not exists(select 1 from public.organizations where id=c.organization_id and owner_id=p_actor and status='verified') or c.status not in ('published','closed') then raise exception 'Verified organization ownership required'; end if;
  if exists(select 1 from public.fraud_flags where campaign_id=cid and resolved_by is null) then raise exception 'Resolve risk flags before release'; end if;
  select coalesce(sum(debit-credit),0) into balance from public.journal_lines where campaign_id=cid and giving_type=p_data->>'giving_type' and account='bank';
  select coalesce(sum(amount),0) into reserved from public.disbursements where campaign_id=cid and giving_type=p_data->>'giving_type' and status in ('requested','checked','approved');
  reserved:=reserved+(select coalesce(sum(gift.amount),0) from public.refunds r join public.donations gift on gift.id=r.donation_id where gift.campaign_id=cid and gift.giving_type=p_data->>'giving_type' and r.status in ('requested','checked','approved') and exists(select 1 from public.settlements where donation_id=gift.id));
  if (p_data->>'amount')::bigint>balance-reserved then raise exception 'Insufficient settled, unreserved funds'; end if;
  insert into public.disbursements(campaign_id,giving_type,amount,purpose,recipient_reference,maker_id) values(cid,p_data->>'giving_type',(p_data->>'amount')::bigint,p_data->>'purpose',p_data->>'recipient_reference',p_actor) returning id into eid;
 when 'release' then
  select * into dis from public.disbursements where id=(p_data->>'id')::uuid for update;
  if dis.id is null or dis.maker_id=p_actor then raise exception 'Independent operator required'; end if;
  perform 1 from public.campaigns where id=dis.campaign_id for update;
  if exists(select 1 from public.fraud_flags where campaign_id=dis.campaign_id and resolved_by is null) then raise exception 'Resolve risk flags before release'; end if;
  if not exists(select 1 from public.campaigns campaign_row join public.organizations o on o.id=campaign_row.organization_id where campaign_row.id=dis.campaign_id and campaign_row.status in ('published','closed') and o.status='verified') then raise exception 'Suspended campaign or organization'; end if;
  if p_data->>'step'='check' and dis.status='requested' then
   perform private.require_role(p_actor,array['admin','verifier']);
   update public.disbursements set checker_id=p_actor,status='checked' where id=dis.id;
  elsif p_data->>'step'='approve' and dis.status='checked' and dis.checker_id<>p_actor then
   perform private.require_role(p_actor,array['finance']);
   update public.disbursements set approver_id=p_actor,status='approved' where id=dis.id;
  elsif p_data->>'step'='paid' and dis.status='approved' and dis.approver_id=p_actor then
   perform private.require_role(p_actor,array['finance']);
   if length(p_data->>'bank_reference')<6 then raise exception 'External transfer reference required'; end if;
   perform private.journal('disbursement:'||dis.id,'Approved transfer recorded',dis.campaign_id,dis.giving_type,dis.amount,'restricted_fund','bank');
   update public.disbursements set status='paid',bank_reference=p_data->>'bank_reference' where id=dis.id;
   insert into public.notifications(user_id,title,title_sw,body,body_sw) select distinct user_id,'Funds disbursed','Fedha zimetolewa','An approved release was recorded for a supported project.','Malipo yaliyoidhinishwa yamerekodiwa kwa mradi uliounga mkono.' from public.donations where campaign_id=dis.campaign_id and status='confirmed';
  elsif p_data->>'step'='reject' and dis.status in ('requested','checked','approved') then
   perform private.require_role(p_actor,array['admin','finance','verifier']);
   update public.disbursements set status='rejected' where id=dis.id;
  else raise exception 'Invalid approval transition'; end if;
  eid:=dis.id;
 when 'refund_request' then
  select * into d from public.donations where id=(p_data->>'donation_id')::uuid for update;
  if d.user_id is distinct from p_actor or d.status<>'confirmed' then raise exception 'Your confirmed donation is required'; end if;
  perform 1 from public.campaigns where id=d.campaign_id for update;
  select coalesce(sum(debit-credit),0) into balance from public.journal_lines where campaign_id=d.campaign_id and giving_type=d.giving_type and account='bank';
  select coalesce(sum(amount),0) into reserved from public.disbursements where campaign_id=d.campaign_id and giving_type=d.giving_type and status in ('requested','checked','approved');
  reserved:=reserved+(select coalesce(sum(gift.amount),0) from public.refunds r join public.donations gift on gift.id=r.donation_id where gift.campaign_id=d.campaign_id and gift.giving_type=d.giving_type and r.status in ('requested','checked','approved') and exists(select 1 from public.settlements where donation_id=gift.id));
  if exists(select 1 from public.settlements where donation_id=d.id) and balance-reserved<d.amount then raise exception 'Funds already allocated. Contact support for review'; end if;
  insert into public.refunds(donation_id,requester_id,reason) values(d.id,p_actor,p_data->>'reason') returning id into eid;
 when 'refund_review' then
  select * into ref from public.refunds where id=(p_data->>'id')::uuid for update;
  if ref.id is null or ref.requester_id=p_actor then raise exception 'Independent operator required'; end if;
  select * into d from public.donations where id=ref.donation_id for update;
  perform 1 from public.campaigns where id=d.campaign_id for update;
  if p_data->>'step'='check' and ref.status='requested' then
   perform private.require_role(p_actor,array['admin']);
   update public.refunds set checker_id=p_actor,status='checked' where id=ref.id;
  elsif p_data->>'step'='approve' and ref.status='checked' and ref.checker_id<>p_actor then
   perform private.require_role(p_actor,array['finance']);
   update public.refunds set approver_id=p_actor,status='approved' where id=ref.id;
  elsif p_data->>'step'='refunded' and ref.status='approved' and ref.approver_id=p_actor then
   perform private.require_role(p_actor,array['finance']);
   if length(p_data->>'provider_reference')<6 then raise exception 'External refund statement reference required'; end if;
   if d.status<>'confirmed' then raise exception 'Confirmed payment required'; end if;
   perform private.journal('refund:'||ref.id,'Approved external refund reconciled',d.campaign_id,d.giving_type,d.amount,'restricted_fund',case when exists(select 1 from public.settlements where donation_id=d.id) then 'bank' else 'provider_receivable' end);
   update public.refunds set status='refunded',provider_reference=p_data->>'provider_reference' where id=ref.id;
   update public.donations set status='refunded' where id=d.id;
   update public.campaigns set raised=raised-d.amount,donor_count=donor_count-case when exists(select 1 from public.donations where campaign_id=d.campaign_id and user_id=d.user_id and status='confirmed' and id<>d.id) then 0 else 1 end where id=d.campaign_id;
   insert into public.notifications(user_id,title,title_sw,body,body_sw) values(d.user_id,'Refund recorded','Marejesho yamerekodiwa','Finance recorded the approved refund against a provider statement.','Fedha zilizorejeshwa zimerekodiwa kwa taarifa ya mtoa huduma.');
  elsif p_data->>'step'='reject' and ref.status in ('requested','checked','approved') then
   perform private.require_role(p_actor,array['admin','finance']);
   update public.refunds set status='rejected' where id=ref.id;
  else raise exception 'Invalid approval transition'; end if;
  eid:=ref.id;
 when 'complaint' then
  insert into public.complaints(user_id,campaign_id,body) values(p_actor,nullif(p_data->>'campaign_id','')::uuid,p_data->>'body') returning id into eid;
 when 'resolve_complaint' then
  perform private.require_role(p_actor,array['support','admin']);
  if length(notes)<20 then raise exception 'Resolution detail required'; end if;
  update public.complaints set status='resolved',resolution=notes where id=(p_data->>'id')::uuid returning id into eid;
 when 'resolve_flag' then
  perform private.require_role(p_actor,array['admin']);
  if length(notes)<20 then raise exception 'Resolution detail required'; end if;
  update public.fraud_flags set resolved_by=p_actor,resolution=notes where id=(p_data->>'id')::uuid and resolved_by is null returning id into eid;
 else raise exception 'Unknown action'; end case;
 insert into public.audit_logs(actor_id,action,entity_id) values(p_actor,p_action||coalesce('.'||(p_data->>'step'),'.'||(p_data->>'decision'),''),coalesce(eid::text,p_actor::text));
 result:=jsonb_build_object('id',eid,'ok',true); return result;
end $$;
-- Explicitly revoke default EXECUTE, including from PUBLIC. Only the server service key may call these RPCs.
revoke all on function public.take_rate_limit(text,integer,integer), public.create_donation(uuid,uuid,bigint,text,boolean,text,text,uuid), public.confirm_payment(uuid,text,text,text,bigint,text), public.mutate_mvp(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.take_rate_limit(text,integer,integer), public.create_donation(uuid,uuid,bigint,text,boolean,text,text,uuid), public.confirm_payment(uuid,text,text,text,bigint,text), public.mutate_mvp(uuid,text,jsonb) to service_role;
revoke all on all functions in schema private from public;
grant execute on function private.staff(text[]) to anon,authenticated;
commit;
