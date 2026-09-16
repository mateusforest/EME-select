# Curadoria Select V2 — piloto humano e proposta de IA

**Status: núcleo de avaliação humana implementado; automação de IA/WhatsApp e cobertura estruturada ainda propostas.** Preparada em 16/09/2026 a partir dos dois motores de curadoria e dos documentos `PORTAL-050`, `060`, `070`, `080` e `100`. Os cortes são hipóteses da EME para calibrar, não um padrão de mercado já validado. Não foram atribuídas notas a imóveis reais por esta alteração.

### Escopo implementado nesta entrega

- `server/curation-policy.mjs` compartilha a mesma política entre o backend local e cloud: cinco dimensões de qualidade, pesos por família, corte 85/100, pisos 4/5 para condição/função e 3/5 nas demais dimensões.
- A interface mostra orientação por tipologia, âncoras de 0 a 5, a âncora da nota selecionada e as seis conferências humanas: enquadramento/evidências, autorização, características, mercado, documentos e limitações/revisão técnica. Nota alta não libera conferência pendente.
- Novas avaliações sem curadoria anterior recebem `EME-select-v2-pilot`. Registros com `EME-piloto-01` explícita ou formato legado de quatro critérios/chave `market` continuam na V1, inclusive se as notas estiverem vazias. A reabertura mantém a política original; não há migração automática nem conversão de notas antigas.
- Política e família são persistidas ao salvar; a política também é preservada nas decisões. Mudança de família na V2 exige repontuar e conferir novamente, mantendo as referências textuais para revisão. Pesos ou pisos recebidos dentro de registros antigos não substituem as definições do servidor.
- O indicador atual é **preenchimento**: dimensões com nota válida e referência textual, de 0 a 5 na V2 ou 0 a 4 na V1. Não mede cobertura material, qualidade da evidência ou confiança da IA.
- A decisão final e a publicação continuam humanas e separadas. Não foram conectados modelo, WhatsApp, consultas externas, verificação documental automática ou classificação de compradores.

As matrizes de requisitos, cobertura de 90%/100%, estados detalhados de evidência, verificação semântica dos dois diferenciais, roteamento automático e a camada M das seções seguintes são **especificações para etapas futuras**. Por enquanto, a suficiência das referências e os diferenciais dependem da revisão humana; não foram implementados percentuais artificiais sobre texto preenchido.

## 1. Decisão de produto

A EME seleciona a qualidade do imóvel, independentemente de preço mínimo. Preço alto, marca de acabamento, endereço valorizado e fotografia profissional não comprovam alto padrão. Um imóvel compacto pode ter excelente projeto; um imóvel caro pode não atender à seleção.

No fluxo futuro, a IA poderá organizar o atendimento pelo WhatsApp, pedir material, extrair informações e recomendar uma pré-seleção explicável. O resultado positivo previsto é **“Pré-selecionado para revisão humana”**. Somente a pessoa responsável pode aprovar a entrada na carteira; publicação é uma decisão posterior e explícita.

Separar três perguntas, com registros independentes:

| Camada | Pergunta | Resultado |
|---|---|---|
| Q — qualidade do ativo | O imóvel possui qualidade consistente para a coleção Select, dentro de sua tipologia e uso? | Nota de qualidade, evidências, cobertura e limitações |
| R — prontidão comercial | A EME tem condições de representá-lo, apresentá-lo e negociar com informações conferidas? | Checklist: pendente, em revisão, liberado ou bloqueado |
| M — adequação ao comprador | Este imóvel atende à necessidade declarada desta pessoa ou empresa? | Compatível, parcialmente compatível, incompatível ou ainda não avaliado; razões e concessões |

Não somar Q, R e M em uma “nota geral”. Preço e orçamento integram R/M, nunca elevam a qualidade Q. Uma ótima qualidade não compensa um bloqueio de autorização; uma ótima prontidão não compensa qualidade insuficiente. Um imóvel aprovado para a coleção pode ser inadequado para determinado comprador.

## 2. Diagnóstico da versão anterior

Antes desta alteração, as regras estavam duplicadas em `server/curation.mjs` e `server/cloud/domain.mjs`, sob `EME-piloto-01`. Essa política continua disponível para seus registros históricos; a matriz abaixo explica o que motivou a V2, não descreve toda a implementação atual.

| Base anterior | Consequência | Direção da V2 |
|---|---|---|
| Condição física 30%, uso 25%, contexto 20%, mercado 25%; corte 80/100 e piso 3/5 | Coerência comercial interfere na nota de qualidade; não distingue excelência de aceitabilidade | Separar Q de R e definir âncoras observáveis |
| Nota inteira de 0 a 5 com justificativa de pelo menos 10 caracteres | Texto preenchido não comprova a afirmação e não padroniza notas | Evidências estruturadas, referências por afirmação e critérios de pontuação |
| `coverage` conta dimensões com nota e texto, de 0 a 4 | Mostra preenchimento, não cobertura material do imóvel | Cobertura por requisitos aplicáveis, com itens críticos explícitos |
| Quatro conferências: autorização, descrição, mercado e documentos | Boa trava inicial, mas pouco detalhada para tipologias distintas | Separar gates da triagem de liberações humanas da operação |
| Adaptador local muda poucas orientações para terreno, terra agrícola, galpão/pavilhão e sala/loja | Lote em condomínio, centro de distribuição e edifício corporativo não recebem orientação específica; a versão cloud tem ajuda genérica | Uma política compartilhada e versionada para todos os tipos |
| Administrador confirma as conferências e a decisão final | Já existe responsabilidade humana a preservar | IA sem permissão para confirmar conferências, aprovar entrada ou publicar |
| Reabertura/alteração exige nova revisão; publicação é independente | Boa separação entre cadastro, decisão e anúncio | Preservar as travas e vincular nova evidência à versão avaliada |
| Não há IA/WhatsApp conectados no fluxo descrito nesses documentos | Uma proposta de atendimento não pode ser apresentada como automação ativa | Implementar primeiro triagem assistida e validar com casos reais autorizados |

Hoje não existe preço mínimo comercial na curadoria; o anúncio exige preço e área positivos para publicação. Manter essa distinção. As limitações dos documentos antigos devem ser lidas por versão: por exemplo, `PORTAL-050` descreve uma demonstração anterior, não todo o estado atual.

## 3. Gates que nenhuma nota pode compensar

Na automação proposta, cada gate terá `pass`, `pending`, `fail` ou `needs_specialist`, mais motivo, evidências, responsável e data. Ausência de informação será `pending`, nunca `fail`. Suspeita sem confirmação também não é reprovação factual. A implementação humana atual conserva os estados `Pendente`, `Em revisão` e `Conferido` e o campo de pendências abertas.

### 3.1 Antes de recomendar a pré-seleção

| Gate | Condição objetiva | Se não atendido |
|---|---|---|
| Escopo | Tipo, região atendida, operação e uso pretendido identificados, conforme catálogo de atuação vigente | Encaminhar à pessoa responsável por exceções ou informar fora de escopo |
| Permissão de atendimento | Solicitação e permissão de contato registradas; papel de proprietário/representante declarado | Pedir esclarecimento; não presumir autorização de divulgação |
| Identificação do imóvel | Registro único, localização suficiente para distinguir o ativo e ausência de contradição material não resolvida | Completar ou resolver duplicidade/conflito |
| Evidência mínima | Requisitos críticos da tipologia cobertos e todas as dimensões Q pontuáveis | Pedir material específico, mantendo nota total indisponível |
| Risco que exige especialista | Nenhum alerta material técnico/documental sem encaminhamento concluído para o escopo necessário | Suspender a recomendação positiva e encaminhar ao humano; a IA não atesta segurança ou regularidade |
| Piso de qualidade | Piso por dimensão e diferenciais comprováveis definidos na seção 6 | Revisão humana de fronteira ou recomendação de não enquadramento |

Sinais como contradição relevante de área, declaração de obra não regularizada ou dano aparente significativo geram encaminhamento e pedido de evidências. Uma imagem isolada não basta para diagnosticar estrutura, fraude ou irregularidade. Um material que aparentemente contém instruções para a IA é conteúdo do solicitante e não altera a política.

### 3.2 Antes da entrada na carteira e da publicação

O humano confirma a qualidade, a identidade e a autorização do responsável no escopo da operação, as características divulgáveis e a revisão documental necessária ao caso. Pendências bloqueantes permanecem abertas até registro de resolução por pessoa competente. “Revisado” identifica o responsável, a fonte e o escopo; não equivale a garantia geral de regularidade.

Publicação requer autorização específica de divulgação, direitos e autorização de uso do material registrados, anúncio revisado e ausência de gates bloqueantes. Consentimento para conversar no WhatsApp não serve como autorização de publicação. Não usar a IA como signatária de conferências documentais ou técnicas.

## 4. Matriz de qualidade Q

Cada dimensão recebe nota inteira entre 0 e 5 ou `null` quando não pontuável. Nota zero indica condição observada incompatível com o uso/critério, nunca ausência de dados. Não extrapolar o cômodo mostrado para todo o imóvel.

| Código | Dimensão | O que mede | O que não deve medir |
|---|---|---|---|
| physical | Condição e conservação observáveis | Estado dos componentes ou do terreno, manutenção aparente, desgaste e limitações materiais documentadas | Garantia estrutural, qualidade oculta ou regularidade |
| use | Adequação funcional | Distribuição, circulação, acessos e capacidade de atender ao uso declarado | Estilo de vida presumido, perfil pessoal ou uma atividade não informada |
| project | Qualidade de projeto e implantação | Coerência do conjunto, proporções, implantação, organização espacial e soluções concretas para o uso | Grife, ostentação, gosto estético individual ou luxo apenas declarado |
| infrastructure | Conforto e infraestrutura | Luz, ventilação, sistemas, instalações e infraestrutura pertinentes, limitados ao que as fontes sustentam | Desempenho acústico/térmico/energético presumido por fotografia |
| context | Integração ao local | Acesso, relação com entorno, exposições e condicionantes relevantes ao uso | Prestígio social, raça, religião, renda presumida ou composição dos moradores |

### 4.1 Pesos por família

| Família e tipos do catálogo | physical | use | project | infrastructure | context |
|---|---:|---:|---:|---:|---:|
| Residencial: casa, casa em condomínio, apartamento, compacto, cabana | 25 | 25 | 20 | 20 | 10 |
| Comercial: sala comercial, loja, edifício corporativo | 25 | 25 | 20 | 20 | 10 |
| Industrial/logístico: galpão, pavilhão, centro de distribuição | 25 | 30 | 15 | 20 | 10 |
| Terrenos: terreno urbano, lote em condomínio | 25 | 25 | 20 | 15 | 15 |
| Agrícola: terra agrícola | 25 | 25 | 15 | 25 | 10 |

Os pesos totalizam 100 em cada família. São parâmetros do piloto, armazenados na versão da política. A família deve ser explícita; um novo tipo não herda pesos por aproximação silenciosa. Imóvel de uso misto requer enquadramento humano antes de pontuar.

### 4.2 Âncoras de 0 a 5

As frases abaixo são regras de anotação. Toda nota exige referência a evidência, requisito avaliado e limitação. Comparações para notas 4/5 devem usar o mesmo uso e tipologia, com contexto declarado; não comparar uma cabana com um edifício corporativo.

| Dimensão | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Condição | Elemento essencial comprovadamente inutilizável para o uso avaliado | Deterioração extensa e intervenção ampla identificadas | Deficiências relevantes em vários pontos; recuperação necessária | Conservação funcional, com correções delimitadas registradas | Conservação superior e consistente nos pontos críticos, sem deficiência relevante identificada no escopo observado | Condição excepcional e uniforme, com execução/manutenção corroboradas; nenhum ponto crítico sem evidência |
| Função | Uso essencial objetivamente inviável na configuração documentada | Fluxo/acesso essencial comprometido, exigindo reconfiguração ampla | Limitações importantes que prejudicam o uso cotidiano ou operacional | Programa essencial atendido; limitações e concessões explícitas | Programa bem resolvido e fluxos eficientes, demonstrados em planta/material suficiente | Eficiência excepcional demonstrada, com soluções adicionais úteis e sem gargalo relevante identificado |
| Projeto | Implantação/configuração incompatível com o uso documentado | Desarticulação generalizada; conflito relevante entre espaços e uso | Soluções fragmentadas ou limitações claras de implantação | Projeto coerente e proporcional, sem diferencial comprovado | Conjunto consistente com pelo menos duas soluções de projeto úteis e documentadas | Integração excepcional dessas soluções; desempenho espacial comparável superior documentado |
| Infraestrutura | Recurso essencial comprovadamente ausente e sem solução para o uso avaliado | Múltiplos recursos essenciais deficientes | Atendimento parcial; adaptações relevantes necessárias | Recursos essenciais atendidos, com escopo e limitações registrados | Recursos superiores aos essenciais e adequados ao uso, corroborados por material específico | Recursos integrados e desempenho superior demonstrado por fontes adequadas; declaração comercial isolada não basta |
| Contexto | Condicionante material comprovado impede o uso avaliado | Conflito grave documentado com acesso/entorno | Limitações relevantes que prejudicam o uso | Local compatível com o uso, com concessões claras | Relação favorável com acesso/entorno e benefícios específicos documentados | Integração excepcional e consistente, demonstrada em referências comparáveis e fontes pertinentes |

Para notas 4 e 5, nomear o que excede a âncora 3. Para nota 5, registrar o conjunto de referência e evidência corroborada; “parece premium” não é fundamento. Um acabamento vistoso não eleva infraestrutura. O mesmo fato pode ser relevante para dois critérios, mas não deve ser contado como dois diferenciais independentes.

### 4.3 Checklist mínimo por tipologia

Cada item separado por ponto e vírgula é um requisito de evidência de peso 1 dentro da dimensão. Eles formam o denominador da cobertura e precisam de identificadores estáveis na implementação. Todos os itens de condição e função são críticos. Os demais itens podem ser marcados como críticos adicionalmente pela matriz da tipologia. “Não aplicável” exige regra explícita da política ou decisão humana fundamentada; não pode ser escolhido pela IA para aumentar cobertura.

| Família | physical | use | project | infrastructure | context |
|---|---|---|---|---|---|
| Residencial | Ambientes internos relevantes; exterior/áreas comuns pertinentes; manutenção e limitações declaradas | Planta ou sequência que demonstre circulação; acessos/entrada; área e programa declarados com fonte | Relação entre ambientes; implantação/orientação conhecida; duas soluções de projeto identificáveis | Fontes de luz/ventilação; recursos/instalações declarados e suas fontes; necessidades específicas de conforto a confirmar | Acessos reais; entorno imediato; exposições/condicionantes declaradas |
| Comercial | Unidade e áreas de apoio; fachada/acesso; estado das instalações observado/declarado | Programa da atividade pretendida; fluxos de público/equipe/carga; dimensões/capacidade com fonte | Configuração adaptada à atividade; áreas de apoio; organização de acessos e atendimento | Instalações pertinentes à atividade; circulação vertical quando existente; conforto dos espaços ocupados | Acesso e mobilidade; visibilidade quando pertinente; restrições de uso encaminhadas ao responsável |
| Industrial/logístico | Cobertura/fechamentos visíveis; piso e áreas operacionais; manutenção/limitações declaradas | Acesso e manobra; carga/descarga; pé-direito e capacidades declarados com fonte | Fluxos operacionais; segregação de áreas; possibilidade documentada de ocupação pelo uso proposto | Energia/utilidades; sistemas relevantes documentados; áreas de apoio | Rotas de acesso; relação com vizinhança; condicionantes da operação encaminhadas ao responsável |
| Terrenos | Levantamento/descrição de limites; condição superficial/topografia informada; estado dos acessos | Área e geometria com fonte; acesso identificado; uso pretendido e suas dependências | Relação entre forma/relevo e implantação pretendida; aproveitamento conceitual sem inventar potencial construtivo; condicionantes conhecidas | Infraestrutura existente declarada; fontes sobre disponibilidade/ligação; dependências de implantação | Entorno; acesso e conexão local; restrições/riscos declarados para avaliação humana |
| Agrícola | Limites/área com fonte; condição do terreno/benfeitorias documentada; histórico de manutenção/manejo declarado | Atividade pretendida; circulação/logística; capacidade operacional declarada com fonte | Organização das áreas/benfeitorias; acesso operacional; relação da implantação com a atividade | Água/energia declaradas e fontes; infraestrutura produtiva pertinente; dependências para operar | Acessos/logística; relação com áreas adjacentes; condicionantes declaradas para revisão especializada |

As evidências podem ser fotografias reais, vídeo, planta, levantamento, declaração identificada ou fonte técnica adequada ao requisito. Um requisito exige evidência suficiente para a afirmação feita: uma foto pode mostrar uma doca, mas não certificar sua capacidade. Para terrenos e área agrícola, não pontuar potencial de construção, solo, água, produtividade, limites legais ou licenças a partir de aparência; encaminhar essas dependências a fontes e profissionais pertinentes.

## 5. Evidência, cobertura e incerteza são coisas diferentes

Cada evidência deve registrar `id`, imóvel/versão, requisito, afirmação sustentada, tipo de fonte, referência privada, autor/origem, data de recebimento, data do material quando conhecida, escopo, limitações, responsável pela revisão e status. Não inventar data de captura a partir da data de upload.

| Estado da evidência | Significado |
|---|---|
| Ausente | Não há material suficiente para a afirmação |
| Declarada | Foi informada pelo solicitante, ainda sem corroboração |
| Observável no material | O material permite descrever um aspecto visível, dentro do enquadramento e da data conhecidos |
| Corroborada por fonte | A afirmação tem uma segunda fonte pertinente ou material técnico identificado; a autenticidade ainda pode precisar de revisão |
| Conferida por humano | Pessoa identificada registrou o que conferiu, a fonte, a data e o limite dessa conferência |
| Contraditória/desatualizada | Há conflito ou material insuficientemente atual para sustentar a afirmação |

Esses estados não formam uma escala de “certeza da IA”. Uma declaração pode cobrir um campo de identificação, mas não satisfaz sozinha um requisito que pede planta, material visual ou conferência técnica. Duplicar fotos não constitui corroboração independente. Uma planta comercial não confirma área registral.

**Cobertura Q** = requisitos aplicáveis com evidência aceitável para a afirmação ÷ todos os requisitos aplicáveis × 100. Mostrar também cobertura por dimensão e contagem dos requisitos críticos cobertos. Não usar quantidade de mensagens, fotos ou caracteres como substituto.

**Incerteza** = lista explícita do que falta, conflita ou não pode ser inferido, com impacto na decisão e próxima ação. Não mostrar “95% de confiança” sem um processo de calibração específico validado. Uma nota completa significa pontuação possível no escopo observado, não certeza sobre todo o imóvel.

Evidência vencida ou mudança relevante de estado, área, preço, uso, autorização ou disponibilidade exige revisão dos itens afetados. O prazo de atualização depende do tipo de informação e deve ser configurado na política; não inventar prazo universal para documentos. O dossiê mantém as versões anteriores.

## 6. Regra do piloto V2 e extensão futura de pré-seleção

Identificador implementado: `EME-select-v2-pilot`. A fórmula, o corte e os pisos abaixo já se aplicam aos registros V2 no portal. Cobertura por requisitos, dois diferenciais semanticamente sustentados e roteamento de IA são extensões propostas, dependentes de dados estruturados. A V1 permanece preservada; uma ferramenta de migração/reavaliação entre políticas ainda não foi implementada.

```text
Q = soma(nota_dimensão / 5 * peso_dimensão)
Piso Q: physical >= 4; use >= 4; todas as demais dimensões >= 3
Corte positivo: Q >= 85, sem arredondar antes da comparação
Cobertura para pré-seleção: >= 90% e 100% dos requisitos críticos
Cobertura para aprovação humana: 100% dos requisitos Q aplicáveis
Diferenciais: pelo menos 2 benefícios concretos, distintos e sustentados
```

O requisito proposto de diferenciais descreve o que torna o ativo Select; não adiciona bônus de pontos. Não aceitar “alto padrão”, “localização nobre” ou marca de material como diferenciais autossuficientes. O pseudocódigo a seguir descreve a futura triagem de IA; hoje o encaminhamento e a revisão são feitos pela equipe.

```text
se tipo/regra ausente -> enquadramento humano
se gate needs_specialist -> revisão especializada, sem recomendação positiva
se evidência crítica contraditória -> esclarecimento/revisão humana
se gate pending ou cobertura insuficiente ou nota null -> pedir complemento
se gate fail confirmado -> recomendação de não enquadramento com motivo
se Q >= 85 e pisos cumpridos e 2 diferenciais e gates da triagem pass
   -> pré-selecionado para revisão humana
senão, se Q >= 80 e todas as notas >= 3
   -> caso de fronteira para revisão humana, sem rótulo positivo
senão -> recomendação de não enquadramento; humano decide no piloto
```

O atendimento pode solicitar complemento antes da pontuação. Não calcular uma nota total com dimensões ausentes nem renormalizar os pesos para esconder lacunas. O número na interface pode ser arredondado para leitura, mas o resultado da regra usa a soma original.

Durante o piloto, a IA não encerra candidatos por conta própria, nem comunica “reprovado definitivamente”. Casos negativos e de fronteira passam por pessoa responsável antes da resposta conclusiva. Uma exceção comercial não altera os gates; se a política estiver errada para uma tipologia, versionar e revisar a política.

Exemplos sintéticos para verificar a regra, não avaliações de imóveis reais:

| Situação | Encaminhamento |
|---|---|
| Residencial Q=90, cobertura 100%, gates da triagem completos, prontidão documental pendente | Pré-seleção positiva para humano; sem aprovação de entrada ou publicação |
| Residencial Q=90, cobertura 60% | Pedir material; não exibir Q como nota final válida |
| Residencial notas 3/5/5/5/5, Q=90 | Piso de condição não atendido; revisão de fronteira; nota alta não compensa o piso |
| Residencial Q=84, pisos atendidos e cobertura suficiente | Revisão humana de fronteira |
| Residencial Q=92, alerta técnico material não resolvido | Revisão especializada; a nota não libera o gate |
| Residencial compacto Q=90, preço abaixo dos demais | Mesmo fluxo positivo; preço baixo não é motivo de exclusão |
| Residencial Q=72, preço muito elevado | Recomendação de não enquadramento, sujeita ao humano no piloto |

## 7. Prontidão comercial R — lado do vendedor

Curadoria do vendedor significa organizar a relação e a oferta, sem atribuir uma nota de valor à pessoa. O primeiro atendimento coleta papel do solicitante, cidade/região, tipo, operação, programa/área, estado informado, diferenciais descritos, imagens disponíveis, preço pretendido quando conhecido e objetivo/prazo. Perguntar apenas o necessário e aceitar “não sei”.

O checklist R separa:

1. **Representação:** identidade/vínculo e autorização para o escopo, conferidos por humano; permissão de divulgação independente.
2. **Oferta:** disponibilidade, ocupação, acesso para visita, itens incluídos, prazo e condições de negociação.
3. **Informação:** características, áreas, custos recorrentes com periodicidade e limitações conhecidas, com fontes e data.
4. **Mercado:** preço pedido e referências realmente comparáveis; explicitar diferenças e margem de incerteza, sem fabricar valor justo ou rentabilidade.
5. **Documentação:** documentos necessários ao caso definidos e revisados pelo responsável pertinente; pendências e escopo registrados, sem certificação pela IA.
6. **Apresentação:** material real suficiente, descrição fiel, autorizações e revisão de dados privados antes da publicação.

“Preço desalinhado — conversar com proprietário” é pendência comercial, não deterioração da nota Q. Um imóvel com Q alto pode ficar em preparação enquanto a equipe resolve R. A IA pede documentos somente no fluxo seguro definido pela operação; não há necessidade de receber documentos pessoais completos na conversa inicial.

## 8. Adequação M — lado do comprador

O comprador não é aprovado/reprovado por “padrão”. A curadoria traduz uma necessidade declarada em uma seleção útil. Perguntar finalidade, região desejada, faixa de orçamento opcional, custos recorrentes aceitáveis, área/programa, acessibilidade necessária, prazo, prioridades e concessões. Para empresa, incluir atividade, capacidades e dependências técnicas declaradas.

Cada preferência recebe `obrigatória`, `importante` ou `desejável`, e cada correspondência recebe `atende`, `não atende` ou `desconhecido`, com fonte. Uma exigência obrigatória não atendida torna o imóvel incompatível; desconhecida exige confirmação. Entre os compatíveis, ordenar por prioridades declaradas e apresentar concessões reais. Não prometer “match perfeito”.

Pode haver pontuação auxiliar de preferências para ordenar imóveis compatíveis, mas não é a nota Q: somar pesos de preferências atendidas sobre preferências avaliadas, mostrando separadamente a cobertura. Nunca ocultar uma exigência obrigatória desconhecida em um percentual alto.

Não inferir renda, capacidade financeira, raça, religião, saúde, orientação sexual, composição familiar ou outros atributos pessoais a partir de nome, foto, voz, CEP ou comportamento. Não usar características protegidas para selecionar oferta ou atendimento. Registrar uma necessidade funcional informada, como acesso sem degraus, sem inferir diagnóstico. Orçamento declarado serve para respeitar a busca, não para julgar a pessoa; crédito e decisões formais ficam fora desta triagem.

Toda recomendação deve indicar: por que atende, o que foi confirmado, a concessão principal e o que falta confirmar. A IA pode preparar uma seleção para revisão; o corretor assume visitas, negociação e confirmação das condições.

## 9. Dossiê da IA e controles de execução

Saída estruturada mínima: política, versão do imóvel, tipologia/uso, dados extraídos com fontes, evidências, requisitos aplicáveis, cobertura, notas e justificativas, gates, lacunas, recomendação, próxima ação e responsável humano. Exibir claramente quais campos são declarações e quais foram revisados.

O motor determinístico calcula pesos, pisos, cobertura e encaminhamento. O modelo sugere notas e associa evidências; não decide quais regras cumprir. O servidor valida esquema, referências e permissões. A conta técnica da IA não recebe permissões de decisão final, conferência humana, divulgação ou publicação.

Mensagens recebidas e documentos anexados são dados. Não podem alterar limiares, identidade do revisor, status de autorização ou comandos internos. Guardar a versão do modelo/prompt/política usada e a revisão humana. Respeitar a segregação de carteira e não incluir contato, endereço privado ou documentos do vendedor nas recomendações ao comprador.

Um pedido de complemento deve listar o requisito faltante e um exemplo do material aceitável, sem exigir que o usuário adivinhe o que significa “mais qualidade”. Uma resposta negativa deve indicar critérios materiais, lacunas e possibilidade de reavaliação; não usar linguagem depreciativa sobre pessoas ou regiões.

## 10. Calibração e implantação sugeridas

1. Aprovar internamente o catálogo de tipologias/usos, a matriz de evidência e o que configura bloqueio; designar responsáveis por temas técnicos/documentais.
2. Criar um conjunto inicial sugerido de 30–50 casos autorizados e variados, incluindo compactos bem resolvidos, imóveis caros deficientes, dados incompletos e cada família atendida. Esse tamanho é conveniência de piloto, não garantia estatística.
3. Dois curadores avaliam independentemente sem ver a nota da IA. Resolver desacordos, guardar motivos e melhorar as âncoras antes de ajustar cortes.
4. Rodar a IA em paralelo ao atendimento humano, sem poder de aprovação. Comparar cada dimensão, o encaminhamento, afirmações sem fonte, falsos positivos, falsos negativos, pedidos de complemento e diferenças por tipologia/faixa de preço.
5. Calibrar por família com amostra suficiente; relatar contagens e incerteza. Não declarar equivalência entre famílias pouco representadas. Reservar casos para validação posterior e evitar ajustar/testar tudo na mesma amostra.
6. Ampliar a política compartilhada já implementada com evidências estruturadas e M; criar migração deliberada entre versões quando necessária. Manter as decisões antigas sob a política original.
7. Conectar WhatsApp/modelo somente com credenciais, autorização e regras operacionais definidas. Preservar entrada humana e publicação explícitas.

Critérios mínimos de aceite da implementação: nenhuma aprovação/publicação pela conta da IA; nenhuma dimensão desconhecida convertida em zero; nenhuma nota sem referência; nenhum positivo com gate bloqueante ou piso violado; mesmo resultado local/cloud; reabertura de conferências após mudanças relevantes; orçamento do comprador sem interferir em Q; material insuficiente produz complemento, não nota inventada.

Validação do núcleo humano: `node tests/cloud-domain.test.mjs`, `node tests/curation-api.test.mjs` e compilação TypeScript. Os cenários incluem pisos não compensáveis, corte 85, conferências obrigatórias, desconhecido sem nota, políticas desconhecidas bloqueadas, todos os tipos do catálogo, mudança de família, pesos não sobrescritos por dados salvos e preservação/reabertura/aprovação da V1 sem reinterpretar notas. Os testes utilizam casos sintéticos e banco temporário.

Esta proposta é uma especificação de produto e operação. Não presume verificação de leis, registros, documentos, risco estrutural, aptidão agronômica ou valor de mercado. Esses pontos permanecem limitados ao escopo das fontes e revisões humanas efetivamente registradas.
