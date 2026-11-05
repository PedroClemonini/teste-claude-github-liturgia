'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { InstrumentPicker } from './InstrumentPicker.jsx';

const VAZIO = { name: '', email: '', password: '', instruments: [] };

/** @param {{inviteToken: string}} props */
export function RegisterForm({ inviteToken }) {
  const router = useRouter();
  const [form, setForm] = useState(VAZIO);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, inviteToken }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setBusy(false);
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível concluir o cadastro.');
      return;
    }

    // Cadastro feito: já entra com as credenciais recém-criadas.
    await signIn('credentials', { email: form.email, password: form.password, redirect: false });
    setBusy(false);
    router.push('/agenda');
    router.refresh();
  };

  return (
    <form className="ui-form ui-stack ui-auth__form" onSubmit={submit} noValidate>
      <label className="ui-field">
        <span>Nome</span>
        <input
          name="name"
          autoComplete="name"
          required
          value={form.name}
          onChange={update('name')}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <p className="ui-error">{errors.name}</p>}
      </label>

      <label className="ui-field">
        <span>E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={update('email')}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <p className="ui-error">{errors.email}</p>}
      </label>

      <div>
        <label className="ui-field">
          <span>Senha</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={update('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="senha-ajuda"
          />
        </label>
        <p className="ui-helper" id="senha-ajuda">
          Mínimo de 8 caracteres. Se já tem conta em outra capela, use o mesmo e-mail e a mesma senha.
        </p>
        {errors.password && <p className="ui-error">{errors.password}</p>}
      </div>

      <InstrumentPicker
        value={form.instruments}
        onChange={(instruments) => setForm({ ...form, instruments })}
        error={errors.instruments}
      />

      {errors.inviteToken && <p className="ui-error">{errors.inviteToken}</p>}
      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}

      <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
        {busy ? 'Cadastrando…' : 'Criar conta'}
      </button>
      <p className="ui-helper">
        Você vai entrar como Músico na capela que te convidou. Um coordenador pode promover
        integrantes na tela Equipe.
      </p>
    </form>
  );
}
