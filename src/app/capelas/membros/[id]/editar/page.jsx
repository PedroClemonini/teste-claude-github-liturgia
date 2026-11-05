import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isOwner } from '@/domain/auth/roles.js';
import { findUserById, toMemberRow } from '@/services/users.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { MemberEditForm } from '@/components/MemberEditForm.jsx';
import { Breadcrumbs } from '@/components/Breadcrumbs.jsx';

export const metadata = { title: 'Editar integrante · Coral Litúrgico' };

export default async function EditarMembroPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isOwner(user)) redirect('/agenda');

  const { id } = await params;
  const [member, capelas] = await Promise.all([findUserById(id), listManagedCapelas(user)]);
  if (!member) notFound();

  return (
    <>
      <Breadcrumbs items={[{ href: '/capelas', label: 'Capelas' }, { label: member.name }]} />
      <div className="ui-page-head">
        <h1 className="ui-heading-large">Editar {member.name}</h1>
      </div>
      <MemberEditForm member={toMemberRow(member)} capelas={capelas} />
    </>
  );
}
