import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { getSong } from '@/services/songs.js';
import { momentLabel } from '@/domain/liturgy/moments.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { getVideoEmbedUrl } from '@/domain/video/embed.js';
import { formatTag } from '@/domain/songs/tags.js';
import { SongWithFullscreen } from '@/components/SongWithFullscreen.jsx';
import { DeleteSongButton } from '@/components/DeleteSongButton.jsx';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';
import { Icon } from '@/components/Icon.jsx';

export const metadata = { title: 'Cifra · Coral Litúrgico' };

export default async function MusicaPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const { id } = await params;
  let song;
  try {
    song = await getSong(id);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }

  const videoEmbedUrl = getVideoEmbedUrl(song.audioUrl);

  return (
    <>
      <SongWithFullscreen
        song={{
          id: song.id,
          title: song.title,
          composer: song.composer,
          originalKey: song.originalKey,
          chordPro: song.chordPro,
        }}
        breadcrumbs={<Breadcrumbs items={[{ href: '/acervo', label: 'Acervo' }, { label: song.title }]} />}
      >
        {isCoordinator(user) && (
          <>
            <Link className="ui-button" href={`/acervo/${song.id}/editar`}>
              <Icon name="edit" />
              Editar
            </Link>
            <DeleteSongButton songId={song.id} title={song.title} />
          </>
        )}
      </SongWithFullscreen>

      {videoEmbedUrl ? (
        <div className="video-embed" style={{ marginTop: '1rem' }}>
          <iframe
            src={videoEmbedUrl}
            title={`Vídeo de ${song.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        song.audioUrl && (
          <p style={{ marginTop: '1rem' }}>
            <a className="ui-button" href={song.audioUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="link-external" />
              Ouvir
            </a>
          </p>
        )
      )}

      {(song.moments.length > 0 || song.seasons.length > 0 || song.tags.length > 0) && (
        <dl className="ui-details">
          {song.moments.length > 0 && (
            <div>
              <dt>Momentos do rito</dt>
              <dd>
                {song.moments.map((moment) => (
                  <span className="ui-lozenge" key={moment}>
                    {momentLabel(moment)}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {song.seasons.length > 0 && (
            <div>
              <dt>Tempos litúrgicos</dt>
              <dd>
                {song.seasons.map((season) => (
                  <span className="ui-lozenge" key={season}>
                    <span className="season-dot" data-season={season} />
                    {seasonLabel(season)}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {song.tags.length > 0 && (
            <div>
              <dt>Tags</dt>
              <dd>
                {song.tags.map((tag) => (
                  <Link className="ui-tag" key={tag} href={`/acervo?tag=${tag}`}>
                    {formatTag(tag)}
                  </Link>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
    </>
  );
}
