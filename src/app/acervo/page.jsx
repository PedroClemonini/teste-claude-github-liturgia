import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { searchSongs } from '@/services/songs.js';
import { LITURGICAL_MOMENTS, momentLabel } from '@/domain/liturgy/moments.js';
import { LITURGICAL_SEASONS } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';

export const metadata = { title: 'Acervo · Coral Litúrgico' };

/** Busca por título, trecho da letra, momento do rito e tempo litúrgico. */
export default async function AcervoPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const query = await searchParams;
  const q = query?.q ?? '';
  const moment = query?.momento ?? '';
  const season = query?.tempo ?? '';

  const songs = await searchSongs({
    query: q || undefined,
    moment: moment || undefined,
    season: season || undefined,
    limit: 100,
  });

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Acervo</h1>
          <p>Busque por título, por um trecho da letra ou pela adequação litúrgica.</p>
        </div>
        {isCoordinator(user) && (
          <Link className="btn" href="/acervo/nova">
            Nova música
          </Link>
        )}
      </div>

      <form className="filters card" method="get" action="/acervo">
        <label className="field" style={{ margin: 0 }}>
          <span>Título ou trecho da letra</span>
          <input name="q" defaultValue={q} placeholder="ex.: estais no céu" />
        </label>

        <label className="field" style={{ margin: 0 }}>
          <span>Momento</span>
          <select name="momento" defaultValue={moment}>
            <option value="">todos</option>
            {LITURGICAL_MOMENTS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field" style={{ margin: 0 }}>
          <span>Tempo litúrgico</span>
          <select name="tempo" defaultValue={season}>
            <option value="">todos</option>
            {LITURGICAL_SEASONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button className="btn" type="submit">
          Buscar
        </button>
      </form>

      <p style={{ color: 'var(--text-soft)', fontSize: '0.85rem' }}>
        {songs.length} {songs.length === 1 ? 'música encontrada' : 'músicas encontradas'}
        {season ? ' (inclui músicas que servem em qualquer tempo)' : ''}
      </p>

      {songs.length === 0 ? (
        <p className="empty">Nada encontrado com esses filtros.</p>
      ) : (
        <ul className="song-list card">
          {songs.map((song) => (
            <li key={song.id}>
              <Link className="song-link" href={`/acervo/${song.id}`}>
                <strong>{song.title}</strong>
                <span className="tag tag--key">{song.originalKey}</span>
                {song.composer && <small>{song.composer}</small>}
                {song.moments.length > 0 && (
                  <small>· {song.moments.map(momentLabel).join(', ')}</small>
                )}
                <span className="song-snippet">{song.plainLyrics.slice(0, 120)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
