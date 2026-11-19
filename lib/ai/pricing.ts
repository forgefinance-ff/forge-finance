/** Campos de uso que a API da Anthropic devolve em cada resposta. */
export type TokenUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

type ModelPrice = {
  /** Dólares por 1 milhão de tokens. */
  input: number;
  output: number;
  cacheRead: number;
  /** Acima deste total de entrada, o preço do pedido inteiro é multiplicado. */
  longPrompt?: { aboveTokens: number; multiplier: number };
};

/** Preços da API da Anthropic. Atualize aqui quando a tabela mudar. */
const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheRead: 0.01,
    longPrompt: { aboveTokens: 100_000, multiplier: 5 },
  },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-fable-5-2": { input: 8, output: 40, cacheRead: 0.2 },
};

/** Gravar no cache de 5 minutos custa 1,25 vez o preço de entrada. */
const CACHE_WRITE_MULTIPLIER = 1.25;

export type UsageCost = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Custo em milionésimos de dólar. */
  costUsdMicros: number;
  /** false quando o modelo não está na tabela: os tokens contam, o custo fica zerado. */
  priced: boolean;
};

function tokens(value: number | null | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Math.round(Number(value)) : 0;
}

export function calculateUsageCost(model: string, usage: TokenUsage): UsageCost {
  const inputTokens = tokens(usage.input_tokens);
  const outputTokens = tokens(usage.output_tokens);
  const cacheReadTokens = tokens(usage.cache_read_input_tokens);
  const cacheWriteTokens = tokens(usage.cache_creation_input_tokens);
  const counts = { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens };

  const price = MODEL_PRICES[model];
  if (!price) return { ...counts, costUsdMicros: 0, priced: false };

  const totalInput = inputTokens + cacheReadTokens + cacheWriteTokens;
  const multiplier =
    price.longPrompt && totalInput > price.longPrompt.aboveTokens ? price.longPrompt.multiplier : 1;

  // Preço por milhão de tokens × tokens = milionésimos de dólar.
  const cost =
    inputTokens * price.input +
    outputTokens * price.output +
    cacheReadTokens * price.cacheRead +
    cacheWriteTokens * price.input * CACHE_WRITE_MULTIPLIER;

  return { ...counts, costUsdMicros: Math.round(cost * multiplier), priced: true };
}
