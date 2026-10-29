import test from 'node:test';
import assert from 'node:assert/strict';
import {switchWhatsAppEnv,attachSwitchChannel,SWITCH_NUMBER,SWITCH_CALLBACK} from '../server/cloud/switch-channel.mjs';
import {sendSwitchWhatsAppTemplate,whatsappSwitchReady} from '../server/cloud/switch-professionals.mjs';
const env={SWITCH_WHATSAPP_ENABLED:'true',SWITCH_INVITE_SECRET:'fake-test-secret-longer-than-thirty-two-characters',SWITCH_WHATSAPP_TEMPLATE:'m_switch_convite',SWITCH_WHATSAPP_ACCESS_TOKEN:'switch-token-synthetic-only-not-real',SWITCH_WHATSAPP_PHONE_NUMBER_ID:'11111111',SWITCH_WHATSAPP_BUSINESS_ACCOUNT_ID:'22222222',SWITCH_WHATSAPP_GRAPH_VERSION:'v25.0',SWITCH_META_APP_SECRET:'fake-switch-app-secret',SWITCH_WHATSAPP_VERIFY_TOKEN:'fake-verification-token-longer-than-thirty-two',SWITCH_WHATSAPP_WEBHOOK_ENABLED:'true'};
test('canal Switch não herda token ou número do atendimento principal',()=>{
 const configured=switchWhatsAppEnv({...env,WHATSAPP_ACCESS_TOKEN:'site-token',WHATSAPP_PHONE_NUMBER_ID:'99999999'});
 assert.equal(configured.WHATSAPP_PHONE_NUMBER_ID,'11111111');assert.equal(configured.WHATSAPP_ACCESS_TOKEN,env.SWITCH_WHATSAPP_ACCESS_TOKEN);
 assert.equal(configured.WHATSAPP_EXPECTED_NUMBER,SWITCH_NUMBER);
 assert.equal(whatsappSwitchReady({SWITCH_WHATSAPP_ENABLED:'true',WHATSAPP_ACCESS_TOKEN:'legacy-token-very-long-private',WHATSAPP_PHONE_NUMBER_ID:'99999999',WHATSAPP_GRAPH_VERSION:'v25.0'}),false);
});
test('número diferente bloqueia a transmissão antes de qualquer mensagem',async()=>{
 const calls=[];
 await assert.rejects(sendSwitchWhatsAppTemplate(env,{phone:'5554999999999',city:'Vacaria',inviteUrl:'https://www.emeselect.com/switch',optoutUrl:'https://www.emeselect.com/switch'},async(url,options)=>{calls.push(options);return{ok:true,json:async()=>({id:'11111111',display_phone_number:'+55 54 99157-8029'})};}),/remetente difere/);
 assert.equal(calls.length,1);assert.equal(calls[0].method,undefined);
});
test('painel é administrativo, usa retorno próprio e não expõe segredos',async()=>{
 const service=attachSwitchChannel({env,client:{rest:async()=>[],rpc:async()=>{}}});
 await assert.rejects(service.handle('/api/switch/whatsapp/connection',{method:'GET'},null,{role:'corretor',active:true},{},()=>{}),/gestão/);
 let data;await service.handle('/api/switch/whatsapp/connection',{method:'GET'},null,{role:'admin',active:true},{},(_code,value)=>data=value);
 assert.equal(data.callbackUrl,SWITCH_CALLBACK);assert.equal(data.expectedNumber,SWITCH_NUMBER);
 for(const secret of [env.SWITCH_WHATSAPP_ACCESS_TOKEN,env.SWITCH_META_APP_SECRET,env.SWITCH_WHATSAPP_VERIFY_TOKEN])assert.ok(!JSON.stringify(data).includes(secret));
});
test('consulta de mensagens filtra pelo número comercial do canal',async()=>{
 let query;const service=attachSwitchChannel({env,client:{rest:async path=>{query=path;return[];},rpc:async()=>{}}});
 await service.handle('/api/switch/whatsapp/inbox',{method:'GET'},null,{role:'admin',active:true},{},()=>{});
 assert.match(query,/phone_number_id=eq.11111111/);
});
