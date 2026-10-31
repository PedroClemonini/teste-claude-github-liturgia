import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { getSong } from '@/services/songs.js';
import { momentLabel } from '@/domain/liturgy/moments.js';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { getVideoEmbedUrl } from '@/domain/video/embed.js';
import { SongViewer } from '@/components/SongViewer.jsx';
import { PerformanceMode } from '@/components/PerformanceMode.jsx';

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
      <div className="page-head">
        <div className="grow">
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <Link href="/acervo">← Acervo</Link>
          </p>
        </div>
        <span className="row">
          <PerformanceMode
            label="Tela cheia"
            songs={[
              {
                id: song.id,
                title: song.title,
                composer: song.composer,
                originalKey: song.originalKey,
                chordPro: song.chordPro,
              },
            ]}
          />
          {isCoordinator(user) && (
            <Link className="btn btn--ghost" href={`/acervo/${song.id}/editar`}>
              Editar
            </Link>
          )}
        </span>
      </div>

      <SongViewer
        song={{
          title: song.title,
          composer: song.composer,
          originalKey: song.originalKey,
          chordPro: song.chordPro,
        }}
      />

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
            <a className="btn btn--ghost" href={song.audioUrl} target="_blank" rel="noopener noreferrer">
              ▶ Ouvir
            </a>
          </p>
        )
      )}

      {(song.moments.length > 0 || song.seasons.length > 0) && (
        <div className="row" style={{ marginTop: '1.5rem' }}>
          {song.moments.map((moment) => (
            <span className="tag" key={moment}>
              {momentLabel(moment)}
            </span>
          ))}
          {song.seasons.map((season) => (
            <span className="tag" key={season}>
              {seasonLabel(season)}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
