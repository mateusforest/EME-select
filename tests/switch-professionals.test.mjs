import {SWITCH_CONSENT_VERSION} from '../shared/switch-consent.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {switchProfessionalEnrollment,switchProfessionalReview,switchSendEligibility} from '../shared/switch-professionals.mjs';
import {switchProToken,whatsappSwitchReady,sendSwitchWhatsAppTemplate} from '../server/cloud/switch-professionals.mjs';

const input={requestId:'8c43ee32-d668-4493-b251-aa22a08df956',name:'Corretor de exemplo',
 phone:'(54) 99999-9999',creci:'RS 12345',business:'Imobiliária Exemplo',city:'Vacaria',
 propertyType:'Casa',whatsappOptIn:true,privacyAccepted:true,consentVersion:SWITCH_CONSENT_VERSION};
const env={SWITCH_WHATSAPP_ENABLED:'true',WHATSAPP_ACCESS_TOKEN:'token-de-teste-somente-fake',
 WHATSAPP_PHONE_NUMBER_ID:'1234567891011',WHATSAPP_GRAPH_VERSION:'v22.0',
 SWITCH_WHATSAPP_TEMPLATE:'m_switch_convite_profissional',
 SWITCH_INVITE_SECRET:'uma-chave-aleatoria-sintetica-testes-com-mais-de-32'};
test('cadastra somente voluntários com aceite explícito para receber ofertas no WhatsApp',()=>{
 const result=switchProfessionalEnrollment(input);
 assert.equal(result.phone,'5554999999999');assert.equal(result.whatsappOptIn,true);
 for(const changed of [{whatsappOptIn:false},{privacyAccepted:false},{website:'spam'},{consentVersion:undefined},{consentVersion:'old'}])
  assert.throws(()=>switchProfessionalEnrollment({...input,...changed}));
});
test('somente status verificado autoriza convites e verificação depende de CRECI conferido',()=>{
 const prior={status:'pending',version:1,whatsapp_opt_in:true};
 assert.throws(()=>switchProfessionalReview({version:1,status:'verified',licenseChecked:false},prior));
 assert.deepEqual(switchProfessionalReview({version:1,status:'verified',licenseChecked:true},prior),{status:'verified'});
});
test('contato recusou ou acabou prazo: nenhum novo envio',()=>{
 const deal={status:'prepared',expires_at:new Date(Date.now()+86400000).toISOString(),teaser_city:'Vacaria',teaser_type:'Casa'};
 const pro={id:'p',status:'verified',whatsapp_opt_in:true,city:'Vacaria',property_type:'Casa'};
 assert.equal(switchSendEligibility(pro,deal),true);
 assert.equal(switchSendEligibility({...pro,whatsapp_opt_in:false},deal),false);
 assert.equal(switchSendEligibility({...pro,status:'paused'},deal),false);
 assert.equal(switchSendEligibility(pro,{...deal,expires_at:new Date(Date.now()-1000).toISOString()}),false);
 assert.equal(switchSendEligibility({...pro,city:'Porto Alegre'},deal),false);
});
test('token HMAC é regenerável e não depende de dado pessoal',()=>{
 const a=switchProToken(env,'deal','f6153f76-8b8a-47ef-ac10-11458c49d135');
 const b=switchProToken(env,'deal','f6153f76-8b8a-47ef-ac10-11458c49d135');
 assert.equal(a,b);assert.equal(a.length,43);
 assert.notEqual(a,switchProToken(env,'stop','f6153f76-8b8a-47ef-ac10-11458c49d135'));
});
test('WhatsApp envia template aprovado apenas com configuração completa e retorna envio à Meta, não entrega',async()=>{
 assert.equal(whatsappSwitchReady({...env,SWITCH_WHATSAPP_ENABLED:'false'}),false);
 assert.equal(whatsappSwitchReady(env),true);
 let called=0;
 const response=await sendSwitchWhatsAppTemplate(env,{
   phone:'5554999999999',city:'Vacaria',
   inviteUrl:'https://www.emeselect.com/switch/convite/abc',
   optoutUrl:'https://www.emeselect.com/switch/sair/abc'
 },async(url,options)=>{
   called++;
   assert.ok(url.startsWith('https://graph.facebook.com/'));
   assert.equal(options.headers.Authorization,'Bearer '+env.WHATSAPP_ACCESS_TOKEN);
   const data=JSON.parse(options.body);
   assert.equal(data.type,'template');assert.equal(data.template.components[0].parameters.length,3);
   return {ok:true,json:async()=>({messages:[{id:'wamid.FAKE'}]})};
 });
 assert.deepEqual(response,{messageId:'wamid.FAKE'});
 assert.equal(called,1);
});
