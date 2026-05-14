import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
