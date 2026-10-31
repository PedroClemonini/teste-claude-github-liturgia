'use client';

/**
 * Painel de capelas: gerar/revogar convites de cadastro (num popup, com o
 * link pronto pra copiar) e, só para o administrador, fundar capelas novas.
 * Não existe envio de e-mail — o link é copiado e compartilhado manualmente.
 */
import { useEffect, useState } from 'react';

function formatarData(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** @param {{capelas: {id: string, name: string}[], canFound?: boolean}} props */
export function CapelaManagerPanel({ capelas: capelasIniciais, canFound = false }) {
  const [capelas, setCapelas] = useState(capelasIniciais);
  const [invitesByCapela, setInvitesByCapela] = useState({});
  const [newCapelaName, setNewCapelaName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [modalCapelaId, setModalCapelaId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  useEffect(() => {
    const faltando = capelas.filter((capela) => !(capela.id in invitesByCapela));
    if (faltando.length === 0) return;

    faltando.forEach(async (capela) => {
      const response = await fetch(`/api/invites?capelaId=${capela.id}`);
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setInvitesByCapela((current) => ({ ...current, [capela.id]: body.invites }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capelas]);

  const criarCapela = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError(null);

    const response = await fetch('/api/capelas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: newCapelaName }),
    });
    const body = await response.json().catch(() => ({}));
    setCreating(false);

    if (!response.ok) {
      setError(body.error ?? 'Não foi possível criar a capela.');
      return;
    }
    setCapelas((current) => [...current, body.capela]);
    setNewCapelaName('');
  };

  const gerarConvite = async (capelaId) => {
    setError(null);
    const response = await fetch('/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ capelaId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? 'Não foi possível gerar o convite.');
      return;
    }
    setInvitesByCapela((current) => ({
      ...current,
      [capelaId]: [body.invite, ...(current[capelaId] ?? [])],
    }));
    setModalCapelaId(capelaId);
  };

  const revogarConvite = async (capelaId, id) => {
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
    setInvitesByCapela((current) => ({
      ...current,
      [capelaId]: (current[capelaId] ?? []).filter((invite) => invite.id !== id),
    }));
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

  const modalCapela = capelas.find((capela) => capela.id === modalCapelaId) ?? null;
  const pendentesDoModal = (invitesByCapela[modalCapelaId] ?? []).filter((invite) => !invite.usedAt);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Capelas</h2>
      {error && <p className="error">{error}</p>}

      {capelas.map((capela) => {
        const pendentes = (invitesByCapela[capela.id] ?? []).filter((invite) => !invite.usedAt);

        return (
          <div key={capela.id} className="row" style={{ justifyContent: 'space-between', padding: '0.4rem 0' }}>
            <strong>{capela.name}</strong>
            <span className="row" style={{ gap: '0.4rem' }}>
              {pendentes.length > 0 && (
                <button
                  type="button"
                  className="btn btn--small btn--ghost"
                  onClick={() => setModalCapelaId(capela.id)}
                >
                  Convites pendentes ({pendentes.length})
                </button>
              )}
              <button type="button" className="btn btn--small" onClick={() => gerarConvite(capela.id)}>
                Gerar link de convite
              </button>
            </span>
          </div>
        );
      })}

      {canFound && (
        <form onSubmit={criarCapela} className="row" style={{ marginTop: '0.5rem' }}>
          <input
            value={newCapelaName}
            onChange={(event) => setNewCapelaName(event.target.value)}
            placeholder="Nome da nova capela"
            style={{ flex: 1 }}
          />
          <button className="btn btn--small" type="submit" disabled={creating || !newCapelaName.trim()}>
            {creating ? 'Criando…' : 'Criar capela'}
          </button>
        </form>
      )}

      {modalCapela && (
        <div className="modal-backdrop" onClick={() => setModalCapelaId(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Convites — {modalCapela.name}</h3>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setModalCapelaId(null)}
                aria-label="Fechar"
              >
                Fechar
              </button>
            </div>

            {pendentesDoModal.length === 0 ? (
              <p className="empty">Nenhum convite pendente para esta capela.</p>
            ) : (
              pendentesDoModal.map((invite) => (
                <div key={invite.id} className="field" style={{ marginBottom: '1rem' }}>
                  <span>Expira em {formatarData(invite.expiresAt)}</span>
                  <input readOnly value={linkDoConvite(invite.token)} onFocus={(event) => event.target.select()} />
                  <div className="row" style={{ marginTop: '0.4rem' }}>
                    <button type="button" className="btn btn--small" onClick={() => copiarLink(invite)}>
                      {copiedId === invite.id ? 'Copiado!' : 'Copiar link'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--small btn--danger"
                      disabled={revokingId === invite.id}
                      onClick={() => revogarConvite(modalCapela.id, invite.id)}
                    >
                      Revogar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
