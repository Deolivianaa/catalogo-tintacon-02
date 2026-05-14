import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { parseCsv, type ParseProgress } from "@/utils/csv";
import type { Product } from "@/types/product";

const STORAGE_KEY = "tintacon-catalog-v1";
const SYNC_URL_KEY = "tintacon-sync-url";
const LAST_SYNC_KEY = "tintacon-last-sync";
const DEFAULT_CSV = "/data/produtos.csv";
const SYNC_HOUR = 19; // 19:00 diariamente

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [syncUrl, setSyncUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(SYNC_URL_KEY);
  });
  const syncingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as Product[];
            if (!cancelled && Array.isArray(parsed) && parsed.length) {
              setProducts(parsed);
              setLoading(false);
              return;
            }
          } catch {
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
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

  const importFile = useCallback(
    async (source: File | string, opts?: { clearBefore?: boolean; silent?: boolean }) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
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
        const data = await parseCsv(source, setProgress);
        setProducts(data);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          toast.warning("Cache local cheio — produtos carregados, mas não persistidos");
        }
        if (typeof source === "string") {
          try {
            localStorage.setItem(SYNC_URL_KEY, source);
            localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
            setSyncUrl(source);
          } catch {
            /* ignore */
          }
        }
        if (!opts?.silent) {
          toast.success(`${data.length.toLocaleString("pt-BR")} produtos importados`);
        }
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "Erro ao importar arquivo";
        toast.error(msg);
      } finally {
        setLoading(false);
        setProgress(null);
        syncingRef.current = false;
      }
    },
    [],
  );

  const sync = useCallback(
    async (opts?: { silent?: boolean }) => {
      const url = typeof window !== "undefined" ? localStorage.getItem(SYNC_URL_KEY) : null;
      if (!url) {
        if (!opts?.silent) toast.error("Nenhuma URL de sincronização configurada");
        return;
      }
      if (!opts?.silent) toast.info("Sincronizando catálogo...");
      await importFile(url, { clearBefore: true, silent: opts?.silent });
      if (opts?.silent) {
        toast.success("Catálogo sincronizado automaticamente (19:00)");
      }
    },
    [importFile],
  );

  // Auto-sync diário às 19:00 (enquanto o app estiver aberto)
  useEffect(() => {
    if (!syncUrl) return;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(SYNC_HOUR, 0, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      const ms = next.getTime() - now.getTime();
      timer = setTimeout(async () => {
        const last = localStorage.getItem(LAST_SYNC_KEY);
        const today = new Date().toDateString();
        const lastDay = last ? new Date(last).toDateString() : "";
        if (lastDay !== today) {
          await sync({ silent: true });
        }
        scheduleNext();
      }, ms);
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [syncUrl, sync]);

  return { products, loading, progress, importFile, sync, syncUrl };
}
