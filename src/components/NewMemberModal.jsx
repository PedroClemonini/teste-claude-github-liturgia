'use client';

/**
 * Dono cadastra uma pessoa direto numa capela, com nome, e-mail e senha. Se o
 * e-mail já tem conta, ela só ganha o vínculo com a capela.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ASSIGNABLE_ROLES } from '@/domain/auth/roles.js';
import { Modal } from './Modal.jsx';
import { Select } from './Select.jsx';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role.id, label: role.label }));

const VAZIO = { name: '', email: '', password: '', role: 'MUSICO' };

/** @param {{capela: {id: string, name: string}, onClose: () => void}} props */
export function NewMemberModal({ capela, onClose }) {
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

    const response = await fetch('/api/members', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, capelaId: capela.id }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setErrors(body.details ?? {});
      setMessage(body.error ?? 'Não foi possível criar o usuário.');
      return;
    }

    router.refresh();
    onClose();
  };

  return (
    <Modal title={`Novo usuário — ${capela.name}`} onClose={onClose}>
      <form className="ui-form ui-stack" onSubmit={submit} noValidate>
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

        <div>
          <label className="ui-field">
            <span>
              Senha <em aria-hidden="true">*</em>
            </span>
            <input
              type="password"
              autoComplete="new-password"
              required
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

        <Select
          label="Papel nesta capela"
          value={form.role}
          options={ROLE_OPTIONS}
          onChange={(role) => setForm({ ...form, role })}
        />

        {message && (
          <p className="ui-error" role="alert">
            {message}
          </p>
        )}

        <div className="ui-modal__actions">
          <button type="button" className="ui-button ui-button--subtle" onClick={onClose}>
            Cancelar
          </button>
          <button className="ui-button ui-button--primary" type="submit" disabled={busy}>
            {busy ? 'Criando…' : 'Criar usuário'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
