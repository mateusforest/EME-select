export const PHOTO_MIN_LONG_EDGE = 2000;
export const PHOTO_MIN_SHORT_EDGE = 1200;
export const PHOTO_WEB_LONG_EDGE = 1280;
export const PHOTO_WEB_SHORT_EDGE = 720;

export function photoPublicationIssue(photo) {
  const {width, height} = photo || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return 'Reenvie o arquivo para verificar suas dimensões.';
  if (Math.max(width, height) < PHOTO_WEB_LONG_EDGE || Math.min(width, height) < PHOTO_WEB_SHORT_EDGE) return `Resolução de ${width} × ${height} px. Para o site, use pelo menos ${PHOTO_WEB_LONG_EDGE} px no lado maior e ${PHOTO_WEB_SHORT_EDGE} px no menor.`;
  return null;
}

export function photoQualityIssue(photo) {
  const {width, height} = photo || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return 'Reenvie o arquivo para verificar suas dimensões.';
  }
  if (Math.max(width, height) < PHOTO_MIN_LONG_EDGE || Math.min(width, height) < PHOTO_MIN_SHORT_EDGE) {
    return `Para maior definição, prefira ${PHOTO_MIN_LONG_EDGE} px no lado maior e ${PHOTO_MIN_SHORT_EDGE} px no menor.`;
  }
  return null;
}

export function photoPublicationIssues(photos) {
  if (!Array.isArray(photos) || !photos.length) return ['Adicione pelo menos uma fotografia real.'];
  const issues = [];
  photos.forEach((photo, index) => {
    const label = `Foto ${index + 1}`;
    const quality = photoPublicationIssue(photo);
    if (quality) issues.push(`${label}: ${quality}`);
  });
  return issues;
}
