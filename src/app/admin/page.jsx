import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';
import { listAllMembers } from '@/services/users.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { MemberList } from '@/components/MemberList.jsx';
import { CapelaManagerPanel } from '@/components/CapelaManagerPanel.jsx';

export const metadata = { title: 'Administração · Coral Litúrgico' };

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isAdministrator(user)) redirect('/agenda');

  const [members, capelas] = await Promise.all([listAllMembers(user), listManagedCapelas(user)]);

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Administração</h1>
          <p>
            {capelas.length} {capelas.length === 1 ? 'capela' : 'capelas'} · {members.length}{' '}
            {members.length === 1 ? 'integrante' : 'integrantes'} no total.
          </p>
        </div>
      </div>

      <CapelaManagerPanel capelas={capelas} canFound />

      <MemberList
        members={members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          voiceOrInstrument: member.voiceOrInstrument,
          role: member.role,
          capelaId: member.capelaId,
          capelaName: member.capela?.name ?? null,
        }))}
        canManage
        canMoveCapela
        currentUserId={user.id}
      />
    </>
  );
}
