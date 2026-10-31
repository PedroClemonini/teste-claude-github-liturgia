import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';
import { LoginForm } from '@/components/LoginForm.jsx';

export const metadata = { title: 'Entrar · Coral Litúrgico' };

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(isAdministrator(user) ? '/admin' : '/agenda');

  return (
    <div className="auth">
      <div className="card">
        <h1>Entrar</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>
          Use o e-mail cadastrado na equipe do coral.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
