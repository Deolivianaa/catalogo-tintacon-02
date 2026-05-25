import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars ausentes no servidor");
  return createClient(url, key, { auth: { persistSession: false } });
}

const SYNC_PASSWORD = "#nfFbt";

export const triggerSync = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        password: z.string(),
        url: z.string().url().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== SYNC_PASSWORD) {
      throw new Error("Senha incorreta");
    }

    const supabaseAdmin = getSupabase();


    const { data: current, error: readErr } = await supabaseAdmin
      .from("catalog_sync")
      .select("url, version")
      .eq("id", 1)
      .single();

    if (readErr) throw new Error(readErr.message);

    const url = data.url ?? current?.url ?? null;
    if (!url) throw new Error("Nenhuma URL configurada");

    const { error: updErr } = await supabaseAdmin
      .from("catalog_sync")
      .update({
        url,
        version: (current?.version ?? 0) + 1,
        synced_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updErr) throw new Error(updErr.message);

    return { ok: true, url };
  });

export const clearCatalogRemote = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ password: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== SYNC_PASSWORD) {
      throw new Error("Senha incorreta");
    }

    const supabaseAdmin = getSupabase();

    const { data: current, error: readErr } = await supabaseAdmin
      .from("catalog_sync")
      .select("version")
      .eq("id", 1)
      .single();

    if (readErr) throw new Error(readErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("catalog_sync")
      .update({
        url: null,
        version: (current?.version ?? 0) + 1,
        synced_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });
