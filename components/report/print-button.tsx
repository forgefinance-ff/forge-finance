"use client";

export function PrintButton() {
  return (
    <button type="button" className="rpt-btn rpt-btn-primary" onClick={() => window.print()}>
      Baixar PDF / Imprimir
    </button>
  );
}
