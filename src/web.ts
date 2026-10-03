/**
 * Web-session datacenter headless probes.
 *
 * Single-payload tells for spaced farms that rotate IPs slower than a
 * same-IP burst window (Saginaw Level3, Council Bluffs GCP, Ashburn EC2
 * with POSIX locales, Boardman device-farm geo, Anyang-si UTC English).
 *
 * Requires a shallow / low-usage visit. Does not cover cross-visitor
 * burst clustering — that needs a window of rows and stays in the app.
 *
 * Ashburn *city* alone is never a signal (people live there); only
 * Boardman / The Dalles city, or Ashburn+UTC/headless corroboration.
 */

const HEADLESS_PROBE_SCREENS = new Set([
  "800x600",
  "1280x720",
  "600x800",
  "1024x768",
]);

/** Cloud-region cities that are never residential web egress. */
const DATACENTER_PROBE_CITIES = new Set([
  "ashburn",
  "council bluffs",
  "boardman",
  "the dalles",
]);

/** Conversion-ish milestones shared across BR / NidNoi / Chalkline funnels. */
const ENGAGED_MILESTONE_HINTS = new Set([
  "login_completed",
  "signup_completed",
  "book_added",
  "reader_engaged",
  "preview_reader_opened",
  "bookshelf_opened",
  "app_opened",
  "board_opened",
  "board_published",
  "project_published",
  "learn_opened",
  "learn_thai_opened",
  "learn_chinese_opened",
  "learn_japanese_opened",
  "read_opened",
]);

export type WebProbeOptions = {
  /**
   * Override the built-in shallow check with a product-specific one
   * (e.g. app `isShallowProbePayload`). When omitted, farmfence uses
   * pageViewCount ≤ 2, usage ≤ 15s, and no engaged milestone hints.
   */
  isShallow?: boolean;
};

/**
 * Generic shallow bounce — safe default when the app does not pass its
 * own funnel-aware shallow predicate.
 */
export function isShallowWebProbePayload(
  payload: Record<string, unknown>,
): boolean {
  const pv = typeof payload.pageViewCount === "number" ? payload.pageViewCount : 0;
  if (pv > 2) return false;
  const usage =
    typeof payload.totalUsageSeconds === "number" ? payload.totalUsageSeconds : 0;
  if (usage > 15) return false;
  const reached = Array.isArray(payload.funnelReached) ? payload.funnelReached : [];
  const milestones = reached.filter(
    (n) =>
      typeof n === "string" &&
      n !== "page_view" &&
      !String(n).startsWith("cta_"),
  );
  if (milestones.length > 2) return false;
  if (milestones.some((n) => ENGAGED_MILESTONE_HINTS.has(String(n)))) return false;
  return true;
}

/**
 * Spaced datacenter headless probe reason, or null when the payload does
 * not qualify. Re-evaluate at read time so old rows pick up new rules.
 */
export function datacenterHeadlessProbeReason(
  payload: Record<string, unknown>,
  opts?: WebProbeOptions,
): string | null {
  const shallow =
    typeof opts?.isShallow === "boolean"
      ? opts.isShallow
      : isShallowWebProbePayload(payload);
  if (!shallow) return null;

  const usage =
    typeof payload.totalUsageSeconds === "number" ? payload.totalUsageSeconds : 0;
  if (usage > 15) return null;

  const tz = typeof payload.timezone === "string" ? payload.timezone.trim() : "";
  const lang = typeof payload.language === "string" ? payload.language : "";
  const city =
    typeof payload.city === "string" ? payload.city.trim().toLowerCase() : "";
  const country =
    typeof payload.country === "string"
      ? payload.country.trim().toUpperCase()
      : "";
  const sw = payload.screenWidth;
  const sh = payload.screenHeight;
  const screen =
    typeof sw === "number" && typeof sh === "number" ? `${sw}x${sh}` : "";

  if (/@posix/i.test(lang)) {
    return "Synthetic POSIX locale (datacenter headless probe)";
  }
  if (/^etc\/unknown$/i.test(tz) || /^unknown$/i.test(tz)) {
    return "Synthetic timezone Etc/Unknown (datacenter probe)";
  }

  const utcTz = /^UTC$/i.test(tz) || /^Etc\/UTC$/i.test(tz);

  // Boardman / The Dalles: no residential web egress — shallow alone is enough
  // (farm images often ship America/Los_Angeles, not UTC).
  if (city === "boardman" || city === "the dalles") {
    const label = typeof payload.city === "string" ? payload.city.trim() : city;
    return `Datacenter city probe (${label})`;
  }

  // Ashburn / Council Bluffs need UTC or classic headless screen corroboration
  // (Ashburn has residents; city alone must never flag).
  if (
    DATACENTER_PROBE_CITIES.has(city) &&
    (utcTz || HEADLESS_PROBE_SCREENS.has(screen))
  ) {
    const label = typeof payload.city === "string" ? payload.city.trim() : city;
    return `Datacenter city probe (${label})`;
  }

  if (
    utcTz &&
    HEADLESS_PROBE_SCREENS.has(screen) &&
    ["US", "CA", "PL", "KR", "FR", "DE", "NL", "BE", "IE"].includes(country)
  ) {
    return "UTC headless desktop probe from non-UTC residential geo";
  }

  // East-Asia residential geos never ship browser TZ as UTC with an English
  // locale — catches spaced Anyang-si mobile probes that miss classic
  // headless screens and the same-IP burst window.
  if (
    utcTz &&
    ["KR", "JP", "CN", "TW"].includes(country) &&
    /^en\b/i.test(lang)
  ) {
    return "UTC English probe from East-Asia residential geo";
  }

  return null;
}

export function isDatacenterHeadlessProbePayload(
  payload: Record<string, unknown>,
  opts?: WebProbeOptions,
): boolean {
  return datacenterHeadlessProbeReason(payload, opts) != null;
}
