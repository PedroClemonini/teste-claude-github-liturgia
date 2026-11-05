import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { listMembers } from '@/services/users.js';
import { toParticipantOptions } from '@/services/celebrations.js';
import { CelebrationForm } from '@/components/CelebrationForm.jsx';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';

export const metadata = { title: 'Novo evento · Coral Litúrgico' };

export default async function NovaCelebracaoPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isCoordinator(user)) redirect('/agenda');

  const [capelas, members] = await Promise.all([listManagedCapelas(user), listMembers(user)]);
  const participantOptions = toParticipantOptions(members, user.capelaIds);

  return (
    <>
      <Breadcrumbs items={[{ href: '/agenda', label: 'Agenda' }, { label: 'Novo evento' }]} />
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Novo evento</h1>
          <p className="ui-subtle">Depois de criar, monte o roteiro musical momento a momento.</p>
        </div>
      </div>
      <CelebrationForm capelas={capelas} participantOptions={participantOptions} />
    </>
  );
}
