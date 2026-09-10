import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/session.js';
import { LoginForm } from '@/components/LoginForm.jsx';

export const metadata = { title: 'Entrar · Coral Litúrgico' };

export default async function LoginPage() {
  if (await currentUser()) redirect('/agenda');

  return (
    <div className="auth">
      <div className="card">
        <h1>Entrar</h1>
        <p style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>
          Use o e-mail cadastrado na equipe do coral.
        </p>
        <LoginForm />
        <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
          Ainda não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
