import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { listMembers } from '@/services/users.js';
import { sortByOwnCapelaFirst } from '@/services/celebrations.js';
import { CelebrationForm } from '@/components/CelebrationForm.jsx';

export const metadata = { title: 'Novo evento · Coral Litúrgico' };

export default async function NovaCelebracaoPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');
  if (!isCoordinator(user)) redirect('/agenda');

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
          <h1>Novo evento</h1>
          <p>Depois de criar, monte o roteiro musical momento a momento.</p>
        </div>
      </div>
      <CelebrationForm capelas={capelas} participantOptions={participantOptions} />
    </>
  );
}
