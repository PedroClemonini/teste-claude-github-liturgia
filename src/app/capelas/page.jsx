import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isOwner } from '@/domain/auth/roles.js';
import { capelaOptions, membersOf, NO_CAPELA, pickCapela } from '@/domain/team/capela-selection.js';
import { listMembers, toMemberRow } from '@/services/users.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { MemberList } from '@/components/MemberList.jsx';
import { CapelaToolbar } from '@/components/CapelaToolbar.jsx';

export const metadata = { title: 'Capelas · Coral Litúrgico' };

/** Área do dono: cria capelas e adiciona pessoas em cada uma. */
export default async function CapelasPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isOwner(user)) redirect('/agenda');

  const query = await searchParams;
  const [todos, capelas] = await Promise.all([listMembers(user), listManagedCapelas(user)]);

  const options = capelaOptions(todos, capelas);
  // Sem esta opção, quem saiu de todas as capelas sumiria da tela.
  if (membersOf(todos, NO_CAPELA).length > 0) options.push({ value: NO_CAPELA, label: 'Sem capela' });

  const selected = pickCapela(options, query?.capela, user.capelaIds);
  const capelaId = selected === NO_CAPELA ? null : selected;
  const members = selected ? membersOf(todos, selected) : [];

  return (
    <>
      <div className="ui-page-head">
        <div>
          <h1 className="ui-heading-large">Capelas</h1>
          <p className="ui-subtle">
            {capelas.length} {capelas.length === 1 ? 'capela' : 'capelas'} · {todos.length}{' '}
            {todos.length === 1 ? 'pessoa' : 'pessoas'} no total.
          </p>
        </div>
      </div>

      <CapelaToolbar
        options={options}
        selected={selected}
        basePath="/capelas"
        canManage={capelaId !== null}
        canCreate
      />

      {selected ? (
        <MemberList
          members={members.map(toMemberRow)}
          capelaId={capelaId}
          currentUserId={user.id}
          canManage={capelaId !== null}
          canEditAccounts
        />
      ) : (
        <p className="ui-subtle">Nenhuma capela criada ainda.</p>
      )}
    </>
  );
}
