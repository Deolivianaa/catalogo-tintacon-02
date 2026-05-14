import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Endpoint público chamado pelo pg_cron diariamente às 19:00 BRT
// para incrementar a versão e disparar re-sync em todos os visualizadores.
export const Route = createFileRoute("/api/public/hooks/sync-catalog")({
  server: {
    handlers: {
      POST: async () => {
        const { data: current, error: readErr } = await supabaseAdmin
          .from("catalog_sync")
          .select("url, version")
          .eq("id", 1)
          .single();

        if (readErr) {
          return new Response(JSON.stringify({ error: readErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!current?.url) {
          return new Response(JSON.stringify({ ok: false, reason: "no-url" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { error: updErr } = await supabaseAdmin
          .from("catalog_sync")
          .update({
            version: (current.version ?? 0) + 1,
            synced_at: new Date().toISOString(),
          })
          .eq("id", 1);

        if (updErr) {
          return new Response(JSON.stringify({ error: updErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({ ok: true, version: (current.version ?? 0) + 1 }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
