import test from 'node:test';
import assert from 'node:assert/strict';
import {switchReadiness} from '../server/cloud/switch-readiness.mjs';

const liveEnv={
 SWITCH_INVITE_SECRET:'a'.repeat(64),
 SWITCH_WHATSAPP_ENABLED:'true',
 SWITCH_WHATSAPP_TEMPLATE:'m_switch_convite',
 SWITCH_WHATSAPP_ACCESS_TOKEN:'fake_token_more_than_twenty_chars',
 SWITCH_WHATSAPP_PHONE_NUMBER_ID:'12345678912',
 SWITCH_WHATSAPP_GRAPH_VERSION:'v22.0',
 SWITCH_WHATSAPP_WEBHOOK_ENABLED:'true',
 CRON_SECRET:'fake_cron_secret_long_enough',
 SWITCH_AUTOPILOT_ENABLED:'true',
 SWITCH_DEFAULT_BROKERAGE_BPS:'500',
 SWITCH_DEFAULT_SHARE_BPS:'3000'
};
test('prontidão reprova tabela ausente e não presume contrato/Meta aprovados',async()=>{
  const res=await switchReadiness({
    client:{rest:async path=>{if(path.startsWith('eme_switch_professionals'))throw Error('missing');return [];}},
    env:liveEnv
  });
  assert.equal(res.workflow.databaseReady,false);
  assert.equal(res.pilotCanBeTested,false);
  assert.equal(res.externalMessagesMayBeSent,false);
  assert.equal(res.workflow.commercialContractReviewed,false);
  assert.equal(res.workflow.providerTemplateApproved,false);
  assert.ok(res.checks.some(c=>c.key==='eme_switch_professionals'&&!c.ready));
  assert.equal(JSON.stringify(res).includes(liveEnv.SWITCH_WHATSAPP_ACCESS_TOKEN),false);
  assert.equal(JSON.stringify(res).includes(liveEnv.CRON_SECRET),false);
});
test('prontidão verifica separadamente banco, env e habilitação explícita',async()=>{
  const db={rest:async()=>[]};
  const off=await switchReadiness({client:db,env:{}});
  assert.equal(off.workflow.databaseReady,true);
  assert.equal(off.workflow.whatsappConfigured,false);
  assert.equal(off.workflow.autopilotEnabled,false);
  const on=await switchReadiness({client:db,env:liveEnv});
  assert.equal(on.workflow.databaseReady,true);
  assert.equal(on.workflow.whatsappConfigured,true);
  assert.equal(on.workflow.schedulerSecretConfigured,true);
  assert.equal(on.workflow.autopilotEnabled,true);
  assert.equal(on.workflow.providerTemplateApproved,false);
  assert.equal(on.workflow.rlsVerified,false);
});

test('prontidão reprova schema antigo mesmo quando as tabelas existem',async()=>{
 const result=await switchReadiness({client:{rest:async path=>{
  if(path.includes('consent_version')||path.includes('payment_reference'))throw Error('column missing');
  return [];
 }},env:{}});
 assert.equal(result.pilotCanBeTested,false);
 assert.equal(result.checks.length,8);
});
