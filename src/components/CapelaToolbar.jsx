'use client';

/**
 * Barra da Equipe e da aba Capelas: um seletor de capela, que também cria capelas
 * para o dono, e um único botão para acrescentar pessoas à capela escolhida.
 * Não existe envio de e-mail — o link é copiado e compartilhado manualmente.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionMenu } from './ActionMenu.jsx';
import { Icon } from './Icon.jsx';
import { Modal } from './Modal.jsx';
import { NewMemberModal } from './NewMemberModal.jsx';
import { Select } from './Select.jsx';

/** Opção do seletor que abre a criação de capela, em vez de escolher uma. */
const NEW_CAPELA = 'nova-capela';

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * @param {{
 *   options: {value: string, label: string}[],
 *   selected: string|null,
 *   basePath: string,
 *   canManage?: boolean,
 *   canCreate?: boolean,
 * }} props `canManage` libera os convites da capela escolhida; `canCreate`
 * (só o dono) libera nova capela e novo usuário.
 */
export function CapelaToolbar({ options, selected, basePath, canManage = false, canCreate = false }) {
  const router = useRouter();
  const [invites, setInvites] = useState([]);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [newMemberOpen, setNewMemberOpen] = useState(false);
  const [newCapelaOpen, setNewCapelaOpen] = useState(false);

  const capela = options.find((option) => option.value === selected) ?? null;
  const pendentes = invites.filter((invite) => !invite.usedAt);

  useEffect(() => {
    setInvites([]);
    setError(null);
    if (!canManage || !selected) return undefined;

    let cancelado = false;
    fetch(`/api/invites?capelaId=${selected}`)
      .then((response) => (response.ok ? response.json() : { invites: [] }))
      .then((body) => {
        if (!cancelado) setInvites(body.invites);
      })
      .catch(() => {});
    // Trocar de capela rápido não pode deixar os convites da anterior na tela.
    return () => {
      cancelado = true;
    };
  }, [selected, canManage]);

  const gerarConvite = async () => {
    setError(null);
    const response = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capelaId: selected }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? 'Não foi possível gerar o convite.');
      return;
    }
    setInvites((current) => [body.invite, ...current]);
    setInvitesOpen(true);
  };

  const revogarConvite = async (id) => {
    if (revokingId) return;
    setRevokingId(id);
    setError(null);

    const response = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    setRevokingId(null);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível revogar o convite.');
      return;
    }
    setInvites((current) => current.filter((invite) => invite.id !== id));
  };

  const linkDoConvite = (token) => `${window.location.origin}/cadastro?token=${token}`;

  const copiarLink = async (invite) => {
    try {
      await navigator.clipboard.writeText(linkDoConvite(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId((current) => (current === invite.id ? null : current)), 2000);
    } catch {
      // Sem permissão de clipboard: o link continua visível pra copiar à mão.
    }
  };

  const personItems = [
    canCreate && { label: 'Criar usuário', icon: 'person-add', onSelect: () => setNewMemberOpen(true) },
    { label: 'Gerar link de convite', icon: 'link', onSelect: gerarConvite },
    pendentes.length > 0 && {
      label: `Convites pendentes (${pendentes.length})`,
      icon: 'people-group',
      onSelect: () => setInvitesOpen(true),
    },
  ].filter(Boolean);

  const selectOptions = canCreate
    ? [...options, { value: NEW_CAPELA, label: '+ Adicionar capela', action: true }]
    : options;

  const trocarCapela = (value) => {
    if (value === NEW_CAPELA) setNewCapelaOpen(true);
    else router.push(`${basePath}?capela=${encodeURIComponent(value)}`);
  };

  return (
    <div className="ui-toolbar">
      {options.length > 0 && (
        <div className="ui-toolbar__select">
          <Select compact label="Capela" value={selected ?? ''} options={selectOptions} onChange={trocarCapela} />
        </div>
      )}

      {options.length === 0 && canCreate && (
        <button type="button" className="ui-button ui-button--primary" onClick={() => setNewCapelaOpen(true)}>
          <Icon name="add" />
          Nova capela
        </button>
      )}

      {canManage && personItems.length === 1 && (
        <button type="button" className="ui-button ui-button--primary" onClick={personItems[0].onSelect}>
          <Icon name="add" />
          Adicionar pessoa
        </button>
      )}

      {canManage && personItems.length > 1 && (
        <ActionMenu label="Adicionar pessoa" items={personItems} triggerClassName="ui-button ui-button--primary">
          <Icon name="add" />
          Adicionar pessoa
        </ActionMenu>
      )}

      {error && (
        <p className="ui-error ui-toolbar__error" role="alert">
          {error}
        </p>
      )}

      {newMemberOpen && capela && (
        <NewMemberModal capela={{ id: capela.value, name: capela.label }} onClose={() => setNewMemberOpen(false)} />
      )}

      {newCapelaOpen && <NewCapelaModal basePath={basePath} onClose={() => setNewCapelaOpen(false)} />}

      {invitesOpen && capela && (
        <Modal title={`Convites — ${capela.label}`} onClose={() => setInvitesOpen(false)}>
          {pendentes.length === 0 ? (
            <div className="ui-empty">
              <p>Nenhum convite pendente para esta capela.</p>
            </div>
          ) : (
            <div className="ui-form">
              {pendentes.map((invite) => (
                <div key={invite.id} className="ui-invite">
                  <label className="ui-field">
                    <span>Expira em {formatarData(invite.expiresAt)}</span>
                    <input readOnly value={linkDoConvite(invite.token)} onFocus={(event) => event.target.select()} />
                  </label>
                  <div className="ui-button-group">
                    <button type="button" className="ui-button ui-button--primary" onClick={() => copiarLink(invite)}>
                      {copiedId === invite.id ? 'Copiado!' : 'Copiar link'}
                    </button>
                    <button
                      type="button"
                      className="ui-button ui-button--danger"
                      disabled={revokingId === invite.id}
                      onClick={() => revogarConvite(invite.id)}
                    >
                      Revogar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/** Cria a capela e já a deixa selecionada. */
function NewCapelaModal({ basePath, onClose }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const criar = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    const response = await fetch('/api/capelas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(body.details?.name ?? body.error ?? 'Não foi possível criar a capela.');
      return;
    }
    router.push(`${basePath}?capela=${body.capela.id}`);
    router.refresh();
    onClose();
  };

  return (
    <Modal title="Nova capela" onClose={onClose}>
      <form className="ui-form ui-stack" onSubmit={criar} noValidate>
        <label className="ui-field">
          <span>
            Nome <em aria-hidden="true">*</em>
          </span>
          <input required value={name} onChange={(event) => setName(event.target.value)} />
          {message && <p className="ui-error">{message}</p>}
        </label>
        <div className="ui-modal__actions">
          <button type="button" className="ui-button ui-button--subtle" onClick={onClose}>
            Cancelar
          </button>
          <button className="ui-button ui-button--primary" type="submit" disabled={busy || !name.trim()}>
            {busy ? 'Criando…' : 'Criar capela'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
