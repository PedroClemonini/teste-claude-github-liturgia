import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { canManageCapela, isCoordinator } from '@/domain/auth/roles.js';
import { getCelebration, isParticipantCoordinator, toParticipantOptions } from '@/services/celebrations.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { listMembers } from '@/services/users.js';
import { CelebrationForm } from '@/components/CelebrationForm.jsx';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';

export const metadata = { title: 'Editar evento · Coral Litúrgico' };

export default async function EditarCelebracaoPage({ params }) {
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
  // Edita quem administra a capela, ou um coordenador escalado como
  // participante — quem só vê, sem nenhum dos dois, cai de volta pro
  // detalhe, igual já acontece ao tentar salvar.
  if (!canManageCapela(user, celebration.capela) && !isParticipantCoordinator(user, celebration)) {
    redirect(`/celebracoes/${id}`);
  }

  const [capelas, members] = await Promise.all([listManagedCapelas(user), listMembers(user)]);
  const participantOptions = toParticipantOptions(members, user.capelaIds);

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/agenda', label: 'Agenda' },
          { href: `/celebracoes/${id}`, label: celebration.title },
          { label: 'Editar' },
        ]}
      />
      <div className="ui-page-head">
        <h1 className="ui-heading-large">Editar evento</h1>
      </div>
      <CelebrationForm celebration={celebration} capelas={capelas} participantOptions={participantOptions} />
    </>
  );
}
