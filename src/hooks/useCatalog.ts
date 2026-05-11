import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { parseCsv, type ParseProgress } from "@/utils/csv";
import type { Product } from "@/types/product";

const STORAGE_KEY = "tintacon-catalog-v1";
const DEFAULT_CSV = "/data/produtos.csv";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ParseProgress | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (cached) {
          const parsed = JSON.parse(cached) as Product[];
          if (!cancelled && Array.isArray(parsed) && parsed.length) {
            setProducts(parsed);
            setLoading(false);
            return;
          }
        }
        setProgress({ processed: 0, total: 0, percent: 0 });
        const data = await parseCsv(DEFAULT_CSV, (p) => !cancelled && setProgress(p));
        if (cancelled) return;
        setProducts(data);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          /* quota */
        }
      } catch (e) {
        console.error(e);
        toast.error("Falha ao carregar catálogo padrão");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setProgress(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importFile = useCallback(async (file: File, opts?: { clearBefore?: boolean }) => {
    setLoading(true);
    setProgress({ processed: 0, total: 0, percent: 0 });
    if (opts?.clearBefore) {
      setProducts([]);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    try {
      const data = await parseCsv(file, setProgress);
      setProducts(data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* quota */
      }
      toast.success(`${data.length.toLocaleString("pt-BR")} produtos importados`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar CSV");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  return { products, loading, progress, importFile };
}
