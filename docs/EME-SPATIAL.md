# EME Spatial — estúdio de espaços

Nome de trabalho escolhido para o produto. Disponibilidade de marca ainda não verificada. Spatial Studio é a área interna de produção, em `/portalselect/spatial`, restrita a administradores.

## O produto

Uma operação de produção de experiências imobiliárias, assistida por IA, com orçamento, referências, reaproveitamento de tipologias e controle de qualidade. O primeiro empreendimento de validação é o G400. A plataforma deve permitir produzir projetos sem depender de pedidos repetidos em uma conversa.

| Nível proposto | Entrega pretendida | Principal variável de custo |
| --- | --- | --- |
| Apresentação | Perspectivas, plantas, pontos interativos e transições | Acervo e quantidade de vistas |
| Navegável | Ambientes com geometria e deslocamento contínuo | Tipologias únicas, detalhamento e desempenho |
| Signature | Realismo elevado e iluminação avançada | Produção artística, processamento e infraestrutura |

Os níveis são propostas comerciais. A seleção no estúdio não significa que os respectivos geradores estejam implementados.

## Primeira versão implementada

- Projetos salvos no servidor, com versão para evitar sobrescritas concorrentes.
- Simulação editável de esforço, prazo, custos, margem, tributos e cortesia.
- Investimento na plataforma separado do custo de produzir o empreendimento.
- Referências existentes do G400 e exportação de projeto em JSON.
- Plano de produção revisável por IA, usando a conexão protegida da Central de IA. Somente nome, nível, escopo e objetivo são enviados; arquivos e valores financeiros não são enviados.

Ainda não inclui importação de arquivos, extração de plantas, geração de modelos, fila de processamento, medição real de consumo ou publicação de experiências. O plano de IA é texto orientador, não uma cena produzida. Nesta implementação não foram feitas chamadas pagas reais para validar a qualidade dos planos.

## Como reduzir o prazo com evidência

As 2.276 horas do orçamento anterior representam esforço acumulado da equipe. Não são dias corridos. A base anterior continua como referência manual, e não como compromisso comercial do novo produto.

O piloto deve conter uma tipologia e um ambiente social. A simulação inicial do nível Navegável usa 130 horas de base, 60% potencialmente automatizáveis e redução de 50% nessa parcela: restam 91 horas. Com duas pessoas, 30 horas produtivas por semana cada e uma semana adicional de revisão, a conta arredonda para três semanas. Todos esses números são hipóteses editáveis, ainda não medições. Não incluem construir o motor de produção.

Antes de recalcular o G400 completo, registrar no piloto: preparação das referências, correção da geometria, montagem, materiais, iluminação, navegação, testes, retrabalho e processamento. Comparar previsão e realizado por etapa. Repetir unidades a partir de tipologias validadas; não modelar cada apartamento do zero.

O cadastro de referência contém oito tipologias, 13 níveis internos distintos e 31 unidades, além das áreas comuns e garagens. Perspectivas e plantas orientam a produção, mas não substituem medidas verificadas ou um modelo arquitetônico. Uma imagem bonita não garante geometria navegável consistente.

## Motor de produção a desenvolver

1. Importar arquivos e organizar origem, versão e direitos de uso.
2. Extrair cômodos, aberturas e medidas para uma estrutura editável, sinalizando incertezas.
3. Validar escala e circulação antes de produzir mobiliário e acabamentos.
4. Montar cenas com componentes reutilizáveis e bibliotecas de materiais. Usar IA para tarefas delimitadas, preservando a planta aprovada.
5. Gerar a experiência conforme o nível: apresentação, navegação web ou motor de maior fidelidade, sujeito a validação técnica e de licenças.
6. Executar tarefas em fila, com estimativa de custo, teto de consumo, cancelamento, proteção contra duplicidade e versões recuperáveis.
7. Revisar qualidade visual, colisões, acessibilidade, desempenho e fidelidade arquitetônica; publicar uma versão aprovada.

O primeiro marco técnico deve ser um ambiente percorrível do piloto com custo e tempo registrados. Só então expandir para o edifício completo e automatizar a repetição de tipologias.

## Modelo de cobrança

Separar produção inicial, licença/operação recorrente e alterações posteriores. A captação e eventual comissão imobiliária devem aparecer separadamente. A base de produção depende de tipologias únicas, níveis internos, áreas comuns, acervo recebido, acabamento desejado e revisões incluídas.

Na simulação, custo = (horas restantes × custo/hora + recursos) × (1 + contingência). Preço de referência = custo ÷ (1 − tributos − margem), arredondado para cima em milhares. As alíquotas e a margem são premissas internas, não orientação tributária. A cortesia reduz o valor cobrado, não o custo de produção.

Para o G400, apresentar o preço de referência e a cortesia de 100% em linhas distintas. Isso não implica gratuidade indefinida de hospedagem, processamento ou alterações. As condições precisam constar da proposta final.

O investimento de desenvolvimento do EME Spatial deve ser acompanhado separadamente e amortizado por uma política comercial futura. Não somar automaticamente todo esse investimento a cada cliente. A mensalidade dependerá do custo real de hospedagem, processamento, suporte e uso. Direitos de incorporação, domínio próprio, entrega de arquivos e eventual distribuição independente precisam ser especificados por contrato.

## Situação de implantação

A primeira versão foi publicada em 29/09/2026. A migração `20260929_spatial_studio.sql` foi aplicada ao projeto de produção, com acesso protegido. A evolução abaixo utiliza o mesmo registro e dispensa nova migração. Os testes de interface e de composição assistida usam respostas de IA simuladas; isso não comprova a qualidade artística das sugestões do provedor.

## Evolução: oficina e documentos

A oficina do Spatial Studio agora monta apresentações com seleção e ordenação das referências do G400 e permite configurar o piloto geométrico do Tipo 5. Três acabamentos, horário de luz e ponto inicial da visita são editáveis. A caminhada reutiliza o percurso e as colisões do piloto já existente; não representa uma nova reconstrução automática a partir de plantas.

A composição com IA usa somente o objetivo e o catálogo de identificadores autorizados. A resposta configura recursos existentes e é validada no servidor. Não envia imagens, custos internos ou credenciais para o navegador. O usuário revisa o resultado e salva a configuração no projeto. A qualidade da resposta do provedor não foi avaliada com chamadas pagas nesta entrega.

A exportação principal é agora PDF: capa com a primeira referência selecionada, escopo, nível, entregáveis personalizáveis, investimento, cortesia, condições e referências visuais. O relatório interno acrescenta custos, capacidade e margem; a proposta externa omite essas premissas. O JSON continua disponível como dados editáveis e a oficina 3D exporta GLB com geometria, materiais e metadados do estudo. A exportação GLB não inclui o aplicativo de caminhada, câmera ou ambiente HDR do visualizador.

Os novos campos são opcionais no registro existente e não exigem migração adicional. Projetos anteriores permanecem válidos. Importação de novas plantas, geração de geometria por IA, nível Signature fotorrealista, processamento em fila e publicação autônoma continuam fora desta entrega. A atualização do estúdio não altera o cenário público do empreendimento.

## Apresentação para clientes e telas touch

`/apresentar/g400` abre uma experiência dedicada sem cabeçalho comercial, orçamento ou portal. Fachadas, seleção de pavimentos, unidades, plantas ampliáveis, interiores e lazer reutilizam o acervo do empreendimento. Apenas o Tipo 5 tem caminhada 3D; as outras tipologias abrem plantas. Controles podem ser recolhidos e recuperados por um botão persistente ou pela tecla H. Tela cheia é solicitada por gesto do usuário; se o navegador negar, a apresentação continua ocupando a janela. Teclas F, Esc e setas complementam toque e mouse.

Na oficina, Abrir este cenário em apresentação gera `/apresentar/cenario#…`, com uma cópia explícita de título e configuração visual validada. Não contém cadastro, identificador do projeto, orçamento, instruções internas, credenciais ou proposta comercial. Não consulta APIs administrativas. O link é público para quem o receber, pode ser encaminhado e não expira nem pode ser revogado nesta versão. Alterações na oficina exigem um novo link; o antigo preserva sua configuração. A edição segue restrita ao portal da EME. Conta externa de cliente, publicação com versão central e revogação são evoluções separadas, não implementadas por este link.

Referência visual fornecida: vídeo `WhatsApp Video 2026-09-28 at 19.44.41.mp4`. Direção aprovada: imagem dominante, passagem de edifício a unidade e navegação interna contínua com poucos controles. O objetivo de produção é a fidelidade ao empreendimento inteiro, não um modelo genérico. A interface de apresentação não transforma as perspectivas em geometria navegável. Para alcançar o nível da referência, produzir e validar fachadas, implantação, áreas comuns, garagens, tipologias, mobiliário, materiais, luz e vistas reais; geometria e medidas precisam de fontes verificadas. Não anunciar o atual piloto como equivalente fotorrealista ou como passeio completo pelo condomínio.

Verificação: navegação, tela cheia e fallback, links inválidos, seleção de unidades, ampliação de plantas, caminhada Tipo 5, layout móvel e entrada touch em viewport 4K testados no navegador. Esses testes não substituem a validação de desempenho e calibração na TV física escolhida para o escritório.
