'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

const VAZIO = { name: '', email: '', password: '', voiceOrInstrument: '' };

/** Sugestões comuns; o campo aceita qualquer texto. */
const SUGESTOES = [
  'Soprano',
  'Contralto',
  'Tenor',
  'Baixo',
  'Violão',
  'Teclado',
  'Flauta',
  'Violino',
  'Percussão',
];

export function RegisterForm() {
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
      body: JSON.stringify(form),
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
    <form onSubmit={submit} noValidate>
      <label className="field">
        <span>Nome</span>
        <input name="name" autoComplete="name" required value={form.name} onChange={update('name')} />
        {errors.name && <p className="error">{errors.name}</p>}
      </label>

      <label className="field">
        <span>E-mail</span>
        <input type="email" name="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        {errors.email && <p className="error">{errors.email}</p>}
      </label>

      <label className="field">
        <span>Senha (mínimo 8 caracteres)</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
        />
        {errors.password && <p className="error">{errors.password}</p>}
      </label>

      <label className="field">
        <span>Voz ou instrumento</span>
        <input
          name="voiceOrInstrument"
          list="sugestoes-voz"
          required
          placeholder="Soprano, Violão…"
          value={form.voiceOrInstrument}
          onChange={update('voiceOrInstrument')}
        />
        <datalist id="sugestoes-voz">
          {SUGESTOES.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        {errors.voiceOrInstrument && <p className="error">{errors.voiceOrInstrument}</p>}
      </label>

      {message && <p className="error">{message}</p>}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Cadastrando…' : 'Criar conta'}
      </button>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-soft)', marginTop: '0.6rem' }}>
        Novas contas entram como Músico. Um coordenador pode promover integrantes na tela Equipe.
      </p>
    </form>
  );
}
