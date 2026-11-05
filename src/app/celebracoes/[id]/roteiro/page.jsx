import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { canManageCapela, isCoordinator } from '@/domain/auth/roles.js';
import { getCelebration } from '@/services/celebrations.js';
import { searchSongs } from '@/services/songs.js';
import { RepertoireBuilder } from '@/components/RepertoireBuilder.jsx';
import { seasonLabel } from '@/domain/liturgy/seasons.js';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';
import { Icon } from '@/components/Icon.jsx';

export const metadata = { title: 'Roteiro musical · Coral Litúrgico' };

export default async function RoteiroPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const { id } = await params;
  if (!isCoordinator(user)) redirect(`/celebracoes/${id}`);

  let celebration;
  try {
    celebration = await getCelebration(id, user);
  } catch (error) {
    if (error.status === 404) notFound();
    throw error;
  }
  // Ver uma celebração de outra capela não dá direito de geri-la.
  if (!canManageCapela(user, celebration.capela)) redirect(`/celebracoes/${id}`);
  // Acervo inteiro: a escolha do coordenador não deve ficar presa ao filtro.
  const songs = await searchSongs({ limit: 200 });

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/agenda', label: 'Agenda' },
          { href: `/celebracoes/${id}`, label: celebration.title },
          { label: 'Roteiro' },
        ]}
      />
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Roteiro musical</h1>
          <p className="ui-subtle">
            {new Date(celebration.date).toLocaleDateString('pt-BR', {
              dateStyle: 'long',
              timeZone: 'UTC',
            })}{' '}
            · {seasonLabel(celebration.season)}
          </p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="ui-empty">
          <Icon name="audio" size={32} />
          <p>O acervo está vazio.</p>
          <Link className="ui-button ui-button--primary" href="/acervo/nova">
            Cadastrar a primeira música
          </Link>
        </div>
      ) : (
        <RepertoireBuilder
          celebrationId={id}
          songs={songs.map((song) => ({
            id: song.id,
            title: song.title,
            originalKey: song.originalKey,
            moments: song.moments,
            tags: song.tags,
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
