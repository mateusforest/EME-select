# Portal EME Select — estrutura do produto e da operação

**Versão 0.1 · 13/09/2026 · proposta para discussão antes da produção**

**Complemento desta versão:** [Curadoria e IA na operação inteira](CURADORIA-E-IA-v01.md). Detalha o envio público de imóveis, a seção Avaliações, uma régua de pontuação para calibrar e o acompanhamento do atendimento dos corretores. As duas decisões de escopo já confirmadas permanecem: equipe interna primeiro e administração mensal no lançamento.

## 1. Direção

O portal será a central de trabalho da imobiliária: cada imóvel, cliente, análise, aprovação e negociação terá um responsável, uma próxima ação e um histórico. A tecnologia deve reduzir o trabalho repetitivo e tornar o padrão de atendimento verificável.

O diferencial será um dossiê confiável que acompanha o imóvel desde a captação até o fechamento. A equipe trabalhará sobre a mesma informação; o site exibirá apenas a versão liberada para publicação. IA, curadoria e acompanhamento comercial fazem parte desse fluxo desde o piloto.

Este documento propõe regras e escopo. Não constitui especificação jurídica aprovada, orçamento contratado ou autorização para iniciar desenvolvimento.

## 2. Contexto confirmado e decisões em aberto

| Tema | Base para o projeto |
| --- | --- |
| Empresa | Imobiliária e CNPJ separados do EME SaaS; marca EME Select |
| Mercado inicial | Rio Grande do Sul; qualidade do imóvel e contexto de mercado, sem preço mínimo definido |
| Equipe | Donos nas decisões relevantes; dois corretores em preparação; possível participação de advogado |
| Atendimento | Digital como primeiro canal e experiência presencial sob agendamento |
| IA | Apoia captação, análise, atendimento e organização; decisões importantes passam por humanos |
| Site atual | Versão 0.4.2; oito cenários contando a home; 18 imóveis demonstrativos; sem backend, cadastro de equipe ou dossiês reais |
| Marca | M em mármore verde; identidade visual já aprovada |
| Exploração espacial | Cenários fotográficos; 3D e Marble adiados |

**Decisões confirmadas pelo usuário nesta etapa:**

1. **Acesso inicial somente da equipe EME.** A área de proprietários, compradores e locatários será uma evolução posterior.
2. **Locação com intermediação e administração mensal desde o lançamento.** Contratos ativos, cobranças, conciliação, repasses, manutenção e renovação fazem parte da primeira operação.

Os demais critérios deste documento são propostas a validar. Administração mensal está no escopo inicial; a escolha dos fornecedores financeiros e o grau de automação bancária ainda estão em aberto.

## 3. Três áreas conectadas

| Área | Quem usa | Responsabilidade |
| --- | --- | --- |
| Site e marketplace da imobiliária | Público | Descobrir imóveis, solicitar atendimento e submeter um imóvel à curadoria |
| Portal de gestão | Equipe autorizada | Cadastrar, analisar, aprovar, publicar, atender e acompanhar negócios |
| Área do cliente | Clientes autenticados, quando liberada | Enviar informações e acompanhar somente seus imóveis e solicitações |

O portal de gestão será uma aplicação privada com autenticação e permissões verificadas no servidor. Ocultar botões ou criar uma rota pouco conhecida não protege dados.

A empresa manterá banco, arquivos, acessos e integrações segregados do EME SaaS. Componentes visuais e código poderão ser reutilizados quando houver direito de uso; contatos, imóveis e documentos não serão compartilhados automaticamente.

## 4. Mapa do portal

| Módulo | O que a equipe faz | Entrega da primeira versão |
| --- | --- | --- |
| **Hoje** | Enxerga prioridades, aprovações, visitas e atrasos | Caixa de trabalho com responsável, prazo e próxima ação |
| **Captação** | Recebe indicações e propostas de proprietários | Origem, contato, responsável, interesse e autorização de uso |
| **Avaliações** | Acompanha a entrada de imóveis candidatos | Protocolo, pré-avaliação da IA, evidências, pendências e decisão de entrada |
| **Imóveis** | Mantém o cadastro e o dossiê | Dados, proprietários, ofertas, mídia, documentos e histórico |
| **Curadoria** | Avalia qualidade física, mercado e apresentação | Critérios por categoria, evidências, pendências e parecer |
| **Jurídico** | Examina documentação e condições do negócio | Solicitações, fontes, revisão profissional e restrições |
| **Relacionamento** | Acompanha clientes e oportunidades | Contatos, interesses, conversas, tarefas e distribuição |
| **Agenda e visitas** | Organiza o atendimento presencial ou remoto | Solicitação, confirmação, roteiro e retorno da visita |
| **Negócios** | Controla propostas e negociação | Versões, condições, aprovações, documentos e desfecho |
| **Locações** | Administra a carteira de contratos ativos | Competências, cobranças, repasses, vistorias, manutenção, reajustes e encerramento |
| **Financeiro** | Acompanha receitas, despesas e comissões | Valores previstos, recebidos, a pagar e comprovantes |
| **Publicação** | Controla o que aparece no site | Prévia, revisão, publicação, suspensão e atualização |
| **Gestão** | Organiza equipe, regras e indicadores | Permissões, parâmetros, metas e histórico de decisões |
| **Qualidade e IA** | Acompanha o padrão de atendimento e as automações | Evidências de atendimento, revisão do gestor, treinamento, falhas e consumo |

A IA acompanhará os eventos relevantes desses módulos por rotinas especializadas, com fontes, permissões e responsáveis. Uma central adicional mostrará trabalhos em andamento, sugestões aguardando revisão, falhas de integrações e consumo. O corretor não precisará sair do dossiê para um chat desconectado do imóvel. Cálculos financeiros, permissões e travas seguem regras verificáveis no servidor, com continuidade manual quando a IA estiver indisponível.

## 5. O dossiê do imóvel

A tela mais importante reunirá:

- **Resumo:** situação comercial, responsável, próxima ação, pendências críticas e última confirmação de disponibilidade.
- **Cadastro:** endereço, referência cadastral, matrícula quando disponível, uso, tipologia, áreas e características.
- **Pessoas:** proprietários e representantes, participação e contatos; documentos restritos.
- **Ofertas:** venda e/ou locação, preço, despesas, condições, prazo de autorização e histórico.
- **Curadoria:** critérios atendidos, evidências, lacunas e parecer da equipe.
- **Mercado:** comparáveis, fontes, datas, ajustes, faixa estimada e preço pedido pelo proprietário.
- **Documentos e jurídico:** arquivos, consultas, validade aplicável, revisões e restrições.
- **Mídia e publicação:** fotos reais autorizadas, plantas, vídeos, textos, coleções e prévia.
- **Relacionamento e negócios:** interessados, visitas, propostas e evolução.
- **Histórico:** quem alterou, o que mudou, quando e por qual motivo.

**Modelagem essencial:** imóvel físico, oferta comercial e ambiente do site são coisas diferentes. Uma casa pode ter oferta de venda e de locação, além de aparecer em Serra e Condomínios. Um edifício pode conter várias unidades. O portal não deve duplicar o imóvel para representar cada combinação.

As imagens conceituais dos ambientes continuam sendo cenários ilustrativos de navegação. A ficha de um imóvel real usará sua própria mídia autorizada; um cenário gerado não será apresentado como fotografia desse imóvel.

## 6. Captação, curadoria e publicação

Fluxo principal proposto:

**Entrada → contato e autorização → cadastro preliminar → análises física, mercadológica e documental → decisão de entrada → preparação da apresentação → liberação da publicação → acompanhamento.**

As análises podem ocorrer em paralelo. Pendências geram tarefas com responsáveis. Não é necessário terminar toda a fotografia comercial antes de descobrir um impedimento relevante.

Além da etapa principal, existirão estados independentes:

| Dimensão | Exemplos de estados |
| --- | --- |
| Qualidade do cadastro | Incompleto, em conferência, conferido |
| Curadoria | Não iniciada, em análise, pendências, aprovada, recusada |
| Jurídico | Não iniciado, documentos solicitados, em análise, pendência, liberado para etapa específica |
| Publicação | Rascunho, em revisão, publicado, suspenso, arquivado |
| Oferta | Em preparação, disponível, em negociação, indisponível, concluída, retirada |

**Regra:** boa avaliação de mercado não compensa pendência documental. Publicação e fechamento terão liberações distintas. Um imóvel liberado para divulgação não recebe, por consequência, autorização automática para concluir qualquer negociação.

Condições mínimas propostas para publicar:

1. Identificação e vínculo com o imóvel suficientemente conferidos para essa etapa.
2. Autorização de divulgação registrada e em vigor.
3. Cadastro obrigatório, preço e condições confirmados.
4. Curadoria aprovada e apresentação revisada.
5. Documentação mínima exigida pela política de publicação analisada pelo responsável.
6. Ausência de pendência que essa política classifique como impeditiva.
7. Aprovação humana identificada e vinculada à versão publicada.

Uma alteração material de proprietário, condição jurídica, preço ou autorização pode exigir nova aprovação. O sistema preservará a versão já publicada enquanto uma alteração comum está em revisão; uma pendência impeditiva exigirá suspensão. A política precisa definir esses eventos antes do desenvolvimento.

## 7. Como a curadoria mantém um padrão alto

O primeiro modelo será uma ficha de critérios com **atende, atende parcialmente, não atende ou não verificado**. Cada resposta terá evidência e responsável. Pesos, notas e cortes poderão ser calibrados depois de avaliar casos reais; não há base hoje para definir que uma nota arbitrária garante qualidade.

O complemento de curadoria e IA apresenta uma hipótese numérica para essa calibração: quatro dimensões, pontuação de 0–100 e corte experimental de 80, com mínimo por dimensão e exigência de evidências. A hipótese não é um padrão aprovado e não substitui as liberações da etapa. A primeira ficha de critérios e os exemplos revisados orientarão a validação dos números.

Dimensões comuns: conservação, funcionalidade, luz e conforto, relação com o entorno, adequação do preço, qualidade da informação e viabilidade da apresentação. Documentação tem um controle próprio, sem ser diluída em uma média.

| Categoria | Pontos adicionais que precisam de análise |
| --- | --- |
| Casas e apartamentos | Distribuição, conservação, ventilação, uso das áreas e despesas |
| Condomínios | Unidade e empreendimento separados; regras, despesas e áreas compartilhadas confirmadas |
| Comercial | Acesso, exposição, infraestrutura e adequação ao uso pretendido |
| Industrial | Pé-direito, docas, acesso de veículos, instalações e exigências do uso, quando verificadas |
| Terrenos urbanos | Dimensões, acesso, topografia, serviços e possibilidades de implantação a confirmar |
| Terras agrícolas | Área, acesso, uso atual, infraestrutura e verificações rurais e ambientais aplicáveis |

Fotografias podem ajudar a identificar indícios visíveis; não comprovam instalações, estrutura, limites de terreno ou condição documental. Pontos que exigem vistoria ou profissional técnico geram uma tarefa.

A análise de preço separará **valor pedido**, **faixa estimada** e **valor negociado**. Comparáveis precisam guardar data, origem, área e diferenças relevantes. Dados insuficientes resultam em análise inconclusiva, nunca em precisão inventada. Estudo automatizado de mercado e eventual PTAM terão documentos, responsáveis e finalidades distintos; a definição profissional deverá ser validada considerando as regras de avaliação do COFECI. [Referência COFECI](https://intranet.cofeci.gov.br/arquivos/legislacao/docs/Resolucao/2007/Resolucao_COFECI_1066_2007.pdf).

## 8. Documentação e revisão jurídica

Para cada tipo de verificação, registrar:

- Documento ou consulta esperada, imóvel/pessoa a que se refere e finalidade.
- Fonte, data de emissão/consulta, abrangência, referência e arquivo.
- Situação: não solicitado, solicitado, recebido, falhou, em revisão, pendente, revisado ou requer atualização.
- Achado da IA separado da conclusão profissional.
- Responsável, data da revisão, restrição e condição para prosseguir.

O checklist varia por imóvel, município, operação e perfil das partes. Matrícula, titularidade, representação, tributos, condomínio, regularidade construtiva e verificações judiciais são temas para o advogado transformar em políticas de análise; esta lista não é uma certificação de suficiência para todos os negócios.

A Pesquisa Prévia do RI Digital retorna vínculos com matrículas, mas não comprova, por si, propriedade atual. A visualização de matrícula também não equivale a certidão. O portal deverá armazenar essa distinção, sem converter uma consulta informativa em selo de regularidade. [Pesquisa Prévia — RI Digital](https://www.ridigital.org.br/PO/DefaultPO.aspx) · [Manual de Matrícula Online](https://ridigital.org.br/Downloads/SAEC_MatriculaOnline.pdf).

Busca que falhou, fonte não consultada e ausência de resultado são situações diferentes. Homônimos e referências ambíguas exigem conferência. Não haverá botão automático “imóvel limpo”.

Integração registral ou judicial depende de acesso permitido, cobertura, condições comerciais e limites de cada fonte. A existência de um portal público não confirma que haja uma API disponível para nossa empresa. O piloto deve permitir registrar consultas e anexar evidências manualmente enquanto essas integrações são avaliadas.

## 9. Clientes, atendimento e visitas

Uma pessoa poderá ser proprietária, compradora e locatária em momentos diferentes. O cadastro de contato será único; cada oportunidade terá finalidade, critérios e responsável próprios.

Fluxo sugerido: **novo contato → atendimento iniciado → necessidades entendidas → seleção de imóveis → visita → proposta → negociação → concluído ou encerrado**. O motivo de perda e a possibilidade de contato futuro serão registrados separadamente.

Distribuição inicial: responsável definido por fila e disponibilidade, com possibilidade de transferência justificada. Novos leads não poderão ficar sem responsável. Regras de exclusividade do atendimento e participação de parceiros precisam ser definidas pelos donos.

A conversa registrará preferências objetivas: localização, uso, orçamento informado, prazo, características necessárias e forma de contato. A IA poderá sugerir imóveis compatíveis, citando os critérios usados, e o corretor revisará a seleção.

Visitas: solicitação, disponibilidade do proprietário, confirmação da equipe, participantes, instruções de acesso, realização, ausência, cancelamento e retorno. Solicitar horário não equivale a ter uma visita confirmada. Informações de chaves e acesso físico serão restritas.

O número atual é **(54) 99990-2688**. O site hoje prepara mensagens para o WhatsApp; isso não constitui caixa de atendimento integrada. A conexão oficial será uma etapa própria, com identificação do contato, registro dos eventos e teste do número. Comunicação proativa observará as permissões do destinatário e as regras do canal, inclusive possibilidade de parar mensagens. [Orientação da Meta sobre mensagens comerciais](https://about.fb.com/news/2025/04/ways-to-manage-your-businesses-chats-on-whatsapp/).

## 10. Negócios, contratos e financeiro

**Venda:** interesse → proposta versionada → revisão → negociação → aceite registrado → condições e documentos → assinatura → acompanhamento dos eventos do fechamento → entrega e pós-venda.

**Locação por intermediação:** interesse → proposta → análise cadastral e de condições pelos responsáveis → garantia conforme política definida → contrato → vistoria/entrega → encerramento da intermediação ou início da administração contratada.

O sistema registrará os eventos do negócio. Um clique em “concluído” não substitui assinatura, pagamento, registro ou outro ato necessário. Contratos terão versões e revisão jurídica; assinatura eletrônica será uma integração avaliada separadamente.

Primeiro financeiro: receita prevista, valor recebido, despesas autorizadas, participação de cada profissional e pagamentos registrados. Comissão terá base, taxa ou valor fixo, participantes, gatilho de exigibilidade, vencimento e versão da regra acordada. Não há percentual padrão aprovado neste planejamento.

Separar valor dos imóveis negociados, receita de comissão e dinheiro efetivamente recebido. Alterar preço ou contrato não poderá recalcular silenciosamente uma comissão já aprovada. Cancelamentos e ajustes deixam lançamentos de reversão e motivo. Dados bancários e mudanças de beneficiário exigem revisão; o piloto pode registrar pagamentos externos sem comandar transferências bancárias.

### Administração mensal — parte do lançamento

O contrato ativo será um registro operacional próprio, vinculado ao imóvel, à oferta que originou o negócio, às partes e à autorização de administração. Deve guardar início e término, vencimento, regras de cobrança, garantia, taxa de administração, rateio entre proprietários, despesas, reajuste e condições de repasse. Taxas, índices e encargos não serão inventados pelo sistema; virão da versão contratual validada.

| Rotina | Funcionamento proposto |
| --- | --- |
| Implantação | Conferir contrato, poderes de administração, partes, vistoria de entrada, chaves, garantia e saldos de abertura, quando houver migração |
| Competência mensal | Preparar aluguel e encargos discriminados, com origem, período e responsabilidade de pagamento |
| Cobrança | Revisar a cobrança e registrar emissão/envio; acompanhar vencimento, cancelamento e substituição sem duplicar a dívida |
| Conciliação | Vincular recebimentos confirmados às cobranças; tratar pagamentos parciais, excedentes, devoluções e valores sem identificação |
| Repasse | Calcular valor devido a cada proprietário conforme contrato, deduções autorizadas e receita da EME; revisar, pagar e registrar comprovante |
| Extrato | Produzir demonstrativo por contrato/proprietário com cobrança, recebimento, retenção, despesa, repasse e saldo; equipe compartilha por canal autorizado enquanto não houver área do cliente |
| Inadimplência | Gerar fila por atraso, registrar contato e encaminhar negociação ou providência jurídica ao responsável |
| Manutenção | Abrir chamado, classificar urgência, reunir evidências/orçamentos, identificar quem autoriza e paga, acompanhar execução e conclusão |
| Reajuste e renovação | Alertar antes dos eventos contratuais, preparar cálculo verificável e submeter alteração/comunicação ao responsável |
| Saída | Registrar aviso, vistoria final, chaves, valores finais, situação da garantia e encerramento aprovado |

**Separação financeira obrigatória no produto:** valores de proprietários e locatários, garantias quando administradas e receitas próprias da EME precisam de identificação e saldos separados. Aluguel recebido para repasse não será apresentado como faturamento da imobiliária. A estrutura de contas bancárias, escrituração e tratamento de garantias será definida com os responsáveis financeiro, contábil e jurídico.

O sistema distinguirá valor previsto, cobrado, recebido e conciliado, elegível para repasse, aprovado e pago. Um comprovante anexado ou uma sugestão da IA não comprova sozinho a entrada de dinheiro. A política padrão proposta só libera repasse de recebimento conciliado; eventual adiantamento/garantia de aluguel exige produto, contrato e autorização próprios, sem ser presumido no lançamento.

Descontos, acordos de dívida, mudanças de beneficiário, despesas fora do limite e liberações de garantias passam por aprovação. As decisões negociais pertencem às partes do contrato ou a representantes com poderes registrados. Aprovação interna dos donos da EME não substitui o aceite do proprietário ou do cliente.

**Automação inicial a decidir:** o portal deve controlar todo o ciclo desde o lançamento. Emissão de cobranças e execução de pagamentos podem começar por provedor contratado, com conciliação assistida e registro supervisionado; o controle da operação não dependerá de transferência bancária autônoma. A integração escolhida precisa permitir identificar eventos repetidos, confirmar resultados e reconciliar falhas. Nunca repetir um pagamento apenas porque a resposta do provedor demorou.

Antes da produção, definir: quem implanta contratos; vencimentos e calendário de repasses; taxa e base de administração; rateios; cobranças proporcionais; regras de atraso; responsabilidades por condomínio/tributos/manutenção; limites e fluxo de urgência; política de garantia; reajustes; rescisão e fechamento mensal. O cadastro inicial usará modelos de contrato revisados por tipo de operação, sem impor a mesma regra a todos os imóveis.

## 11. Autonomia da IA

| Ação | Papel proposto para a IA | Controle humano |
| --- | --- | --- |
| Receber um cadastro | Organizar campos e apontar o que falta | Equipe resolve divergências de identidade e dados |
| Ler documentos | Extrair informações e sugerir alertas com página/fonte | Profissional valida conteúdo e conclusão |
| Analisar fotos | Identificar características e indícios visíveis | Corretor/técnico confirma o que não pode ser comprovado pela imagem |
| Estudo de mercado | Organizar comparáveis e produzir hipótese fundamentada | Responsável valida a análise e a negociação do preço |
| Atendimento recebido | Responder informações aprovadas e reunir necessidades | Transferência para humano por pedido, dúvida ou assunto importante |
| Texto do anúncio | Produzir rascunho apenas com dados autorizados | Revisão antes de publicar |
| Seleção de imóveis | Explicar compatibilidade com critérios informados | Corretor e cliente decidem |
| Tarefas internas | Criar lembretes e encaminhamentos pelas regras configuradas | Equipe pode corrigir, pausar ou reassumir |
| Administração de locações | Resumir contratos, alertar prazos, sugerir conciliações e classificar chamados | Cálculos usam regras verificáveis; pessoas validam exceções, acordos, encargos e pagamentos |
| Captação proativa | Organizar oportunidades de fontes permitidas | Origem e estratégia de contato aprovadas antes de campanhas |
| Qualidade dos corretores | Apontar evidências de precisão, continuidade e cumprimento de compromissos | Gestor revisa o contexto; profissional pode contestar; sem punição, comissão ou distribuição de leads decidida pela IA |
| Negociação, liberação jurídica, contrato, pagamento | Preparar informação e rascunhos | Decisão e autorização humana obrigatórias |

O primeiro piloto pode incluir extração assistida de documentos, resumo do dossiê, checklist de pendências e rascunhos de atendimento/anúncio. Autonomia de resposta será liberada gradualmente para assuntos delimitados e informações aprovadas.

Cada execução guardará dados utilizados, fonte, horário, modelo/versão, resultado, custo e revisão. Dado ausente vira campo pendente. IA indisponível não pode paralisar cadastro, atendimento ou análise humana.

A recuperação de informação respeitará as permissões do usuário antes de buscar documentos. Arquivos recebidos serão tratados como conteúdo, sem poder conceder permissões ou comandar ferramentas. A IA não receberá credenciais de administrador. Ações permitidas, limites de custo, repetição de tarefas e botão de pausa serão definidos no servidor.

## 12. Captação e dados pessoais

Primeiras fontes sugeridas: formulários próprios, indicações, proprietários atendidos, parcerias autorizadas e materiais enviados pelos interessados. Outras fontes entram após confirmar direito de uso, finalidade e qualidade dos dados.

Não assumir que dado acessível na internet permite qualquer finalidade de prospecção. A escolha de hipótese legal e a análise da estratégia ficarão registradas com o responsável jurídico. O guia da ANPD sobre legítimo interesse apresenta avaliação de finalidade, necessidade e balanceamento com salvaguardas; ele é referência para essa análise, não uma aprovação automática da nossa captação. [ANPD — legítimo interesse](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse).

Não usar dados da base de corretores/clientes do EME SaaS como lista automática de prospecção da imobiliária. Eventual cooperação entre as empresas precisa de definição própria.

## 13. Equipe, permissões e aprovações

Perfis são conjuntos de permissões, não uma proposta de contratar uma pessoa para cada função.

| Perfil | Acesso principal | Limite |
| --- | --- | --- |
| Donos/direção | Visão da operação, políticas e decisões relevantes | Decisões registradas; alterações sensíveis deixam histórico |
| Coordenação/corretor responsável | Carteira e atendimentos atribuídos, visitas e negociação | Não remove impedimento jurídico nem altera comissão aprovada sozinho |
| Jurídico | Casos e documentos necessários à análise | Não altera silenciosamente preços, recebimentos ou publicação |
| Conteúdo | Dados comerciais liberados e mídia | Sem documentos pessoais ou bancários desnecessários |
| Financeiro | Valores, comissões, cobranças e comprovantes autorizados | Sem acesso indiscriminado a todas as conversas/documentos |
| Administração de locações | Contratos atribuídos, vistorias, chamados, vencimentos e demonstrativos | Não altera beneficiário, encargos ou acordo aprovado sem a revisão exigida |
| Administração técnica | Usuários, disponibilidade e configurações técnicas | Acesso a conteúdo privado limitado e auditado |
| Cliente, quando habilitado | Próprios imóveis, pedidos e documentos compartilhados | Sem notas internas, dados de terceiros ou comissões de outros participantes |

No piloto, um dono pode acumular coordenação e financeiro. Aprovar a si próprio uma exceção sensível não deve apagar a necessidade de justificativa e segunda revisão quando definida pela política.

Decisões inicialmente reservadas aos donos: entrada final na coleção, política comercial, revisão interna de mudanças relevantes de preço/condições e propostas, exceções, distribuição de comissões e aprovações financeiras definidas na política. Alterações e aceites em nome do proprietário ou cliente exigem sua concordância ou poderes de representação registrados. O jurídico registra sua conclusão profissional. Tarefas rotineiras podem ser delegadas sem deslocar essas responsabilidades.

Segurança proposta: contas individuais, autenticação em dois fatores para a equipe, menor acesso necessário, desligamento imediato de acesso, links privados de duração limitada, cópias de segurança testadas e registro de exportações/alterações. Política de retenção, atendimento a titulares e resposta a incidentes serão definidas conforme o tratamento efetivo. A ANPD mantém orientações de segurança para agentes de pequeno porte; o enquadramento e eventuais flexibilizações não devem ser presumidos apenas pelo tamanho da equipe. [Guia ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/anonimizado___guia_orientat-_seg_da_inf_p_atpp.pdf) · [Resolução ANPD nº 2](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022).

## 14. A primeira tela do portal

A página “Hoje” será adaptada ao perfil:

- Aprovações aguardando a pessoa que está conectada.
- Atendimentos sem resposta e tarefas vencidas.
- Visitas de hoje e solicitações ainda não confirmadas.
- Imóveis com pendências ou disponibilidade a reconfirmar.
- Propostas que exigem retorno.
- Recebimentos e comissões a conferir, para quem tiver acesso.
- Cobranças vencidas, conciliações pendentes e repasses a aprovar.
- Manutenções urgentes, reajustes e contratos próximos da renovação ou saída.

Cada item abre o registro correspondente e mostra próxima ação, responsável e prazo. Indicadores servirão à decisão, com período e definição explícitos.

A identidade mantém o M em mármore, verde e marfim. O trabalho interno usará tabelas claras, fichas e listas de pendências. Cenários imersivos continuam apropriados à descoberta no site; no portal, a prioridade será leitura, velocidade e precisão. Cadastro pelo celular precisa facilitar fotos e notas de visita; análises extensas podem privilegiar o computador.

## 15. Base técnica proposta

Arquitetura inicial sugerida, sem escolher fornecedores ou contratar serviços nesta etapa:

1. Aplicação privada do portal, aproveitando o conhecimento de React/TypeScript já usado.
2. Serviço central com módulos de cadastro, análise, atendimento, publicação e financeiro.
3. Banco relacional com histórico e restrições de integridade.
4. Armazenamento separado para mídia pública e documentos privados.
5. Fila de tarefas para leitura de arquivos, IA e integrações, com repetição segura.
6. Camada pública de catálogo contendo somente os campos e as versões aprovados.

Começar com uma aplicação de servidor organizada em módulos é uma hipótese mais simples para a equipe inicial do que distribuir o sistema entre muitos serviços independentes. A decisão final depende da equipe técnica, hospedagem e integrações.

Entidades centrais: empresa, usuário, permissão, pessoa/organização, empreendimento, unidade/imóvel, oferta, autorização, documento, consulta, avaliação, critério, decisão, versão publicada, oportunidade, conversa, visita, proposta, contrato, lançamento, comissão, tarefa e evento de histórico. Administração mensal acrescenta competência, cobrança, item de cobrança, recebimento, conciliação, beneficiário/rateio, repasse, garantia, vistoria, chamado, orçamento, reajuste e encerramento. Valores monetários exigem precisão decimal; saldos e cálculos devem ser reproduzíveis a partir dos lançamentos e regras versionadas, independentemente da IA.

Mudanças concorrentes exigem controle de versão. Eventos de integração repetidos não podem duplicar contatos, mensagens ou lançamentos. O site não deverá ler tabelas privadas diretamente. Ambientes de desenvolvimento e teste usarão dados sintéticos; os 18 exemplos atuais continuarão identificados como demonstração até serem substituídos por um catálogo real aprovado.

Integrações a avaliar: WhatsApp oficial, e-mail e agenda, documentos/registro, assinatura e financeiro. Para cada uma, confirmar disponibilidade, preço, acesso, limites, tratamento de dados e funcionamento quando falhar. Cadastro manual supervisionado deve ser uma alternativa inicial onde não houver integração validada.

## 16. Ordem de implantação

| Etapa | Entrega | Critério para avançar |
| --- | --- | --- |
| **0 — Fechar a operação** | Escopo, responsáveis, critérios de curadoria, política documental, comissões e nível de autonomia | Donos e responsáveis conseguem executar o fluxo em casos de exemplo, incluindo exceções |
| **1 — Base e dossiê** | Acesso da equipe, cadastro, ofertas, documentos privados, tarefas e histórico | Um imóvel percorre o fluxo sem planilhas paralelas para decisões essenciais |
| **2 — Curadoria e publicação** | Análises, aprovações, IA assistida e publicação no site | Regras impeditivas são respeitadas; somente a versão aprovada aparece ao público |
| **3 — Atendimento e fechamento** | Clientes, visitas, propostas, contratos registrados e comissões | Um negócio completo é acompanhado, inclusive perda ou cancelamento |
| **4 — Administração mensal** | Contratos ativos, competências, cobrança, conciliação, repasses, extratos, manutenção e eventos contratuais | Um ciclo mensal completo é conferido, inclusive atraso, pagamento parcial, despesa e cancelamento |
| **5 — Piloto operacional** | Carteira pequena autorizada, equipe treinada, integrações essenciais e acompanhamento | Operação comercial e mensal sustentadas com dados reais e correções registradas |
| **6 — Ampliações escolhidas** | Área de clientes, mais canais e maior autonomia da IA | Escopo, operação e resultados do piloto justificam a expansão |

As etapas 1–4 formam o escopo de lançamento confirmado, entregues em partes para revisão antes do piloto. Administração mensal precisa estar pronta antes de assumir contratos administrados. IA assistida entra junto da curadoria; não depende de esperar toda a expansão. A área de clientes permanece para depois; a equipe poderá registrar solicitações recebidas por canais autorizados e fornecer demonstrativos durante essa primeira fase.

Não fixar prazo ou custo total antes de definir equipe técnica, integrações e regras operacionais da administração. O orçamento deverá separar desenvolvimento, infraestrutura, IA, mensagens, documentos, assinatura, serviços financeiros, manutenção e suporte. Limites de consumo devem ser configuráveis.

## 17. O que provar antes do piloto

1. Corretor não acessa documentos de um caso não autorizado, mesmo pelo endereço direto.
2. Imóvel sem a liberação exigida não é publicado.
3. Uma mudança material provoca revisão ou suspensão conforme a regra definida.
4. Site recebe somente dados públicos; arquivos privados não são expostos.
5. Um imóvel pode integrar mais de uma coleção sem duplicar cadastro ou negócio.
6. Oferta de venda e oferta de locação mantêm condições próprias.
7. IA cita evidências e sinaliza informação ausente; documento não consegue instruí-la a publicar ou divulgar dados.
8. Atendimento pode ser assumido por humano sem perder o histórico.
9. Visita solicitada só se torna confirmada após a validação prevista.
10. Proposta e comissão mantêm versões; ajuste posterior não apaga o acordo anterior.
11. Eventos repetidos não duplicam mensagens ou lançamentos.
12. Cancelamento, falha de integração, indisponibilidade da IA e restauração de backup têm caminhos testados.
13. A mesma competência não gera cobrança duplicada, inclusive após repetição de tarefa ou mudança de contrato.
14. Pagamento parcial, excedente, estorno e recebimento não identificado mantêm saldos corretos e rastreáveis.
15. Repasse respeita conciliação, rateio e deduções aprovadas; aluguel de terceiros não aparece como receita própria.
16. Pagamento com resultado incerto exige reconciliação antes de nova tentativa; mudança de beneficiário exige revisão.
17. Reajuste, manutenção, rescisão e garantia seguem a versão contratual, com responsável e aprovações registradas.
18. Fechamento mensal produz extratos coerentes com os lançamentos; correção de período fechado mantém histórico.

## 18. Indicadores e decisões da próxima rodada

Indicadores iniciais: tempo até atendimento humano, tempo até decisão de curadoria, idade das pendências, disponibilidade confirmada, visita realizada, visita que gera proposta, proposta que vira negócio, motivo de perda, comissão prevista versus recebida e tarefas de IA corrigidas. Na administração: contratos ativos, cobranças por faixa de atraso, valores sem conciliação, repasses pendentes, receita de administração e tempo de resolução de manutenção. Resposta automática não conta como resposta humana; volume negociado e aluguel destinado a terceiros não contam como receita.

A próxima rodada deve fechar, nesta ordem:

1. Responsáveis e regras da administração mensal, já confirmada para o lançamento; fornecedores e grau de automação financeira.
2. Quem exerce cada responsabilidade e quem pode substituir o titular.
3. Critérios mínimos de entrada/publicação/fechamento e evidências exigidas.
4. Política de captação, autorização e eventual exclusividade.
5. Regras de distribuição de atendimento e comissão.
6. Integrações indispensáveis ao piloto e orçamento mensal aceitável.
7. Mapa de telas detalhado e casos de exemplo para validação antes da produção.

**Recomendação atual:** começar por uma operação interna com carteira pequena, cobrindo captação, curadoria, atendimento, fechamento e administração mensal. Dossiê confiável, controles financeiros claros e IA assistida sustentam esse lançamento. A dimensão premium será medida pela consistência da entrega e pela clareza para o cliente.
