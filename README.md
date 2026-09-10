# Coral Litúrgico

Aplicação web para organizar o serviço musical de corais católicos: calendário
das celebrações, escala da equipe e acervo de cifras — pensada para ser lida no
celular, durante a missa, sem depender de PDF.

## Como está construído

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Interface | Next.js 15 (App Router), React 18, JavaScript | Renderização no servidor para abrir rápido em rede ruim de igreja; componentes de cliente só onde há interação. |
| Dados | PostgreSQL + Prisma ORM | Relacional porque celebração, música e roteiro são de fato relações; o Prisma dá tipos, migrações e consultas seguras. |
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

### Usuários e autenticação
- Cadastro simples: nome, e-mail, senha e voz ou instrumento (ex.: Soprano, Violão).
- Login por NextAuth; a senha é guardada apenas como hash bcrypt.
- Dois papéis: **Coordenador** (edita calendário, cadastra músicas, monta roteiros,
  muda papéis) e **Músico** (consulta escalas e cifras).
- A permissão é cobrada no servidor, em `services/`, não só na interface —
  esconder um botão não protege uma rota.

### Calendário litúrgico
- Painel de agenda com grade mensal no computador e lista cronológica no celular.
- Missa, missa solene (casamento, padroeiro) e ensaio, cada um com marcação visual própria.
- Data, horário e **tempo litúrgico**, este último calculado a partir da data:
  Páscoa pelo algoritmo de Meeus/Jones/Butcher e, dela, Cinzas, Tríduo,
  Pentecostes, Advento e Batismo do Senhor. O coordenador pode sobrepor à mão.
- Roteiro musical com os onze momentos do rito: Entrada, Ato Penitencial, Glória,
  Salmo, Aclamação, Ofertório, Santo, Cordeiro, Comunhão, Ação de Graças e Final.

### Acervo e cifras
- Busca por título, por trecho da letra ou por adequação litúrgica (momento e tempo).
  Para isso, cada música guarda também a letra sem acordes.
- **Editor ChordPro**: o acorde é digitado entre colchetes, encostado na sílaba
  em que muda — `[G]Pai Nosso que est[C]ais no c[G]éu`.
- **Tela dividida**: texto à esquerda, cifra renderizada à direita, em tempo real.
- **Transposição dinâmica**: na tela do músico, um clique sobe ou desce meio tom;
  a grafia passa a bemóis quando o tom de destino pede, e há modo somente letra.
- O roteiro guarda o tom escolhido para cada celebração, sem alterar a cifra do acervo.

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
  celebração (pronto para imprimir ou consumir pela API) e `sourceChordPro` como
  foi cadastrada. A tela do músico parte da segunda, o que impede transpor duas
  vezes a mesma cifra.
- **Música sem tempo litúrgico serve em qualquer tempo**, e por isso continua
  aparecendo quando se filtra por Natal ou Páscoa.
- **Datas em UTC** em todo o cálculo litúrgico: o tempo litúrgico de um dia é o
  mesmo para toda a equipe, qualquer que seja o fuso do aparelho.
- **Excluir música usada em roteiro é bloqueado** (409), para não abrir buraco no
  histórico das celebrações.
- **O cadastro público sempre cria Músico**; promover alguém é ação de
  coordenador, na tela Equipe.
