'use client';

import { Modal } from './Modal.jsx';

/**
 * Confirmação de ação destrutiva, no lugar do window.confirm do navegador.
 *
 * @param {{
 *   title: string,
 *   confirmLabel: string,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 *   children: import('react').ReactNode,
 * }} props
 */
export function ConfirmModal({ title, confirmLabel, onConfirm, onCancel, children }) {
  return (
    <Modal title={title} onClose={onCancel} role="alertdialog" hideClose>
      <p className="ui-modal__body">{children}</p>
      <div className="ui-modal__actions">
        <button type="button" className="ui-button ui-button--subtle" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="ui-button ui-button--danger-bold" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
