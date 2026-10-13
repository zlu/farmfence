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

/**
 * Latin America ISO country codes — residential geos that never ship a
 * China IANA browser timezone unless the client is a proxy/headless farm
 * (Oct 2026 Melmoth pair: BR/EC egress + Asia/Shanghai + 800×600).
 */
const LATAM_COUNTRIES = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "CU",
  "DO",
  "EC",
  "GT",
  "HN",
  "MX",
  "NI",
  "PA",
  "PE",
  "PY",
  "SV",
  "UY",
  "VE",
]);

/** China mainland IANA / legacy TZ labels (not Singapore / HK / Taipei). */
function isChinaMainlandTimezone(tz: string): boolean {
  return (
    /^Asia\/Shanghai$/i.test(tz) ||
    /^Asia\/Chongqing$/i.test(tz) ||
    /^Asia\/Harbin$/i.test(tz) ||
    /^Asia\/Urumqi$/i.test(tz) ||
    /^PRC$/i.test(tz)
  );
}

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

  const ua = typeof payload.userAgent === "string" ? payload.userAgent : "";
  const x11Linux = /X11;\s*Linux/i.test(ua);

  // Ashburn / Council Bluffs need UTC, classic headless screen, or X11 Linux
  // corroboration (Ashburn has residents; city alone must never flag).
  if (
    DATACENTER_PROBE_CITIES.has(city) &&
    (utcTz || HEADLESS_PROBE_SCREENS.has(screen) || x11Linux)
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

  // LATAM residential egress + China mainland browser TZ is a proxy/farm
  // tell. Require classic headless screen or English locale so a real
  // Chinese traveler (zh + Asia/Shanghai + laptop) is not flagged.
  if (
    LATAM_COUNTRIES.has(country) &&
    isChinaMainlandTimezone(tz) &&
    (HEADLESS_PROBE_SCREENS.has(screen) || /^en\b/i.test(lang))
  ) {
    return "China browser TZ on LATAM geo (proxy/headless farm)";
  }

  // SG/HK cloud egress geo with China mainland browser TZ + English +
  // synthetic screen (perfect/near-square or classic headless). Catches
  // Alibaba SG 43.119 farms that set Asia/Shanghai on en-US Macs.
  if (
    (country === "SG" || country === "HK") &&
    isChinaMainlandTimezone(tz) &&
    /^en\b/i.test(lang) &&
    (HEADLESS_PROBE_SCREENS.has(screen) ||
      isNearSquareDesktopProbeScreen(sw, sh))
  ) {
    return "China browser TZ on SG/HK geo (cloud headless farm)";
  }

  // US egress + America/Los_Angeles + X11 Linux + 1920×1080 — Oct 2026
  // LogicWeb / Ashburn blog scrape farm (NYC geo with PT timezone, Chrome/153).
  // Real CA Linux desktops are rare on shallow 0s blog hits with this fingerprint.
  if (
    country === "US" &&
    /^America\/Los_Angeles$/i.test(tz) &&
    x11Linux &&
    screen === "1920x1080" &&
    /^en\b/i.test(lang)
  ) {
    return "US X11 Linux PT-timezone headless probe";
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
  // Orientation-agnostic: farms spoof portrait (1196×1365) and perfect
  // squares (1366×1366) as often as landscape near-squares.
  const lo = Math.min(w, h);
  const hi = Math.max(w, h);
  if (lo < 1000 || hi > 1500) return false;
  if (hi - lo > 220) return false;
  if (
    COMMON_DESKTOP_SCREENS.has(`${w}x${h}`) ||
    COMMON_DESKTOP_SCREENS.has(`${h}x${w}`)
  ) {
    return false;
  }
  return true;
}

function isDesktopBrowserUa(ua: string): boolean {
  if (!ua) return false;
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) return false;
  return /Windows NT|Macintosh|X11; (?:Ubuntu|Linux|CrOS)/i.test(ua);
}

/**
 * Real conversion — not guest-preview chrome. Guest `/reader?preview=1`
 * farms fire `preview_reader_opened` / `reader_opened` and would otherwise
 * look "engaged" to the shallow check.
 */
const STRONG_ENGAGEMENT_MILESTONES = new Set([
  "login_completed",
  "signup_completed",
  "book_added",
  "reader_engaged",
  "bookshelf_opened",
  "used_5min",
  "read_5min",
  "app_opened",
  "board_published",
  "project_published",
]);

function hasStrongEngagement(payload: Record<string, unknown>): boolean {
  const reached = Array.isArray(payload.funnelReached) ? payload.funnelReached : [];
  return reached.some(
    (n) => typeof n === "string" && STRONG_ENGAGEMENT_MILESTONES.has(n),
  );
}

/**
 * Spaced zh-CN (etc.) desktop cloud scrapers: fixed Chinese locale,
 * randomized near-square screen and/or CN cloud egress (Tencent / Huawei).
 * Geo+timezone are often spoofed to match the exit country, so mismatch
 * is not required. Never flags on language alone.
 *
 * Near-square screens are synthetic enough that guest-preview milestones
 * must not exempt (Oct 2026 Santa Clara / SG / HK farm opened
 * `/reader?preview=1` directly). Soft path (common screen + CN cloud)
 * still requires a shallow bounce.
 */
export function cloudLocaleProbeReason(
  payload: Record<string, unknown>,
  opts?: WebProbeOptions,
): string | null {
  const usage =
    typeof payload.totalUsageSeconds === "number" ? payload.totalUsageSeconds : 0;
  if (usage > 15) return null;

  const lang = typeof payload.language === "string" ? payload.language : "";
  if (!/^zh\b/i.test(lang)) return null;

  // Spare signed-in / converted sessions even with a probe-like screen.
  if (hasStrongEngagement(payload)) return null;

  const ua = typeof payload.userAgent === "string" ? payload.userAgent : "";
  const sw = payload.screenWidth;
  const sh = payload.screenHeight;
  const desktopUa = isDesktopBrowserUa(ua);
  const desktopSized =
    typeof sw === "number" &&
    typeof sh === "number" &&
    sw >= 1024 &&
    sh >= 768;
  const mobileUa = /iPhone|iPad|iPod|Android/i.test(ua);

  const nearSquare = isNearSquareDesktopProbeScreen(sw, sh);
  const ip = typeof payload.ip === "string" ? payload.ip : null;
  const tencent = isTencentCloudIp(ip);
  const huawei = isHuaweiCloudIp(ip);
  const cnCloud = isCnCloudHostingIp(ip);
  const cloudLabel = tencent ? "Tencent" : huawei ? "Huawei" : null;

  const shallow =
    typeof opts?.isShallow === "boolean"
      ? opts.isShallow
      : isShallowWebProbePayload(payload);

  if (desktopUa || (ua === "" && desktopSized)) {
    if (nearSquare) {
      // Ignore shallow — preview_reader_opened must not exempt.
      return cloudLabel
        ? `zh desktop cloud locale probe (near-square screen + ${cloudLabel} egress)`
        : "zh desktop cloud locale probe (near-square screen)";
    }

    if (!shallow) return null;

    // Common screen (e.g. 1920×1080) still botty when zh + shallow desktop
    // + CN cloud egress — the Oct 2026 SEO scrape farm used both.
    if (cnCloud && desktopSized) {
      return `zh desktop cloud locale probe (${cloudLabel ?? "CN cloud"} egress)`;
    }
    return null;
  }

  // zh mobile on Tencent/Huawei ECS — hosting egress, not residential CN
  // carriers. Oct 2026 Aceville iPhone farms hit book-detail / characters.
  if (shallow && cnCloud && mobileUa) {
    return `zh mobile cloud locale probe (${cloudLabel ?? "CN cloud"} egress)`;
  }

  return null;
}

export function isCloudLocaleProbePayload(
  payload: Record<string, unknown>,
  opts?: WebProbeOptions,
): boolean {
  return cloudLocaleProbeReason(payload, opts) != null;
}
