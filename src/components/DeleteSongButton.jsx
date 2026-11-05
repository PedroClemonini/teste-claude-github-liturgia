'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ActionMenu } from './ActionMenu.jsx';
import { ConfirmModal } from './ConfirmModal.jsx';
import { Icon } from './Icon.jsx';

/** @param {{songId: string, title: string}} props */
export function DeleteSongButton({ songId, title }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const excluir = async () => {
    setConfirming(false);
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
    setBusy(false);

    if (!response.ok) {
      // 409: a música ainda está no roteiro de algum evento — o servidor explica.
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? 'Não foi possível remover a música.');
      return;
    }
    router.push('/acervo');
    router.refresh();
  };

  return (
    <>
      <ActionMenu
        label="Mais ações"
        triggerClassName="ui-button ui-button--subtle ui-button--icon"
        items={[{ label: busy ? 'Removendo…' : 'Remover do acervo', icon: 'delete', danger: true, onSelect: () => setConfirming(true) }]}
      >
        <Icon name="show-more-vertical" />
      </ActionMenu>
      {error && (
        <p className="ui-error" role="alert">
          {error}
        </p>
      )}
      {confirming && (
        <ConfirmModal
          title={`Remover "${title}" do acervo?`}
          confirmLabel="Remover do acervo"
          onConfirm={excluir}
          onCancel={() => setConfirming(false)}
        >
          Essa ação não pode ser desfeita.
        </ConfirmModal>
      )}
    </>
  );
}
