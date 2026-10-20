const destinations = {
  todos: '#/', serra: '#/?ambiente=serra', litoral: '#/?ambiente=litoral', urbano: '#/?ambiente=cidade',
  condominios: '#/?ambiente=cidade&categoria=casas&opcao=condominio',
  comercial: '#/?ambiente=cidade&categoria=comercial', terrenos: '#/?ambiente=serra&categoria=terrenos',
  industrial: '#/?ambiente=cidade&categoria=comercial&opcao=galpao',
};
export const environmentHref = id => destinations[id] || '#/';
export function resolvePublicRoute(hash) {
  if (/^#\/empreendimentos\/(?:casa-m-veredas|moradas-da-serra|g400)(?:[/?]|$)/.test(hash)) return '#/colecao';
  if (hash === '#ef-empreendimentos') return '#ef-colecao';
  const match = /^#\/ambientes\/([^/?]+)(?:\?.*)?$/.exec(hash);
  return match && Object.hasOwn(destinations, match[1]) ? destinations[match[1]] : hash;
}
export function publicTitle(title) {
  const text = String(title || '').trim();
  if (text !== text.toLocaleUpperCase('pt-BR')) return text;
  const lower = text.toLocaleLowerCase('pt-BR');
  return lower.replace(/^\p{L}/u, letter => letter.toLocaleUpperCase('pt-BR')).replace(/\beme\b/gi, 'EME');
}
const editorialInstruction = /^(?:destacar|apresentar|valorizar(?: editorialmente)?|evidenciar|mencionar|ressaltar|incluir|evitar|não prometer|na divulgação|orientação editorial)\b/i;
export function publicReasons(property) {
  const clean = list => (list || []).filter(value => typeof value === 'string').map(value => value.trim()).filter(value => value && !editorialInstruction.test(value));
  const reasons = clean(property.reasons);
  return [...new Set(reasons.length ? reasons : clean(property.tags))].slice(0, 6);
}
