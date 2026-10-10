/**
 * Web-session datacenter headless probes + cloud locale scrapers.
 *
 * Single-payload tells for spaced farms that rotate IPs slower than a
 * same-IP burst window (Saginaw Level3, Council Bluffs GCP, Ashburn EC2
 * with POSIX locales, Boardman device-farm geo, Anyang-si UTC English,
 * zh-CN desktop scrapers on Tencent/Aceville egress).
 *
 * Requires a shallow / low-usage visit. Does not cover cross-visitor
 * burst clustering — that needs a window of rows and stays in the app.
 *
 * Ashburn *city* alone is never a signal (people live there); only
 * Boardman / The Dalles city, or Ashburn+UTC/headless corroboration.
 * zh-CN alone is never a signal (diaspora / VPN users).
 */

import { isCnCloudHostingIp, isHuaweiCloudIp, isTencentCloudIp } from "./datacenter.js";

const HEADLESS_PROBE_SCREENS = new Set([
  "800x600",
  "1280x720",
  "600x800",
  "1024x768",
]);

/** Common real desktop / laptop screen sizes — never treat as randomized. */
const COMMON_DESKTOP_SCREENS = new Set([
  "1280x720",
  "1280x800",
  "1366x768",
  "1440x900",
  "1512x982",
  "1536x864",
  "1680x1050",
  "1728x1117",
  "1792x1120",
  "1800x1169",
  "1920x1080",
  "1920x1200",
  "2048x1152",
  "2560x1440",
  "2560x1600",
  "2880x1800",
  "3008x1692",
  "3024x1964",
  "3456x2234",
  "3840x2160",
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
/**
 * Per-query search milestones + automatic Discover chrome are noise for the
 * shallow cap — LCSH subject scrapers emit them without becoming readers.
 */
function isSearchNoiseMilestone(name: string): boolean {
  return (
    name.startsWith("discover_search_") ||
    name.startsWith("track_search_") ||
    name === "discover_search" ||
    name === "feature_discover_search" ||
    name === "feature_track_search" ||
    name === "app_nudge_shown"
  );
}

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
      !n.startsWith("cta_") &&
      !isSearchNoiseMilestone(n),
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

/**
 * Randomized near-square desktop "screen" — typical of headless scrapers
 * that spoof window.screen to odd sizes (e.g. 1261×1160) instead of a
 * real display. Real monitors almost never land in this band.
 */
export function isNearSquareDesktopProbeScreen(
  width: unknown,
  height: unknown,
): boolean {
  if (typeof width !== "number" || typeof height !== "number") return false;
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w < 1150 || w > 1500) return false;
  if (h < 1000 || h > 1350) return false;
  if (Math.abs(w - h) > 220) return false;
  if (COMMON_DESKTOP_SCREENS.has(`${w}x${h}`)) return false;
  return true;
}

function isDesktopBrowserUa(ua: string): boolean {
  if (!ua) return false;
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) return false;
  return /Windows NT|Macintosh|X11; (?:Ubuntu|Linux|CrOS)/i.test(ua);
}

/**
 * Spaced zh-CN (etc.) desktop cloud scrapers: fixed Chinese locale, shallow
 * bounce, randomized near-square screen and/or CN cloud egress
 * (Tencent / Huawei). Geo+timezone are often spoofed to match the exit
 * country, so mismatch is not required. Never flags on language alone.
 */
export function cloudLocaleProbeReason(
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

  const lang = typeof payload.language === "string" ? payload.language : "";
  if (!/^zh\b/i.test(lang)) return null;

  const ua = typeof payload.userAgent === "string" ? payload.userAgent : "";
  const sw = payload.screenWidth;
  const sh = payload.screenHeight;
  const desktopUa = isDesktopBrowserUa(ua);
  const desktopSized =
    typeof sw === "number" &&
    typeof sh === "number" &&
    sw >= 1024 &&
    sh >= 768;
  if (!desktopUa && !(ua === "" && desktopSized)) return null;

  const nearSquare = isNearSquareDesktopProbeScreen(sw, sh);
  const ip = typeof payload.ip === "string" ? payload.ip : null;
  const tencent = isTencentCloudIp(ip);
  const huawei = isHuaweiCloudIp(ip);
  const cnCloud = isCnCloudHostingIp(ip);
  const cloudLabel = tencent ? "Tencent" : huawei ? "Huawei" : null;

  if (nearSquare) {
    return cloudLabel
      ? `zh desktop cloud locale probe (near-square screen + ${cloudLabel} egress)`
      : "zh desktop cloud locale probe (near-square screen)";
  }

  // Common screen (e.g. 1920×1080) still botty when zh + shallow desktop
  // + CN cloud egress — the Oct 2026 SEO scrape farm used both.
  if (cnCloud && desktopSized) {
    return `zh desktop cloud locale probe (${cloudLabel ?? "CN cloud"} egress)`;
  }

  return null;
}

export function isCloudLocaleProbePayload(
  payload: Record<string, unknown>,
  opts?: WebProbeOptions,
): boolean {
  return cloudLocaleProbeReason(payload, opts) != null;
}
