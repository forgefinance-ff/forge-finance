"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { getAssetQuote, getIndices } from "@/lib/market/quotes";
import { assetCurrency, isAssetClass, normalizeTicker } from "@/lib/market/symbols";
import { appCtx } from "@/lib/services/app";
import { errorMessage, ServiceError } from "@/lib/services/context";
import {
  createInvestment,
  createMarketInvestment,
  deleteInvestment,
  recordTrade,
  updateInvestmentValue,
} from "@/lib/services/registry";

function refresh() {
  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
}

export async function createInvestmentAction(formData: FormData) {
  await createInvestment(await appCtx(), {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    invested_amount: String(formData.get("invested_amount") ?? ""),
    current_value: String(formData.get("current_amount") ?? ""),
    institution: String(formData.get("institution") ?? ""),
  });

  refresh();
}

export async function deleteInvestmentAction(formData: FormData) {
  await deleteInvestment(await appCtx(), String(formData.get("id")));

  refresh();
}

/** Dólar do dia para ativos do exterior (erro claro se o provedor estiver fora). */
async function usdRateFor(assetClass: string): Promise<number> {
  if (!isAssetClass(assetClass) || assetCurrency(assetClass) !== "USD") return 1;
  const { dolar } = await getIndices();
  if (!dolar?.price) throw new ServiceError("Não consegui a cotação do dólar agora. Tente de novo em instantes.");
  return dolar.price;
}

export async function createMarketInvestmentAction(formData: FormData): Promise<ActionResult> {
  try {
    const assetClass = String(formData.get("asset_class") ?? "");
    if (!isAssetClass(assetClass)) throw new ServiceError("Escolha o tipo do ativo.");

    const ticker = normalizeTicker(String(formData.get("ticker") ?? ""), assetClass);
    if (!ticker) {
      throw new ServiceError(
        assetClass === "cripto"
          ? "Código inválido. Use, por exemplo, BTC ou ETH."
          : assetClass === "exterior"
            ? "Código inválido. Use, por exemplo, AAPL ou VOO."
            : "Código inválido. Use, por exemplo, PETR4, ITUB4 ou HGLG11."
      );
    }

    const quote = await getAssetQuote({ ticker, assetClass });
    if (!quote) {
      throw new ServiceError(`Não encontrei a cotação de ${ticker}. Confira o código e o tipo do ativo.`);
    }

    const ctx = await appCtx();
    await createMarketInvestment(
      ctx,
      {
        ticker,
        asset_class: assetClass,
        name: quote.name ?? ticker,
        institution: String(formData.get("institution") ?? ""),
      },
      {
        side: "buy",
        quantity: String(formData.get("quantity") ?? ""),
        price: String(formData.get("price") ?? ""),
        fees: String(formData.get("fees") ?? ""),
        traded_at: String(formData.get("traded_at") ?? ""),
        fx_rate: await usdRateFor(assetClass),
      },
      { price: quote.price, currency: quote.currency }
    );

    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível salvar o ativo.") };
  }
}

export async function recordTradeAction(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await appCtx();
    await recordTrade(ctx, String(formData.get("investment_id") ?? ""), {
      side: String(formData.get("side")) === "sell" ? "sell" : "buy",
      quantity: String(formData.get("quantity") ?? ""),
      price: String(formData.get("price") ?? ""),
      fees: String(formData.get("fees") ?? ""),
      traded_at: String(formData.get("traded_at") ?? ""),
      fx_rate: await usdRateFor(String(formData.get("asset_class") ?? "")),
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível registrar a operação.") };
  }
}

export async function updateInvestmentValueAction(formData: FormData): Promise<ActionResult> {
  try {
    await updateInvestmentValue(
      await appCtx(),
      String(formData.get("id") ?? ""),
      String(formData.get("current_value") ?? "")
    );
    refresh();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível atualizar o valor.") };
  }
}

/** Confere o código e devolve nome e preço para o formulário mostrar antes de salvar. */
export async function lookupAssetAction(
  rawTicker: string,
  assetClass: string
): Promise<
  | { ok: true; ticker: string; name: string | null; price: number; currency: string; changePct: number | null }
  | { ok: false; error: string }
> {
  try {
    await appCtx();
    if (!isAssetClass(assetClass)) return { ok: false, error: "Escolha o tipo do ativo." };
    const ticker = normalizeTicker(rawTicker, assetClass);
    if (!ticker) return { ok: false, error: "Código inválido para esse tipo de ativo." };
    const quote = await getAssetQuote({ ticker, assetClass });
    if (!quote) return { ok: false, error: `Não encontrei ${ticker}.` };
    return {
      ok: true,
      ticker,
      name: quote.name,
      price: quote.price,
      currency: quote.currency,
      changePct: quote.changePct,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível consultar agora.") };
  }
}
