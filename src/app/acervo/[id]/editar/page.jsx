import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { getSong, listSongTags } from '@/services/songs.js';
import { SongForm } from '@/components/SongForm.jsx';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';

export const metadata = { title: 'Editar música · Coral Litúrgico' };

export default async function EditarMusicaPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

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
      <Breadcrumbs
        items={[
          { href: '/acervo', label: 'Acervo' },
          { href: `/acervo/${song.id}`, label: song.title },
          { label: 'Editar' },
        ]}
      />
      <div className="ui-page-head">
        <h1 className="ui-heading-large">Editar música</h1>
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
          tags: song.tags,
        }}
        tagSuggestions={await listSongTags()}
      />
    </>
  );
}
