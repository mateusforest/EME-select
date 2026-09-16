import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const files = ['20260916_operations.sql', '20260916_intelligence.sql'];
const parts = files.map(name => {
  const source = readFileSync(new URL('supabase/migrations/' + name, root), 'utf8').trim();
  if (!/^begin;/i.test(source) || !/commit;$/i.test(source)) throw new Error('Expected transactional migration: ' + name);
  return '-- ' + name + '\n' + source.replace(/^begin;\s*/i, '').replace(/\s*commit;$/i, '');
});
const target = new URL('docs/sql/ATIVAR-OPERACOES-IA.sql', root);
const preamble = `-- EME SELECT · 0.14.0
-- Executar no SQL Editor do projeto vjoajqrwqdeujqaognac (EME).
-- Cria 7 tabelas privadas e 2 funções. Não altera imóveis nem financeiro.
-- Sem tokens, senhas, chaves ou dados de exemplo neste arquivo.
-- Uma única transação: qualquer erro cancela a ativação inteira.
begin;
do $$ begin
  if to_regclass('public.eme_profiles') is null
    or to_regclass('public.eme_cases') is null
    or to_regclass('public.eme_finance_state') is null then
    raise exception 'Base EME não identificada. Confira o projeto antes de continuar.';
  end if;
end $$;
`;
mkdirSync(dirname(fileURLToPath(target)), { recursive: true });
writeFileSync(target, preamble + '\n' + parts.join('\n\n') + `\n\ncommit;\n
-- Conferência da ativação: as 7 tabelas devem aparecer com RLS = true.
select relname as tabela, relrowsecurity as rls from pg_class
where relnamespace='public'::regnamespace and relname in
('eme_operations_state','eme_operations_audit','eme_operations_receipts','eme_operations_files',
 'eme_ai_settings','eme_ai_runs','eme_ai_audit') order by relname;
`, 'utf8');
console.log('SQL de ativação preparado: docs/sql/ATIVAR-OPERACOES-IA.sql');
