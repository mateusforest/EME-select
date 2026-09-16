export const DEFAULT_AI_MODEL = 'gpt-6-astra';
export const AI_TIMEOUT_MS = 90000;

// An untouched installation follows the server configuration. Once an admin
// saves settings (version > 0), an explicit disable or model choice takes precedence.
export function resolveAISettings(settings, env = process.env) {
  if (Number(settings.version) !== 0) return settings;
  const model = /^[a-zA-Z0-9._:-]{3,100}$/.test(env.OPENAI_MODEL || '') ? env.OPENAI_MODEL : DEFAULT_AI_MODEL;
  return { ...settings, model, enabled: Boolean(env.OPENAI_API_KEY) };
}
