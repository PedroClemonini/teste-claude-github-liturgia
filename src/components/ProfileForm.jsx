'use client';

/** A própria pessoa muda nome, e-mail, senha e instrumentos. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InstrumentPicker } from './InstrumentPicker.jsx';

/** @param {{user: {name: string, email: string, instruments: string[]}}} props */
export function ProfileForm({ user }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    instruments: user.instruments,
    currentPassword: '',
    newPassword: '',
  });
  const [savedEmail, setSavedEmail] = useState(user.email);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const pedeSenhaAtual = form.email.trim().toLowerCase() !== savedEmail || form.newPassword !== '';

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    setSaved(false);

    const response = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível salvar.');
      return;
    }

    setForm({ ...form, email: body.user.email, currentPassword: '', newPassword: '' });
    setSavedEmail(body.user.email);
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="ui-form" noValidate>
      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Dados pessoais</h2>
        <div className="grid-2">
          <label className="ui-field">
            <span>
              Nome <em aria-hidden="true">*</em>
            </span>
            <input
              autoComplete="name"
              required
              value={form.name}
              onChange={update('name')}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <p className="ui-error">{errors.name}</p>}
          </label>

          <label className="ui-field">
            <span>
              E-mail <em aria-hidden="true">*</em>
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="ui-error">{errors.email}</p>}
          </label>
        </div>
      </section>

      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Vozes e instrumentos</h2>
        <InstrumentPicker
          hideLegend
          value={form.instruments}
          onChange={(instruments) => setForm({ ...form, instruments })}
          error={errors.instruments}
        />
      </section>

      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Senha</h2>
        <div className="grid-2">
          <label className="ui-field">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={update('newPassword')}
              aria-invalid={Boolean(errors.newPassword)}
              placeholder="Deixe em branco para manter a atual"
            />
            {errors.newPassword && <p className="ui-error">{errors.newPassword}</p>}
          </label>

          {pedeSenhaAtual && (
            <div>
              <label className="ui-field">
                <span>
                  Senha atual <em aria-hidden="true">*</em>
                </span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.currentPassword}
                  onChange={update('currentPassword')}
                  aria-invalid={Boolean(errors.currentPassword)}
                  aria-describedby="senha-atual-ajuda"
                />
              </label>
              <p className="ui-helper" id="senha-atual-ajuda">
                Necessária para trocar o e-mail ou a senha.
              </p>
              {errors.currentPassword && <p className="ui-error">{errors.currentPassword}</p>}
            </div>
          )}
        </div>
      </section>

      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}
      {saved && (
        <p className="ui-success" role="status">
          Perfil atualizado.
        </p>
      )}

      <div className="ui-form__actions">
        <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}
