export const selectEntryPath = '/acesso-select';
export const selectTeamPath = '/acesso-select/equipe';

// Old bookmarks remain redirects, never a second sign-in screen.
export function canonicalSelectPath(path) {
  if (!/^\/(?:portalselect|acesso-select\/equipe)(?:\/|$)/.test(path)) return path;
  let section = path.replace(/^\/(?:portalselect|acesso-select\/equipe)\/?/, '').replace(/\/+$/, '');
  if (/^demo(?:\/|$)/.test(section)) section = section.replace(/^demo\/?/, '');
  section = ({hoje:'', carteira:'imoveis', atendimento:'relacionamento'})[section] ?? section;
  return selectTeamPath + (section ? '/' + section : '');
}
