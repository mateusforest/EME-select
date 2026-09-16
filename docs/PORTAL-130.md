# Portal único · 0.13.0

O portal separado de demonstração foi retirado da navegação, do acesso e do código publicado. A EME passa a ter uma entrada autenticada e um único conjunto de menus, permissões e registros.

## O que foi reaproveitado

- A organização das áreas de operação e gestão foi incorporada ao menu e à visão geral do portal real.
- Atendimento e visitas, locações, documentos, qualidade da equipe e Central de IA têm páginas no mesmo layout, marcadas **Em desenvolvimento**. Elas informam o que já pode ser feito e o que ainda depende de implantação. Seus atalhos levam apenas a funcionalidades existentes.
- **Padrão de curadoria** é uma consulta funcional à política compartilhada com o servidor. Apresenta as cinco famílias de imóveis, pesos, referências de notas, mínimos e conferências atuais. Não replica a antiga régua de quatro dimensões do protótipo.
- Imóveis e anúncios, avaliações, financeiro, equipe e conta mantêm a persistência real e as permissões existentes. Financeiro, equipe e qualidade da equipe são visíveis somente para administradores.

## Links antigos

| Endereço anterior | Destino autenticado |
| --- | --- |
| `/portalselect/demo` ou `/demo/hoje` sob `/portalselect` | `/portalselect` |
| `/portalselect/demo/carteira` | `/portalselect/imoveis` |
| `/portalselect/demo/atendimento` | `/portalselect/relacionamento` |
| `/portalselect/demo/avaliacoes` | `/portalselect/avaliacoes` |
| `/portalselect/demo/locacoes` e demais módulos | Módulo correspondente sem `/demo` |

A normalização usa substituição do endereço no histórico, preserva parâmetros e fragmento e acontece antes da verificação da sessão. Ela não cria sessão, não libera acesso sem login e não importa registros da antiga demonstração. Caminhos desconhecidos continuam mostrando uma área indisponível dentro do portal.

## Dados e limites

Foram removidos os componentes e o modelo que semeavam avaliações, conversas, contratos e tarefas fictícios. Os dados antigos de demonstração eventualmente presentes no navegador não são mais lidos e não são apagados nem convertidos em dados reais. O protótipo permanece recuperável pelo histórico do Git.

Não há migration ou alteração de registros no Supabase nesta entrega. A área pública do site conserva seus cenários e acervo ilustrativo identificado; a unificação trata do portal de gestão.

As áreas marcadas Em desenvolvimento não ativam WhatsApp, IA, armazenamento documental, agenda, contratos, cobranças ou avaliação de desempenho. As instruções e os status deixam esse limite explícito, sem apresentar métricas ou botões que simulem operações concluídas.

## Verificar

```sh
npm run build
npx playwright test tests/portal.spec.ts tests/finance-workspace.spec.ts
node scripts/verify-portal.mjs
node scripts/verify-vercel-portal.mjs
node scripts/verify-team.mjs
```

`verify-portal.mjs` cria um SQLite temporário e um administrador fictício isolado, abre as áreas reais em desktop e celular e salva capturas em `tmp/portal-unified-*`. Nunca usa o banco nem credenciais de produção. A suíte cobre normalização de links, autenticação, permissões, navegação, ausência de dados fictícios, padrão atual, erro de conexão e acesso por celular.

Validação desta entrega: build concluído; 11 testes de portal e 7 de financeiro aprovados; 12 áreas verificadas em desktop e celular, sem transbordamento ou erros de navegador. A verificação com API real também confirmou criação de avaliação, persistência, atribuição ao corretor, troca obrigatória de senha, suspensão, logout e autenticação nos links antigos. A simulação da Vercel validou rotas aninhadas, indisponibilidade da API e login conectado.
