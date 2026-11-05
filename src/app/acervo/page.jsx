import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listSongTags, searchSongs } from '@/services/songs.js';
import { formatTag } from '@/domain/songs/tags.js';
import { LITURGICAL_MOMENTS, momentLabel } from '@/domain/liturgy/moments.js';
import { LITURGICAL_SEASONS } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { Icon } from '@/components/Icon.jsx';
import { Select } from '@/components/Select.jsx';

/** Mais que isso quebra a linha; o restante aparece como "+N". */
const MAX_MOMENTS = 3;

const comTodos = (items) => [
  { value: '', label: 'Todos' },
  ...items.map((item) => ({ value: item.id, label: item.label })),
];

export const metadata = { title: 'Acervo · Coral Litúrgico' };

/** Busca por título, trecho da letra, momento do rito e tempo litúrgico. */
export default async function AcervoPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const query = await searchParams;
  const q = query?.q ?? '';
  const moment = query?.momento ?? '';
  const season = query?.tempo ?? '';
  const tag = query?.tag ?? '';

  const [songs, tags] = await Promise.all([
    searchSongs({
      query: q || undefined,
      moment: moment || undefined,
      season: season || undefined,
      tag: tag || undefined,
      limit: 100,
    }),
    listSongTags(),
  ]);

  const filtrando = Boolean(q || moment || season || tag);

  return (
    <>
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Acervo</h1>
          <p className="ui-subtle">Busque por título, trecho da letra ou adequação litúrgica.</p>
        </div>
        {isCoordinator(user) && (
          <Link className="ui-button ui-button--primary" href="/acervo/nova">
            <Icon name="add" />
            Nova música
          </Link>
        )}
      </div>

      {/* A chave recria o formulário quando a URL muda (ex.: Limpar filtros, que
          navega sem recarregar), senão os campos ficariam com os valores antigos. */}
      <form
        key={`${q}|${moment}|${season}|${tag}`}
        className={tags.length > 0 ? 'ui-filters ui-filters--tags' : 'ui-filters'}
        method="get"
        action="/acervo"
        role="search"
      >
        <label className="ui-field">
          <span>Título, trecho da letra ou #tag</span>
          <span className="ui-search">
            <Icon name="search" />
            <input name="q" defaultValue={q} placeholder="ex.: estais no céu" />
          </span>
        </label>

        <Select label="Momento" name="momento" defaultValue={moment} options={comTodos(LITURGICAL_MOMENTS)} />
        <Select label="Tempo litúrgico" name="tempo" defaultValue={season} options={comTodos(LITURGICAL_SEASONS)} />
        {tags.length > 0 && (
          <Select
            searchable
            label="Tag"
            name="tag"
            defaultValue={tag}
            options={[
              { value: '', label: 'Todas' },
              ...tags.map((item) => ({ value: item, label: formatTag(item) })),
            ]}
          />
        )}

        <button className="ui-button" type="submit">
          Buscar
        </button>
      </form>

      <div className="ui-results-head">
        <p className="ui-subtle" role="status">
          {songs.length} {songs.length === 1 ? 'música encontrada' : 'músicas encontradas'}
        </p>
        {filtrando && (
          <Link className="ui-button ui-button--subtle" href="/acervo">
            <Icon name="cross" />
            Limpar filtros
          </Link>
        )}
      </div>

      {songs.length === 0 ? (
        <div className="ui-empty">
          <Icon name="search" size={32} />
          <p>Nada encontrado com esses filtros.</p>
        </div>
      ) : (
        <ul className="ui-card ui-song-list">
          {songs.map((song) => (
            <li key={song.id}>
              <Link className="ui-song" href={`/acervo/${song.id}`}>
                <span className="ui-song__main">
                  <span className="ui-song__title">
                    {song.title}
                    {song.audioUrl && (
                      <span className="ui-song__audio" title="Tem link para ouvir">
                        <Icon name="audio" size={12} />
                        <span className="ui-visually-hidden">Tem link para ouvir</span>
                      </span>
                    )}
                  </span>
                  <span className="ui-song__snippet">
                    {[song.composer, song.plainLyrics.slice(0, 120)].filter(Boolean).join(' · ')}
                  </span>
                  {song.tags.length > 0 && (
                    <span className="ui-song__tags">{song.tags.map(formatTag).join(' ')}</span>
                  )}
                </span>
                <span className="ui-song__moments">
                  {song.moments.slice(0, MAX_MOMENTS).map((item) => (
                    <span className="ui-lozenge" key={item}>
                      {momentLabel(item)}
                    </span>
                  ))}
                  {song.moments.length > MAX_MOMENTS && (
                    <span
                      className="ui-lozenge"
                      title={song.moments.slice(MAX_MOMENTS).map(momentLabel).join(', ')}
                    >
                      +{song.moments.length - MAX_MOMENTS}
                    </span>
                  )}
                </span>
                <span className="ui-key" title="Tom original">
                  {song.originalKey}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
