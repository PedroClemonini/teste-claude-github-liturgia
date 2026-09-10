import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

// A sessão é o único ponto de contato das rotas com o NextAuth: trocando-a
// por um duplo, as rotas podem ser exercitadas de ponta a ponta contra o banco.
const session = { user: null };
vi.mock('@/lib/session.js', () => ({
  currentUser: async () => session.user,
}));

const { prisma, resetDatabase, makeCoordinator, makeMusician } = await import('../helpers/db.js');
const registerRoute = await import('@/app/api/register/route.js');
const songsRoute = await import('@/app/api/songs/route.js');
const songRoute = await import('@/app/api/songs/[id]/route.js');
const celebrationsRoute = await import('@/app/api/celebrations/route.js');
const celebrationRoute = await import('@/app/api/celebrations/[id]/route.js');
const repertoireRoute = await import('@/app/api/celebrations/[id]/repertoire/route.js');
const scriptRoute = await import('@/app/api/celebrations/[id]/script/route.js');
const membersRoute = await import('@/app/api/members/route.js');
const memberRoleRoute = await import('@/app/api/members/[id]/role/route.js');

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

let coordenador;
let musico;

beforeEach(async () => {
  await resetDatabase();
  coordenador = await makeCoordinator();
  musico = await makeMusician();
  session.user = null;
});
afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('POST /api/register', () => {
  it('cadastra um novo integrante', async () => {
    const response = await registerRoute.POST(
      post({
        name: 'Maria Soprano',
        email: 'maria@paroquia.org',
        password: 'salmo23aleluia',
        voiceOrInstrument: 'Soprano',
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.user).toMatchObject({ email: 'maria@paroquia.org', role: 'MUSICO' });
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('devolve 422 com as mensagens por campo', async () => {
    const response = await registerRoute.POST(post({ name: 'M', email: 'x', password: '1' }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.details.email).toBeTruthy();
    expect(body.details.password).toBeTruthy();
  });

  it('devolve 409 para e-mail repetido', async () => {
    const payload = {
      name: 'Maria Soprano',
      email: 'maria@paroquia.org',
      password: 'salmo23aleluia',
      voiceOrInstrument: 'Soprano',
    };
    await registerRoute.POST(post(payload));
    const response = await registerRoute.POST(post(payload));
    expect(response.status).toBe(409);
  });

  it('não deixa o cadastro público criar um coordenador', async () => {
    const response = await registerRoute.POST(
      post({
        name: 'Espertinho',
        email: 'esperto@paroquia.org',
        password: 'salmo23aleluia',
        voiceOrInstrument: 'Baixo',
        role: 'COORDENADOR',
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
  it('cria a celebração deduzindo o tempo litúrgico', async () => {
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

  it('entrega ao músico o roteiro já transposto para o tom da celebração', async () => {
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

  it('devolve 404 quando a celebração não existe', async () => {
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
});
