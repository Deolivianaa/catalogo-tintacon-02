import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Product, RawProduct } from "@/types/product";

const HEADER_MAP: Record<string, keyof RawProduct> = {
  CODIGO: "codigo",
  DESCRICAO: "descricao",
  CODIGOCLASSIFICACAO: "codigoClassificacao",
  CLASSIFICACAO: "classificacao",
  MODELO: "modelo",
  UM: "um",
  CODIGOBARRAS: "codigoBarras",
  CODIGOFABRICA: "codigoFabrica",
  CODMARCA: "codMarca",
  MARCA: "marca",
  CDLN: "cdln",
  LINHA: "linha",
  CODFAMILIA: "codFamilia",
  FAMILIA: "familia",
  CDTP: "cdtp",
  TIPO: "tipo",
  CDSB: "cdsb",
  SUBTIPO: "subtipo",
  CODIGOFABRICANTE: "codigoFabricante",
  FABRICANTE: "fabricante",
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function clean(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim().replace(/\s+/g, " ");
}

function buildProducts(rows: RawProduct[]): Product[] {
  const map = new Map<string, Product>();
  for (const r of rows) {
    const existing = map.get(r.codigo);
    if (existing) {
      existing.variants.push({
        um: r.um,
        codigo: r.codigo,
        codigoBarras: r.codigoBarras,
      });
      if (!existing.codigoBarras && r.codigoBarras) {
        existing.codigoBarras = r.codigoBarras;
      }
    } else {
      map.set(r.codigo, {
        ...r,
        id: r.codigo,
        variants: [{ um: r.um, codigo: r.codigo, codigoBarras: r.codigoBarras }],
      });
    }
  }
  return Array.from(map.values());
}

function rowsFromResults(data: Record<string, unknown>[]): RawProduct[] {
  return data
    .map((row) => {
      const out: Partial<RawProduct> = {};
      for (const [csvKey, value] of Object.entries(row)) {
        const field = HEADER_MAP[normalizeHeader(csvKey)];
        if (field) out[field] = clean(value);
      }
      return out as RawProduct;
    })
    .filter((r) => r.codigo && r.descricao);
}

export interface ParseProgress {
  processed: number;
  total: number;
  percent: number;
}

export type ImportSource = File | string;

function isXlsxName(name: string): boolean {
  return /\.(xlsx|xls|xlsm|xlsb|ods)(\?|$)/i.test(name);
}

async function fetchBuffer(
  url: string,
  onPhase?: (p: ParseProgress) => void,
): Promise<{ buffer: ArrayBuffer; isXlsx: boolean }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  const isXlsx =
    isXlsxName(url) ||
    ct.includes("spreadsheetml") ||
    ct.includes("ms-excel") ||
    ct.includes("opendocument.spreadsheet");
  const totalHeader = res.headers.get("content-length");
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;
  if (!res.body || !total) {
    const buf = await res.arrayBuffer();
    onPhase?.({ processed: buf.byteLength, total: buf.byteLength || 1, percent: 30 });
    return { buffer: buf, isXlsx };
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    const percent = Math.min(30, Math.round((received / total) * 30));
    onPhase?.({ processed: received, total, percent });
  }
  const merged = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return { buffer: merged.buffer, isXlsx };
}

function decodeBuffer(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function countCsvRows(text: string): number {
  return Math.max(0, text.split(/\r\n|\n|\r/).filter((line) => line.trim()).length - 1);
}

async function parseXlsxBuffer(
  buffer: ArrayBuffer,
  onProgress?: (p: ParseProgress) => void,
): Promise<Product[]> {
  onProgress?.({ processed: 0, total: 1, percent: 35 });
  const wb = XLSX.read(buffer, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("Planilha vazia");
  const sheet = wb.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  onProgress?.({ processed: 0, total: json.length, percent: 60 });
  const rows = rowsFromResults(json);
  if (rows.length === 0) throw new Error("Planilha sem produtos válidos");
  const products = buildProducts(rows);
  onProgress?.({ processed: rows.length, total: rows.length, percent: 100 });
  return products;
}

async function parseCsvText(
  text: string,
  onProgress?: (p: ParseProgress) => void,
): Promise<Product[]> {
  const totalChars = text.length || 1;
  const totalRows = countCsvRows(text);

  return new Promise((resolve, reject) => {
    const rows: RawProduct[] = [];
    let lastReport = 0;

    Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toUpperCase(),
      chunkSize: 1024 * 256,
      chunk: (results: Papa.ParseResult<Record<string, string>>) => {
        rows.push(...rowsFromResults(results.data));
        if (onProgress) {
          const cursor = (results.meta as { cursor?: number }).cursor ?? 0;
          const percent = 30 + Math.min(69, Math.round((cursor / totalChars) * 69));
          const now = Date.now();
          if (now - lastReport > 60 || percent >= 99) {
            lastReport = now;
            onProgress({ processed: rows.length, total: totalRows, percent });
          }
        }
      },
      complete: (results?: Papa.ParseResult<Record<string, string>>) => {
        try {
          if (rows.length === 0 && results?.data?.length) {
            rows.push(...rowsFromResults(results.data));
          }
          if (rows.length === 0) {
            throw new Error("CSV sem produtos válidos");
          }
          const products = buildProducts(rows);
          onProgress?.({ processed: rows.length, total: totalRows || rows.length, percent: 100 });
          resolve(products);
        } catch (e) {
          reject(e as Error);
        }
      },
      error: (err: Error) => reject(err),
    });
  });
}

export async function parseCsv(
  source: ImportSource,
  onProgress?: (p: ParseProgress) => void,
): Promise<Product[]> {
  // File local
  if (typeof source !== "string") {
    const buffer = await source.arrayBuffer();
    if (isXlsxName(source.name)) {
      return parseXlsxBuffer(buffer, onProgress);
    }
    const text = decodeBuffer(buffer);
    onProgress?.({ processed: 0, total: countCsvRows(text), percent: 30 });
    return parseCsvText(text, onProgress);
  }

  // URL / path
  const { buffer, isXlsx } = await fetchBuffer(source, onProgress);
  if (isXlsx) return parseXlsxBuffer(buffer, onProgress);
  const text = decodeBuffer(buffer);
  return parseCsvText(text, onProgress);
}
