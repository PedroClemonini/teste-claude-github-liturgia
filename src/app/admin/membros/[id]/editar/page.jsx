import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';
import { findUserById } from '@/services/users.js';
import { listManagedCapelas } from '@/services/capelas.js';
import { MemberEditForm } from '@/components/MemberEditForm.jsx';

export const metadata = { title: 'Editar integrante · Coral Litúrgico' };

export default async function EditarMembroPage({ params }) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isAdministrator(user)) redirect('/agenda');

  const { id } = await params;
  const [member, capelas] = await Promise.all([findUserById(id), listManagedCapelas(user)]);
  if (!member || member.role === 'ADMINISTRADOR') notFound();

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            <Link href="/admin">← Administração</Link>
          </p>
          <h1>Editar {member.name}</h1>
        </div>
      </div>
      <MemberEditForm member={member} capelas={capelas} />
    </>
  );
}
