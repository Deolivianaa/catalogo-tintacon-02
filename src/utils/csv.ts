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

export function parseCsv(file: File | string): Promise<Product[]> {
  return new Promise((resolve, reject) => {
    const handle = (results: Papa.ParseResult<Record<string, string>>) => {
      try {
        resolve(buildProducts(rowsFromResults(results.data)));
      } catch (e) {
        reject(e);
      }
    };
    if (typeof file === "string") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        download: true,
        transformHeader: (h: string) => h.trim().toUpperCase(),
        complete: handle,
        error: (err: Error) => reject(err),
      });
    } else {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toUpperCase(),
        complete: handle,
        error: (err: Error) => reject(err),
      });
    }
  });
}
