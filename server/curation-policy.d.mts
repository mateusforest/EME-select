import type { Curation } from '../src/portal/api';
export const LEGACY_POLICY: string;
export const SELECT_POLICY: string;
export function readCuration(input?: { saved?: Record<string, unknown> | null; type?: string; stage?: string }): Curation;
export function curationSnapshot(curation: Curation): Record<string, unknown>;
