/**
 * Limpeza de séries de preço (função pura).
 *
 * O Yahoo às vezes devolve um ponto isolado errado (ex.: dólar a 4,96 num
 * mês em que todos os outros dias estão perto de 5,37). Um ponto é descartado
 * só quando foge mais que `jump` dos vizinhos E os vizinhos concordam entre
 * si: um movimento real (os pontos seguintes acompanham) é mantido.
 */
export type PricePoint = { open: number; high: number; low: number; close: number };

export function dropIsolatedSpikes<T extends PricePoint>(points: T[], jump = 0.05, agree = 0.025): T[] {
  if (points.length < 4) return points;
  const diff = (a: number, b: number) => Math.abs(a / b - 1);

  const bad = points.map((p, i) => {
    const prev = points[i - 1]?.close;
    const next = points[i + 1]?.close;
    if (prev != null && next != null) {
      return diff(p.close, prev) > jump && diff(p.close, next) > jump && diff(prev, next) < agree;
    }
    // Pontas: compara com os dois vizinhos do mesmo lado.
    const [a, b] = prev == null ? [next, points[i + 2]?.close] : [prev, points[i - 2]?.close];
    return a != null && b != null && diff(p.close, a) > jump && diff(a, b) < agree;
  });

  return points
    .filter((_, i) => !bad[i])
    .map((p) => {
      // Pavio absurdo num candle bom (abertura/máxima/mínima erradas): limita ao corpo.
      const open = diff(p.open, p.close) > jump * 2 ? p.close : p.open;
      const top = Math.max(open, p.close);
      const bottom = Math.min(open, p.close);
      return {
        ...p,
        open,
        high: Math.max(top, Math.min(p.high, top * (1 + jump * 2))),
        low: Math.min(bottom, Math.max(p.low, bottom * (1 - jump * 2))),
      };
    });
}
