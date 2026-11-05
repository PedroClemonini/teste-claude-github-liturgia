import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { LoginForm } from '@/components/LoginForm.jsx';

export const metadata = { title: 'Entrar · Coral Litúrgico' };

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect('/agenda');

  return (
    <div className="ui-auth">
      <h1 className="ui-heading-large">Entrar</h1>
      <p className="ui-subtle">Use o e-mail cadastrado na equipe do coral.</p>
      <LoginForm />
    </div>
  );
}
