'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

/** @param {{token: string}} props */
export function ResetPasswordForm({ token }) {
  const router = useRouter();
  const [form, setForm] = useState({ password: '', confirmacao: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    setMessage(null);

    if (form.password !== form.confirmacao) {
      setErrors({ confirmacao: 'As duas senhas não são iguais.' });
      return;
    }

    setBusy(true);
    const response = await fetch('/api/password-reset/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: form.password }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setBusy(false);
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível redefinir a senha.');
      return;
    }

    // Senha trocada: já entra com ela, sem obrigar a digitar de novo.
    const result = await signIn('credentials', {
      email: body.email,
      password: form.password,
      redirect: false,
    });
    setBusy(false);

    if (result?.error) {
      // Improvável, mas se o login automático falhar a senha já está trocada.
      setMessage('Senha redefinida. Entre com a nova senha.');
      router.push('/entrar');
      return;
    }
    router.push('/agenda');
    router.refresh();
  };

  return (
    <form className="ui-form ui-stack ui-auth__form" onSubmit={submit} noValidate>
      <div>
        <label className="ui-field">
          <span>Nova senha</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            autoFocus
            value={form.password}
            onChange={update('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="nova-senha-ajuda"
          />
        </label>
        <p className="ui-helper" id="nova-senha-ajuda">
          Mínimo de 8 caracteres.
        </p>
        {errors.password && <p className="ui-error">{errors.password}</p>}
      </div>
      <label className="ui-field">
        <span>Repita a nova senha</span>
        <input
          type="password"
          name="confirmacao"
          autoComplete="new-password"
          required
          value={form.confirmacao}
          onChange={update('confirmacao')}
          aria-invalid={Boolean(errors.confirmacao)}
        />
        {errors.confirmacao && <p className="ui-error">{errors.confirmacao}</p>}
      </label>
      {errors.token && <p className="ui-error">{errors.token}</p>}
      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}
      <button
        className="ui-button ui-button--primary"
        type="submit"
        disabled={busy || !form.password || !form.confirmacao}
      >
        {busy ? 'Salvando…' : 'Salvar nova senha'}
      </button>
      <p className="ui-auth__link">
        <Link href="/entrar">Voltar para o login</Link>
      </p>
    </form>
  );
}
