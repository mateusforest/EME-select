# Equipe, navegação regional e oportunidades

## Equipe aprovada

A landing usa os três perfis aprovados (Mateus Forest, Douglas Maraschin e Fabrício Foscarini), agora centralizados em `src/team-profiles.ts` e compartilhados com `TeamProfiles.tsx`. Usa os retratos originais em `public/assets/team/`, com proporção preservada por `object-fit: cover` e dimensões fixas que não encolhem com o texto.

O diretório público legado `/api/public/people` continha duas entradas com a mesma fotografia e cargos diferentes da landing aprovada. Ele deixou de sobrescrever a equipe da experiência. O cadastro administrativo e seus registros não foram alterados. Futuras revisões editoriais da equipe da landing devem atualizar a fonte compartilhada acima.

## Navegação

A faixa de estados e cidades foi removida da abertura da home, inclusive seus manipuladores e estilos. A escolha de estado/região continua no menu expansível **A coleção**, junto a **Todos os imóveis**. As páginas regionais e a apresentação de regiões mais abaixo na landing permanecem disponíveis.

## Oportunidades

`/#/oportunidades` é uma página independente, com verde EME, detalhes champanhe, destaque fotográfico, cartões, favoritos, filtros por tipo e região e ordenação por valor. Os filtros fazem parte da URL. O anúncio mantém um retorno às oportunidades com a seleção e a posição de rolagem anteriores, inclusive quando recarregado.

A API pública não possui um indicador específico de promoção/oportunidade. A página apresenta a seleção publicada, sem inferir descontos, urgência, valorização ou rentabilidade. Preços, fotos, descrições e disponibilidade editorial vêm exclusivamente do inventário público; combinações sem imóveis exibem um estado vazio.

## Verificação

- TypeScript e build de produção concluídos.
- 15 testes de catálogo, filtros e oportunidades aprovados.
- Navegador: desktop 1440 px e celular 390 px; retratos distintos e sem deformação; abertura sem seletor regional; menu A coleção; página Todos os imóveis; filtros e ordenação de oportunidades; anúncio e retorno; abertura direta; estado vazio de Palmas; salvar e remover pela coleção de favoritos.
- Efeitos discretos respeitam a preferência por movimento reduzido. A prévia bloqueia envio de formulários; nenhuma solicitação de contato foi criada durante a conferência.
