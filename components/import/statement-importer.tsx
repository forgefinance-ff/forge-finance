"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangleIcon, CheckCircle2Icon, FileUpIcon, Loader2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import {
  findExistingTransactions,
  importTransactions,
  type ExistingTransaction,
} from "@/app/actions/import";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import {
  detectColumns,
  readStatementFile,
  tableToRows,
  type ColumnMap,
  type StatementRow,
  type Table,
} from "@/lib/import/statement-parser";
import { KIND_LABEL } from "@/lib/movement-kinds";
import { cn } from "@/lib/utils";

type Props = {
  accounts: Account[];
  categories: Category[];
};

type ReviewRow = StatementRow & {
  id: number;
  include: boolean;
  type: "income" | "expense";
  categoryId: string;
  duplicate: boolean;
};

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500";

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function norm(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Sugere a categoria pelo nome que aparece na descrição; senão "Outros". */
function guessCategory(description: string, type: "income" | "expense", categories: Category[]) {
  const options = categories.filter((c) => c.type === type);
  const text = norm(description);

  const byName = options
    .filter((c) => c.name.length >= 4 && text.includes(norm(c.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (byName) return byName.id;

  const others = options.find(
    (c) => (!c.kind || c.kind === "regular") && norm(c.name) === "outros"
  );
  return others?.id ?? "";
}

export function StatementImporter({ accounts, categories }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState("");
  const [table, setTable] = useState<Table | null>(null);
  const [headerRow, setHeaderRow] = useState(-1);
  const [map, setMap] = useState<ColumnMap | null>(null);
  const [invert, setInvert] = useState(false);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);
  const [isReading, startReading] = useTransition();
  const [isImporting, startImporting] = useTransition();

  const columns = useMemo(() => {
    if (!table) return [];
    const width = Math.max(...table.slice(0, 30).map((r) => r.length), 0);
    const header = headerRow >= 0 ? table[headerRow] : [];
    return Array.from({ length: width }, (_, i) => header[i] || `Coluna ${i + 1}`);
  }, [table, headerRow]);

  const preview = useMemo(
    () => (table && map ? tableToRows(table, headerRow, map, invert).slice(0, 5) : []),
    [table, headerRow, map, invert]
  );

  function reset() {
    setFileName("");
    setTable(null);
    setMap(null);
    setRows(null);
    setError(null);
    setResult(null);
    setInvert(false);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function buildReview(parsed: StatementRow[]) {
    if (parsed.length === 0) {
      setError("Não encontrei lançamentos com data e valor nesse arquivo.");
      return;
    }

    const dates = parsed.map((r) => r.date).sort();
    let existing: ExistingTransaction[] = [];
    if (accountId) {
      existing = await findExistingTransactions(accountId, dates[0], dates[dates.length - 1]);
    }

    const pool = [...existing];
    const review: ReviewRow[] = parsed.map((row, index) => {
      const type = row.amount >= 0 ? "income" : "expense";
      const amount = Math.abs(row.amount);
      // Duplicado: mesma data, valor e tipo de algo que já está na conta.
      const match = pool.findIndex(
        (e) => e.date === row.date && e.type === type && Math.abs(e.amount - amount) < 0.005
      );
      if (match >= 0) pool.splice(match, 1);

      return {
        ...row,
        amount,
        id: index,
        type,
        duplicate: match >= 0,
        include: match < 0,
        categoryId: guessCategory(row.description, type, categories),
      };
    });

    setRows(review);
  }

  function handleFile(file: File) {
    reset();
    setFileName(file.name);

    startReading(async () => {
      try {
        const parsed = await readStatementFile(file);

        if (parsed.kind === "rows") {
          await buildReview(parsed.rows);
          return;
        }

        if (parsed.table.length === 0) {
          setError("O arquivo está vazio.");
          return;
        }

        const detected = detectColumns(parsed.table);
        setTable(parsed.table);
        setHeaderRow(detected.headerRow);
        setMap(detected.map);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
      }
    });
  }

  function confirmColumns() {
    if (!table || !map) return;
    setError(null);
    startReading(async () => {
      await buildReview(tableToRows(table, headerRow, map, invert));
    });
  }

  function updateRow(id: number, patch: Partial<ReviewRow>) {
    setRows((current) =>
      current?.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        // Trocou entrada/saída: a categoria antiga não serve mais.
        if (patch.type && patch.type !== row.type) {
          next.categoryId = guessCategory(next.description, patch.type, categories);
        }
        return next;
      }) ?? null
    );
  }

  function setAll(include: boolean) {
    setRows((current) => current?.map((row) => ({ ...row, include })) ?? null);
  }

  function setCategoryForSelected(type: "income" | "expense", categoryId: string) {
    setRows(
      (current) =>
        current?.map((row) =>
          row.include && row.type === type ? { ...row, categoryId } : row
        ) ?? null
    );
  }

  const selected = rows?.filter((row) => row.include) ?? [];
  const totalIn = selected.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalOut = selected.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const duplicates = rows?.filter((row) => row.duplicate).length ?? 0;

  function runImport() {
    if (!accountId) {
      setError("Escolha a conta do extrato.");
      return;
    }
    setError(null);

    startImporting(async () => {
      const response = await importTransactions(
        accountId,
        selected.map((row) => ({
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          category_id: row.categoryId,
        }))
      );

      if (!response.ok) {
        setError(response.error);
        return;
      }

      setResult({ created: response.created, failed: response.failed.length });
      if (response.failed.length) {
        toast.error(`${response.failed.length} lançamento(s) não foram importados.`);
      } else {
        toast.success(`${response.created} lançamento(s) importados.`);
      }
      setRows(null);
      setTable(null);
    });
  }

  const categoryOptions = (type: "income" | "expense") => {
    const list = categories.filter((c) => c.type === type);
    const regular = list.filter((c) => !c.kind || c.kind === "regular");
    const special = list.filter((c) => c.kind && c.kind !== "regular");
    return (
      <>
        <option value="">Sem categoria</option>
        <optgroup label={type === "income" ? "Receitas" : "Despesas"}>
          {regular.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </optgroup>
        {special.length > 0 && (
          <optgroup label="Aportes, empréstimos e reembolsos">
            {special.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name} ({KIND_LABEL[c.kind]})
              </option>
            ))}
          </optgroup>
        )}
      </>
    );
  };

  if (accounts.length === 0) {
    return (
      <section className="rounded-[22px] border border-dashed border-line-strong bg-surface p-8 text-center">
        <p className="font-semibold text-foreground">Cadastre uma conta primeiro</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Os lançamentos do extrato entram numa conta e ajustam o saldo dela.
        </p>
        <Link href="/contas" className="mt-4 inline-block text-sm font-medium text-brand-soft hover:underline">
          Ir para Contas
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Conta e arquivo */}
      <section className="grid gap-4 rounded-[22px] border border-line bg-surface p-6 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm text-text-soft">Conta do extrato</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className={inputClass}
            disabled={!!rows}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-sm text-text-soft">Arquivo (OFX, CSV ou XLSX)</span>
          <input
            ref={fileInput}
            type="file"
            accept=".ofx,.csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInput.current?.click()}
            disabled={isReading || isImporting}
          >
            {isReading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <FileUpIcon className="h-4 w-4" />}
            {fileName ? `Trocar arquivo (${fileName})` : "Escolher arquivo"}
          </Button>
        </div>

        <p className="text-xs text-faint md:col-span-2">
          Dica: no app ou site do banco, procure “Exportar extrato” e escolha OFX (melhor) ou
          planilha. Fatura de cartão costuma vir com compras positivas: use “Inverter sinais”.
        </p>
      </section>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <section className="flex flex-col items-start gap-3 rounded-[22px] border border-success/40 bg-success/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2Icon className="h-5 w-5 text-success" />
            {result.created} lançamento(s) importados
            {result.failed > 0 && `, ${result.failed} com erro`}.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Importar outro
            </Button>
            <Link
              href="/transacoes"
              className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-brand-soft hover:underline"
            >
              Ver transações
            </Link>
          </div>
        </section>
      )}

      {/* 2. Colunas (CSV / Excel) */}
      {table && map && !rows && (
        <section className="space-y-4 rounded-[22px] border border-line bg-surface p-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Confira as colunas</h2>
            <p className="text-sm text-muted-foreground">
              Detectamos as colunas automaticamente. Ajuste se algo estiver errado.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                ["date", "Data"],
                ["description", "Descrição"],
                ["amount", "Valor (com sinal)"],
                ["credit", "Ou: coluna de entradas"],
                ["debit", "Ou: coluna de saídas"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-xs font-medium text-faint">{label}</span>
                <select
                  value={map[key]}
                  onChange={(e) => setMap({ ...map, [key]: Number(e.target.value) })}
                  className={inputClass}
                >
                  <option value={-1}>—</option>
                  {columns.map((name, i) => (
                    <option key={i} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-text-soft">
            <input type="checkbox" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
            Inverter sinais (fatura de cartão: compras positivas viram saídas)
          </label>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-tint text-left text-xs uppercase tracking-wider text-faint">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Descrição</th>
                  <th className="px-4 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {preview.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-faint">
                      Nenhuma linha válida com essas colunas.
                    </td>
                  </tr>
                ) : (
                  preview.map((row, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-4 py-2 text-text-soft">{formatDate(row.date)}</td>
                      <td className="px-4 py-2 text-foreground">{row.description}</td>
                      <td className={cn("px-4 py-2 text-right tabular-nums", row.amount >= 0 ? "text-success" : "text-danger")}>
                        {row.amount >= 0 ? "+" : "−"} {brl(Math.abs(row.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Button type="button" onClick={confirmColumns} disabled={isReading || preview.length === 0}>
            Continuar para revisão
          </Button>
        </section>
      )}

      {/* 3. Revisão */}
      {rows && (
        <section className="space-y-4 rounded-[22px] border border-line bg-surface p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Revise os lançamentos</h2>
              <p className="text-sm text-muted-foreground">
                {rows.length} encontrados · {selected.length} selecionados ·{" "}
                <span className="text-success">+ {brl(totalIn)}</span> ·{" "}
                <span className="text-danger">− {brl(totalOut)}</span>
              </p>
              {duplicates > 0 && (
                <p className="mt-1 text-xs text-warning">
                  {duplicates} parecem já estar nesta conta (mesma data, valor e tipo) e vieram
                  desmarcados.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
                Marcar todos
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)}>
                Desmarcar todos
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">
                Categoria para todas as entradas selecionadas
              </span>
              <select
                defaultValue=""
                onChange={(e) => e.target.value && setCategoryForSelected("income", e.target.value)}
                className={inputClass}
              >
                {categoryOptions("income")}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">
                Categoria para todas as saídas selecionadas
              </span>
              <select
                defaultValue=""
                onChange={(e) => e.target.value && setCategoryForSelected("expense", e.target.value)}
                className={inputClass}
              >
                {categoryOptions("expense")}
              </select>
            </label>
          </div>

          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  "grid gap-3 p-3 md:grid-cols-[auto_90px_minmax(0,1fr)_130px_minmax(0,220px)_110px] md:items-center",
                  !row.include && "opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  aria-label="Importar este lançamento"
                  checked={row.include}
                  onChange={(e) => updateRow(row.id, { include: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm text-text-soft">
                  {formatDate(row.date)}
                  {row.duplicate && (
                    <span className="ml-1 block text-[11px] font-semibold text-warning">possível duplicado</span>
                  )}
                </span>
                <input
                  value={row.description}
                  maxLength={120}
                  onChange={(e) => updateRow(row.id, { description: e.target.value })}
                  className={inputClass}
                  aria-label="Descrição"
                />
                <select
                  value={row.type}
                  onChange={(e) => updateRow(row.id, { type: e.target.value as "income" | "expense" })}
                  className={inputClass}
                  aria-label="Entrada ou saída"
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>
                <select
                  value={row.categoryId}
                  onChange={(e) => updateRow(row.id, { categoryId: e.target.value })}
                  className={inputClass}
                  aria-label="Categoria"
                >
                  {categoryOptions(row.type)}
                </select>
                <span
                  className={cn(
                    "text-right text-sm font-semibold tabular-nums",
                    row.type === "income" ? "text-success" : "text-danger"
                  )}
                >
                  {row.type === "income" ? "+" : "−"} {brl(row.amount)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={reset} disabled={isImporting}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={runImport}
              disabled={isImporting || selected.length === 0}
            >
              {isImporting ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
              {isImporting ? "Importando…" : `Importar ${selected.length} lançamento(s)`}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
