import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listMembers, toMemberRow } from '@/services/users.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { canManageCapela, isCoordinator } from '@/domain/auth/roles.js';
import { capelaOptions, membersOf, pickCapela } from '@/domain/team/capela-selection.js';
import { MemberList } from '@/components/MemberList.jsx';
import { CapelaToolbar } from '@/components/CapelaToolbar.jsx';

export const metadata = { title: 'Equipe · Coral Litúrgico' };

export default async function EquipePage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const query = await searchParams;
  const [todos, capelas] = await Promise.all([
    listMembers(user),
    isCoordinator(user) ? listManagedCapelas(user) : [],
  ]);

  const options = capelaOptions(todos, capelas);
  // Abre onde a pessoa pode agir: as capelas que coordena vêm primeiro.
  const preferred = [...capelas.map((capela) => capela.id), ...user.capelaIds];
  const selected = pickCapela(options, query?.capela, preferred);
  const members = membersOf(todos, selected);
  const canManage = selected !== null && canManageCapela(user, { id: selected });

  return (
    <>
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Equipe</h1>
          <p className="ui-subtle">
            {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
            {selected && !canManage && isCoordinator(user) ? ' — você só consulta esta capela.' : ''}
          </p>
        </div>
      </div>

      <CapelaToolbar options={options} selected={selected} basePath="/equipe" canManage={canManage} />

      {selected ? (
        <MemberList
          members={members.map(toMemberRow)}
          capelaId={selected}
          currentUserId={user.id}
          canManage={canManage}
        />
      ) : (
        <p className="ui-subtle">Você ainda não faz parte de nenhuma capela.</p>
      )}
    </>
  );
}
