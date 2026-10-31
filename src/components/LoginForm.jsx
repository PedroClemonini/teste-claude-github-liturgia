'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await signIn('credentials', { ...form, redirect: false });
    setBusy(false);

    if (result?.error) {
      setError('E-mail ou senha não conferem.');
      return;
    }
    router.push('/agenda');
    router.refresh();
  };

  return (
    <form onSubmit={submit} noValidate>
      <label className="field">
        <span>E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
      <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>
        <Link href="/esqueci-senha">Esqueci minha senha</Link>
      </p>
    </form>
  );
}
