# EME Select 0.11.0 — curadoria, envio e fotografia

Data: 16/09/2026.

## Entregue

- `/enviar-imovel`: página pública com o formulário de três etapas, orientações e protocolo. Os menus desktop/móvel apontam para ela; links antigos continuam funcionando. Cada envio cria uma solicitação privada, sem conceder acesso ao proprietário.
- Portal da equipe: botão **Copiar link de envio** na área de imóveis. O endereço é público e geral, sem token individual.
- Contato comercial atualizado para **(54) 99157-8029**. Os links abrem o aplicativo para a pessoa enviar sua mensagem; não enviam automaticamente.
- Novos dossiês: política **EME-select-v2-pilot**, cinco dimensões, pesos específicos por família, corte inicial de 85/100. Condição e função precisam de 4/5; demais dimensões, 3/5. Preço não integra essa nota. Seis conferências humanas são necessárias para decidir.
- Dossiês com notas da política anterior conservam a V1 e sua história. Uma versão desconhecida da política bloqueia a decisão; uma mudança de família invalida as notas V2 e exige reavaliação.
- Fotos: publicação exige lado maior de 2000 px e menor de 1200 px, legenda, grupo e capa horizontal. Baixa resolução pode ser guardada para avaliação, mas impede divulgação. O servidor mede o arquivo, sem confiar em dimensões enviadas pelo navegador.
- Preparação das fotos: até 3200 px, preservação de proporção, sem ampliação, remoção de metadados. Compressão no navegador evita os níveis agressivos anteriores; arquivos que excedem o limite são recusados com orientação.
- Tela cheia: imagens pequenas permanecem no tamanho disponível do arquivo, sobre fundo escuro. As transições esperam o carregamento; erro mantém a imagem anterior. Fotos maiores mantêm a escolha de enquadramento.

## Aplicação no primeiro imóvel

As fotografias fornecidas do apartamento de Balneário Camboriú têm aproximadamente 870 × 652 px. O cadastro pode ser avaliado e visualizado, mas essas imagens não atendem ao mínimo para publicação. Solicitar os arquivos originais ou uma nova sessão fotográfica. Não ampliar artificialmente nem inventar detalhes para passar no controle.

Quantidade de pixels não certifica nitidez, exposição ou fidelidade. A equipe precisa conferir o conteúdo, as limitações do imóvel e a autorização das fotos.

## Fluxo definido para as próximas entregas

O número de WhatsApp indicado funciona hoje somente no aplicativo. A conexão com API deve verificar a elegibilidade para coexistência, sem desligar ou migrar o número por pressuposição.

Atendimento pretendido: contato → registro privado → coleta de dados/evidências → pré-seleção, complemento ou indicação de fora dos critérios → revisão EME → aprovação interna → publicação explícita. A IA não dará a aprovação final e não liberará chaves.

Portal do proprietário: convites e verificação de vínculo, acesso apenas aos imóveis vinculados, conversas supervisionadas, solicitação/confirmação de visitas. Retirada de chave somente com autorização da EME, identificação, registro de custódia e devolução.

Estas capacidades ainda **não estão ativas**: IA no WhatsApp, classificação automática, consulta jurídica, convites individuais, conta de proprietário, chat compartilhado, agenda e custódia de chaves. O formulário desta versão não recebe arquivos; as fotos são complementadas pela equipe no portal.

Especificações:

- [Política de curadoria e evidências](CURADORIA-SELECT-V2.md)
- [Atendimento, acesso de clientes, conversas, visitas e chaves](ATENDIMENTO-E-PORTAL-CLIENTE.md)

## Validação

Build TypeScript/Vite, testes de API local, domínio/cloud e schema Postgres, controle de publicação de fotos, e cenários de navegador para cadastro, curadoria, envio público, solicitação de visita e galeria. Os testes usam dados fictícios e bancos temporários; não enviam WhatsApp nem inserem candidaturas fictícias em produção.
