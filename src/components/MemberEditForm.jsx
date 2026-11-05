'use client';

/**
 * Edição completa de um integrante — só o dono chega aqui. Marque as capelas
 * da pessoa e o papel em cada uma. Deixar a senha em branco mantém a atual.
 */
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ASSIGNABLE_ROLES } from '@/domain/auth/roles.js';
import { InstrumentPicker } from './InstrumentPicker.jsx';
import { Select } from './Select.jsx';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role.id, label: role.label }));

/** @param {{member: object, capelas: {id: string, name: string}[]}} props */
export function MemberEditForm({ member, capelas }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: member.name,
    email: member.email,
    instruments: member.instruments,
    memberships: member.memberships.map(({ capelaId, role }) => ({ capelaId, role })),
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const vinculo = (capelaId) => form.memberships.find((item) => item.capelaId === capelaId);

  const alternarCapela = (capelaId) =>
    setForm({
      ...form,
      memberships: vinculo(capelaId)
        ? form.memberships.filter((item) => item.capelaId !== capelaId)
        : [...form.memberships, { capelaId, role: 'MUSICO' }],
    });

  const trocarPapel = (capelaId, role) =>
    setForm({
      ...form,
      memberships: form.memberships.map((item) => (item.capelaId === capelaId ? { ...item, role } : item)),
    });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);

    const response = await fetch(`/api/members/${member.id}`, {
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

    router.push('/capelas');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="ui-form" noValidate>
      <section className="ui-card ui-form__section">
        <h2 className="ui-heading-small">Dados</h2>
        <div className="grid-2">
          <label className="ui-field">
            <span>
              Nome <em aria-hidden="true">*</em>
            </span>
            <input required value={form.name} onChange={update('name')} aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="ui-error">{errors.name}</p>}
          </label>

          <label className="ui-field">
            <span>
              E-mail <em aria-hidden="true">*</em>
            </span>
            <input type="email" required value={form.email} onChange={update('email')} aria-invalid={Boolean(errors.email)} />
            {errors.email && <p className="ui-error">{errors.email}</p>}
          </label>

          <label className="ui-field">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              aria-invalid={Boolean(errors.password)}
              placeholder="Deixe em branco para manter a atual"
            />
            {errors.password && <p className="ui-error">{errors.password}</p>}
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
        <h2 className="ui-heading-small">Capelas</h2>
        <p className="ui-helper">Marque as capelas da pessoa e o papel em cada uma.</p>
        <ul className="ui-list">
          {capelas.map((capela) => {
            const atual = vinculo(capela.id);
            return (
              <li key={capela.id} className="ui-capela">
                <label className="ui-checkbox">
                  <input type="checkbox" checked={Boolean(atual)} onChange={() => alternarCapela(capela.id)} />
                  {capela.name}
                </label>
                {atual && (
                  <Select
                    compact
                    label={`Papel em ${capela.name}`}
                    value={atual.role}
                    options={ROLE_OPTIONS}
                    onChange={(role) => trocarPapel(capela.id, role)}
                  />
                )}
              </li>
            );
          })}
        </ul>
        {errors.memberships && <p className="ui-error">{errors.memberships}</p>}
      </section>

      {message && (
        <p className="ui-error" role="alert">
          {message}
        </p>
      )}

      <div className="ui-form__actions">
        <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <Link className="ui-button ui-button--subtle" href="/capelas">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
