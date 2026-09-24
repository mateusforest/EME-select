export const locationProfiles = [
  { value: '', label: 'Todas as localizações' },
  { value: 'beira-mar', label: 'Beira-mar' },
  { value: 'centro', label: 'Centro' },
  { value: 'bairro', label: 'Bairros' },
  { value: 'natureza', label: 'Em meio à natureza' },
];
export function profilesFor(environment) {
  const allowed = environment === 'litoral' ? ['', 'beira-mar', 'centro', 'bairro'] : environment === 'serra' ? ['', 'centro', 'bairro', 'natureza'] : environment === 'urbano' ? ['', 'centro', 'bairro'] : [''];
  return locationProfiles.filter(item => allowed.includes(item.value));
}
