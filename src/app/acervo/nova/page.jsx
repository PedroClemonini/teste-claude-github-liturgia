import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator, isCoordinator } from '@/domain/auth/roles.js';
import { SongForm } from '@/components/SongForm.jsx';

export const metadata = { title: 'Nova música · Coral Litúrgico' };

export default async function NovaMusicaPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (isAdministrator(user)) redirect('/admin');
  if (!isCoordinator(user)) redirect('/acervo');

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Nova música</h1>
          <p>Digite a cifra à esquerda e confira o alinhamento à direita.</p>
        </div>
      </div>
      <SongForm />
    </>
  );
}
