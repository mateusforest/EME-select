# Portal 0.9 — Supabase e Vercel

O portal publicado usa Supabase Auth para senhas, Postgres para cadastros e histórico e o bucket privado eme-property-photos para fotografias. A função api/portal.js mantém os contratos do portal. As sessões são cookies HttpOnly, Secure e SameSite=Strict, com expiração e revogação no banco. As tabelas não têm acesso direto por anon/authenticated; a função valida a sessão, o responsável pelo cadastro e o papel antes de usar a credencial de servidor. A publicação usa somente uma projeção de campos públicos.

## Configuração de produção
SUPABASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SERVICE_ROLE_KEY já configurados na Vercel. Nunca expor a service role em variável VITE_.

Para ativar o primeiro administrador, configurar EME_ADMIN_EMAIL com o e-mail autorizado e EME_BOOTSTRAP_TOKEN com 32 bytes aleatórios em hexadecimal (Secret na Vercel). Entregar o código privadamente ao responsável. Ele escolhe a própria senha em /portalselect. Sem essas variáveis, a ativação permanece bloqueada. Depois do primeiro cadastro, não é possível executar outro bootstrap. Os demais membros são criados pelo administrador e devem trocar a senha provisória.

## Migração
supabase/migrations/20260914_portal.sql foi aplicada em 14/09/2026. Não executar novamente: contém CREATE TABLE. O SQLite local estava vazio (zero usuários, avaliações, anúncios e fotos), portanto não havia dados de clientes a importar. O arquivo local foi preservado. npm start continua sendo o servidor local SQLite; a produção usa a API Vercel/Supabase.

## Validação
npm run test:cloud verifica curadoria, projeção pública e transações/RLS em Postgres via PGlite. scripts/verify-cloud.mjs executa integração contra um projeto vazio com contas fictícias e limpa apenas os IDs criados no teste; não executar após ativar o portal. O teste confirmou login, troca obrigatória de senha, atribuição, upload, conflitos, aprovação, publicação, retirada e revogação de sessões.

## Limites atuais
20 fotos por imóvel; imagens são preparadas no navegador para caber no envio à Vercel e reprocessadas no servidor. Fotos retiradas da galeria podem permanecer privadas no storage e precisar de limpeza posterior. Não há recuperação de senha por e-mail implementada. Backups e retenção devem ser definidos conforme o plano Supabase contratado. Administração financeira de locação e automações de IA ainda não fazem parte desta migração. Consultas da carteira precisam de paginação antes de ultrapassar o limite de retorno configurado no Supabase.
