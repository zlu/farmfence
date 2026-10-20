/**
 * Web-session datacenter headless probes + cloud locale scrapers.
 *
 * Single-payload tells for spaced farms that rotate IPs slower than a
 * same-IP burst window (Saginaw Level3, Council Bluffs GCP, Ashburn EC2
 * with POSIX locales, Boardman device-farm geo, Anyang-si UTC English,
 * zh-CN desktop scrapers on Tencent/Aceville egress).
 *
 * Most rules require a shallow / low-usage visit. Synthetic timezone
 * `Etc/Unknown` and `@posix` locale never appear on real browsers, so those
 * flags ignore guest-preview milestones (`reader_engaged`, etc.). Does not
 * cover cross-visitor burst clustering — that needs a window of rows and
 * stays in the app.
 *
 * Ashburn *city* alone is never a signal (people live there); only
 * Boardman / The Dalles / Falkenstein city, or Ashburn+UTC/headless
 * corroboration. zh-CN alone is never a signal (diaspora / VPN users).
 */

import { isCnCloudHostingIp, isHuaweiCloudIp, isTencentCloudIp } from "./datacenter.js";

const EXPLICIT_AUTOMATION_UA =
  /lightpanda|headless(?:chrome)?|chrome-lighthouse|phantomjs|selenium|playwright|puppeteer|webdriver|cypress|dataprovider|semrush|ahrefs|mj12bot|dotbot|petalbot/i;

/** User agents that explicitly identify browser automation or scraping tools. */
export function isAutomatedBrowserUserAgent(
  userAgent: string | null | undefined,
): boolean {
  return Boolean(userAgent && EXPLICIT_AUTOMATION_UA.test(userAgent));
}

const HEADLESS_PROBE_SCREENS = new Set([
  "800x600",
  "1280x720",
  "1280x1024",
  "600x800",
  "1024x768",
  // Classic Xvfb / VNC 4:3 — Ace Data Centers US Linux aarch64 farm (Oct 2026).
  "1600x1200",
]);

/**
 * iPad CSS-pixel sizes. Real Macintosh / Windows desktop UAs never report
 * these — farms pair Mac Safari/Chrome UAs with iPad `window.screen` (Oct
 * 2026 SG + Asia/Shanghai + zh-CN + 820×1180 character scrapes).
 */
const IPAD_PROBE_SCREENS = new Set([
  "768x1024",
  "1024x768",
  "810x1080",
  "1080x810",
  "820x1180",
  "1180x820",
  "834x1112",
  "1112x834",
  "834x1194",
  "1194x834",
  "1024x1366",
  "1366x1024",
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

/**
 * Cloud-region cities that are never (or almost never) residential web
 * egress. Ashburn / Washington have residents — city alone must never
 * flag; always pair with UTC / classic headless screen / X11 below.
 * Washington catches GCP us-east egress that MaxMind maps to DC instead
 * of Council Bluffs (Oct 2026 Chrome/116 Mac farm).
 */
const DATACENTER_PROBE_CITIES = new Set([
  "ashburn",
  "centreville", // Ashburn-adjacent MaxMind for VA hosting / scrape egress
  "council bluffs",
  "boardman",
  "the dalles",
  "washington",
]);

/** East / SE Asia geos where America/* browser TZ is a proxy/farm tell. */
const EAST_ASIA_AMERICA_TZ_COUNTRIES = new Set([
  "JP",
  "KR",
  "TW",
  "HK",
  "SG",
  "CN",
  "TH",
  "VN",
  "MY",
  "PH",
  "ID",
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
  /**
   * The app has established that this payload landed on a protected,
   * byte-heavy or scrape-heavy path (for example an EPUB preview).
   */
  isSensitivePath?: boolean;
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

/** Login-friction probes (home→login→abandon) — not engagement for shallow. */
function isLoginFrictionMilestone(name: string): boolean {
  return (
    name === "login_opened" ||
    name === "login_abandoned" ||
    name === "sign_in_opened" ||
    name === "sign_in_abandoned" ||
    name === "sign_in_canceled_google" ||
    name === "sign_in_canceled_apple"
  );
}

/** Max visible-tab seconds for strong geo↔TZ mismatch farms (LATAM/non-CN/US-X11).
 *  Oct 2026 Shanghai proxy wave often sits 30–35s on preview reader. */
const STRONG_MISMATCH_MAX_USAGE_SECONDS = 45;
/** Login→support bounces often hit 3 page views / 3 friction milestones. */
const STRONG_MISMATCH_MAX_PAGE_VIEWS = 4;
const STRONG_MISMATCH_MAX_MILESTONES = 4;

/**
 * Geos where Asia/Shanghai (etc.) is a native browser TZ. Outside this set,
 * China mainland TZ + English + synthetic screen is a cloud/proxy farm tell
 * (SG/HK Alibaba, VN HCMC, DE Krefeld — Oct 2026 square Mac scrapers).
 */
const CHINA_MAINLAND_TZ_NATIVE_COUNTRIES = new Set(["CN"]);

export function isShallowWebProbePayload(
  payload: Record<string, unknown>,
  maxUsageSeconds = 15,
  opts?: {
    maxPageViews?: number;
    maxMilestones?: number;
    ignoreLoginFriction?: boolean;
  },
): boolean {
  const maxPageViews = opts?.maxPageViews ?? 2;
  const maxMilestones = opts?.maxMilestones ?? 2;
  const pv = typeof payload.pageViewCount === "number" ? payload.pageViewCount : 0;
  if (pv > maxPageViews) return false;
  const usage =
    typeof payload.totalUsageSeconds === "number" ? payload.totalUsageSeconds : 0;
  if (usage > maxUsageSeconds) return false;
  const reached = Array.isArray(payload.funnelReached) ? payload.funnelReached : [];
  const milestones = reached.filter(
    (n) =>
      typeof n === "string" &&
      n !== "page_view" &&
      !n.startsWith("cta_") &&
      !isSearchNoiseMilestone(n) &&
      !(opts?.ignoreLoginFriction && isLoginFrictionMilestone(n)),
  );
  if (milestones.length > maxMilestones) return false;
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
  const usage =
    typeof payload.totalUsageSeconds === "number" ? payload.totalUsageSeconds : 0;

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
  const ua = typeof payload.userAgent === "string" ? payload.userAgent : "";
  const x11Linux = /X11;\s*Linux/i.test(ua);
  const staleMacCatalinaChrome = isStaleMacCatalinaChromeUa(ua);

  if (isAutomatedBrowserUserAgent(ua)) {
    return /\blightpanda(?:\/|$)/i.test(ua)
      ? "Lightpanda headless browser"
      : "Explicit browser automation / scraper user agent";
  }

  // High-confidence China-TZ residential-proxy wave on an app-designated
  // sensitive path. Automatic preview milestones and elapsed time do not
  // clear it — the preview UI itself emits those. Opt-in via isSensitivePath
  // so the signal is never applied site-wide (HK VPN / diaspora on HTML).
  // Stale Win/Mac Chrome≤125 is corroboration, not required: Oct 2026 wave
  // also uses current X11 Linux Chrome (146+) with Asia/Shanghai + en.
  const guestUnsigned =
    payload.signedIn !== true &&
    !(typeof payload.email === "string" && payload.email.includes("@"));

  if (
    opts?.isSensitivePath === true &&
    guestUnsigned &&
    country !== "" &&
    country !== "CN" &&
    isChinaMainlandTimezone(tz) &&
    /^en\b/i.test(lang)
  ) {
    return isStaleDesktopProxyFarmUa(ua)
      ? "China browser TZ on non-CN geo + stale desktop browser (proxy farm)"
      : "China browser TZ on non-CN geo (proxy farm)";
  }

  // Synthetic TZ / POSIX locale never appear on real browsers. Guest preview
  // milestones (reader_engaged after a few seconds of visible time) must not
  // exempt — Oct 2026 Council Bluffs GCP farm opened Home→Preview→Reader on
  // Odyssey while still reporting Etc/Unknown + 1024×1024.
  if (guestUnsigned) {
    if (/@posix/i.test(lang)) {
      return "Synthetic POSIX locale (datacenter headless probe)";
    }
    if (/^etc\/unknown$/i.test(tz) || /^unknown$/i.test(tz)) {
      return "Synthetic timezone Etc/Unknown (datacenter probe)";
    }
  }

  const shallowTight =
    typeof opts?.isShallow === "boolean"
      ? opts.isShallow
      : isShallowWebProbePayload(payload, 15);
  // Strong geo↔TZ mismatch: own shallow gate (not opts.isShallow). Apps' tight
  // shallow often rejects login→abandon bounces (3 PVs); those are still probes.
  const shallowMismatch = isShallowWebProbePayload(
    payload,
    STRONG_MISMATCH_MAX_USAGE_SECONDS,
    {
      maxPageViews: STRONG_MISMATCH_MAX_PAGE_VIEWS,
      maxMilestones: STRONG_MISMATCH_MAX_MILESTONES,
      ignoreLoginFriction: true,
    },
  );

  // Strong geo↔TZ mismatch farms: allow up to 45s (Fortaleza 16s; Shanghai
  // proxy preview wave often 30–35s).
  if (usage <= STRONG_MISMATCH_MAX_USAGE_SECONDS && shallowMismatch) {
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

    // Non-CN egress with China mainland browser TZ + English. Screen is NOT
    // required: Oct 2026 wave (~3k/2h) rotates residential proxy geos
    // (BR/IN/PK/BD/ZA/US/…) with stock 1920×1080 and Asia/Shanghai + en-US
    // on /reader?preview=1 and /discover SEO. zh travelers still spared.
    if (
      country !== "" &&
      !CHINA_MAINLAND_TZ_NATIVE_COUNTRIES.has(country) &&
      isChinaMainlandTimezone(tz) &&
      /^en\b/i.test(lang)
    ) {
      return "China browser TZ on non-CN geo (cloud headless farm)";
    }

    // Desktop UA + iPad screen: hardware fingerprint lie (Mac/Win UA never
    // has 820×1180). Catches zh SG/Shanghai farms that drop the `en` tell.
    if (
      isDesktopBrowserUa(ua) &&
      IPAD_PROBE_SCREENS.has(screen) &&
      (/^zh\b/i.test(lang) || /^en\b/i.test(lang))
    ) {
      return "Desktop UA with iPad screen (headless farm)";
    }

    // iPhone Safari Version/ major ≫ iOS major (Oct 2026 anne-carson farm:
    // iOS 18_7 + Version/26.6.1). Real iOS Safari Version tracks the OS.
    if (isSpoofedIphoneSafariVersion(ua)) {
      return "iPhone Safari Version spoof (ahead of iOS)";
    }

    // US + America/* + X11 Linux + 1920×1080 (LogicWeb / Aceville / residential
    // proxy). Farm rotates PT/ET/CT while keeping the same desktop fingerprint;
    // real US Linux desktops are rare on this exact 1920×1080 + en probe shape.
    if (
      country === "US" &&
      /^America\//i.test(tz) &&
      x11Linux &&
      screen === "1920x1080" &&
      /^en\b/i.test(lang)
    ) {
      return "US X11 Linux America-timezone headless probe";
    }

    // US + Europe/Kiev|Kyiv + X11 Linux (Oct 2026 NYC/Miami scrapers with
    // Ukrainian browser TZ). Real UA residents use UA geo; US travelers use
    // America/* — X11+en+Kiev on US egress is the farm tell.
    if (
      country === "US" &&
      /^Europe\/(Kiev|Kyiv)$/i.test(tz) &&
      x11Linux &&
      /^en\b/i.test(lang)
    ) {
      return "US X11 Linux Europe/Kiev timezone headless probe";
    }

    // East/SE Asia egress + America/* browser TZ + English (Oct 2026 Osaka
    // anne-carson farm with America/New_York). Real travelers keep Asia/* TZ.
    if (
      EAST_ASIA_AMERICA_TZ_COUNTRIES.has(country) &&
      /^America\//i.test(tz) &&
      /^en\b/i.test(lang)
    ) {
      return "America browser TZ on East-Asia geo (proxy/headless farm)";
    }

    // Non-RU geo + Asia/Yekaterinburg + Russian locale (Oct 2026 Madrid X11
    // Firefox farm). Yekaterinburg is a Russian civil TZ — not EU residential.
    if (
      country !== "" &&
      country !== "RU" &&
      /^Asia\/Yekaterinburg$/i.test(tz) &&
      /^ru\b/i.test(lang)
    ) {
      return "Asia/Yekaterinburg on non-RU geo (proxy/headless farm)";
    }

    // LATAM + UTC + X11 Linux + English (Oct 2026 Querétaro Mega Cable scrape).
    // 1920×1080 is a common real desktop size so UTC+X11+en is the tell —
    // not the screen alone. es locale / local TZ spared.
    if (
      LATAM_COUNTRIES.has(country) &&
      (/^UTC$/i.test(tz) || /^Etc\/UTC$/i.test(tz)) &&
      x11Linux &&
      /^en\b/i.test(lang)
    ) {
      return "UTC X11 Linux probe from LATAM geo";
    }

    // US + UTC + X11 Linux + English (Oct 2026 Ace Data Centers San Jose /
    // Cogent NYC Linux aarch64 Chrome farm, often 1600×1200). Real US
    // residents use America/* — UTC+X11+en on US egress is the farm tell.
    if (
      country === "US" &&
      (/^UTC$/i.test(tz) || /^Etc\/UTC$/i.test(tz)) &&
      x11Linux &&
      /^en\b/i.test(lang)
    ) {
      return "UTC X11 Linux probe from US geo";
    }

    // Reston / Herndon are Cisco Umbrella / OpenDNS POPs (Eastern Time).
    // Pacific TZ + English + shallow is a scanner/farm tell — Reston
    // residents use America/New_York. Engaged CA corp proxy users spared
    // by the shallow gate.
    if (
      (city === "reston" || city === "herndon") &&
      /^America\/Los_Angeles$/i.test(tz) &&
      /^en\b/i.test(lang)
    ) {
      return "US East Coast OpenDNS POP + Pacific TZ probe";
    }
  }

  if (!shallowTight) return null;
  if (usage > 15) return null;

  const utcTz = /^UTC$/i.test(tz) || /^Etc\/UTC$/i.test(tz);

  // Boardman / The Dalles / Falkenstein (Hetzner): no residential web egress —
  // shallow alone is enough (farm images often ship America/Los_Angeles, not UTC).
  if (city === "boardman" || city === "the dalles" || city === "falkenstein") {
    const label = typeof payload.city === "string" ? payload.city.trim() : city;
    return `Datacenter city probe (${label})`;
  }

  // Ashburn / Centreville / Council Bluffs / Washington need UTC, classic
  // headless screen, or X11 Linux corroboration (Ashburn/DC have residents;
  // city alone must never flag).
  if (
    DATACENTER_PROBE_CITIES.has(city) &&
    (utcTz || HEADLESS_PROBE_SCREENS.has(screen) || x11Linux)
  ) {
    const label = typeof payload.city === "string" ? payload.city.trim() : city;
    return `Datacenter city probe (${label})`;
  }

  // UTC + classic headless screen is never residential (800×600 / 1280×720…).
  // Country list used to gate this; SG/JP farms slipped — screen+UTC is enough.
  if (utcTz && HEADLESS_PROBE_SCREENS.has(screen)) {
    return "UTC headless desktop probe";
  }

  // Stock Puppeteer/Chromedriver UA for years: Mac 10.15 + ancient Chrome
  // + UTC + English (GCP→DC and SG Vultr farms, Oct 2026).
  // Real Catalina users are gone; America/New_York MacBooks are spared.
  if (
    utcTz &&
    staleMacCatalinaChrome &&
    /^en\b/i.test(lang) &&
    (country === "US" ||
      country === "CA" ||
      EAST_ASIA_AMERICA_TZ_COUNTRIES.has(country))
  ) {
    return "UTC stale Mac Catalina Chrome probe";
  }

  // East-Asia residential geos never ship browser TZ as UTC with an English
  // locale — catches spaced Anyang-si / SG mobile probes that miss classic
  // headless screens and the same-IP burst window.
  if (
    utcTz &&
    EAST_ASIA_AMERICA_TZ_COUNTRIES.has(country) &&
    /^en\b/i.test(lang)
  ) {
    return "UTC English probe from East-Asia residential geo";
  }

  return null;
}

/**
 * Default Puppeteer / Selenium Mac UA: Catalina (`10_15_7`) with a Chrome
 * major that stopped shipping years ago. Threshold is deliberately below
 * current stable so real outdated laptops on local TZ are not swept in —
 * this helper is only consulted with UTC (or other strong) corroboration.
 */
function isStaleMacCatalinaChromeUa(ua: string): boolean {
  if (!/Macintosh;\s*Intel Mac OS X 10[_ ]15/i.test(ua)) return false;
  const m = ua.match(/Chrome\/(\d+)/i);
  if (!m) return false;
  const major = Number(m[1]);
  return Number.isFinite(major) && major > 0 && major <= 120;
}

/** Desktop browser majors observed in the Oct 2026 EPUB/preview proxy wave. */
function isStaleDesktopProxyFarmUa(ua: string): boolean {
  if (!/Windows NT|Macintosh/i.test(ua)) return false;
  if (/OPR\/|Brave\//i.test(ua)) return false;
  const version = ua.match(/(?:Chrome|Edg|Firefox)\/(\d+)/i);
  if (!version) return false;
  const major = Number(version[1]);
  return Number.isFinite(major) && major >= 110 && major <= 125;
}

/**
 * Mobile Safari `Version/N` tracks iOS major (iOS 18 → Version/18.x).
 * Farms spoof Version/26+ on iOS 18 UAs. Skip FxiOS/CriOS/etc. (no Version/).
 */
function isSpoofedIphoneSafariVersion(ua: string): boolean {
  if (!/iPhone|iPad|iPod/i.test(ua)) return false;
  if (/FxiOS|CriOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) return false;
  const ios = ua.match(/OS (\d+)[._]\d+/i);
  const ver = ua.match(/Version\/(\d+)/i);
  if (!ios || !ver) return false;
  const iosMajor = Number(ios[1]);
  const safariMajor = Number(ver[1]);
  if (!Number.isFinite(iosMajor) || !Number.isFinite(safariMajor)) return false;
  return safariMajor >= iosMajor + 3;
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
