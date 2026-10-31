import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { listMembers } from '@/services/users.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { MemberList } from '@/components/MemberList.jsx';
import { CapelaManagerPanel } from '@/components/CapelaManagerPanel.jsx';

export const metadata = { title: 'Equipe · Coral Litúrgico' };

export default async function EquipePage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');

  const query = await searchParams;
  const filtroCapela = query?.capela ?? '';

  const todos = await listMembers(user);
  const capelas = isCoordinator(user) ? await listManagedCapelas(user) : [];

  // Opções do filtro: todas as capelas que aparecem entre os integrantes visíveis.
  const opcoesCapela = [
    ...new Map(
      todos
        .filter((member) => member.capelaId && member.capela?.name)
        .map((member) => [member.capelaId, member.capela.name]),
    ),
  ].sort((a, b) => a[1].localeCompare(b[1]));

  const members = filtroCapela ? todos.filter((member) => member.capelaId === filtroCapela) : todos;

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Equipe</h1>
          <p>
            {members.length} {members.length === 1 ? 'integrante' : 'integrantes'}
            {isCoordinator(user)
              ? ' — você gerencia e convida só a sua capela.'
              : ' na sua capela.'}
          </p>
        </div>
      </div>

      {isCoordinator(user) && <CapelaManagerPanel capelas={capelas} />}

      <MemberList
        members={members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          voiceOrInstrument: member.voiceOrInstrument,
          role: member.role,
          capelaName: member.capela?.name ?? null,
          editable: member.capelaId === user.capelaId,
        }))}
        canManage={isCoordinator(user)}
        currentUserId={user.id}
        filterOptions={opcoesCapela.map(([id, name]) => ({ id, name }))}
        activeFilter={filtroCapela}
        filterAction="/equipe"
      />
    </>
  );
}
