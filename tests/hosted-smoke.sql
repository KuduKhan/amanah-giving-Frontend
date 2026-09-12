-- Run only on the dedicated staging project. All fixture records roll back.
begin;
do $$
declare owner_id uuid:=gen_random_uuid(); donor_id uuid:=gen_random_uuid(); reviewer_id uuid:=gen_random_uuid(); finance_id uuid:=gen_random_uuid();
org uuid; campaign uuid; donation public.donations; release_id uuid; result jsonb;
begin
 insert into auth.users(id,email_confirmed_at) values(owner_id,now()),(donor_id,now()),(reviewer_id,now()),(finance_id,now());
 insert into public.user_roles(user_id,role) values(reviewer_id,'verifier'),(finance_id,'finance');
 result:=public.mutate_mvp(owner_id,'organization',jsonb_build_object('name','ROLLBACK TEST','registration','TEST-'||gen_random_uuid(),'location','Test','description','Rollback-only fixture'));
 org:=(result->>'id')::uuid;
 insert into public.verification_documents(id,organization_id,owner_id,storage_path,mime,size) values(gen_random_uuid(),org,owner_id,'rollback-fixture','application/pdf',100);
 perform public.mutate_mvp(reviewer_id,'review',jsonb_build_object('entity','organization','id',org,'decision','approve','notes','Independent review of rollback fixture evidence.'));
 result:=public.mutate_mvp(owner_id,'campaign',jsonb_build_object('organization_id',org,'title','Rollback test campaign','title_sw','Mfano wa majaribio','story','Test only','story_sw','Majaribio pekee','category','Water','location','Test','goal',100000,'end_date','2099-12-31','budget',jsonb_build_array(jsonb_build_object('label','Test budget','amount',100000))));
 campaign:=(result->>'id')::uuid;
 perform public.mutate_mvp(reviewer_id,'review',jsonb_build_object('entity','campaign','id',campaign,'decision','approve','notes','Independent review of rollback fixture budget.'));
 donation:=public.create_donation(donor_id,campaign,10000,'SADAQAH',true,'','mpesa',gen_random_uuid());
 update public.donations set provider_id='TEST-'||donation.id where id=donation.id;
 perform public.confirm_payment(donation.id,'TEST-'||donation.id,'TEST-REFERENCE-'||donation.id,'TEST-EVENT-'||donation.id,10000,'mpesa');
 perform public.confirm_payment(donation.id,'TEST-'||donation.id,'TEST-REFERENCE-'||donation.id,'TEST-EVENT-'||donation.id,10000,'mpesa');
 if (select raised from public.campaigns where id=campaign)<>10000 then raise exception 'Duplicate payment failure';end if;
 perform public.mutate_mvp(finance_id,'settle',jsonb_build_object('donation_id',donation.id,'bank_reference','TEST-SETTLE-'||donation.id));
 result:=public.mutate_mvp(owner_id,'disbursement',jsonb_build_object('campaign_id',campaign,'giving_type','SADAQAH','amount',10000,'purpose','Test milestone','recipient_reference','TEST-RECIPIENT'));
 release_id:=(result->>'id')::uuid;
 perform public.mutate_mvp(reviewer_id,'release',jsonb_build_object('id',release_id,'step','check'));
 perform public.mutate_mvp(finance_id,'release',jsonb_build_object('id',release_id,'step','approve'));
 perform public.mutate_mvp(finance_id,'release',jsonb_build_object('id',release_id,'step','paid','bank_reference','TEST-RELEASE-'||donation.id));
 if (select sum(debit-credit) from public.journal_lines where campaign_id=campaign and account='bank')<>0 then raise exception 'Bank balance failure';end if;
 if (select paid_at from public.disbursements where id=release_id) is null then raise exception 'Missing release date';end if;
end $$;
set constraints all immediate;
rollback;
select jsonb_build_object('donations_remaining',(select count(*) from public.donations),'campaigns_remaining',(select count(*) from public.campaigns),'profiles_remaining',(select count(*) from public.profiles)) as clean_after_test;
