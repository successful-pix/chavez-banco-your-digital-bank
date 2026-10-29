create or replace function public.execute_test_pix_transfer(
 p_lookup_type text,
 p_lookup_value text,
 p_amount numeric,
 p_description text default null
)
returns table(transaction_id uuid,recipient_name text,sender_balance numeric)
language plpgsql
security definer
set search_path=''
as $$
declare
 v_sender uuid:=auth.uid();
 v_s public.profiles%rowtype;
 v_r public.profiles%rowtype;
 v_amount numeric(14,2);
 v_tx uuid;
begin
 if v_sender is null then raise exception 'Authentication required'; end if;
 if p_lookup_type not in ('email','cpf') then raise exception 'Unsupported PIX key type'; end if;
 v_amount:=round(coalesce(p_amount,0),2);
 if v_amount<=0 then raise exception 'Enter a valid amount'; end if;
 select * into v_s from public.profiles where id=v_sender for update;
 if not found then raise exception 'Sender profile not found'; end if;
 if coalesce(v_s.blocked,false) then raise exception 'Your account is blocked'; end if;
 if coalesce(v_s.kyc_status,'pending')<>'approved' then raise exception 'KYC approval is required'; end if;
 if coalesce(v_s.balance,0)<v_amount then raise exception 'Insufficient balance'; end if;
 if p_lookup_type='email' then
  select * into v_r from public.profiles where lower(email)=lower(btrim(p_lookup_value)) and id<>v_sender limit 1;
 else
  select * into v_r from public.profiles where regexp_replace(coalesce(cpf,''),'[^0-9]','','g')=regexp_replace(btrim(p_lookup_value),'[^0-9]','','g') and id<>v_sender limit 1;
 end if;
 if not found then raise exception 'No matching Chavez Banco recipient was found'; end if;
 if coalesce(v_r.blocked,false) then raise exception 'Recipient account is unavailable'; end if;

 -- Queue for review only: no recipient credit and no completed status here.
 -- Existing pending-outgoing transaction trigger reserves the sender's amount.
 insert into public.transactions(
   user_id,type,direction,amount,status,description,
   recipient_name,recipient_account,recipient_bank,pix_key,
   recipient_user_id,balance_reserved
 )
 values(
   v_sender,'pix','out',v_amount,'pending',
   nullif(btrim(coalesce(p_description,'')),''),
   v_r.full_name,v_r.account_number,'Chavez Banco',btrim(p_lookup_value),
   v_r.id,false
 ) returning id into v_tx;

 insert into public.notifications(user_id,title,body) values
 (v_sender,'Transfer pending approval','Your PIX transfer of '||v_amount::text||' BRL to '||coalesce(v_r.full_name,'Chavez Banco')||' is pending approval. No transfer has been completed.'),
 (v_r.id,'Incoming transfer pending approval','A PIX transfer of '||v_amount::text||' BRL is awaiting approval. It has not been credited to your balance.');

 return query select v_tx,v_r.full_name,
   (select p.balance from public.profiles p where p.id=v_sender);
end; $$;
revoke all on function public.execute_test_pix_transfer(text,text,numeric,text) from public,anon;
grant execute on function public.execute_test_pix_transfer(text,text,numeric,text) to authenticated;