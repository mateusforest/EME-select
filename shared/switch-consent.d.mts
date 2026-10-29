export const SWITCH_CONSENT_VERSION: string;
export const switchConsentText: Readonly<Record<'privacy'|'contact'|'updates'|'professional'|'professionalPrivacy', string>>;
export function requireSwitchConsentVersion(value: unknown): void;
