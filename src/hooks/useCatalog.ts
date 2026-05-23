import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { parseCsv, type ParseProgress } from "@/utils/csv";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/types/product";

const STORAGE_KEY = "tintacon-catalog-v1";
const VERSION_KEY = "tintacon-catalog-version";
const DEFAULT_CSV = "/data/produtos.csv";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const knownVersionRef = useRef<number>(
    typeof window !== "undefined"
      ? Number(localStorage.getItem(VERSION_KEY) ?? 0)
      : 0,
  );

  // Carregamento inicial: cache local OU CSV padrão
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
  const clearCatalog = useCallback(() => {
    setProducts([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    toast.success("Catálogo limpo");
  }, []);


  // Carrega versão atual + assina realtime
  useEffect(() => {
    let cancelled = false;

    const applyRow = async (row: { url: string | null; version: number }, isInitial: boolean) => {
      if (cancelled) return;
      setSyncUrl(row.url);
      const known = knownVersionRef.current;
      if (!row.url) return;
      // Na carga inicial, só re-baixa se a versão remota for maior que a conhecida
      if (isInitial && row.version <= known) return;
      knownVersionRef.current = row.version;
      try {
        localStorage.setItem(VERSION_KEY, String(row.version));
      } catch {
        /* ignore */
      }
      if (!isInitial) toast.info("Sincronizando catálogo (atualização remota)...");
      await importFile(row.url, { clearBefore: true, silent: isInitial });
      if (!isInitial) toast.success("Catálogo atualizado");
    };

    (async () => {
      const { data } = await supabase
        .from("catalog_sync")
        .select("url, version")
        .eq("id", 1)
        .single();
      if (data) await applyRow(data, true);
    })();

    const channel = supabase
      .channel("catalog_sync_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "catalog_sync" },
        (payload) => {
          const row = payload.new as { url: string | null; version: number };
          void applyRow(row, false);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [importFile]);

  return { products, loading, progress, importFile, syncUrl, clearCatalog };
}
