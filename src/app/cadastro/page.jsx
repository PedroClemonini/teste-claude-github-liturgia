import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { RegisterForm } from '@/components/RegisterForm.jsx';

export const metadata = { title: 'Criar conta · Coral Litúrgico' };

export default async function RegisterPage({ searchParams }) {
  const user = await currentUser();
  if (user) redirect('/agenda');

  const query = await searchParams;
  const token = typeof query?.token === 'string' ? query.token : null;

  return (
    <div className="ui-auth ui-auth--wide">
      <h1 className="ui-heading-large">Criar conta</h1>
      {token ? (
        <RegisterForm inviteToken={token} />
      ) : (
        <p className="ui-section-message">
          O cadastro é feito por convite. Peça ao coordenador da sua capela o link de convite.
        </p>
      )}
      <p className="ui-auth__link">
        Já faz parte da equipe? <Link href="/entrar">Entrar</Link>
      </p>
    </div>
  );
}
