import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listMembers } from '@/services/users.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { MemberList } from '@/components/MemberList.jsx';

export const metadata = { title: 'Equipe · Coral Litúrgico' };

export default async function EquipePage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');

  const members = await listMembers(user);

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Equipe</h1>
          <p>
            {members.length} {members.length === 1 ? 'integrante' : 'integrantes'} no coral.
            {isCoordinator(user) ? ' Você pode alterar o papel de cada um.' : ''}
          </p>
        </div>
      </div>

      <MemberList
        members={members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          voiceOrInstrument: member.voiceOrInstrument,
          role: member.role,
        }))}
        canManage={isCoordinator(user)}
        currentUserId={user.id}
      />
    </>
  );
}
