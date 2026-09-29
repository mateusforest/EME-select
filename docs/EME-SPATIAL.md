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

Código preparado localmente; não publicado em produção. A migração `20260929_spatial_studio.sql` foi criada e testada em banco de teste, mas não aplicada ao serviço de produção. O fluxo de interface usa testes com respostas simuladas; isso não comprova a qualidade artística do futuro motor.
