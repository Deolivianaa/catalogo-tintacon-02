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

export function parseCsv(
  file: File | string,
  onProgress?: (p: ParseProgress) => void,
): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const rows: RawProduct[] = [];
    const totalBytes = typeof file === "string" ? 0 : file.size;
    let estimatedTotal = totalBytes > 0 ? Math.max(1, Math.round(totalBytes / 220)) : 0;

    const baseConfig = {
      header: true,
      delimiter: ";",
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toUpperCase(),
      chunkSize: 1024 * 256,
      chunk: (results: Papa.ParseResult<Record<string, string>>) => {
        rows.push(...rowsFromResults(results.data));
        if (onProgress) {
          const cursor = (results.meta as { cursor?: number }).cursor ?? 0;
          let percent = 0;
          let total = estimatedTotal;
          if (totalBytes > 0) {
            percent = Math.min(99, Math.round((cursor / totalBytes) * 100));
            total = Math.max(estimatedTotal, rows.length);
          } else {
            estimatedTotal = Math.max(estimatedTotal, rows.length * 2);
            total = estimatedTotal;
            percent = Math.min(95, Math.round((rows.length / total) * 100));
          }
          onProgress({ processed: rows.length, total, percent });
        }
      },
      complete: () => {
        try {
          const products = buildProducts(rows);
          onProgress?.({ processed: rows.length, total: rows.length, percent: 100 });
          resolve(products);
        } catch (e) {
          reject(e);
        }
      },
      error: (err: Error) => reject(err),
    };

    if (typeof file === "string") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Papa.parse(file, { ...baseConfig, download: true } as any);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Papa.parse(file as File, baseConfig as any);
    }
  });
}
