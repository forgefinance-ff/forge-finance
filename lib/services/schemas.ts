/** Validações (zod) compartilhadas pelos serviços, com mensagens em português. */
import { z } from "zod";

import { isRealDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";

/** Aceita número ou texto ("1.234,56", "1234.56"). */
const numeric = z.union([z.number(), z.string()]).transform((value) =>
  typeof value === "number" ? value : parseAmount(value)
);

export const positiveAmount = (label = "O valor") =>
  numeric
    .refine((v) => Number.isFinite(v) && v > 0, `${label} deve ser maior que zero.`)
    .refine((v) => v <= 100_000_000, `${label} está alto demais.`)
    .transform((v) => Math.round(v * 100) / 100);

export const nonNegativeAmount = (label = "O valor") =>
  numeric
    .refine((v) => Number.isFinite(v) && v >= 0, `${label} não pode ser negativo.`)
    .transform((v) => Math.round(v * 100) / 100);

/** Pode ser negativo (ex.: saldo inicial de uma conta). */
export const anyAmount = (label = "O valor") =>
  numeric
    .refine((v) => Number.isFinite(v), `${label} é inválido.`)
    .transform((v) => Math.round(v * 100) / 100);

/** Vazio vira null. */
export const optionalAmount = (inner: z.ZodType<number>) =>
  z
    .union([z.literal(""), z.null(), z.undefined(), z.number(), z.string()])
    .transform((v, ctx) => {
      if (v === "" || v === null || v === undefined) return null;
      const parsed = inner.safeParse(v);
      if (!parsed.success) {
        ctx.addIssue({ code: "custom", message: parsed.error.issues[0].message });
        return z.NEVER;
      }
      return parsed.data;
    });

export const dateString = (message = "Informe uma data válida.") =>
  z.string().trim().refine(isRealDate, message);

export const optionalDate = (message = "Informe uma data válida.") =>
  z
    .union([z.literal(""), z.null(), z.undefined(), z.string()])
    .transform((v, ctx) => {
      if (!v) return null;
      if (!isRealDate(v.trim())) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return v.trim();
    });

export const id = (message = "Item não encontrado.") => z.string().uuid(message);

export const optionalId = z
  .union([z.literal(""), z.null(), z.undefined(), z.string().uuid("Item inválido.")])
  .transform((v) => v || null);

export const text = (label: string, max: number) =>
  z
    .string({ message: `Informe ${label}.` })
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `${label[0].toUpperCase()}${label.slice(1)} pode ter no máximo ${max} caracteres.`);

export const optionalText = (max: number, label = "O texto") =>
  z
    .union([z.null(), z.undefined(), z.string()])
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= max, `${label} pode ter no máximo ${max} caracteres.`)
    .transform((v) => v || null);

export const hexColor = z
  .union([z.null(), z.undefined(), z.string()])
  .transform((v) => (v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null));
