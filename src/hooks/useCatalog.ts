import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { parseCsv, type ParseProgress } from "@/utils/csv";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { clearCatalogRemote } from "@/lib/catalog-sync.functions";
import type { Product } from "@/types/product";

const STORAGE_KEY = "tintacon-catalog-v1";
const VERSION_KEY = "tintacon-catalog-version";
const DEFAULT_CSV = "/data/produtos.csv";
const SYNC_PASSWORD = "#nfFbt";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const initialResolvedRef = useRef(false);
  const knownVersionRef = useRef<number>(
    typeof window !== "undefined"
      ? Number(localStorage.getItem(VERSION_KEY) ?? 0)
      : 0,
  );
  const clearRemoteFn = useServerFn(clearCatalogRemote);

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

  const loadCachedOrDefault = useCallback(async () => {
    try {
      const cached = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Product[];
          if (Array.isArray(parsed) && parsed.length) {
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
      const data = await parseCsv(DEFAULT_CSV, setProgress);
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
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const clearCatalog = useCallback(async () => {
    setProducts([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    try {
      await clearRemoteFn({ data: { password: SYNC_PASSWORD } });
      toast.success("Catálogo limpo para todos os visualizadores");
    } catch (e) {
      console.warn("clearCatalogRemote (serverFn) falhou, tentando fallback direto:", e);
      try {
        const { data: cur } = await supabase
          .from("catalog_sync")
          .select("version")
          .eq("id", 1)
          .single();
        const { error: updErr } = await supabase
          .from("catalog_sync")
          .update({
            url: null,
            version: (cur?.version ?? 0) + 1,
            synced_at: new Date().toISOString(),
          })
          .eq("id", 1);
        if (updErr) throw updErr;
        toast.success("Catálogo limpo para todos os visualizadores");
      } catch (err) {
        console.error(err);
        toast.warning("Catálogo limpo localmente, mas não foi possível propagar");
      }
    }
  }, [clearRemoteFn]);

  // Sincronização central + carga inicial
  useEffect(() => {
    let cancelled = false;

    const applyRow = async (
      row: { url: string | null; version: number },
      isInitial: boolean,
    ) => {
      if (cancelled) return;
      setSyncUrl(row.url);
      const known = knownVersionRef.current;

      // Estado remoto: catálogo limpo
      if (!row.url) {
        if (row.version > known) {
          knownVersionRef.current = row.version;
          try {
            localStorage.setItem(VERSION_KEY, String(row.version));
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* ignore */
          }
          setProducts([]);
          if (!isInitial) toast.info("Catálogo foi limpo remotamente");
        }
        if (isInitial) {
          initialResolvedRef.current = true;
          setLoading(false);
        }
        return;
      }

      // Estado remoto: tem URL
      if (isInitial && row.version <= known) {
        // já temos a versão atual — usa cache/default
        initialResolvedRef.current = true;
        await loadCachedOrDefault();
        return;
      }

      knownVersionRef.current = row.version;
      try {
        localStorage.setItem(VERSION_KEY, String(row.version));
      } catch {
        /* ignore */
      }
      if (!isInitial) toast.info("Sincronizando catálogo (atualização remota)...");
      initialResolvedRef.current = true;
      await importFile(row.url, { clearBefore: true, silent: isInitial });
      if (!isInitial) toast.success("Catálogo atualizado");
    };

    (async () => {
      const { data } = await supabase
        .from("catalog_sync")
        .select("url, version")
        .eq("id", 1)
        .single();
      if (cancelled) return;
      if (data) {
        await applyRow(data, true);
      } else {
        // sem linha de sync — comportamento legado
        initialResolvedRef.current = true;
        await loadCachedOrDefault();
      }
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
  }, [importFile, loadCachedOrDefault]);

  return { products, loading, progress, importFile, syncUrl, clearCatalog };
}
