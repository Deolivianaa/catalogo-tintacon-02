import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { parseCsv } from "@/utils/csv";
import type { Product } from "@/types/product";

const STORAGE_KEY = "tintacon-catalog-v1";
const DEFAULT_CSV = "/data/produtos.csv";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
        const data = await parseCsv(DEFAULT_CSV);
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const data = await parseCsv(file);
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
    }
  }, []);

  return { products, loading, importFile };
}
