export const PHOTO_MIN_LONG_EDGE: 2000;
export const PHOTO_MIN_SHORT_EDGE: 1200;
export type PhotoDimensions = {width?: number; height?: number};
export type PublicationPhoto = PhotoDimensions & {caption?: string; room?: string};
export function photoQualityIssue(photo: PhotoDimensions): string | null;
export function photoPublicationIssues(photos: readonly PublicationPhoto[]): string[];
