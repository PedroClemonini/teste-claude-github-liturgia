import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isCoordinator } from '@/domain/auth/roles.js';
import { CelebrationForm } from '@/components/CelebrationForm.jsx';

export const metadata = { title: 'Nova celebração · Coral Litúrgico' };

export default async function NovaCelebracaoPage() {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (!isCoordinator(user)) redirect('/agenda');

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Nova celebração</h1>
          <p>Depois de criar, monte o roteiro musical momento a momento.</p>
        </div>
      </div>
      <CelebrationForm />
    </>
  );
}
