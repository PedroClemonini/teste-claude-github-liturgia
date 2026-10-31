import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { getCelebration } from '@/services/celebrations.js';
import { searchSongs } from '@/services/songs.js';
import { RepertoireBuilder } from '@/components/RepertoireBuilder.jsx';
import { seasonLabel } from '@/domain/liturgy/seasons.js';

export const metadata = { title: 'Roteiro musical · Coral Litúrgico' };

export default async function RoteiroPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');

  const { id } = await params;
  if (!isCoordinator(user)) redirect(`/celebracoes/${id}`);

  let celebration;
  try {
    celebration = await getCelebration(id, user);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }
  // Ver uma celebração de capela fundada não dá direito de geri-la.
  if (celebration.capelaId !== user.capelaId) redirect(`/celebracoes/${id}`);
  // Acervo inteiro: a escolha do coordenador não deve ficar presa ao filtro.
  const songs = await searchSongs({ limit: 200 });

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <Link href={`/celebracoes/${id}`}>← {celebration.title}</Link>
          </p>
          <h1>Roteiro musical</h1>
          <p>
            {new Date(celebration.date).toLocaleDateString('pt-BR', {
              dateStyle: 'long',
              timeZone: 'UTC',
            })}{' '}
            · {seasonLabel(celebration.season)}
          </p>
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="empty">
          O acervo está vazio. <Link href="/acervo/nova">Cadastre a primeira música.</Link>
        </p>
      ) : (
        <RepertoireBuilder
          celebrationId={id}
          songs={songs.map((song) => ({
            id: song.id,
            title: song.title,
            originalKey: song.originalKey,
            moments: song.moments,
          }))}
          initial={celebration.repertoire.map((item) => ({
            moment: item.moment,
            songId: item.songId,
            keyOverride: item.keyOverride,
            position: item.position,
          }))}
        />
      )}
    </>
  );
}
