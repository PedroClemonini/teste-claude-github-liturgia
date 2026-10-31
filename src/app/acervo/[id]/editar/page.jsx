import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { getSong } from '@/services/songs.js';
import { SongForm } from '@/components/SongForm.jsx';

export const metadata = { title: 'Editar música · Coral Litúrgico' };

export default async function EditarMusicaPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');

  const { id } = await params;
  if (!isCoordinator(user)) redirect(`/acervo/${id}`);

  let song;
  try {
    song = await getSong(id);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <Link href={`/acervo/${song.id}`}>← {song.title}</Link>
          </p>
          <h1>Editar música</h1>
        </div>
      </div>
      <SongForm
        song={{
          id: song.id,
          title: song.title,
          composer: song.composer,
          chordPro: song.chordPro,
          originalKey: song.originalKey,
          audioUrl: song.audioUrl,
          moments: song.moments,
          seasons: song.seasons,
        }}
      />
    </>
  );
}
