# Envio, cadastro e percurso fotográfico — 0.10.0

## Fluxo de trabalho

1. **Envio pelo site:** imóvel, contato e revisão. O solicitante informa vínculo, localização, finalidade, características e situação declarada. O consentimento autoriza contato sobre a avaliação; não autoriza publicidade.
2. **Recebimento:** o servidor cria ficha e avaliação vinculadas, na etapa Recebido, atribuídas a um administrador ativo. O protocolo permite repetir uma solicitação após falha de conexão sem duplicá-la. Não são geradas notas, aprovação ou publicação.
3. **Cadastro da equipe:** cinco etapas — identificação, características, apresentação, fotografias e revisão. O rascunho exige somente título e cidade; os requisitos completos são cobrados antes de publicar.
4. **Curadoria humana:** conferir autorização, características, mercado e documentação, com evidências e decisão. Cadastro e prévia não equivalem a aceitação na carteira.
5. **Publicação explícita:** somente após as conferências. Alterações posteriores retiram a versão pública e exigem nova revisão.

O formulário público recebe dados e contato; as fotografias são adicionadas pela equipe no cadastro autenticado. Origem do anúncio, vínculo, contato, endereço privado e observações internas não integram a projeção pública. A fila de avaliações e o cadastro compartilham o mesmo identificador.

## Ficha e fotografias

A ficha inclui áreas privativa e total, quartos, suítes, banheiros, vagas, ano de construção, finalidade, preço e encargos. Campos desconhecidos devem ficar vazios. O IPTU é anual; se a periodicidade da fonte não for explícita, conservar o valor em observações até confirmar.

Cada fotografia tem legenda, grupo e posição. A primeira é a capa. A ordem salva determina o percurso e pode ser alterada com controles acessíveis. A primeira aparição de um grupo cria seu capítulo. A prévia usa os arquivos reais, sem inventar geometria ou cômodos.

Sequência sugerida: entrada/estar → jantar → cozinha → vista → área íntima → serviço → áreas comuns. Alternar ângulos próximos que ajudem a entender as conexões; evitar repetições e não presumir que duas fotos mostram dormitórios distintos.

A galeria oferece tela inteira, dissolução com avanço suave, navegação por capítulos, setas, teclado, arraste e reprodução opcional. Carrega a próxima foto antes da troca, conserva a anterior em caso de falha e respeita movimento reduzido. “Foto inteira” permite conferir o enquadramento original. É um percurso fotográfico, não um levantamento espacial 3D.

## Apartamento de referência

O material fornecido em 15/09/2026 foi registrado privadamente como **Frente ao mar, entre o estar e o horizonte**, Balneário Camboriú/SC. Seleção: 12 das 17 fotografias, preservando a resolução original (~870 px de largura). A nitidez em telas grandes depende de receber arquivos de maior resolução.

Os valores e características são declarações do anúncio de referência: R$ 3.990.000, 116 m² privativos, 226 m² totais, três quartos/suítes, quatro banheiros e duas vagas. Disponibilidade, titularidade, endereço, áreas, valores atuais, autorização de uso das imagens e documentação aguardam conferência. Afirmações do anunciante como “documentação regular” não foram convertidas em verificações concluídas. Nenhum contato foi feito com o anunciante.

As imagens e o cadastro real ficam no Supabase privado, fora do Git. O imóvel permanece **Em avaliação**, sem anúncio público. Os arquivos de marketing recebidos junto às fotos não foram usados como dados do apartamento.

## Implantação e proteção

- Aplicar `supabase/migrations/20260915_submissions.sql` após a migração inicial. A função de recebimento só é executável pelo serviço; não concede leitura pública de fichas.
- Backend limita tamanho, frequência, campos e tipos; força recebimento privado. O consentimento, a origem e a atribuição automática ficam registrados.
- SQLite local migra para versão 4 com a coluna de grupo das fotografias. Produção continua em Supabase; não copiar bancos locais para produção.
- Validar com `npm run build`, `npm run test:api`, `npm run test:cloud`, os testes Playwright de formulário/galeria e `node scripts/verify-listings.mjs`.

IA de análise jurídica, verificação externa automática, tour 3D e publicação autônoma não fazem parte desta entrega.
