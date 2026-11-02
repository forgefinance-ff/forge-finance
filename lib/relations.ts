/**
 * O Supabase devolve relações "muitos para um" (ex.: transactions -> categories)
 * como OBJETO em runtime, mas a tipagem às vezes infere ARRAY.
 * Este helper aceita os dois formatos e devolve sempre um único item (ou null).
 */
export function firstRelation<T extends object>(
  value: T | T[] | null | undefined
): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
