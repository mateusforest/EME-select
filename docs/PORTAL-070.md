# Portal Select · 0.7.0 · Curadoria e decisão

## Como usar

Entrar em `/portalselect/avaliacoes`, abrir um imóvel e selecionar **Curadoria e decisão**. A operação permanece local, com contas individuais e banco privado. Os cadastros existentes recebem uma curadoria inicialmente não verificada; não há pontuação inventada ou importação de exemplos.

1. Registrar notas de 0 a 5 e evidência textual em cada dimensão: condição física, adequação ao uso, contexto do local e coerência de mercado. Fontes e datas devem constar das observações. A condição física adapta o nome para terrenos e as orientações de uso distinguem residencial, comercial e industrial.
2. Acompanhar autorização/vínculo, características, referências de mercado e revisão documental. Somente o administrador pode marcar uma conferência como concluída ou alterar uma conferência concluída. A pessoa que atualizou e a data são geradas no servidor.
3. Registrar pendências abertas e salvar. Toda versão fica no histórico, incluindo os critérios, notas, referências, situações e pendências.
4. Encaminhar à decisão quando os critérios e as conferências estiverem completos, dentro da régua piloto e sem pendências registradas.
5. O administrador revisa as fontes, registra motivo e confirma a revisão humana para aprovar a entrada interna. Também pode solicitar ajustes ou registrar não seleção com motivo.
6. Aprovação e não seleção bloqueiam a edição. Reabrir exige administrador e motivo, preserva a decisão antiga no histórico e coloca todas as conferências em revisão novamente.

## Régua experimental

Versão `EME-piloto-01`, baseada na proposta de planejamento: pesos 30/25/20/25, nota ponderada em 100 pontos, corte experimental de 80 e mínimo 3 por dimensão. Não existe preço mínimo de imóvel. Uma nota completa só aparece após preencher as quatro notas com suas evidências. A tela distingue a nota salva de alterações ainda não salvas.

Essa hipótese ainda precisa ser calibrada com a amostra de imóveis e os responsáveis da EME. Não representa padrão de mercado ou avaliação profissional certificada. A confirmação de aprovação deixa explícito o uso da régua piloto para aquela decisão. Alterações futuras da política precisam de nova versão e migração deliberada, sem modificar silenciosamente decisões anteriores. Regras específicas e listas completas por tipologia serão ampliadas com os responsáveis.

## Limites desta entrega

- Evidências são referências textuais. Não há upload, guarda de anexos, consulta judicial, consulta registral, validação automática de autenticidade ou IA conectada.
- O checklist é uma organização inicial do trabalho; não constitui lista jurídica completa. O responsável deve registrar escopo, fonte, data e autor da análise, com as particularidades do caso.
- “Conferido” significa que um administrador registrou uma conferência humana; não significa que o software verificou a fonte. O histórico identifica quem fez o registro, que pode ser diferente do profissional citado na referência.
- “Entrada aprovada” é decisão interna de carteira. Não publica anúncio, não garante ausência de ônus/processos, não cria contrato e não movimenta dinheiro.
- A permissão de administrador reúne as decisões nesta fase. Alçadas profissionais específicas, aprovação por segunda pessoa e validade/expiração de documentos ainda não foram implementadas.
- A demonstração em `/portalselect/demo` e o catálogo público continuam separados.

## Dados, atualização e validação

Schema SQLite 2 adiciona apenas a tabela `curation`, ligada ao cadastro existente. Contas, avaliações e histórico são preservados. A migração é transacional. A versão anterior do servidor recusa abrir um banco de versão superior, evitando downgrade silencioso. Para regressar à versão 0.6.0, é necessário restaurar deliberadamente o banco anterior, além do código; não apontar o servidor antigo para o banco migrado.

Antes de aplicar, criar cópia com `npm run backup:portal`; seguir as instruções de restauração em [PORTAL-060.md](PORTAL-060.md). Nunca substituir o banco por dados de teste. Atualizações concorrentes usam a versão do dossiê, e chamadas diretas à API passam pelas mesmas travas da tela.

Validação: testes de migração com contas e avaliações existentes, permissões, notas inválidas, ausência de evidências, nota alta com pendência documental, mínimo por dimensão, conflito de versões, encaminhamento, aprovação humana, bloqueio de edição, reabertura e persistência. Fluxo completo também conferido no navegador em computador e celular, com bancos temporários.
