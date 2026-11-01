/**
 * Configuração do provedor de IA (somente servidor).
 * A chave NUNCA deve ser exposta ao navegador: use apenas variáveis sem o
 * prefixo NEXT_PUBLIC_.
 *
 *   ANTHROPIC_API_KEY  -> chave do provedor (obrigatória para ativar a IA)
 *   AI_MODEL           -> opcional; modelo a usar (padrão: claude-haiku-5-5)
 */
export type AiStatus = {
  configured: boolean;
  model: string;
};

export function getAiStatus(): AiStatus {
  return {
    configured: Boolean(process.env.ANTHROPIC_API_KEY),
    model: process.env.AI_MODEL || "claude-haiku-5-5",
  };
}
