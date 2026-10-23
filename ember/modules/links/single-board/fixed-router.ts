import traces from "./fixed-routes.json";
// Replay reviewed routes through the normal core import, pour and DRC phases.
export async function fixedRouter(input: any) {

  const contract = JSON.stringify({ bounds: input.bounds, layerCount: input.layerCount, obstacles: input.obstacles, connections: input.connections });
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(contract)))).map(b => b.toString(16).padStart(2, "0")).join("");
  if (digest !== "bc289e28308b8835f709ce76a0d044369c6490aeeee1c9481251668af47bdede") {
    throw new Error("Links fixed routes do not match the placement/netlist. Regenerate and review routes before rebuilding.");
  }
  const handlers = new Map<string, (event: any) => void>();
  return {
    on(name: string, handler: (event: any) => void) { handlers.set(name, handler); },
    stop() {},
    start() { handlers.get("complete")?.({ traces: structuredClone(traces) }); },
  };
}
