# Coral Litúrgico

Aplicação web para organizar o serviço musical de corais católicos: calendário
das celebrações, escala da equipe e acervo de cifras — pensada para ser lida no
celular, durante a missa, sem depender de PDF.

## Como está construído

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Interface | Next.js 15 (App Router), React 18, JavaScript | Renderização no servidor para abrir rápido em rede ruim de igreja; componentes de cliente só onde há interação. |
| Dados | PostgreSQL + Prisma ORM | Relacional porque evento, música e roteiro são de fato relações; o Prisma dá tipos, migrações e consultas seguras. |
| Autenticação | NextAuth (Auth.js) v5, credenciais + JWT | Login por e-mail e senha, com o papel do usuário dentro da sessão. |
| Validação | Zod | Um único esquema por entidade, usado no formulário e na rota de API. |
| Testes | Vitest (+ Testing Library) | Domínio, serviços contra PostgreSQL real, rotas de API e componentes. |

### Organização das pastas

```
src/
  domain/            regras puras, sem banco e sem React — o coração testável
    chordpro/        leitura, escrita e transposição de cifras
    liturgy/         tempos litúrgicos e momentos do rito
    calendar/        montagem da grade da agenda
    auth/            papéis e permissões
    validation/      esquemas Zod compartilhados
  services/          casos de uso: usam Prisma e cobram as permissões
  app/               páginas e rotas de API (App Router)
  components/        componentes de interface
  lib/               Prisma, NextAuth, utilidades das rotas
prisma/              schema e dados de exemplo
tests/               unit · integration · api · component
```

A regra que sustenta o desenho: **nada em `domain/` conhece banco, HTTP ou
React**. Por isso a transposição, o cálculo do tempo litúrgico e a grade do mês
são testáveis em milissegundos, e as mesmas funções rodam no servidor, no
navegador e no `seed`.

## Funcionalidades

### Liturgia do dia
- A Agenda mostra a liturgia do dia, com cor, leituras e o texto completo. As setas
  navegam entre os dias.
- Os textos vêm da API pública [liturgia-diaria](https://github.com/Dancrf/liturgia-diaria)
  e ficam guardados na tabela `LiturgyDay`. Cada visita à Agenda completa mais alguns
  dias até o fim do ano, sem atrasar a tela. Se a API cair, o que já foi guardado
  continua aparecendo. A URL pode ser trocada por `LITURGY_API_URL`.
- Cada missa mostra a sua liturgia. Na missa de sábado, das 17h em diante vale a
  liturgia de domingo; quem edita o evento pode trocar entre as duas.

### Usuários e autenticação
- Cadastro por convite: nome, e-mail, senha e vozes ou instrumentos (ex.: Soprano,
  Violão). Quem já tem conta entra em outra capela pelo mesmo link, com a mesma senha.
- Aba **Perfil**: cada pessoa muda o próprio nome, e-mail, senha e instrumentos;
  trocar e-mail ou senha pede a senha atual.
- Login por NextAuth; a senha é guardada apenas como hash bcrypt.
- **Esqueci minha senha**: o link no login pede o e-mail e envia um link de uso
  único, válido por 1 hora. Ver [Recuperação de senha](#recuperação-de-senha).
- Uma pessoa pode estar em **uma ou mais capelas**, com um papel em cada:
  **Coordenador** (edita calendário, cadastra músicas, monta roteiros, muda papéis)
  ou **Músico** (consulta escalas e cifras).
- Um único coordenador é o **dono** do sistema: coordena todas as capelas, cria
  capelas e adiciona pessoas em cada uma, por link ou com nome, e-mail e senha
  (aba **Capelas**). O próprio banco impede um segundo dono.
- A permissão é cobrada no servidor, em `services/`, não só na interface —
  esconder um botão não protege uma rota.

### Calendário litúrgico
- Painel de agenda com grade mensal no computador e lista cronológica no celular.
- Missa, missa solene (casamento, padroeiro) e ensaio, cada um com marcação visual própria.
- Data, horário e **tempo litúrgico**, este último calculado a partir da data:
  Páscoa pelo algoritmo de Meeus/Jones/Butcher e, dela, Cinzas, Tríduo,
  Pentecostes, Advento e Batismo do Senhor. O coordenador pode sobrepor à mão.
- Roteiro musical com os catorze momentos do rito: Entrada, Hinos, Ato Penitencial, Glória,
  Salmo, Aclamação, Ladainha, Ofertório, Santo, Oração Eucarística, Cordeiro,
  Comunhão, Ação de Graças e Final.

### Acervo e cifras
- Busca por título, por trecho da letra ou por adequação litúrgica (momento e tempo).
- Tags livres, como `#novenasaofrancisco`: digitar `#novena` na busca encontra pelo
  pedaço do nome, e o Acervo tem um filtro por tag.
  Para isso, cada música guarda também a letra sem acordes.
- **Editor ChordPro**: o acorde é digitado entre colchetes, encostado na sílaba
  em que muda — `[G]Pai Nosso que est[C]ais no c[G]éu`.
- **Tela dividida**: texto à esquerda, cifra renderizada à direita, em tempo real.
- **Transposição dinâmica**: na tela do músico, um clique sobe ou desce meio tom;
  a grafia passa a bemóis quando o tom de destino pede, e há modo somente letra.
- O roteiro guarda o tom escolhido para cada evento, sem alterar a cifra do acervo.

### Alinhamento do acorde: como é garantido

O acorde nunca sai de cima da sílaba porque a cifra não é texto pré-formatado:
cada sílaba e o acorde que soa nela vão para o **mesmo bloco**, e blocos da mesma
palavra ficam dentro de um invólucro que não quebra. Assim, ao estreitar a tela,
a linha quebra entre palavras, e o acorde desce junto com a sua sílaba —
nunca escorrega para a sílaba vizinha e nunca parte a palavra no meio.

## Como rodar

Requisitos: Node.js 20+ e PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # aponte DATABASE_URL para o seu banco
npx prisma db push            # cria as tabelas
npm run db:seed               # dados de exemplo (opcional)
npm run dev                   # http://localhost:3000
```

Contas criadas pelo `seed` (senha `coral2026`):

| E-mail | Papel |
| --- | --- |
| `coordenador@paroquia.org` | Coordenador |
| `musico@paroquia.org` | Músico |

Gere o `AUTH_SECRET` de produção com `openssl rand -base64 32`.

### Com Docker

Requisito: Docker e Docker Compose. Sobe a aplicação (build multi-stage do
Next.js) e o PostgreSQL juntos; o container da aplicação aplica o schema do
Prisma (`prisma db push`) automaticamente antes de iniciar o servidor.

Bases criadas antes do modelo de várias capelas precisam de uma migração, uma
única vez, antes de subir a versão nova: o `db push` recusa apagar colunas com
dados. Veja as instruções em `prisma/upgrade-capelas-multiplas.sql`.

```bash
docker compose up -d --build          # http://localhost:3000
SEED_DB=true docker compose up -d     # opcional: popular com dados de exemplo
```

Variáveis de ambiente aceitas pelo `docker-compose.yml` (todas opcionais, com
valor padrão): `AUTH_SECRET`, `NEXTAUTH_URL`, `SEED_DB`, `DB_PORT` (porta do
Postgres no host, padrão `5432`), `APP_PORT` (porta da aplicação no host,
padrão `3000`) e as de SMTP descritas em
[Recuperação de senha](#recuperação-de-senha) — defina-as no `.env` ou na
linha de comando. Os dados do
Postgres ficam no volume nomeado `db_data`.

```bash
docker compose logs -f app            # acompanhar o servidor
docker compose down                   # parar (mantém o volume do banco)
docker compose down -v                # parar e apagar o banco
```

## Recuperação de senha

O link **Esqueci minha senha**, na tela de login, leva a `/esqueci-senha`. A
pessoa informa o e-mail e recebe um link para `/redefinir-senha?token=…`.

Configure o SMTP no `.env` para o e-mail sair de verdade:

| Variável | Para que serve |
| --- | --- |
| `SMTP_HOST` | Servidor SMTP do provedor. |
| `SMTP_PORT` | Porta; padrão `587`. |
| `SMTP_USER` | Usuário da caixa (normalmente o próprio e-mail). |
| `SMTP_PASSWORD` | Senha da caixa — no Gmail, uma *senha de app*. |
| `SMTP_SECURE` | Opcional. Padrão: `true` na porta 465, `false` na 587. |
| `MAIL_FROM` | Remetente, ex.: `Coral Litúrgico <suporte@paroquiasfranciscoxavier.com.br>`. |
| `APP_URL` | Base dos links do e-mail. Sem ela, cai no `NEXTAUTH_URL`. |

**Sem `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` o app não quebra**: o link de
redefinição é escrito no log do servidor (`docker compose logs app-prod`), o
que mantém o desenvolvimento usável sem credenciais reais. A tela mostra a
mesma mensagem de sucesso nos dois casos.

Como o recurso mexe com senha, vale registrar o que o protege:

- **O banco não guarda o token**, só o SHA-256 dele. Quem lê a tabela não
  consegue redefinir a senha de ninguém. (O token é aleatório de 32 bytes, então
  o hash simples basta; bcrypt existe para senhas escolhidas por pessoas.)
- **A resposta é a mesma exista ou não a conta**, para a tela não virar um
  consultor de "quem é cadastrado aqui".
- **A base do link vem de `APP_URL`/`NEXTAUTH_URL`, nunca do cabeçalho `Host`**
  da requisição — senão alguém poderia forjar um `Host` e receber um link de
  redefinição apontando para o próprio servidor.
- **Uso único, 1 hora de validade.** Pedir um link novo invalida o anterior, e
  trocar a senha apaga todos os pedidos pendentes da conta.
- **Cliques repetidos não viram enxurrada de e-mail**: há um intervalo mínimo de
  1 minuto entre dois envios para a mesma conta.

## Testes

```bash
npm test                 # suíte completa
npm run test:unit        # só o domínio (não precisa de banco)
npm run test:integration # serviços contra PostgreSQL
npm run test:watch
```

Quatro níveis, do mais rápido ao mais próximo do usuário:

- `tests/unit` — regras puras: ChordPro, transposição, datas litúrgicas, grade
  do calendário, permissões, validação.
- `tests/integration` — serviços contra um PostgreSQL de verdade, incluindo
  autorização, transação do roteiro e restrições do banco.
- `tests/api` — rotas do App Router chamadas diretamente, com a sessão trocada
  por um duplo; cobre status HTTP e mensagens de erro por campo.
- `tests/component` — cifra, transposição e editor dividido em jsdom.

> **A suíte apaga as tabelas do banco que usar.** Aponte `DATABASE_URL_TEST`
> para um banco separado no `.env`; quando essa variável existe, os testes a
> usam em lugar de `DATABASE_URL`.

Os arquivos de teste rodam em série (`fileParallelism: false`), porque
compartilham o mesmo banco.

## Decisões que valem registro

- **Transposição sobre o texto ChordPro, não sobre a estrutura já interpretada.**
  Só o conteúdo dos colchetes muda; letra, diretivas e espaçamento seguem
  intactos, e o alinhamento se preserva por construção.
- **`buildScript` devolve as duas versões da cifra**: `chordPro` já no tom da
  evento (pronto para imprimir ou consumir pela API) e `sourceChordPro` como
  foi cadastrada. A tela do músico parte da segunda, o que impede transpor duas
  vezes a mesma cifra.
- **O filtro por tempo litúrgico é estrito**: filtrar por Natal ou Páscoa traz só
  as músicas marcadas com aquele tempo; as sem tempo definido ficam de fora.
- **Datas em UTC** em todo o cálculo litúrgico: o tempo litúrgico de um dia é o
  mesmo para toda a equipe, qualquer que seja o fuso do aparelho.
- **Excluir música usada em roteiro é bloqueado** (409), para não abrir buraco no
  histórico das celebrações.
- **O cadastro público sempre cria Músico**; promover alguém é ação de
  coordenador, na tela Equipe.
