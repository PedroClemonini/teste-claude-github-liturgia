'use client';

/**
 * "Exportar PDF" aqui é o print-to-PDF nativo do navegador: sem servidor de
 * PDF, sem dependência nova. Só garante que toda cifra apareça aberta na
 * hora de imprimir, mesmo as que o músico deixou fechadas na tela.
 */
export function ExportScriptPdfButton() {
  const exportar = () => {
    const itens = Array.from(document.querySelectorAll('.script-item'));
    const fechados = itens.filter((item) => !item.open);
    fechados.forEach((item) => item.setAttribute('open', ''));

    const restaurar = () => {
      fechados.forEach((item) => item.removeAttribute('open'));
      window.removeEventListener('afterprint', restaurar);
    };
    window.addEventListener('afterprint', restaurar);

    window.print();
  };

  return (
    <button type="button" className="btn btn--ghost" onClick={exportar}>
      Exportar cifras (PDF)
    </button>
  );
}
