import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { RegisterForm } from '@/components/RegisterForm.jsx';

export const metadata = { title: 'Criar conta · Coral Litúrgico' };

export default async function RegisterPage() {
  if (await currentUser()) redirect('/agenda');

  return (
    <div className="auth">
      <div className="card">
        <h1>Criar conta</h1>
        <RegisterForm />
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
          Já faz parte da equipe? <Link href="/entrar">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
