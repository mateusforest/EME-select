// Read-only operational readiness; no secrets, contact data or service URLs are exposed.
export async function switchReadiness({client,env=process.env}){
  const tables=[
    ['Solicitações','eme_switch_requests','id,consent_version,consent_recorded_at,demand_reviewed'],
    ['Carteiras autorizadas','eme_switch_partner_offers'],
    ['Negociações','eme_switch_deal_invites','id,closing_reference,payment_reference'],
    ['Profissionais','eme_switch_professionals','id,consent_version,consent_recorded_at,version'],
    ['Fila de mensagens','eme_switch_outbox'],
    ['Auditoria de negociação','eme_switch_deal_audit'],
    ['Histórico de solicitações','eme_switch_events'],
    ['Histórico de consentimentos','eme_switch_consent_events']
  ];
  const checks=await Promise.all(tables.map(async ([label,name,columns='id'])=>{
    try{
      await client.rest(name+'?select='+columns+'&limit=0');
      return {label,key:name,ready:true};
    }catch{
      return {label,key:name,ready:false};
    }
  }));
  const databaseReady=checks.every(x=>x.ready);
  const whatsappConfigured=env.SWITCH_WHATSAPP_ENABLED==='true' &&
    typeof env.WHATSAPP_ACCESS_TOKEN==='string'&&env.WHATSAPP_ACCESS_TOKEN.length>20&&
    /^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')&&
    /^v\d{1,3}\.0$/.test(env.WHATSAPP_GRAPH_VERSION||'')&&
    /^[a-z0-9_]{3,80}$/.test(env.SWITCH_WHATSAPP_TEMPLATE||'')&&
    (env.SWITCH_INVITE_SECRET||'').length>=32;
  const workflow={
    databaseReady,
    crmReady:databaseReady,
    rlsVerified:false, // A service-role read cannot prove anon/authenticated isolation.
    whatsappConfigured, // Does not assert Meta approval, inbound webhook or message delivery.
    inboundWebhookEnabled:env.WHATSAPP_WEBHOOK_ENABLED==='true',
    schedulerSecretConfigured:typeof env.CRON_SECRET==='string'&&env.CRON_SECRET.length>=20,
    autopilotEnabled:whatsappConfigured&&env.SWITCH_AUTOPILOT_ENABLED==='true'&&
      Number.isInteger(Number(env.SWITCH_DEFAULT_BROKERAGE_BPS))&&Number(env.SWITCH_DEFAULT_BROKERAGE_BPS)>=1&&Number(env.SWITCH_DEFAULT_BROKERAGE_BPS)<=1000&&
      Number.isInteger(Number(env.SWITCH_DEFAULT_SHARE_BPS))&&Number(env.SWITCH_DEFAULT_SHARE_BPS)>=1&&Number(env.SWITCH_DEFAULT_SHARE_BPS)<=10000,
    commercialContractReviewed:false, // External legal validation cannot be inferred from config.
    providerTemplateApproved:false // Must be confirmed in Meta; env var alone is insufficient.
  };
  return {
    checks,workflow,
    pilotCanBeTested:databaseReady,
    externalMessagesMayBeSent:databaseReady&&whatsappConfigured,
    needsHumanSignoff:['Confirmação da habilitação profissional e condições de corretagem.',
      'Autorização de divulgação e disponibilidade do imóvel.',
      'Modelo de mensagem aprovado na Meta e número empresarial validado.',
      'Teste ponta a ponta com dados sintéticos e registro de opt-out.'],
    note:'Configuração técnica não significa canal verificado, entrega garantida ou autorização comercial.'
  };
}
