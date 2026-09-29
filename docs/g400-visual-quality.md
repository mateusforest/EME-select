# Referência de qualidade — G400 / EME Spatial

A referência de aceitação é o vídeo `WhatsApp Video 2026-09-28 at 19.44.41.mp4` fornecido pelo cliente. A intenção é alcançar ou superar sua apresentação visual e sua continuidade de navegação. Isso é uma meta de produto, não uma alegação de qualidade já atingida.

O vídeo mostra a passagem do edifício para o pavimento e a unidade, interiores com iluminação consistente e navegação em tela grande. As imagens comerciais do G400 orientam a identidade: pedra clara, madeira, estofados neutros, metais discretos e vegetação. A planta Tipo 5 continua sendo a referência de distribuição; não alterar a arquitetura para aproximá-la de uma imagem decorativa.

## Etapa aplicada em 29/09/2026

- Contato entre móveis e superfícies com oclusão ambiental restrita ao interior fechado. Transparências ficam fora do cálculo de profundidade, e o efeito é desligado no corte e durante a entrada para evitar artefatos nas paredes.
- Iluminação difusa nas janelas, luz interna com sombra no living e menor intensidade uniforme. Vidros foscos permanecem conforme solicitado.
- Sofá com estofamento arredondado, costuras e pés, dentro do limite usado para colisões; cadeiras com encosto curvo e estrutura de madeira; roupa de cama e cabeceiras estofadas.
- Cuba da cozinha com abertura na bancada, cubas de apoio com cavidade, torneiras contínuas e luminárias embutidas no forro.
- Escala da textura do piso ajustada e acabamentos do estúdio sincronizados com as peças novas. Geometria exportável em GLB.

## Critérios para as próximas etapas

1. Comparar cenas do living, cozinha e suíte com as referências, com luz diurna e noturna. Avaliar escala de materiais, sombras, detalhes e continuidade, além de confirmar a planta.
2. Evoluir ativos de mobiliário e arquitetura com modelagem detalhada e materiais preparados para uso em tempo real. Priorizar o 305 até a aprovação visual do cliente.
3. Preparar iluminação indireta por ambiente e reflexos coerentes, com otimização para a navegação. Oclusão de tela e luzes locais não equivalem a uma solução completa de iluminação global.
4. Substituir gradualmente o contexto volumétrico do prédio por geometria fiel das fachadas e pavimentos, mantendo o apartamento integrado.
5. Validar na TV touch e no computador reais antes de prometer desempenho ou resolução. A medição no navegador de desenvolvimento é apenas uma referência local.

Não apresentar esta etapa como equivalente à referência ou como fotorrealismo final. O piloto ainda usa mobiliário simplificado em vários pontos e contexto externo ilustrativo.


## Continuidade e resposta — segunda revisão de 29/09/2026

- A apresentação conserva a fachada enquanto prepara o apartamento e oferece retorno durante a espera. A abertura vai diretamente ao corte do terceiro andar; foi removida a exibição inicial da maquete inteira e sua descida de 1,9 s.
- O renderizador e o apartamento permanecem montados ao alternar entre planta, galeria e fachada, com desenho suspenso enquanto estão ocultos. A página pública também reutiliza a visita dentro do diálogo aberto.
- Preparação antecipada dos programas gráficos do corte e do interior, incluindo oclusão. Planos de corte conservam a mesma quantidade entre as vistas. A entrada dura 650 ms, respeitando movimento reduzido.
- Removido o segundo ambiente HDR de 1,69 MB e sua conversão, mantendo o ambiente de estúdio calculado localmente. Os materiais fotográficos continuam aguardados antes de revelar o modelo.
- Referências carousel-apartament-01 a 04: estofados claros, verde, madeira, mesa com base de madeira, painéis ripados atrás das cabeceiras, cortinas mais largas e quadros decorativos. Não foram incorporados escadas, mezanino ou pé-direito duplo ao Tipo 5.
- Oito testes de navegador/rotas passaram, incluindo carregamento atrasado, retorno durante preparação, reutilização da mesma instância, entrada, cômodos, dia/noite e toque.

Limite ainda aberto: as perspectivas principais são imagens, não o modelo original do edifício. Esta revisão não fornece rotação livre fotorrealista da fachada. O contexto do corte ainda é volumétrico e ilustrativo. O próximo salto exige obter o modelo original com materiais (preferível) ou modelar e validar as fachadas, cortes e implantação antes de otimizar o conjunto para navegação.
