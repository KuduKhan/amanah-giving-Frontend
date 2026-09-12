import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const donor='00000000-0000-4000-8000-000000000001',owner='00000000-0000-4000-8000-000000000002',checker='00000000-0000-4000-8000-000000000003',finance='00000000-0000-4000-8000-000000000004',scholar='00000000-0000-4000-8000-000000000005';
let campaign,org,donation,policy;
const mutate=async(actor,action,data)=> (await db.query('select public.mutate_mvp($1,$2,$3) as result',[actor,action,JSON.stringify(data)])).rows[0].result;
before(async()=>{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',coalesce(current_setting('request.jwt.claim.aal',true),'aal1')) $$;
 grant usage on schema public,auth to anon,authenticated,service_role; grant execute on all functions in schema auth to anon,authenticated,service_role;`);
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url),'utf8'));
 for(const id of [donor,owner,checker,finance,scholar])await db.query('insert into auth.users values($1,now())',[id]);
 await db.query("insert into public.user_roles values($1,'verifier'),($2,'finance'),($3,'shariah')",[checker,finance,scholar]);
 org=(await mutate(owner,'organization',{name:'Test charity',registration:'TEST-REG',location:'Garissa',description:'Test charity for database verification.'})).id;
 await db.query("insert into public.verification_documents(id,organization_id,owner_id,storage_path,mime,size) values(gen_random_uuid(),$1,$2,'fixture-encrypted.bin','application/pdf',100)",[org,owner]);
 await mutate(checker,'review',{entity:'organization',id:org,decision:'approve',notes:'Registration and recipient records independently reviewed.'});
 campaign=(await mutate(owner,'campaign',{organization_id:org,title:'Test water campaign',title_sw:'Mradi wa maji',story:'A test need',story_sw:'Mahitaji ya mfano',category:'Water',location:'Garissa',goal:10000000,end_date:'2099-12-31',budget:[{label:'Delivery',amount:10000000}]})).id;
 await mutate(checker,'review',{entity:'campaign',id:campaign,decision:'approve',notes:'Budget and field need independently reviewed.'});
});
after(()=>db.close());
test('Zakat is rejected until independent eligibility and policy approval',async()=>{
 await assert.rejects(db.query("select public.create_donation($1,$2,100000,'ZAKAT',true,'','mpesa',gen_random_uuid())",[donor,campaign]),/not Zakat eligible/);
 policy=(await mutate(scholar,'policy',{title:'Test policy v1',content:'Eligibility policy test fixture.'})).id;
 await mutate(scholar,'review',{entity:'zakat',id:campaign,policy_id:policy,decision:'approve',notes:'Beneficiary category and entitlement independently checked.'});
 const result=await db.query("select (public.create_donation($1,$2,100000,'ZAKAT',true,'','mpesa','10000000-0000-4000-8000-000000000001')).*",[donor,campaign]);
 donation=result.rows[0].id; assert.equal(result.rows[0].policy_id,policy);
});
test('Idempotent donation creation and mismatched replay rejection',async()=>{
 const r=await db.query("select to_jsonb(public.create_donation($1,$2,100000,'ZAKAT',true,'','mpesa','10000000-0000-4000-8000-000000000001')) as d",[donor,campaign]);assert.equal(r.rows[0].d.id,donation);
 await assert.rejects(db.query("select public.create_donation($1,$2,200000,'ZAKAT',true,'','mpesa','10000000-0000-4000-8000-000000000001')",[donor,campaign]),/Idempotency/);
});
test('Payment amount and provider binding; duplicate confirmations post once',async()=>{
 await db.query("update public.donations set provider_id='checkout-test' where id=$1",[donation]);
 await assert.rejects(db.query("select public.confirm_payment($1,'checkout-test','RECEIPT123','event1',99999,'mpesa')",[donation]),/mismatch/);
 for(let i=0;i<2;i++)await db.query("select public.confirm_payment($1,'checkout-test','RECEIPT123','event1',100000,'mpesa')",[donation]);
 const r=await db.query('select sum(debit-credit) as balance,count(*) as lines from public.journal_lines');assert.equal(Number(r.rows[0].balance),0);assert.equal(Number(r.rows[0].lines),2);
 const c=(await db.query('select raised,donor_count from public.campaigns where id=$1',[campaign])).rows[0];assert.equal(Number(c.raised),100000);assert.equal(c.donor_count,1);
});
test('Only settled funds can be reserved; Zakat cannot fund Sadaqah releases',async()=>{
 const request={campaign_id:campaign,giving_type:'ZAKAT',amount:50000,purpose:'Delivery milestone',recipient_reference:'VERIFIED-RECIPIENT'};
 await assert.rejects(mutate(owner,'disbursement',request),/Insufficient settled/);
 await mutate(finance,'settle',{donation_id:donation,bank_reference:'BANK-SETTLEMENT-1'});
 await assert.rejects(mutate(owner,'disbursement',{...request,giving_type:'SADAQAH'}),/Insufficient settled/);
 const d=(await mutate(owner,'disbursement',request)).id;
 await assert.rejects(mutate(owner,'release',{id:d,step:'check'}),/Independent operator/);
 await mutate(checker,'release',{id:d,step:'check'});
 await db.query("insert into public.user_roles values($1,'finance')",[checker]);
 await assert.rejects(mutate(checker,'release',{id:d,step:'approve'}),/Invalid approval/);
 await mutate(finance,'release',{id:d,step:'approve'});
 await assert.rejects(mutate(owner,'disbursement',{...request,amount:60000}),/Insufficient settled/);
 await mutate(finance,'release',{id:d,step:'paid',bank_reference:'BANK-PAYOUT-1'});
 await assert.rejects(mutate(finance,'release',{id:d,step:'paid',bank_reference:'BANK-PAYOUT-1'}),/Invalid approval/);
 const balance=(await db.query("select sum(debit-credit) as n from public.journal_lines where account='bank'")).rows[0];assert.equal(Number(balance.n),50000);
});
test('Journal balance and immutable history enforced in PostgreSQL',async()=>{
 await assert.rejects(db.exec("begin; insert into public.journal_entries(source,description) values('bad','unbalanced'); commit;"),/Unbalanced/);await db.exec('rollback');
 await assert.rejects(db.exec("update public.journal_lines set debit=999 where debit>0"),/Append-only/);
 await assert.rejects(db.exec('delete from public.audit_logs'),/Append-only/);
});
test('RLS isolates donors; privileged reads require MFA; no public write or RPC access',async()=>{
 await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}'; set request.jwt.claim.aal='aal1';`);
 assert.equal((await db.query('select * from public.donations')).rows.length,0);
 await assert.rejects(db.query('select public.mutate_mvp($1,$2,$3)',[owner,'profile','{}']),/permission denied/);
 await assert.rejects(db.exec("update public.campaigns set raised=100"),/permission denied/);
 await db.exec(`set request.jwt.claim.sub='${finance}';`);assert.equal((await db.query('select * from public.donations')).rows.length,0);
 await db.exec("set request.jwt.claim.aal='aal2'");assert.equal((await db.query('select * from public.donations')).rows.length,1);
 await db.exec("reset role; set request.jwt.claim.sub=''; set request.jwt.claim.aal='aal1'; set role anon;");
 assert.equal((await db.query('select * from public.campaigns')).rows.length,1);
 await assert.rejects(db.query('select * from public.donations'),/permission denied/);await db.exec('reset role');
});
test('Independent updates notify donors only after approval',async()=>{
 const update=(await mutate(owner,'update',{campaign_id:campaign,title:'Delivery update',title_sw:'Taarifa ya mradi',body:'Evidence checked in test fixture.',body_sw:'Ushahidi wa mfano.'})).id;
 const before=Number((await db.query('select count(*) as n from public.notifications')).rows[0].n);
 await mutate(checker,'review',{entity:'update',id:update,decision:'approve',notes:'Evidence and delivery independently reviewed.'});
 assert.equal(Number((await db.query('select count(*) as n from public.notifications')).rows[0].n),before+2);
});
test('Donation intent cannot be altered and journals cannot be extended later',async()=>{
 await assert.rejects(db.query("update public.donations set giving_type='SADAQAH' where id=$1",[donation]),/immutable/);
 await assert.rejects(db.exec("insert into public.journal_lines(entry_id,campaign_id,giving_type,account,debit) select entry_id,campaign_id,giving_type,'bank',1 from public.journal_lines limit 1"),/Cannot append/);
});
test('Refunds reserve available funds, require independent reviewers and reverse the journal once',async()=>{
 await assert.rejects(mutate(donor,'refund_request',{donation_id:donation,reason:'Test refund'}),/Funds already allocated/);
 const gift=(await db.query("select to_jsonb(public.create_donation($1,$2,50000,'ZAKAT',true,'','mpesa',gen_random_uuid())) as d",[donor,campaign])).rows[0].d;
 await db.query("update public.donations set provider_id='second-checkout' where id=$1",[gift.id]);
 await db.query("select public.confirm_payment($1,'second-checkout','SECONDRECEIPT','event2',50000,'mpesa')",[gift.id]);
 await mutate(finance,'settle',{donation_id:gift.id,bank_reference:'BANK-SETTLEMENT-2'});
 const refund=(await mutate(donor,'refund_request',{donation_id:donation,reason:'Request reviewed refund'})).id;
 await assert.rejects(mutate(owner,'disbursement',{campaign_id:campaign,giving_type:'ZAKAT',amount:10000,purpose:'Another release',recipient_reference:'RECIPIENT'}),/Insufficient settled/);
 await db.query("insert into public.user_roles values($1,'admin')",[checker]);
 await assert.rejects(mutate(donor,'refund_review',{id:refund,step:'check'}),/Independent/);
 await mutate(checker,'refund_review',{id:refund,step:'check'});
 await assert.rejects(mutate(checker,'refund_review',{id:refund,step:'approve'}),/Invalid approval/);
 await mutate(finance,'refund_review',{id:refund,step:'approve'});
 await mutate(finance,'refund_review',{id:refund,step:'refunded',provider_reference:'REFUND-STATEMENT-1'});
 await assert.rejects(mutate(finance,'refund_review',{id:refund,step:'refunded',provider_reference:'REFUND-STATEMENT-1'}),/Invalid approval/);
 await db.query("select public.confirm_payment($1,'checkout-test','RECEIPT123','event1',100000,'mpesa')",[donation]);
 assert.equal((await db.query('select status from public.donations where id=$1',[donation])).rows[0].status,'refunded');
 assert.equal(Number((await db.query("select sum(debit-credit) as n from public.journal_lines where account='bank'")).rows[0].n),0);
});
test('Revoked sessions and missing verification evidence fail closed',async()=>{
 const r=(await db.query("select public.active_session($1,gen_random_uuid()) as ok",[donor])).rows[0];assert.equal(r.ok,false);
 const o=(await mutate(owner,'organization',{name:'No evidence charity',registration:'NO-EVIDENCE',location:'Nairobi',description:'Test only'})).id;
 await assert.rejects(mutate(checker,'review',{entity:'organization',id:o,decision:'approve',notes:'This fixture has no security-screened evidence.'}),/Screened verification/);
});
