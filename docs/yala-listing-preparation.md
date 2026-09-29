# Yala — preparação e publicação de anúncios

A pedido do responsável pelo produto, a curadoria manual deixou de ser uma etapa obrigatória do cadastro. O fluxo principal agora é: título e cidade → fotos → preparação da Yala → prévia → OK do administrador. Preço, área, região pública, descrição e uma foto válida continuam necessários para uma oferta utilizável no catálogo.

A ficha é salva antes do primeiro upload; cada foto é persistida separadamente. Ao concluir o lote, a preparação automática (ativada por padrão) usa a conexão OpenAI já configurada na Central de IA. O servidor lê somente fotos pertencentes ao imóvel autorizado, prepara cópias JPEG de até 960 pixels e envia todas para análise visual. Contatos, endereço privado e documentos da ficha não entram na projeção textual. O conteúdo das fotos é dado não confiável, não instrução.

A resposta identifica grupos, escreve legendas, sugere uma ordem com capa, redige descrição/características/diferenciais e separa observações internas. Todos os IDs precisam aparecer exatamente uma vez. Nenhuma foto é excluída pela IA. Textos, grupos e legendas já preenchidos são preservados; campos vazios são completados. A aplicação usa a versão original do anúncio, preservando alterações concorrentes. Análises e uso ficam no histórico de IA. Falhas não publicam nem removem o lote já salvo.

Resolução é orientação: as fotos aceitas pelo decodificador podem ser publicadas sem ampliação. Formatos inválidos, limites de arquivo e ausência de dimensões continuam sendo erros técnicos. A análise não atesta documentação, autorização, inspeções ou conservação estrutural.

O novo botão envia `reviewMode: simplified` e exige administrador, versão atual e confirmação explícita. Aprovação e publicação são gravadas juntas com registro da revisão simplificada. Não preenche notas ou verificações documentais fictícias. O fluxo de avaliação detalhada permanece opcional e suas APIs conservam as regras anteriores. Alterar o anúncio exige outro OK.

Validação: testes de provedor com imagens reais de teste e resposta simulada; identificação completa e rejeição de IDs inválidos; privacidade da projeção; publicação local e em nuvem; permissões, concorrência e confirmação; navegador em desktop/celular; falha de provedor e conflito de versão sem perda das fotos. A qualidade editorial da visão deve ser conferida na prévia com fotos do imóvel real.
