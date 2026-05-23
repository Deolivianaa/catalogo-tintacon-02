export const BUILD_VERSION = "v1.0.1";

export function BuildBadge() {
  return (
    <div className="fixed bottom-2 right-2 z-50 rounded-md border border-border bg-card/80 px-2 py-0.5 text-[10px] font-mono text-muted-foreground backdrop-blur-sm pointer-events-none select-none">
      build {BUILD_VERSION}
    </div>
  );
}
