import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { isAdministrator } from '@/domain/auth/roles.js';
import { RegisterForm } from '@/components/RegisterForm.jsx';

export const metadata = { title: 'Criar conta · Coral Litúrgico' };

export default async function RegisterPage({ searchParams }) {
  const user = await currentUser();
  if (user) redirect(isAdministrator(user) ? '/admin' : '/agenda');

  const query = await searchParams;
  const token = typeof query?.token === 'string' ? query.token : null;

  return (
    <div className="auth">
      <div className="card">
        <h1>Criar conta</h1>
        {token ? (
          <RegisterForm inviteToken={token} />
        ) : (
          <p>
            O cadastro é feito por convite. Peça ao coordenador da sua capela o
            link de convite.
          </p>
        )}
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
          Já faz parte da equipe? <Link href="/entrar">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
