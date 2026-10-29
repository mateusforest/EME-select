import {whatsappSwitchReady} from './switch-professionals.mjs';
import {switchAutopilotSettings} from './switch-autopilot.mjs';

// Read-only operational readiness; no secrets, contact data or service URLs are exposed.
export async function switchReadiness({client,env=process.env}){
  const tables=[
    ['Solicitações','eme_switch_requests'],
    ['Carteiras autorizadas','eme_switch_partner_offers'],
    ['Negociações','eme_switch_deal_invites'],
    ['Profissionais','eme_switch_professionals'],
    ['Fila de mensagens','eme_switch_outbox'],
    ['Auditoria de negociação','eme_switch_deal_audit']
  ];
  const checks=await Promise.all(tables.map(async ([label,name])=>{
    try{
      await client.rest(name+'?select=id&limit=0');
      return {label,key:name,ready:true};
    }catch{
      return {label,key:name,ready:false};
    }
  }));
  const databaseReady=checks.every(x=>x.ready);
  const whatsappConfigured=whatsappSwitchReady(env);
  const workflow={
    databaseReady,
    crmReady:databaseReady,
    whatsappConfigured, // Does not assert Meta approval, inbound webhook or message delivery.
    inboundWebhookEnabled:env.WHATSAPP_WEBHOOK_ENABLED==='true',
    schedulerSecretConfigured:typeof env.CRON_SECRET==='string'&&env.CRON_SECRET.length>=20,
    autopilotEnabled:switchAutopilotSettings(env).enabled,
    commercialContractReviewed:false, // External legal validation cannot be inferred from config.
    providerTemplateApproved:false // Must be confirmed in Meta; env var alone is insufficient.
  };
  return {
    checks,workflow,
    pilotCanBeTested:databaseReady,
    externalMessagesMayBeSent:whatsappConfigured,
    needsHumanSignoff:['Confirmação da habilitação profissional e condições de corretagem.',
      'Autorização de divulgação e disponibilidade do imóvel.',
      'Modelo de mensagem aprovado na Meta e número empresarial validado.',
      'Teste ponta a ponta com dados sintéticos e registro de opt-out.'],
    note:'Configuração técnica não significa canal verificado, entrega garantida ou autorização comercial.'
  };
}
