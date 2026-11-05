'use client';

import { Modal } from './Modal.jsx';

/**
 * Confirmação de ação, no lugar do window.confirm do navegador. O botão é
 * vermelho, salvo com `safe`, para o que não destrói nada.
 *
 * @param {{
 *   title: string,
 *   confirmLabel: string,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 *   safe?: boolean,
 *   children: import('react').ReactNode,
 * }} props
 */
export function ConfirmModal({ title, confirmLabel, onConfirm, onCancel, safe = false, children }) {
  return (
    <Modal title={title} onClose={onCancel} role="alertdialog" hideClose>
      <p className="ui-modal__body">{children}</p>
      <div className="ui-modal__actions">
        <button type="button" className="ui-button ui-button--subtle" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={`ui-button ${safe ? 'ui-button--primary' : 'ui-button--danger-bold'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
