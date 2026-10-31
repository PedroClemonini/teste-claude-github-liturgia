'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ASSIGNABLE_ROLES, roleLabel } from '@/domain/auth/roles.js';

/**
 * Equipe do coral. O coordenador pode promover ou rebaixar integrantes da
 * própria capela ali mesmo na lista; o administrador edita tudo (inclusive
 * capela) numa tela dedicada, aberta pelo link "Editar" — por isso a lista
 * dele mostra capela e papel só como texto, sem seletor embutido.
 *
 * `member.editable === false` esconde o seletor do coordenador mesmo com
 * `canManage` — usado para integrantes de outra capela, que ele só consulta.
 *
 * `filterOptions` (+ `activeFilter`/`filterAction`) mostra um filtro de
 * capela compacto acima da tabela — só quando há mais de uma opção.
 *
 * @param {{members: object[], canManage: boolean, currentUserId: string, canMoveCapela?: boolean, filterOptions?: {id: string, name: string}[], activeFilter?: string, filterAction?: string}} props
 */
export function MemberList({
  members,
  canManage,
  currentUserId,
  canMoveCapela = false,
  filterOptions = [],
  activeFilter = '',
  filterAction = '',
}) {
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

  const remover = async (member) => {
    if (!window.confirm(`Remover ${member.name} da equipe? Essa ação não pode ser desfeita.`)) return;
    setBusyId(member.id);
    setError(null);

    const response = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
    setBusyId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível remover o integrante.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="card table-wrap">
      {filterOptions.length > 1 && (
        <form
          method="get"
          action={filterAction}
          className="row"
          style={{ gap: '0.3rem', marginBottom: '0.75rem', justifyContent: 'flex-end' }}
        >
          <select
            name="capela"
            defaultValue={activeFilter}
            aria-label="Filtrar por capela"
            className="select--compact"
          >
            <option value="">todas as capelas</option>
            {filterOptions.map((capela) => (
              <option key={capela.id} value={capela.id}>
                {capela.name}
              </option>
            ))}
          </select>
          <button className="btn btn--small btn--ghost" type="submit">
            Filtrar
          </button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Voz / instrumento</th>
            <th>Capela</th>
            <th>Papel</th>
            {canManage && <th></th>}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const podeGerenciar = canManage && member.role !== 'ADMINISTRADOR' && member.editable !== false;
            return (
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
                <td>{member.capelaName ?? '—'}</td>
                <td>
                  {podeGerenciar && !canMoveCapela ? (
                    <select
                      aria-label={`Papel de ${member.name}`}
                      value={member.role}
                      disabled={busyId === member.id}
                      onChange={(event) => trocar(member.id, event.target.value)}
                    >
                      {ASSIGNABLE_ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    roleLabel(member.role)
                  )}
                </td>
                {canManage && (
                  <td>
                    <span className="row" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                      {canMoveCapela && podeGerenciar && (
                        <Link className="btn btn--small btn--ghost" href={`/admin/membros/${member.id}/editar`}>
                          Editar
                        </Link>
                      )}
                      {podeGerenciar && member.id !== currentUserId && (
                        <button
                          type="button"
                          className="btn btn--small btn--danger"
                          disabled={busyId === member.id}
                          onClick={() => remover(member)}
                        >
                          Remover
                        </button>
                      )}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
