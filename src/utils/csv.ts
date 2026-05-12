import Papa from "papaparse";
import type { Product, RawProduct } from "@/types/product";

const HEADER_MAP: Record<string, keyof RawProduct> = {
  CÓDIGO: "codigo",
  DESCRIÇÃO: "descricao",
  CÓDIGOCLASSIFICAÇÃO: "codigoClassificacao",
  CLASSIFICAÇÃO: "classificacao",
  MODELO: "modelo",
  UM: "um",
  CÓDIGOBARRAS: "codigoBarras",
  CÓDIGOFÁBRICA: "codigoFabrica",
  "CÓD.MARCA": "codMarca",
  MARCA: "marca",
  CDLN: "cdln",
  LINHA: "linha",
  CÓDFAMÍLIA: "codFamilia",
  FAMÍLIA: "familia",
  CDTP: "cdtp",
  TIPO: "tipo",
  CDSB: "cdsb",
  SUBTIPO: "subtipo",
  CÓDIGOFABRICANTE: "codigoFabricante",
  FABRICANTE: "fabricante",
};

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

function rowsFromResults(data: Record<string, string>[]): RawProduct[] {
  return data
    .map((row) => {
      const out: Partial<RawProduct> = {};
      for (const [csvKey, field] of Object.entries(HEADER_MAP)) {
        out[field] = clean(row[csvKey]);
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

async function loadText(
  file: File | string,
  onPhase?: (p: ParseProgress) => void,
): Promise<string> {
  if (typeof file !== "string") {
    return await file.text();
  }
  const res = await fetch(file);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const totalHeader = res.headers.get("content-length");
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;
  if (!res.body || !total) {
    return await res.text();
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    // Download phase = 0..30% of overall progress
    const percent = Math.min(30, Math.round((received / total) * 30));
    onPhase?.({ processed: received, total, percent });
  }
  text += decoder.decode();
  return text;
}

export async function parseCsv(
  file: File | string,
  onProgress?: (p: ParseProgress) => void,
): Promise<Product[]> {
  const text = await loadText(file, onProgress);
  const totalChars = text.length || 1;

  return new Promise((resolve, reject) => {
    const rows: RawProduct[] = [];
    let lastReport = 0;

    Papa.parse<Record<string, string>>(text, {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toUpperCase(),
      chunk: (results) => {
        rows.push(...rowsFromResults(results.data));
        if (onProgress) {
          const cursor = (results.meta as { cursor?: number }).cursor ?? 0;
          // Parse phase = 30..99%
          const percent = 30 + Math.min(69, Math.round((cursor / totalChars) * 69));
          const now = Date.now();
          if (now - lastReport > 60 || percent >= 99) {
            lastReport = now;
            onProgress({ processed: rows.length, total: rows.length, percent });
          }
        }
      },
      complete: () => {
        try {
          const products = buildProducts(rows);
          onProgress?.({ processed: rows.length, total: rows.length, percent: 100 });
          resolve(products);
        } catch (e) {
          reject(e as Error);
        }
      },
      error: (err: Error) => reject(err),
    });
  });
}
