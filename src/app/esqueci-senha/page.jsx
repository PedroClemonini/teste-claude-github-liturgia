import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm.jsx';

export const metadata = { title: 'Esqueci minha senha · Coral Litúrgico' };

export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) redirect(isAdministrator(user) ? '/admin' : '/agenda');

  return (
    <div className="auth">
      <div className="card">
        <h1>Esqueci minha senha</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>
          Informe o e-mail da sua conta. Enviaremos um link para você escolher
          uma senha nova.
        </p>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
