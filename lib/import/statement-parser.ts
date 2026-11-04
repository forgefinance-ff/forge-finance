// Leitura de extratos bancários no navegador, sem dependências:
//   - OFX (padrão de exportação dos bancos)
//   - CSV / TXT (vírgula, ponto e vírgula ou tabulação)
//   - XLSX (Excel; o .xls antigo não é suportado — salve como .xlsx ou .csv)

export type Table = string[][];

export type StatementRow = {
  date: string; // AAAA-MM-DD
  description: string;
  amount: number; // positivo = entrada, negativo = saída
};

export type ColumnMap = {
  date: number;
  description: number;
  /** Coluna única de valor (com sinal). */
  amount: number;
  /** Ou colunas separadas de entrada e saída. */
  credit: number;
  debit: number;
};

const EMPTY_MAP: ColumnMap = { date: -1, description: -1, amount: -1, credit: -1, debit: -1 };

/* ----------------------------- números e datas ----------------------------- */

/** "1.234,56", "-1234.56", "R$ 1.234,56", "(123,45)", "123,45 D" → número. */
export function parseMoney(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let text = String(raw ?? "").trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (/\s*D$/i.test(text)) {
    negative = true;
    text = text.replace(/\s*D$/i, "");
  } else if (/\s*C$/i.test(text)) {
    text = text.replace(/\s*C$/i, "");
  }

  text = text.replace(/R\$|\s/gi, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  if (text.endsWith("-")) {
    negative = !negative;
    text = text.slice(0, -1);
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma > lastDot) {
    // Formato brasileiro: 1.234,56
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    // Formato americano: 1,234.56
    text = text.replace(/,/g, "");
  } else if (lastComma === -1 && (text.match(/\./g)?.length ?? 0) > 1) {
    // 1.234.567 (milhar sem decimais)
    text = text.replace(/\./g, "");
  }

  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function validDate(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd, aaaammdd, número de série do Excel. */
export function parseDate(raw: unknown): string | null {
  if (typeof raw === "number") return excelSerialToDate(raw);
  const text = String(raw ?? "").trim();
  if (!text) return null;

  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);

  m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return validDate(y, +m[2], +m[1]);
  }

  m = text.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return validDate(+m[1], +m[2], +m[3]);

  if (/^\d{5}(\.\d+)?$/.test(text)) return excelSerialToDate(Number(text));

  return null;
}

function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 20000 || serial > 80000) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return validDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/* ---------------------------------- OFX ----------------------------------- */

export function parseOfx(text: string): StatementRow[] {
  const rows: StatementRow[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);

  const tag = (block: string, name: string) => {
    const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"));
    return m ? m[1].trim() : "";
  };

  for (const block of blocks) {
    const date = parseDate(tag(block, "DTPOSTED").slice(0, 8));
    const amount = parseMoney(tag(block, "TRNAMT").replace(",", "."));
    const description = tag(block, "MEMO") || tag(block, "NAME") || "Sem descrição";
    if (!date || amount === null || amount === 0) continue;
    rows.push({
      date,
      amount: Math.round(amount * 100) / 100,
      description: decodeEntities(description).slice(0, 120),
    });
  }

  return rows;
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/* ---------------------------------- CSV ----------------------------------- */

export function parseCsv(text: string): Table {
  const clean = text.replace(/^﻿/, "");
  const firstLines = clean.split(/\r?\n/).slice(0, 10).join("\n");
  const count = (ch: string) => firstLines.split(ch).length - 1;
  const delimiter = [";", "\t", ","].sort((a, b) => count(b) - count(a))[0];

  const rows: Table = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some((c) => c !== "")) rows.push(row);

  return rows;
}

/* ---------------------------------- XLSX ---------------------------------- */

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Lê os arquivos de um ZIP (o .xlsx é um ZIP de XMLs). */
async function unzip(buffer: ArrayBuffer, wanted: (name: string) => boolean) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const files = new Map<string, string>();
  const decoder = new TextDecoder();

  // Fim do diretório central.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Arquivo Excel inválido.");

  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  for (let n = 0; n < total; n++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    if (!wanted(name)) continue;

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = bytes.subarray(start, start + compressedSize);

    const content = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null;
    if (content) files.set(name, decoder.decode(content));
  }

  return files;
}

function colIndex(ref: string) {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<Table> {
  const files = await unzip(
    buffer,
    (name) =>
      name === "xl/sharedStrings.xml" ||
      name === "xl/workbook.xml" ||
      name === "xl/_rels/workbook.xml.rels" ||
      name.startsWith("xl/worksheets/sheet")
  );

  const parser = new DOMParser();
  const xml = (text: string) => parser.parseFromString(text, "application/xml");

  const shared: string[] = [];
  const sst = files.get("xl/sharedStrings.xml");
  if (sst) {
    for (const si of Array.from(xml(sst).getElementsByTagName("si"))) {
      shared.push(
        Array.from(si.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join("")
      );
    }
  }

  // Primeira planilha do arquivo (pela ordem do workbook).
  let sheetPath = "";
  const workbook = files.get("xl/workbook.xml");
  const rels = files.get("xl/_rels/workbook.xml.rels");
  if (workbook && rels) {
    const firstSheet = xml(workbook).getElementsByTagName("sheet")[0];
    const relId =
      firstSheet?.getAttribute("r:id") ??
      firstSheet?.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id"
      );
    const rel = Array.from(xml(rels).getElementsByTagName("Relationship")).find(
      (r) => r.getAttribute("Id") === relId
    );
    const target = rel?.getAttribute("Target") ?? "";
    sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheetXml =
    files.get(sheetPath) ??
    [...files.entries()].find(([name]) => name.startsWith("xl/worksheets/sheet"))?.[1];
  if (!sheetXml) throw new Error("Não encontrei nenhuma planilha no arquivo.");

  const table: Table = [];
  for (const rowEl of Array.from(xml(sheetXml).getElementsByTagName("row"))) {
    const row: string[] = [];
    for (const c of Array.from(rowEl.getElementsByTagName("c"))) {
      const index = colIndex(c.getAttribute("r") ?? "A");
      const type = c.getAttribute("t");
      const v = c.getElementsByTagName("v")[0]?.textContent ?? "";
      let value = v;
      if (type === "s") value = shared[Number(v)] ?? "";
      else if (type === "inlineStr")
        value = Array.from(c.getElementsByTagName("t"))
          .map((t) => t.textContent ?? "")
          .join("");
      while (row.length < index) row.push("");
      row[index] = value.trim();
    }
    if (row.some((cell) => cell !== "")) table.push(row);
  }

  return table;
}

/* ------------------------ colunas e linhas da tabela ----------------------- */

function norm(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const HEADER_HINTS: Record<keyof ColumnMap, RegExp> = {
  date: /^(data|date|dt|data (do )?lancamento|data mov)/,
  description: /(descricao|historico|lancamento|title|titulo|description|memo|detalhe|estabelecimento|identificacao)/,
  amount: /^(valor|amount|quantia|valor \(r\$\)|valor r\$|montante)/,
  credit: /(entrada|credito|credit)/,
  debit: /(saida|debito|debit)/,
};

/** Acha a linha de cabeçalho e as colunas mais prováveis. */
export function detectColumns(table: Table): { headerRow: number; map: ColumnMap } {
  for (let r = 0; r < Math.min(table.length, 15); r++) {
    const cells = table[r].map(norm);
    const map: ColumnMap = { ...EMPTY_MAP };

    cells.forEach((cell, i) => {
      if (!cell) return;
      if (map.date < 0 && HEADER_HINTS.date.test(cell)) map.date = i;
      else if (map.amount < 0 && HEADER_HINTS.amount.test(cell)) map.amount = i;
      else if (map.credit < 0 && HEADER_HINTS.credit.test(cell)) map.credit = i;
      else if (map.debit < 0 && HEADER_HINTS.debit.test(cell)) map.debit = i;
      else if (map.description < 0 && HEADER_HINTS.description.test(cell)) map.description = i;
    });

    const hasValue = map.amount >= 0 || (map.credit >= 0 && map.debit >= 0);
    if (map.date >= 0 && hasValue) return { headerRow: r, map };
  }

  // Sem cabeçalho reconhecível: tenta pelo conteúdo da primeira linha.
  const first = table[0] ?? [];
  const map: ColumnMap = { ...EMPTY_MAP };
  first.forEach((cell, i) => {
    if (map.date < 0 && parseDate(cell)) map.date = i;
    else if (map.amount < 0 && parseMoney(cell) !== null) map.amount = i;
    else if (map.description < 0 && cell && parseMoney(cell) === null) map.description = i;
  });
  return { headerRow: -1, map };
}

export function tableToRows(
  table: Table,
  headerRow: number,
  map: ColumnMap,
  invertSigns = false
): StatementRow[] {
  const rows: StatementRow[] = [];

  for (let r = headerRow + 1; r < table.length; r++) {
    const cells = table[r];
    const date = map.date >= 0 ? parseDate(cells[map.date]) : null;
    if (!date) continue;

    let amount: number | null = null;
    if (map.amount >= 0) amount = parseMoney(cells[map.amount]);
    else {
      const credit = map.credit >= 0 ? parseMoney(cells[map.credit]) : null;
      const debit = map.debit >= 0 ? parseMoney(cells[map.debit]) : null;
      if (credit) amount = Math.abs(credit);
      else if (debit) amount = -Math.abs(debit);
    }
    if (amount === null || amount === 0) continue;

    const description =
      (map.description >= 0 ? cells[map.description] : "")?.trim() || "Sem descrição";

    const cents = Math.round(amount * 100) / 100;

    rows.push({
      date,
      description: description.slice(0, 120),
      amount: invertSigns ? -cents : cents,
    });
  }

  return rows;
}

export type ParsedFile =
  | { kind: "rows"; rows: StatementRow[] }
  | { kind: "table"; table: Table };

export async function readStatementFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xls")) {
    throw new Error(
      "Arquivos .xls (Excel antigo) não são lidos. Abra no Excel e salve como .xlsx ou .csv."
    );
  }

  if (name.endsWith(".xlsx")) {
    return { kind: "table", table: await parseXlsx(await file.arrayBuffer()) };
  }

  const buffer = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buffer);
  // Muitos bancos exportam em Latin-1: troca se aparecerem caracteres inválidos.
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buffer);

  if (name.endsWith(".ofx") || /<OFX>|<STMTTRN>/i.test(text.slice(0, 5000))) {
    return { kind: "rows", rows: parseOfx(text) };
  }

  return { kind: "table", table: parseCsv(text) };
}
