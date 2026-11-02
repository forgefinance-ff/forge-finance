// Estilos compartilhados dos gráficos (recharts). Usam variáveis CSS do
// globals.css, então eixos, grade e tooltip acompanham o tema claro/escuro.
import type { CSSProperties } from "react";

export const chartGridStroke = "var(--chart-grid)";
export const chartAxisStroke = "var(--chart-axis)";

export const chartAxisTick = { fill: "var(--chart-axis)", fontSize: 11 };

export const chartTooltipStyle: CSSProperties = {
  background: "var(--surface-solid)",
  border: "1px solid var(--line-strong)",
  borderRadius: 14,
  fontSize: 12,
  color: "var(--text)",
  boxShadow: "var(--shadow-panel)",
};

export const chartTooltipLabelStyle: CSSProperties = { color: "var(--text-muted)" };

export const chartTooltipItemStyle: CSSProperties = { color: "var(--text)" };

export const chartCursorFill = "rgba(168,85,247,0.08)";
