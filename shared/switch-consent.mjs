// Keep prior versions in Git; changing displayed terms requires a new version.
export const SWITCH_CONSENT_VERSION = '2026-10-29.1';
export const switchConsentText = Object.freeze({
  privacy: 'Li e concordo com o uso dos dados informados para analisar e administrar esta solicitação.',
  contact: 'Autorizo o contato da equipe M Select pelo WhatsApp informado para responder à minha solicitação.',
  updates: 'Também quero receber pelo WhatsApp avisos da M Select / M Switch sobre oportunidades compatíveis. Opcional; posso cancelar pelo atendimento.',
  professional: 'Quero receber pelo WhatsApp informado convites relevantes da M Select / M Switch com condições comerciais e link para manifestar interesse. Posso cancelar os avisos a qualquer momento.',
  professionalPrivacy: 'Concordo com o uso destes dados para análise profissional, validação de CRECI e gestão dos convites solicitados.'
});
export function requireSwitchConsentVersion(value) {
  if (value !== SWITCH_CONSENT_VERSION) throw Object.assign(new Error('Os termos foram atualizados. Recarregue o formulário e confira os consentimentos.'), {status:400});
}
