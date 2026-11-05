'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [enviado, setEnviado] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const response = await fetch('/api/password-reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível enviar o e-mail. Tente novamente.');
      return;
    }
    setEnviado(body.message);
  };

  // Depois do envio o formulário sai da tela: repetir o pedido não ajuda, e
  // a mensagem é a mesma exista ou não a conta (não revelamos quem é cadastrado).
  if (enviado) {
    return (
      <>
        <p className="ui-success" role="status">
          {enviado}
        </p>
        <p className="ui-auth__link">
          <Link href="/entrar">Voltar para o login</Link>
        </p>
      </>
    );
  }

  return (
    <form className="ui-form ui-stack ui-auth__form" onSubmit={submit} noValidate>
      <label className="ui-field">
        <span>E-mail cadastrado</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <p className="ui-error">{errors.email}</p>}
      </label>
      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}
      <button className="ui-button ui-button--primary" type="submit" disabled={busy || !email.trim()}>
        {busy ? 'Enviando…' : 'Enviar link de redefinição'}
      </button>
      <p className="ui-auth__link">
        <Link href="/entrar">Voltar para o login</Link>
      </p>
    </form>
  );
}
