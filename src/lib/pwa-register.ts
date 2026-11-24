// The only place the offline app-shell service worker (/sw.js) is registered.
// Refuses dev, iframes and every Lovable preview host; ?sw=off unregisters it.
const PROJECT_ID = "8ea0815f-aa8f-4dcf-8bf2-0c25ded6500a";
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
const LOVABLE_SUFFIXES = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];

export function isRefusedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  const label = h.split(".")[0] ?? "";
  if (LOVABLE_SUFFIXES.some((s) => h.endsWith(s))) {
    if (PREVIEW_LABEL.test(label)) return true;
    if (label === `project--${PROJECT_ID}-dev`) return true;
  }
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterAppWorker() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => [r.active, r.waiting, r.installing].some((w) => w?.scriptURL.endsWith("/sw.js"))).map((r) => r.unregister()));
}

export async function registerAppShellWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = true;
  try { inIframe = window.self !== window.top; } catch { /* cross-origin parent */ }
  const refused = !import.meta.env.PROD || inIframe || isRefusedHost(window.location.hostname) || new URLSearchParams(window.location.search).get("sw") === "off";
  if (refused) { await unregisterAppWorker().catch(() => {}); return; }
  await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.error("offline app shell registration failed", e));
}
