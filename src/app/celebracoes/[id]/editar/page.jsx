import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { getCelebration, isParticipantCoordinator, sortByOwnCapelaFirst } from '@/services/celebrations.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { listMembers } from '@/services/users.js';
import { CelebrationForm } from '@/components/CelebrationForm.jsx';

export const metadata = { title: 'Editar evento · Coral Litúrgico' };

export default async function EditarCelebracaoPage({ params }) {
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
  // Edita quem administra a própria capela, ou um coordenador escalado como
  // participante — quem só vê, sem nenhum dos dois, cai de volta pro
  // detalhe, igual já acontece ao tentar salvar.
  if (celebration.capelaId !== user.capelaId && !isParticipantCoordinator(user, celebration)) {
    redirect(`/celebracoes/${id}`);
  }

  const [capelas, members] = await Promise.all([listManagedCapelas(user), listMembers(user)]);
  const participantOptions = sortByOwnCapelaFirst(members, user.capelaId).map((member) => ({
    id: member.id,
    name: member.name,
    capelaName: member.capela?.name ?? null,
    ownCapela: member.capelaId === user.capelaId,
  }));

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <Link href={`/celebracoes/${id}`}>← {celebration.title}</Link>
          </p>
          <h1>Editar evento</h1>
        </div>
      </div>
      <CelebrationForm celebration={celebration} capelas={capelas} participantOptions={participantOptions} />
    </>
  );
}
