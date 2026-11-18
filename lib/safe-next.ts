/**
 * Só aceita caminhos internos (evita redirecionar para outro site depois do login).
 *
 * Não basta olhar o começo do texto: o parser de URL apaga TAB/LF/CR e trata
 * "\" como "/", então "/\t/site.com" virava "//site.com". Por isso recusa
 * caracteres de controle e barra invertida e confere a origem depois de
 * interpretar a URL.
 */
const BASE = "http://ff.invalid";

export function safeNext(value: string | null | undefined): string | null {
  if (!value || value.length > 2048) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return null;
  }
  if (url.origin !== BASE) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
