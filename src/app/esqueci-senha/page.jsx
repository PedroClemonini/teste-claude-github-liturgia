import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm.jsx';

export const metadata = { title: 'Esqueci minha senha · Coral Litúrgico' };

export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) redirect('/agenda');

  return (
    <div className="ui-auth">
      <h1 className="ui-heading-large">Esqueci minha senha</h1>
      <p className="ui-subtle">
        Informe o e-mail da sua conta. Enviaremos um link para você escolher uma senha nova.
      </p>
      <ForgotPasswordForm />
    </div>
  );
}
