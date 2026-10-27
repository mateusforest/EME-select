# Materiais de divulgação

Biblioteca interna disponível em **Operação → Materiais de divulgação** no portal administrativo e em **Carteira → Materiais de divulgação** para corretores. A ficha de cada imóvel salvo também tem o botão **Materiais de divulgação**, que abre a mesma biblioteca filtrada pelo imóvel.

## Uso

- Cada arquivo pode ser vinculado a um imóvel e, opcionalmente, a um corretor. Sem imóvel, aparece em **Materiais gerais**.
- Categorias: Criativo, Vídeo, Apresentação, Expositor, Institucional e Outros.
- Pesquisa por título, arquivo, orientações, imóvel e corretor; filtros por imóvel, corretor e categoria.
- Envio de até dez arquivos por vez, com progresso individual e possibilidade de tentar novamente os que falharem.
- Imagens e vídeos têm visualização. PDF e ZIP podem ser baixados. Todos os downloads entregam o arquivo original.
- É possível editar título, categoria, orientações e vínculos; arquivar e restaurar materiais. Arquivar não elimina o arquivo.
- Formatos: JPG/JPEG, PNG, WebP, PDF, MP4, MOV, WebM e ZIP. Limite de 50 MiB por arquivo, sujeito também ao limite global de armazenamento do projeto Supabase. A reprodução de vídeo depende do codec suportado pelo navegador; o original permanece disponível para download.

## Permissões

Somente contas ativas da equipe, com a senha inicial já atualizada, acessam a biblioteca. Todos os corretores podem consultar e baixar os materiais da carteira. Vincular um corretor é uma forma de organização, não uma restrição de leitura.

A administração edita e arquiva qualquer material. Corretores editam e arquivam os próprios envios e podem vincular o próprio perfil. Os materiais não são publicados automaticamente no catálogo nem apresentados nos portais de clientes e proprietários.

## Ativação em produção

1. Executar `docs/sql/ATIVAR-MATERIAIS-DIVULGACAO.sql` no projeto Supabase que já atende o portal. É a cópia integral de `supabase/migrations/20261026_marketing_materials.sql`.
2. Conferir se o limite global de Storage permite arquivos de 50 MiB. O SQL configura esse limite no bucket, mas não altera o limite global do plano/projeto.
3. Publicar o código da aplicação. O servidor usa a configuração Supabase já existente; a chave de serviço nunca vai ao navegador.
4. Conferir no ambiente oficial um envio, a reprodução de um MP4, um download e as permissões com uma conta administrativa e uma conta de corretor.

O SQL cria uma tabela privada e o bucket privado `eme-marketing-materials`, com restrições para impedir acesso direto de visitantes e clientes. Não altera imóveis, leads nem contas existentes. Antes dessa ativação, o painel exibe um erro de configuração em vez de simular envios bem-sucedidos.

O envio em produção vai diretamente ao Storage com autorização temporária e específica para um arquivo. O servidor valida tamanho, tipo e assinatura antes de disponibilizar o material. Visualizações e downloads recebem URLs temporárias de cinco minutos após autenticação.

## Validação realizada

- 24 testes passaram no conjunto de materiais, API do portal, propostas e Acesso Select.
- Envio real pelo formulário local, vínculo com corretor, filtros, visualização/reprodução de vídeo e biblioteca dentro da ficha conferidos no navegador.
- Desktop e celular de 390 px conferidos, incluindo formulário sem transbordamento horizontal.
- TypeScript e build passaram. Permanece o aviso pré-existente de tamanho de alguns pacotes.
- A migração foi testada com PostgreSQL via PGlite, inclusive repetição e isolamento diante de uma política permissiva de outro bucket.
- Os contratos de Storage foram testados com respostas controladas. A ativação e o teste completo no Supabase de produção ainda não foram realizados.

Na prévia local, os arquivos são mantidos no SQLite. A prévia de demonstração usa banco temporário e dados ilustrativos, sem alterar os dados oficiais.

## Operação e limites atuais

Envios interrompidos não aparecem na biblioteca até a conclusão. Autorizações de envio expiram em duas horas; registros pendentes limitam-se a trinta por conta em 24 horas. Não há rotina automática de limpeza de uploads incompletos nesta versão. Acompanhamento do armazenamento e eventual limpeza devem conferir o status e a idade dos envios antes de remover qualquer objeto. Arquivos arquivados continuam consumindo armazenamento.

A validação de assinatura verifica correspondência de formato; não substitui uma ferramenta antimalware. ZIPs não são extraídos pelo servidor.

Referências técnicas: [envio com autorização temporária](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl), [uso da autorização](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl) e [limites de arquivos](https://supabase.com/docs/guides/storage/uploads/file-limits).
