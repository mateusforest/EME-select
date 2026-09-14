# Portal Select 0.8.0 — imóveis e anúncios

## Cadastrar o primeiro imóvel

1. Abra `/portalselect/imoveis` no servidor local e entre com sua conta. Se ainda não há administrador, conclua a configuração inicial com seus próprios dados.
2. Escolha **Cadastrar imóvel**. Informe título, localização pública, tipo, ambiente, finalidade, preço, área e características. Endereço completo e contato do proprietário possuem campos privados separados.
3. Salve. Adicione fotografias autorizadas, descreva cada ambiente, ajuste a ordem e salve novamente. A primeira fotografia é a capa.
4. Abra **Ver prévia salva** para conferir o anúncio com a apresentação editorial do site. A prévia exige autenticação e respeita a carteira atribuída ao corretor.
5. Abra a curadoria vinculada, registre evidências e verificações e conclua a aprovação de entrada. A política permanece piloto; não é laudo ou verificação jurídica automatizada.
6. Retorne ao anúncio, confirme a autorização de divulgação e selecione **Publicar anúncio**, com uma conta administradora. A coleção deste servidor passa a exibir os imóveis reais publicados.

Uma avaliação existente também pode originar um cadastro. O link abre o anúncio já vinculado quando ele existe, evitando duplicação.

## Fotografias e apresentação

- Até 20 fotografias JPEG, PNG ou WebP, com até 8 MB e 20 megapixels por arquivo. Mínimo de 600 pixels no lado maior e 200 no menor.
- O servidor valida o conteúdo, corrige orientação, remove metadados e prepara WebP de até 2400 × 2400 pixels. A versão preparada é guardada no banco privado; o original não é arquivado. Preserve os originais em seu acervo.
- Cada foto precisa de legenda. Capa, ordem e remoção são administradas no cadastro.
- A galeria carrega a próxima imagem antes de iniciar a transição gradual de 850 ms. Inclui miniaturas, navegação pelo teclado, ampliação, pausa e apresentação automática a cada 6,5 segundos.
- Movimento reduzido desativa a apresentação automática e a transição. A reprodução também respeita interação, janela oculta e galeria ampliada.

## Publicação e acesso

Preço e área positivos, região pública, descrição com pelo menos 80 caracteres, diferenciais, fotografias legendadas e entrada aprovada são exigidos para publicar. Não há preço mínimo comercial. A finalidade é venda **ou** locação por cadastro nesta versão.

Corretor acessa os imóveis de sua carteira; administrador revisa e publica. Alterações em anúncio aprovado exigem administrador. Qualquer edição de dados ou fotos retira a publicação anterior e recoloca as conferências em revisão. Reaprovar a curadoria não republica automaticamente: uma nova confirmação de publicação é necessária.

A resposta pública contém somente os campos selecionados para divulgação. Endereço interno, nome e contato do proprietário, notas de curadoria e referências jurídicas ficam fora dela. Fotos não publicadas exigem acesso à carteira; retirar o anúncio bloqueia novos acessos públicos às imagens. Conteúdo que alguém já tenha copiado ou baixado não pode ser revogado.

Os cenários continuam ilustrativos. Quando há anúncios reais publicados, a busca da coleção utiliza esses registros. Os exemplos antigos permanecem identificados como demonstrativos nos pontos exploratórios dos cenários.

## Armazenamento e hospedagem

Banco SQLite privado, versão de esquema 3, com fotos em BLOB. `npm run backup:portal` inclui dados e fotografias e exige novo login após restauração. Não coloque `.eme-private`, backups ou documentos pessoais no Git, na pasta pública ou no pacote de publicação.

Esta entrega funciona no servidor local `npm start` em `127.0.0.1:4191`. O build estático da Vercel **não executa esta API nem recebe o banco deste computador**. Para operação online compartilhada, ainda é necessário hospedar a API, configurar banco persistente, armazenamento, HTTPS, autenticação e backups no ambiente de produção. Não exponha este servidor local diretamente à internet.

Não foram implementados IA, análise jurídica automática, recebimento de documentos, administração financeira de locações, assinatura ou sincronização com portais externos. Campos preenchidos e aprovação humana não equivalem a certidão de regularidade.

## Verificação

`npm run test:api` cobre contas, permissões, curadoria, arquivos, publicação, retirada e proteção de dados privados. `node scripts/verify-listings.mjs` verifica cadastro, upload, ordenação, prévia, galeria, celular, publicação e retirada usando somente um banco temporário e dados explicitamente fictícios. Evidências visuais em `design/listings/`.
