# Portal Select · 0.6.0

## Base local da equipe

`http://127.0.0.1:4191/portalselect` abre o acesso real. Na primeira execução, o proprietário cria sua conta de administrador na própria tela. Não existe conta ou senha padrão. Os demais usuários são cadastrados em Equipe e acessos e precisam trocar a senha inicial ao entrar.

A demonstração anterior está em `/portalselect/demo`, com exemplos no navegador. Nenhum exemplo é importado para o banco real. As locações, relacionamento, qualidade, pontuações e IA da demonstração continuam sendo simulações.

## Implementado

- Contas individuais: administrador e corretor. O administrador acompanha e distribui as avaliações; o corretor acessa somente sua carteira atribuída. Suspensão revoga as sessões.
- Avaliações reais: nome, cidade, tipo, finalidade, solicitante opcional e responsável. Etapas Recebido, Em avaliação e Ajustes solicitados.
- Acompanhamento com observação obrigatória, autor e data gerados pelo servidor. Atualizações concorrentes exigem recarregar o dossiê para não sobrescrever alterações silenciosamente.
- Banco SQLite no servidor local, separado dos arquivos públicos, sem dados reais no localStorage. Não há envio a serviços externos.
- Troca de senha, encerramento de sessão, limitação de tentativas de login e validação das permissões em cada operação da API.
- Cópia manual consistente do banco, com verificação de integridade e sessões removidas da cópia.

## Operação e dados

Executar `npm run build` e `npm start` na pasta do projeto. O servidor atende apenas em 127.0.0.1, por padrão na porta 4191. O comando `npm run dev` serve a interface de desenvolvimento e encaminha a API para esse servidor.

Banco padrão: `.eme-private/portal.sqlite`. `EME_DB_PATH` permite definir outro caminho. A pasta privada, os bancos e seus arquivos WAL não são publicados nem versionados. Não copiar o banco aberto isoladamente: usar `npm run backup:portal`. As cópias ficam em `.eme-private/backups`, incluem dados e hashes de senha e devem permanecer privadas. Não há backup agendado nem cópia fora deste computador.

Para restaurar: encerrar o servidor, preservar integralmente a pasta privada atual em uma pasta de recuperação, selecionar uma cópia verificada e usá-la como `portal.sqlite` em uma nova pasta privada; apontar `EME_DB_PATH` para essa nova pasta. Não misturar arquivos WAL/SHM antigos com o banco restaurado. Ao iniciar, as contas e avaliações retornam ao estado da cópia, exigindo novo login. A restauração substitui a visão dos dados e deve ser deliberada.

Runtime validado: Node 22.16.0. O módulo SQLite embutido ainda tem status de desenvolvimento ativo nessa versão; revisar a escolha antes da hospedagem definitiva. Referência: [Node SQLite 22.16.0](https://nodejs.org/download/release/v22.16.0/docs/api/sqlite.html).

## Acesso

Senhas de 12 a 128 caracteres, protegidas por scrypt com salt individual (N=131072, r=8, p=1). Cookie de sessão HttpOnly e SameSite=Strict; token aleatório, com somente seu hash no banco. Sessões expiram após 30 minutos de inatividade ou 8 horas totais. A troca da senha encerra as sessões anteriores. Mutações exigem origem local correspondente, JSON e tamanho limitado. Referências de implementação: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) e [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Esta é uma instalação local via HTTP. Não utiliza cookie Secure porque não usa HTTPS. Não abrir este servidor diretamente para a internet. A etapa de hospedagem precisa de HTTPS/cookie Secure, autenticação em dois fatores, recuperação de acesso, convites, operação de backups, monitoramento, política de retenção e revisão independente de segurança. Não há recuperação automática de senha nesta versão; guarde o acesso do administrador.

## Próximas entregas

Conectar critérios de curadoria e evidências privadas ao dossiê; definir revisão humana e níveis de aprovação; depois conectar relacionamento, propostas, locações e administração mensal. A avaliação inicial não certifica regularidade, não consulta processos, não gera pontuação de IA e não publica imóveis. Formulários do site público continuam encaminhando para WhatsApp, sem integração automática com este cadastro.

Os testes usam exclusivamente bancos temporários e pessoas fictícias. Foram verificados acesso, permissões, persistência, concorrência, histórico, expiração, suspensão e fluxos de navegador em computador e celular.
