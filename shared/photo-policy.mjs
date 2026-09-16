export const PHOTO_MIN_LONG_EDGE = 2000;
export const PHOTO_MIN_SHORT_EDGE = 1200;

export function photoQualityIssue(photo) {
  const {width, height} = photo || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return 'Reenvie o arquivo para verificar suas dimensões.';
  }
  if (Math.max(width, height) < PHOTO_MIN_LONG_EDGE || Math.min(width, height) < PHOTO_MIN_SHORT_EDGE) {
    return `Resolução de ${width} × ${height} px. Use no mínimo ${PHOTO_MIN_LONG_EDGE} px no lado maior e ${PHOTO_MIN_SHORT_EDGE} px no menor.`;
  }
  return null;
}

export function photoPublicationIssues(photos) {
  if (!Array.isArray(photos) || !photos.length) return ['Adicione pelo menos uma fotografia real.'];
  const issues = [];
  photos.forEach((photo, index) => {
    const label = `Foto ${index + 1}`;
    const quality = photoQualityIssue(photo);
    if (quality) issues.push(`${label}: ${quality}`);
    if (typeof photo?.caption !== 'string' || photo.caption.trim().length < 3) issues.push(`${label}: descreva o ambiente com pelo menos 3 caracteres.`);
    if (typeof photo?.room !== 'string' || !photo.room.trim()) issues.push(`${label}: escolha o grupo do percurso.`);
  });
  const cover = photos[0];
  if (Number.isInteger(cover?.width) && Number.isInteger(cover?.height) && cover.width > 0 && cover.width < cover.height) {
    issues.push('Escolha uma fotografia horizontal para a capa (primeira foto).');
  }
  return issues;
}
