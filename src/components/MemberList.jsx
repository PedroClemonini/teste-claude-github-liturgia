'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, roleLabel } from '@/domain/auth/roles.js';

/**
 * Equipe do coral. O coordenador pode promover ou rebaixar integrantes; o
 * músico apenas consulta quem canta ou toca o quê.
 *
 * @param {{members: object[], canManage: boolean, currentUserId: string}} props
 */
export function MemberList({ members, canManage, currentUserId }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const trocar = async (id, role) => {
    setBusyId(id);
    setError(null);

    const response = await fetch(`/api/members/${id}/role`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setBusyId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível alterar o papel.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="card table-wrap">
      {error && <p className="error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Voz / instrumento</th>
            <th>Papel</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                {member.name}
                {member.id === currentUserId && (
                  <span className="tag" style={{ marginLeft: '0.4rem' }}>
                    você
                  </span>
                )}
                <br />
                <small style={{ color: 'var(--text-soft)' }}>{member.email}</small>
              </td>
              <td>{member.voiceOrInstrument}</td>
              <td>
                {canManage ? (
                  <select
                    aria-label={`Papel de ${member.name}`}
                    value={member.role}
                    disabled={busyId === member.id}
                    onChange={(event) => trocar(member.id, event.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  roleLabel(member.role)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
