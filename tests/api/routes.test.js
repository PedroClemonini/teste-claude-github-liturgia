import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// A sessão é o único ponto de contato das rotas com o NextAuth: trocando-a
// por um duplo, as rotas podem ser exercitadas de ponta a ponta contra o banco.
const session = { user: null };
vi.mock('@/lib/session.js', () => ({
  currentUser: async () => session.user,
}));

const { prisma, resetDatabase, makeCapela, makeCoordinator, makeMusician, makeAdministrator } = await import(
  '../helpers/db.js'
);
const { createInvite } = await import('@/services/invites.js');
const registerRoute = await import('@/app/api/register/route.js');
const songsRoute = await import('@/app/api/songs/route.js');
const songRoute = await import('@/app/api/songs/[id]/route.js');
const celebrationsRoute = await import('@/app/api/celebrations/route.js');
const celebrationRoute = await import('@/app/api/celebrations/[id]/route.js');
const repertoireRoute = await import('@/app/api/celebrations/[id]/repertoire/route.js');
const scriptRoute = await import('@/app/api/celebrations/[id]/script/route.js');
const membersRoute = await import('@/app/api/members/route.js');
const memberRoute = await import('@/app/api/members/[id]/route.js');
const memberRoleRoute = await import('@/app/api/members/[id]/role/route.js');
const memberCapelaRoute = await import('@/app/api/members/[id]/capela/route.js');
const capelasRoute = await import('@/app/api/capelas/route.js');
const invitesRoute = await import('@/app/api/invites/route.js');
const inviteRoute = await import('@/app/api/invites/[id]/route.js');

const post = (body) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const put = (body) => new Request('http://localhost/api', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const get = (url = 'http://localhost/api') => new Request(url);
const del = () => new Request('http://localhost/api', { method: 'DELETE' });
const params = (id) => ({ params: Promise.resolve({ id }) });

let capela;
let coordenador;
let musico;

beforeEach(async () => {
  await resetDatabase();
  capela = await makeCapela();
  coordenador = await makeCoordinator({ capelaId: capela.id });
  musico = await makeMusician({ capelaId: capela.id });
  session.user = null;
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('POST /api/register', () => {
  it('cadastra um novo integrante na capela do convite', async () => {
    const invite = await createInvite(capela.id, coordenador);
    const response = await registerRoute.POST(
      post({
        name: 'Maria Soprano',
        email: 'maria@paroquia.org',
        password: 'salmo23aleluia',
        voiceOrInstrument: 'Soprano',
        inviteToken: invite.token,
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user).toMatchObject({
      email: 'maria@paroquia.org',
      role: 'MUSICO',
      capelaId: capela.id,
    });
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('devolve 422 com as mensagens por campo', async () => {
    const response = await registerRoute.POST(post({ name: 'M', email: 'x', password: '1' }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.details.email).toBeTruthy();
    expect(body.details.password).toBeTruthy();
  });

  it('devolve 422 sem convite', async () => {
    const response = await registerRoute.POST(
      post({
        name: 'Maria Soprano',
        email: 'maria@paroquia.org',
        password: 'salmo23aleluia',
        voiceOrInstrument: 'Soprano',
      }),
    );
    expect(response.status).toBe(422);
    expect((await response.json()).details.inviteToken).toBeTruthy();
  });

  it('devolve 409 para e-mail repetido', async () => {
    const payload = {
      name: 'Maria Soprano',
      email: 'maria@paroquia.org',
      password: 'salmo23aleluia',
      voiceOrInstrument: 'Soprano',
    };
    const invite1 = await createInvite(capela.id, coordenador);
    await registerRoute.POST(post({ ...payload, inviteToken: invite1.token }));

    const invite2 = await createInvite(capela.id, coordenador);
    const response = await registerRoute.POST(post({ ...payload, inviteToken: invite2.token }));
    expect(response.status).toBe(409);
  });

  it('não deixa o cadastro por convite criar um coordenador', async () => {
    const invite = await createInvite(capela.id, coordenador);
    const response = await registerRoute.POST(
      post({
        name: 'Espertinho',
        email: 'esperto@paroquia.org',
        password: 'salmo23aleluia',
        voiceOrInstrument: 'Baixo',
        role: 'COORDENADOR',
        inviteToken: invite.token,
      }),
    );
    expect(response.status).toBe(201);
    expect((await response.json()).user.role).toBe('MUSICO');
  });

  it('devolve 400 para corpo que não é JSON', async () => {
    const response = await registerRoute.POST(
      new Request('http://localhost/api', { method: 'POST', body: 'nada disso' }),
    );
    expect(response.status).toBe(400);
  });
});

describe('/api/capelas', () => {
  it('permite ao administrador fundar uma capela', async () => {
    const admin = await makeAdministrator();
    session.user = admin;
    const response = await capelasRoute.POST(post({ name: 'Capela Nova' }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.capela).toMatchObject({ name: 'Capela Nova', createdById: admin.id });
  });

  it('impede o coordenador e o músico de fundar capela', async () => {
    session.user = coordenador;
    expect((await capelasRoute.POST(post({ name: 'Capela Nova' }))).status).toBe(403);

    session.user = musico;
    expect((await capelasRoute.POST(post({ name: 'Capela Nova' }))).status).toBe(403);
  });

  it('coordenador lista só a própria capela; administrador lista todas', async () => {
    const admin = await makeAdministrator();
    session.user = admin;
    await capelasRoute.POST(post({ name: 'Capela Nova' }));

    const doCoordenador = await (async () => {
      session.user = coordenador;
      return (await capelasRoute.GET()).json();
    })();
    expect(doCoordenador.capelas.map((c) => c.name)).toEqual([capela.name]);

    session.user = admin;
    const doAdmin = await (await capelasRoute.GET()).json();
    expect(doAdmin.capelas.map((c) => c.name).sort()).toEqual(['Capela Nova', capela.name].sort());
  });
});

describe('/api/invites', () => {
  it('gera e lista um convite para a capela do coordenador', async () => {
    session.user = coordenador;
    const response = await invitesRoute.POST(post({ capelaId: capela.id }));
    expect(response.status).toBe(201);
    const { invite } = await response.json();
    expect(invite.capelaId).toBe(capela.id);

    const listed = await (
      await invitesRoute.GET(get(`http://localhost/api/invites?capelaId=${capela.id}`))
    ).json();
    expect(listed.invites.map((i) => i.id)).toContain(invite.id);
  });

  it('revoga um convite pendente', async () => {
    session.user = coordenador;
    const { invite } = await (await invitesRoute.POST(post({ capelaId: capela.id }))).json();

    expect((await inviteRoute.DELETE(del(), params(invite.id))).status).toBe(200);

    const listed = await (
      await invitesRoute.GET(get(`http://localhost/api/invites?capelaId=${capela.id}`))
    ).json();
    expect(listed.invites.map((i) => i.id)).not.toContain(invite.id);
  });

  it('coordenador de outra capela não cria nem lista convites alheios', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    session.user = await makeCoordinator({ capelaId: outraCapela.id });

    expect((await invitesRoute.POST(post({ capelaId: capela.id }))).status).toBe(403);
    expect(
      (await invitesRoute.GET(get(`http://localhost/api/invites?capelaId=${capela.id}`))).status,
    ).toBe(403);
  });

  it('músico não gera convite', async () => {
    session.user = musico;
    expect((await invitesRoute.POST(post({ capelaId: capela.id }))).status).toBe(403);
  });

  it('administrador gera convite para uma capela que acabou de fundar', async () => {
    const admin = await makeAdministrator();
    session.user = admin;
    const nova = await (await capelasRoute.POST(post({ name: 'Capela Nova' }))).json();

    const response = await invitesRoute.POST(post({ capelaId: nova.capela.id }));
    expect(response.status).toBe(201);
  });
});

describe('/api/songs', () => {
  it('exige autenticação para consultar o acervo', async () => {
    expect((await songsRoute.GET(get())).status).toBe(401);
  });

  it('busca por trecho da letra', async () => {
    session.user = coordenador;
    await songsRoute.POST(
      post({ title: 'Pai Nosso', chordPro: '[G]Pai Nosso que est[C]ais no céu', originalKey: 'G' }),
    );

    session.user = musico;
    const response = await songsRoute.GET(get('http://localhost/api/songs?q=estais%20no%20c%C3%A9u'));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.songs.map((s) => s.title)).toEqual(['Pai Nosso']);
  });

  it('filtra por momento e tempo litúrgico', async () => {
    session.user = coordenador;
    await songsRoute.POST(
      post({
        title: 'Noite Feliz',
        chordPro: '[C]Noite feliz',
        originalKey: 'C',
        moments: ['ENTRADA'],
        seasons: ['NATAL'],
      }),
    );
    const response = await songsRoute.GET(
      get('http://localhost/api/songs?moment=ENTRADA&season=NATAL'),
    );
    expect((await response.json()).songs).toHaveLength(1);

    const outro = await songsRoute.GET(get('http://localhost/api/songs?moment=FINAL'));
    expect((await outro.json()).songs).toHaveLength(0);
  });

  it('impede o músico de cadastrar música', async () => {
    session.user = musico;
    const response = await songsRoute.POST(post({ title: 'X', chordPro: '[C]X' }));
    expect(response.status).toBe(403);
    expect(await prisma.song.count()).toBe(0);
  });

  it('cadastra, edita e remove uma música pelo coordenador', async () => {
    session.user = coordenador;
    const created = await songsRoute.POST(
      post({ title: 'Aleluia', chordPro: '[C]Aleluia', moments: ['ACLAMACAO'] }),
    );
    expect(created.status).toBe(201);
    const { song } = await created.json();
    expect(song.originalKey).toBe('C');

    const updated = await songRoute.PUT(
      put({ title: 'Aleluia Pascal', chordPro: '[D]Aleluia' }),
      params(song.id),
    );
    expect((await updated.json()).song.title).toBe('Aleluia Pascal');

    const removed = await songRoute.DELETE(del(), params(song.id));
    expect(removed.status).toBe(200);
    expect(await prisma.song.count()).toBe(0);
  });

  it('devolve 404 para música inexistente', async () => {
    session.user = musico;
    expect((await songRoute.GET(get(), params('inexistente'))).status).toBe(404);
  });
});

describe('/api/celebrations', () => {
  it('cria a evento deduzindo o tempo litúrgico', async () => {
    session.user = coordenador;
    const response = await celebrationsRoute.POST(
      post({ title: 'Missa da Páscoa', date: '2026-04-05T10:00:00.000Z', type: 'MISSA_SOLENE' }),
    );
    expect(response.status).toBe(201);
    expect((await response.json()).celebration.season).toBe('PASCOA');
  });

  it('lista a agenda por intervalo para qualquer integrante', async () => {
    session.user = coordenador;
    await celebrationsRoute.POST(post({ title: 'Missa', date: '2026-04-05T10:00:00.000Z' }));
    await celebrationsRoute.POST(post({ title: 'Ensaio', date: '2026-05-01T20:00:00.000Z', type: 'ENSAIO' }));

    session.user = musico;
    const response = await celebrationsRoute.GET(
      get('http://localhost/api/celebrations?from=2026-04-01T00:00:00.000Z&to=2026-04-30T23:59:59.999Z'),
    );
    const body = await response.json();
    expect(body.celebrations.map((c) => c.title)).toEqual(['Missa']);
  });

  it('impede o músico de criar e apagar celebrações', async () => {
    session.user = coordenador;
    const { celebration } = await (
      await celebrationsRoute.POST(post({ title: 'Missa', date: '2026-04-05T10:00:00.000Z' }))
    ).json();

    session.user = musico;
    expect((await celebrationsRoute.POST(post({ title: 'X', date: '2026-04-05T10:00:00.000Z' }))).status).toBe(403);
    expect((await celebrationRoute.DELETE(del(), params(celebration.id))).status).toBe(403);
  });

  it('devolve 422 quando a data é inválida', async () => {
    session.user = coordenador;
    const response = await celebrationsRoute.POST(post({ title: 'Missa', date: 'amanhã' }));
    expect(response.status).toBe(422);
    expect((await response.json()).details.date).toBeTruthy();
  });

  it('coordenador vê (mas não mexe em) evento de outra capela; músico nem vê', async () => {
    session.user = coordenador;
    const { celebration } = await (
      await celebrationsRoute.POST(post({ title: 'Missa', date: '2026-04-05T10:00:00.000Z' }))
    ).json();

    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    session.user = await makeCoordinator({ capelaId: outraCapela.id });

    expect((await celebrationRoute.GET(get(), params(celebration.id))).status).toBe(200);
    expect(
      (
        await celebrationRoute.PUT(
          put({ title: 'X', date: '2026-04-05T10:00:00.000Z' }),
          params(celebration.id),
        )
      ).status,
    ).toBe(403);

    session.user = await makeMusician({ capelaId: outraCapela.id });
    expect((await celebrationRoute.GET(get(), params(celebration.id))).status).toBe(404);
  });
});

describe('/api/celebrations/[id]/repertoire e /script', () => {
  let celebrationId;
  let songId;

  beforeEach(async () => {
    session.user = coordenador;
    const celebration = await (
      await celebrationsRoute.POST(post({ title: 'Missa', date: '2026-04-05T10:00:00.000Z' }))
    ).json();
    celebrationId = celebration.celebration.id;

    const song = await (
      await songsRoute.POST(
        post({ title: 'Eis-me aqui', chordPro: '[G]Eis-me aqui, [C]Senhor', originalKey: 'G' }),
      )
    ).json();
    songId = song.song.id;
  });

  it('monta o roteiro e devolve na ordem do rito', async () => {
    const response = await repertoireRoute.PUT(
      put({ items: [{ songId, moment: 'ENTRADA', keyOverride: 'A' }] }),
      params(celebrationId),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.repertoire[0]).toMatchObject({ moment: 'ENTRADA', keyOverride: 'A' });
  });

  it('entrega ao músico o roteiro já transposto para o tom da evento', async () => {
    await repertoireRoute.PUT(
      put({ items: [{ songId, moment: 'ENTRADA', keyOverride: 'A' }] }),
      params(celebrationId),
    );

    session.user = musico;
    const response = await scriptRoute.GET(get(), params(celebrationId));
    const body = await response.json();
    expect(body.script[0].chordPro).toBe('[A]Eis-me aqui, [D]Senhor');
    expect(body.script[0].momentLabel).toBe('Entrada');
  });

  it('impede o músico de alterar o roteiro', async () => {
    session.user = musico;
    const response = await repertoireRoute.PUT(
      put({ items: [{ songId, moment: 'ENTRADA' }] }),
      params(celebrationId),
    );
    expect(response.status).toBe(403);
  });

  it('devolve 404 quando a evento não existe', async () => {
    const response = await repertoireRoute.PUT(put({ items: [] }), params('inexistente'));
    expect(response.status).toBe(404);
  });

  it('devolve 422 quando o momento não existe no rito', async () => {
    const response = await repertoireRoute.PUT(
      put({ items: [{ songId, moment: 'CAFEZINHO' }] }),
      params(celebrationId),
    );
    expect(response.status).toBe(422);
  });
});

describe('/api/members', () => {
  const patch = (body) =>
    new Request('http://localhost/api', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('lista a equipe para qualquer integrante autenticado', async () => {
    session.user = musico;
    const response = await membersRoute.GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.members).toHaveLength(2);
    expect(body.members[0].passwordHash).toBeUndefined();
  });

  it('exige autenticação', async () => {
    expect((await membersRoute.GET()).status).toBe(401);
  });

  it('deixa o coordenador promover um músico', async () => {
    session.user = coordenador;
    const response = await memberRoleRoute.PATCH(patch({ role: 'COORDENADOR' }), params(musico.id));
    expect(response.status).toBe(200);
    expect((await response.json()).user.role).toBe('COORDENADOR');
  });

  it('impede o músico de mudar papéis', async () => {
    session.user = musico;
    const response = await memberRoleRoute.PATCH(patch({ role: 'COORDENADOR' }), params(musico.id));
    expect(response.status).toBe(403);
  });

  it('recusa papel desconhecido', async () => {
    session.user = coordenador;
    const response = await memberRoleRoute.PATCH(patch({ role: 'BISPO' }), params(musico.id));
    expect(response.status).toBe(422);
  });

  it('coordenador remove um integrante da própria capela', async () => {
    session.user = coordenador;
    const response = await memberRoute.DELETE(del(), params(musico.id));
    expect(response.status).toBe(200);
  });

  it('coordenador não remove integrante de outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    const musicoDeFora = await makeMusician({ capelaId: outraCapela.id });

    session.user = coordenador;
    expect((await memberRoute.DELETE(del(), params(musicoDeFora.id))).status).toBe(403);
  });

  it('administrador remove integrante de qualquer capela', async () => {
    session.user = await makeAdministrator();
    expect((await memberRoute.DELETE(del(), params(musico.id))).status).toBe(200);
  });

  it('músico não remove ninguém', async () => {
    session.user = musico;
    expect((await memberRoute.DELETE(del(), params(coordenador.id))).status).toBe(403);
  });

  it('administrador edita nome, e-mail, voz, capela e papel de um integrante', async () => {
    session.user = await makeAdministrator();
    const response = await memberRoute.PATCH(
      patch({
        name: 'Editado',
        email: 'editado@paroquia.org',
        voiceOrInstrument: 'Contralto',
        capelaId: capela.id,
        role: 'COORDENADOR',
      }),
      params(musico.id),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).user).toMatchObject({ name: 'Editado', role: 'COORDENADOR' });
  });

  it('coordenador não usa a edição completa', async () => {
    session.user = coordenador;
    const response = await memberRoute.PATCH(
      patch({
        name: 'X',
        email: 'x@paroquia.org',
        voiceOrInstrument: 'X',
        capelaId: capela.id,
        role: 'MUSICO',
      }),
      params(musico.id),
    );
    expect(response.status).toBe(403);
  });

  it('administrador move um integrante para outra capela', async () => {
    const outraCapela = await makeCapela({ name: 'Outra paróquia' });
    session.user = await makeAdministrator();
    const response = await memberCapelaRoute.PATCH(patch({ capelaId: outraCapela.id }), params(musico.id));
    expect(response.status).toBe(200);
    expect((await response.json()).user.capelaId).toBe(outraCapela.id);
  });

  it('coordenador não move ninguém de capela', async () => {
    session.user = coordenador;
    const response = await memberCapelaRoute.PATCH(patch({ capelaId: capela.id }), params(musico.id));
    expect(response.status).toBe(403);
  });
});
