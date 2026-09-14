# EME Select — piloto navegável da tela inicial

Verificação das fontes: 13/09/2026.

**Estado: planejamento técnico e visual. Nenhum mundo Marble foi gerado, comprado, exportado ou importado nesta etapa.** A imagem aprovada continua sendo a referência visual. Recuperar essa imagem e seu arraste não equivale a concluir a navegação espacial.

**Decisão do usuário em 13/09/2026: piloto adiado.** O usuário não autorizou gerar o teste público neste momento e pediu a restauração de todas as imagens originais, com transições refinadas. Não retomar geração, publicação ou contratação sem nova instrução. O registro abaixo descreve somente a preparação realizada anteriormente.

Atualização da sessão de 13/09/2026: o usuário criou a conta e entrou no Marble. A imagem original e a direção visual foram carregadas no formulário, com Marble 1.1 selecionado. O botão Create ainda não foi acionado: o plano Free permite somente visibilidade pública na galeria; tanto Private quanto Unlisted abriram a oferta Standard de US$ 20/mês. A decisão pendente é autorizar a exposição pública desse teste ou escolher uma modalidade privada. Nenhuma assinatura foi contratada. [Registro do teste preparado](../marble-pilot/home/PILOTO-01.md).

## O que será produzido

Um único cenário conceitual para a home, preservando arquitetura, enquadramento inicial, materiais, paisagismo, luz e paleta da imagem aprovada. A exploração deve revelar profundidade sem voltar à aparência de maquete simplificada. O logotipo, os títulos, a busca e os pontos de acesso permanecem componentes do site, separados do mundo gerado.

O Marble interpreta a imagem e cria partes não visíveis. Portanto, o resultado será uma composição conceitual, não uma reconstrução certificada de um imóvel. A própria documentação reconhece essa interpretação criativa. [Geração a partir de imagem](https://docs.worldlabs.ai/marble/create/prompt-guides/image-prompt)

## Custos e acesso

| Aplicativo Marble | Mensalidade anunciada | Créditos | Gerações anunciadas |
|---|---:|---:|---:|
| Free | US$ 0 | 7.000 | Até 4 |
| Standard | US$ 20 | 20.000 | Até 12 |
| Pro | US$ 35 | 40.000 | Até 25 |
| Max | US$ 95 | 120.000 | Até 75 |

Esses máximos diminuem com edições e operações adicionais. A documentação de cobrança descreve alocação mensal nos quatro planos; a página de preços não especifica separadamente a data de renovação do saldo Free. Confirmar o saldo e seu ciclo na conta antes de depender de testes gratuitos recorrentes. [Preços](https://marble.worldlabs.ai/pricing) · [Cobrança](https://docs.worldlabs.ai/marble/support/account-billing)

O Free gera mundos, mas não exporta. O Standard exporta splats, panoramas e malhas de colisão; o Pro acrescenta malhas texturizadas de alta qualidade e é anunciado com direitos comerciais. [Exportação](https://docs.worldlabs.ai/marble/export/gaussian-splat/index)

Há uma divergência nas fontes oficiais: preços/exportação associam direitos comerciais ao Pro, enquanto os termos §3.3 e §13.23 incluem o Standard entre contas pagas com direitos comerciais. Não assumir essa autorização no Standard sem esclarecer as condições contratadas. Os termos também determinam que uma criação feita no Free permanece não comercial após upgrade: a versão destinada ao site deve nascer sob licença adequada. [Termos](https://docs.worldlabs.ai/terms-of-service)

Para uma produção pontual, a API é uma segunda opção: compra mínima de US$ 5, saldo separado do app e sem expiração; uma geração Marble 1.1 a partir de imagem comum custa 1.580 créditos, aproximadamente US$ 1,26, antes de novas tentativas. Exportação PLY não tem cobrança adicional. A API pode cobrar excedentes: o pré-pago não constitui teto automático. Nenhuma compra está autorizada ou efetuada por este documento. [Preços da API](https://docs.worldlabs.ai/api/pricing)

## Sequência proposta

1. Preparar a imagem arquitetônica sem interface, textos ou bordas artificiais; preservar a fonte aprovada e registrar qualquer adaptação necessária. A recomendação oficial é imagem nítida, com perspectiva e alta resolução.
2. Gerar um primeiro candidato usando Marble 1.1, inicialmente com expansão limitada. Registrar modelo, imagem, prompt, custo e regime de licença.
3. Comparar o enquadramento inicial lado a lado com a referência. Inspecionar deslocamentos curtos antes de liberar exploração ampla. Rejeitar fachadas derretidas, janelas duplicadas, árvores borradas ou chão inconsistente.
4. Exportar o candidato aprovado em SPZ, incluindo opção reduzida, e guardar metadados. A biblioteca Spark integra Gaussian Splats ao Three.js existente. Não é necessário substituir o site ou executar uma geração para cada visitante. [Spark](https://sparkjs.dev/) · [Integração oficial](https://docs.worldlabs.ai/marble/export/gaussian-splat/spark)
5. Ajustar escala, eixos, limites da câmera e posições dos pontos clicáveis usando o arquivo real. Aplicar GSAP nas aproximações e transições. Carregar o mundo sob demanda; manter a imagem original como apresentação imediata e alternativa para dispositivos sem desempenho suficiente.
6. Aprovar o piloto no computador e em celular físico antes de replicar para os demais ambientes.

## Critérios de aprovação

- O primeiro enquadramento conserva a linguagem visual aprovada, sem aparência de brinquedo ou maquete.
- O deslocamento revela profundidade coerente e não abre buracos ou áreas de baixa qualidade dentro do percurso permitido.
- A arquitetura permanece estável; não há deformação por movimentos de câmera ou efeito de paralaxe exagerado.
- Busca, menus e pontos clicáveis continuam legíveis e funcionais.
- Toque, arraste, zoom, retorno à posição inicial e preferência por menos movimento funcionam sem saltos.
- A home oferece imagem imediata durante carregamento e em caso de falha. Medir tempo e fluidez com o arquivo efetivo; ainda não há resultados de desempenho do Marble neste projeto.
- Licença, origem da imagem, exportações e versão final ficam registradas antes de publicação comercial.
