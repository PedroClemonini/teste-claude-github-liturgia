import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { getSong } from '@/services/songs.js';
import { SongForm } from '@/components/SongForm.jsx';

export const metadata = { title: 'Editar música · Coral Litúrgico' };

export default async function EditarMusicaPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const { id } = await params;
  if (!isCoordinator(user)) redirect(`/acervo/${id}`);

  const song = await getSong(id);

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
          moments: song.moments,
          seasons: song.seasons,
        }}
      />
    </>
  );
}
