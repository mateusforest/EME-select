# Perfis públicos, ateliê e apresentação do anúncio — 26/09/2026

## Ateliê
O processamento ESRGAN/TensorFlow no navegador foi substituído por uma preparação convencional no servidor (Sharp/Lanczos3). A ferramenta amplia até 2×, limitada a 3200 px no lado maior, mantém a proporção e não inventa detalhes. O texto da interface não promete reconstrução por IA nem qualidade de impressão. A preparação é uma prévia: não altera o anúncio. O salvamento exige comparação e confirmação, preserva o original privado e mantém as regras de curadoria. Repetir a preparação parte do original reservado. Há limite de duas operações simultâneas por instância, limite de arquivo e prazo de 30 segundos no cliente.

## Quem faz a EME
Nova seção na página inicial e gestão em /portalselect/pessoas, exclusiva de administradores. Nome, cargo livre, retrato, apresentação, registro profissional opcional e ordenação. Rascunho separado da versão publicada; confirmação de autorização antes de publicar. Sem perfis fictícios ou contas de acesso criadas automaticamente. Enquanto não há perfis publicados, a seção mostra apenas a apresentação institucional e o contato.

Persistência local em people_config/people_images. Nuvem usa um registro kind=directory no armazenamento já existente, com UUID reservado, auditoria e controle de versão via eme_save_case; retratos no bucket privado existente, prefixo person-. Não requer migração. Diretório excluído das listas de imóveis, avaliações, financeiro, operações e Central de IA. Retratos de rascunhos exigem administrador; acesso público somente aos retratos da versão publicada.

## Redação
O resultado editorial tem campo highlights próprio, separado de nextActions. Descrição, características e diferenciais devem ser frases prontas para o interessado no imóvel. Instruções de redação comuns são rejeitadas antes de aplicar. Pendências permanecem na conferência interna e não são copiadas para o anúncio. Textos anteriormente salvos não são sobrescritos automaticamente: podem ser gerados novamente, revisados e salvos pelo operador.

## Verificação
Testes de API local e adaptador de nuvem: privacidade, publicação e retirada, ordenação, conflitos de versão, isolamento de carteiras e preparação de fotos. Testes editoriais simulam respostas finais e respostas indevidas. Navegador: cadastro, fotografia, publicação, exibição responsiva e ateliê com comparação/revisão. Chamada real à IA indisponível no ambiente local por ausência de chave local; configuração de produção preservada.
