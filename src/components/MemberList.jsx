'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ASSIGNABLE_ROLES, roleLabel } from '@/domain/auth/roles.js';
import { ActionMenu } from './ActionMenu.jsx';
import { ConfirmModal } from './ConfirmModal.jsx';
import { Icon } from './Icon.jsx';

/**
 * Integrantes de uma capela, com o papel de cada um nela. O papel é só texto, e
 * as ações ficam num menu, sempre com confirmação: assim rolar a lista no
 * celular nunca muda permissões nem apaga nada por acidente.
 *
 * `canManage` libera trocar o papel e tirar da capela; `canEditAccounts` (só o
 * dono) libera editar e apagar a conta.
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
    setPending({
      title: `Tornar ${member.name} ${roleLabel(role)}?`,
      body: 'Isso muda o que a pessoa pode fazer nesta capela.',
      confirmLabel: `Tornar ${roleLabel(role)}`,
      safe: true,
      run: () =>
        executar(
          member.id,
          `/api/members/${member.id}/role`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ capelaId, role }),
          },
          'Não foi possível alterar o papel.',
        ),
    });

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
              const outroPapel = vinculo?.role === 'COORDENADOR' ? 'MUSICO' : 'COORDENADOR';
              const acoes = [
                canEditAccounts && {
                  label: 'Editar',
                  icon: 'edit',
                  href: `/capelas/membros/${member.id}/editar`,
                },
                canManage &&
                  vinculo && {
                    label: `Tornar ${roleLabel(outroPapel)}`,
                    icon: 'people-group',
                    onSelect: () => trocarPapel(member, outroPapel),
                  },
                podeTirar && {
                  label: 'Tirar da capela',
                  icon: 'person-remove',
                  onSelect: () => tirarDaCapela(member, vinculo.capelaName),
                },
                podeApagar && {
                  label: 'Apagar conta',
                  icon: 'delete',
                  danger: true,
                  onSelect: () => apagarConta(member),
                },
              ].filter(Boolean);
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
                      <span
                        className="ui-lozenge"
                        data-type={vinculo?.role === 'COORDENADOR' ? 'MISSA_COMUM' : undefined}
                      >
                        {vinculo ? roleLabel(vinculo.role) : '—'}
                      </span>
                    </td>
                  )}
                  {temAcoes && (
                    <td className="ui-team__actions">
                      {acoes.length > 0 && (
                        <ActionMenu
                          label={`Ações de ${member.name}`}
                          items={acoes}
                          triggerClassName="ui-button ui-button--subtle ui-button--icon"
                        >
                          <Icon name="show-more-vertical" />
                        </ActionMenu>
                      )}
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
          safe={pending.safe}
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
