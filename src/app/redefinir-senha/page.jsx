import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { checkResetToken } from '@/services/passwordReset.js';
import { ResetPasswordForm } from '@/components/ResetPasswordForm.jsx';

export const metadata = { title: 'Nova senha · Coral Litúrgico' };

export default async function ResetPasswordPage({ searchParams }) {
  const user = await currentUser();
  if (user) redirect('/agenda');

  const query = await searchParams;
  const token = typeof query?.token === 'string' ? query.token : '';
  // Conferimos o token antes de mostrar os campos: melhor avisar que o link
  // venceu do que deixar a pessoa escolher uma senha para nada.
  const { valid, reason } = await checkResetToken(token);

  return (
    <div className="ui-auth">
      <h1 className="ui-heading-large">Escolher nova senha</h1>
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <p className="ui-section-message ui-section-message--danger" role="alert">
            {reason}
          </p>
          <p className="ui-auth__link">
            <Link href="/esqueci-senha">Pedir um novo link</Link>
          </p>
        </>
      )}
    </div>
  );
}
