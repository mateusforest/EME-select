import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

const sql=readFileSync(new URL('../supabase/migrations/20261028_switch_pilot.sql',import.meta.url),'utf8');
const staffId='fa3d7ef4-f8e3-4efa-bb8c-31cf9484baf7';
const demandId='f90115e0-2cbc-4c6a-bb43-f600b79f3069';
const dealId='bc8c3ed0-7f73-495f-b69f-b57ba31a9eb5';
const proId='fa0e52f5-ff1c-4788-9364-6cd45e4b9999';
test('M Switch SQL: instala, protege dados, audita e registra ciência do convite',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create table public.eme_profiles(id uuid primary key);');
  await db.query('insert into public.eme_profiles(id) values ($1)',[staffId]);
  await db.exec(sql);
  const rls=await db.query("select relname,relrowsecurity from pg_class where relname like 'eme_switch_%' and relkind='r'");
  assert.ok(rls.rows.length>=5);
  assert.ok(rls.rows.every(r=>r.relrowsecurity===true));
  await db.query(`insert into public.eme_switch_requests(id,request_id,kind,name,phone,city,property_type,asking_cents,contact_opt_in,privacy_accepted)
    values($1,$2,'buy','Pessoa sintética','5554999999999','Vacaria','Casa',60000000,true,true)`,[demandId,'d2e3bd5b-a86e-4c6e-bde9-61e805d29b20']);
  await db.query(`insert into public.eme_switch_deal_invites
   (id,token_hash,public_ref,source_kind,source_id,demand_id,teaser_city,teaser_type,sale_price_cents,brokerage_bps,switch_share_bps,created_by,expires_at)
   values($1,$2,'SWITCHA1','partner_offer',$3,$4,'Vacaria','Casa',50000000,500,3000,$5,now()+interval '7 days')`,
   [dealId,'a'.repeat(64),'4e5a9ba9-2945-46ad-b0d3-a6850c4775f0',demandId,staffId]);
  const accepted=await db.query('select public.eme_switch_acknowledge($1,$2,$3,$4,$5,$6) as id',
    ['a'.repeat(64),'Corretor Sintético','5554988887777','RS 12345','Imobiliária Exemplo',false]);
  assert.equal(accepted.rows[0].id,dealId);
  await assert.rejects(db.query('select public.eme_switch_acknowledge($1,$2,$3,$4,$5,$6)',
    ['a'.repeat(64),'Corretor Sintético','5554988887777','RS 12345','Imobiliária Exemplo',false]),/DEAL_NOT_AVAILABLE/);
  const audit=await db.query('select old_status,new_status from public.eme_switch_deal_audit where deal_id=$1 order by id',[dealId]);
  assert.deepEqual(audit.rows.map(r=>r.new_status),['prepared','acknowledged']);
  await db.query(`insert into public.eme_switch_professionals(id,request_id,name,creci,phone,city,property_type,whatsapp_opt_in,privacy_accepted,optout_token_hash)
    values($1,$2,'Corretor Exemplo','RS 12345','5554988887777','Vacaria','Casa',true,true,$3)`,
    [proId,'934364c2-f4b6-4825-a548-a49c361181d0','b'.repeat(64)]);
  await db.query("update public.eme_switch_professionals set whatsapp_opt_in=false,status='paused' where id=$1",[proId]);
  const paused=await db.query('select status,whatsapp_opt_in from public.eme_switch_professionals where id=$1',[proId]);
  assert.equal(paused.rows[0].status,'paused');assert.equal(paused.rows[0].whatsapp_opt_in,false);
 }finally{await db.close();}
});
