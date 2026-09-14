export interface TeamUser { id: string; name: string; email: string; role: 'admin' | 'corretor'; active: boolean; mustChangePassword: boolean }
export interface Assignee { id: string; name: string; role: string }
export interface LiveEvaluation { id: string; title: string; city: string; type: string; operation: string; owner: string; assignee_id: string; assignee: string; stage: string; version: number; created_at: string; updated_at: string }
export interface HistoryEntry { id: number; action: string; detail: string; created_at: string; author: string }
export interface Criterion { key:string; label:string; weight:number; help:string; score:number|null; note:string }
export interface Verification { key:string; label:string; state:string; note:string; author:string|null; date:string|null }
export interface Curation { policy:string; criteria:Criterion[]; checks:Verification[]; pending:string; score:number|null; blockers:string[]; coverage:number; locked:boolean }
export interface CaseDetails { evaluation: LiveEvaluation; history: HistoryEntry[]; curation:Curation }
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch('/api' + path, { method, credentials:'same-origin', cache:'no-store', ...(method !== 'GET' ? { headers:{'Content-Type':'application/json'}, body:JSON.stringify(body ?? {}) } : {}) }); }
  catch { throw new ApiError('Não foi possível conectar ao portal. Confira sua conexão e tente novamente.',0); }
  let value: T & { error?: string };
  try { value = await response.json(); } catch { throw new ApiError('O serviço do portal não respondeu corretamente. Tente novamente.',response.status); }
  if (!response.ok) throw new ApiError(value.error || 'Não foi possível concluir a operação.',response.status);
  return value;
}
