// app/lib/proAccess.js

const DEV_FLAG =
  process.env.NEXT_PUBLIC_DEV_SHOW_PRO &&
  process.env.NEXT_PUBLIC_DEV_SHOW_PRO.toString().toLowerCase() === "true";

// Safe check for browser and a URL param like ?demo=pro
function hasDemoParam() {
  if (typeof window === "undefined") return false;
  const qp = new URLSearchParams(window.location.search);
  return qp.get("demo") === "pro" || qp.get("demo") === "1";
}

/**
 * Returns true if Pro should be enabled.
 * - When NEXT_PUBLIC_DEV_SHOW_PRO=true, always true (demo mode).
 * - Or when URL has ?demo=pro (or ?demo=1).
 * - Otherwise use your real check (pass it as the argument).
 */
export function isProEnabled(userHasPro = false) {
  return DEV_FLAG || hasDemoParam() || Boolean(userHasPro);
}
