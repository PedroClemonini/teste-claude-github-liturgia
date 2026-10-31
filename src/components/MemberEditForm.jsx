'use client';

/**
 * Edição completa de um integrante — só o administrador chega aqui.
 * Deixar a senha em branco mantém a senha atual.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ASSIGNABLE_ROLES } from '@/domain/auth/roles.js';

/** @param {{member: object, capelas: {id: string, name: string}[]}} props */
export function MemberEditForm({ member, capelas }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: member.name,
    email: member.email,
    voiceOrInstrument: member.voiceOrInstrument,
    capelaId: member.capelaId ?? capelas[0]?.id ?? '',
    role: member.role,
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

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

    router.push('/admin');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card" noValidate>
      <div className="grid-2">
        <label className="field">
          <span>Nome</span>
          <input required value={form.name} onChange={update('name')} />
          {errors.name && <p className="error">{errors.name}</p>}
        </label>

        <label className="field">
          <span>E-mail</span>
          <input type="email" required value={form.email} onChange={update('email')} />
          {errors.email && <p className="error">{errors.email}</p>}
        </label>
      </div>

      <div className="grid-2">
        <label className="field">
          <span>Voz ou instrumento</span>
          <input required value={form.voiceOrInstrument} onChange={update('voiceOrInstrument')} />
          {errors.voiceOrInstrument && <p className="error">{errors.voiceOrInstrument}</p>}
        </label>

        <label className="field">
          <span>Capela</span>
          <select value={form.capelaId} onChange={update('capelaId')}>
            {capelas.map((capela) => (
              <option key={capela.id} value={capela.id}>
                {capela.name}
              </option>
            ))}
          </select>
          {errors.capelaId && <p className="error">{errors.capelaId}</p>}
        </label>
      </div>

      <div className="grid-2">
        <label className="field">
          <span>Papel</span>
          <select value={form.role} onChange={update('role')}>
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
          {errors.role && <p className="error">{errors.role}</p>}
        </label>

        <label className="field">
          <span>Nova senha (opcional)</span>
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            placeholder="Deixe em branco para manter a atual"
          />
          {errors.password && <p className="error">{errors.password}</p>}
        </label>
      </div>

      {message && <p className="error">{message}</p>}

      <button className="btn" type="submit" disabled={busy}>
        {busy ? 'Salvando…' : 'Salvar alterações'}
      </button>
    </form>
  );
}
