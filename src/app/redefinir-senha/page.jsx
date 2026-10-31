import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';
import { checkResetToken } from '@/services/passwordReset.js';
import { ResetPasswordForm } from '@/components/ResetPasswordForm.jsx';

export const metadata = { title: 'Nova senha · Coral Litúrgico' };

export default async function ResetPasswordPage({ searchParams }) {
  const user = await currentUser();
  if (user) redirect(isAdministrator(user) ? '/admin' : '/agenda');

  const query = await searchParams;
  const token = typeof query?.token === 'string' ? query.token : '';
  // Conferimos o token antes de mostrar os campos: melhor avisar que o link
  // venceu do que deixar a pessoa escolher uma senha para nada.
  const { valid, reason } = await checkResetToken(token);

  return (
    <div className="auth">
      <div className="card">
        <h1>Escolher nova senha</h1>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <>
            <p className="error">{reason}</p>
            <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
              <Link href="/esqueci-senha">Pedir um novo link</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
