'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ASSIGNABLE_ROLES, roleLabel } from '@/domain/auth/roles.js';
import { ConfirmModal } from './ConfirmModal.jsx';
import { Icon } from './Icon.jsx';
import { Select } from './Select.jsx';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role.id, label: role.label }));

/**
 * Integrantes de uma capela, com o papel de cada um nela. Com `canManage`, quem
 * vê pode trocar o papel ou tirar a pessoa dali; sem isso, só consulta.
 *
 * `canEditAccounts` (só o dono) mostra as ações de editar e apagar a conta.
 * `capelaId` nulo é a lista de contas sem nenhuma capela.
 *
 * @param {{members: object[], capelaId: string|null, currentUserId: string, canManage?: boolean, canEditAccounts?: boolean}} props
 */
export function MemberList({ members, capelaId, currentUserId, canManage = false, canEditAccounts = false }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);

  /** Faz a chamada, trava a linha enquanto isso e atualiza a tela. */
  const executar = async (id, url, init, falha) => {
    setBusyId(id);
    setError(null);
    const response = await fetch(url, init);
    setBusyId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? falha);
      return;
    }
    router.refresh();
  };

  const temAcoes = canManage || canEditAccounts;

  const trocarPapel = (member, role) =>
    executar(
      member.id,
      `/api/members/${member.id}/role`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ capelaId, role }),
      },
      'Não foi possível alterar o papel.',
    );

  const tirarDaCapela = (member, capelaName) =>
    setPending({
      title: `Tirar ${member.name} de ${capelaName}?`,
      body: 'A conta continua existindo, assim como os vínculos com outras capelas.',
      confirmLabel: 'Tirar da capela',
      run: () =>
        executar(
          member.id,
          `/api/members/${member.id}/capela?capelaId=${encodeURIComponent(capelaId)}`,
          { method: 'DELETE' },
          'Não foi possível remover o integrante.',
        ),
    });

  const apagarConta = (member) =>
    setPending({
      title: `Apagar a conta de ${member.name}?`,
      body: 'A pessoa perde o acesso e sai de todas as capelas. Essa ação não pode ser desfeita.',
      confirmLabel: 'Apagar conta',
      run: () =>
        executar(member.id, `/api/members/${member.id}`, { method: 'DELETE' }, 'Não foi possível apagar a conta.'),
    });

  return (
    <section className="ui-card ui-team" aria-label="Integrantes">
      {error && (
        <p className="ui-error" role="alert">
          {error}
        </p>
      )}

      {members.length === 0 ? (
        <div className="ui-empty">
          <Icon name="people-group" size={32} />
          <p>{capelaId ? 'Nenhum integrante nesta capela.' : 'Nenhuma conta sem capela.'}</p>
        </div>
      ) : (
        <table className="ui-table">
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Vozes e instrumentos</th>
              {capelaId && <th scope="col">Papel</th>}
              {temAcoes && (
                <th scope="col">
                  <span className="ui-visually-hidden">Ações</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const vinculo = member.memberships.find((membership) => membership.capelaId === capelaId);
              const podeTirar = canManage && vinculo && (member.id !== currentUserId || canEditAccounts);
              const podeApagar = canEditAccounts && member.id !== currentUserId && !member.isOwner;
              return (
                <tr key={member.id}>
                  <td>
                    <span className="ui-person">
                      <span className="ui-avatar" aria-hidden="true">
                        {member.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="ui-person__text">
                        <span className="ui-person__name">
                          {member.name}
                          {member.id === currentUserId && <span className="ui-lozenge">você</span>}
                          {member.isOwner && (
                            <span className="ui-lozenge" data-type="MISSA_COMUM">
                              dono
                            </span>
                          )}
                        </span>
                        <span className="ui-person__email">{member.email}</span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Vozes e instrumentos">{member.instruments.join(', ') || '—'}</td>
                  {capelaId && (
                    <td data-label="Papel">
                      {vinculo && canManage ? (
                        <Select
                          compact
                          label={`Papel de ${member.name}`}
                          value={vinculo.role}
                          options={ROLE_OPTIONS}
                          disabled={busyId === member.id}
                          onChange={(role) => trocarPapel(member, role)}
                        />
                      ) : (
                        <span className="ui-lozenge">{vinculo ? roleLabel(vinculo.role) : '—'}</span>
                      )}
                    </td>
                  )}
                  {temAcoes && (
                    <td>
                      <span className="ui-button-group ui-team__actions">
                        {canEditAccounts && (
                          <Link className="ui-button" href={`/capelas/membros/${member.id}/editar`}>
                            <Icon name="edit" />
                            Editar
                          </Link>
                        )}
                        {podeTirar && (
                          <button
                            type="button"
                            className="ui-button ui-button--subtle"
                            aria-label={`Tirar ${member.name} da capela`}
                            disabled={busyId === member.id}
                            onClick={() => tirarDaCapela(member, vinculo.capelaName)}
                          >
                            Tirar da capela
                          </button>
                        )}
                        {podeApagar && (
                          <button
                            type="button"
                            className="ui-button ui-button--danger"
                            disabled={busyId === member.id}
                            onClick={() => apagarConta(member)}
                          >
                            <Icon name="delete" />
                            Apagar conta
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
      )}

      {pending && (
        <ConfirmModal
          title={pending.title}
          confirmLabel={pending.confirmLabel}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setPending(null);
            pending.run();
          }}
        >
          {pending.body}
        </ConfirmModal>
      )}
    </section>
  );
}
