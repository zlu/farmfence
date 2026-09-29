/**
 * farmfence — exclude device-farm / review-farm / crawler traffic from analytics.
 *
 * 1. AWS us-west-2 device farm (Boardman, OR): datacenter IP / Vercel Boardman
 *    geo. No residential user egresses from Boardman EC2, so this is never
 *    overridden (UTC / scripted-tour corroboration is optional diagnostics only —
 *    modern farm images often ship with a US timezone and barely open the app).
 * 2. Google Play / Apple review farm: Googlebot/proxy (`66.249.x`), Google
 *    user-triggered fetchers (published CIDRs), and Google / Apple infra
 *    ranges. Corroborated by a Play-farm randomized locale (e.g. `en-SG`,
 *    `en-JM` — rotated independently of the device timezone), a
 *    locale↔timezone contradiction, and/or a rapid OAuth attempt/cancel loop.
 *    Play Robo tests hammer Google Sign-In and cancel; that is a bot tell,
 *    not proof of a human. Google fetcher IP + randomized locale is never
 *    overridden (those ranges are Google's fetchers, not Google Fi NAT).
 *
 * Safe to run on any payload shape. Typically anonymous.
 */

/** AWS us-west-2 (Boardman, OR) egress ranges, from AWS ip-ranges.json. */
const AWS_US_WEST_2_CIDRS = [
  "35.80.0.0/12",
  "35.160.0.0/13",
  "44.224.0.0/11",
  "52.12.0.0/15",
  "52.36.0.0/14",
  "52.88.0.0/13",
  "54.68.0.0/14",
  "54.148.0.0/15",
  "54.184.0.0/13",
  "54.200.0.0/15",
  "54.212.0.0/15",
  "54.218.0.0/15",
  "54.244.0.0/16",
  "54.245.0.0/16",
];

function parseIpv4(ip: string): number | null {
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4) return null;
  if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
  return ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
}

function parseIpv6(ip: string): bigint | null {
  let value = ip.trim().toLowerCase();
  if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);
  if (value.includes(".")) return null;
  const halves = value.split("::");
  if (halves.length > 2) return null;
  const parseGroups = (part: string): number[] | null => {
    if (!part) return [];
    const groups = part.split(":");
    const out: number[] = [];
    for (const group of groups) {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null;
      out.push(parseInt(group, 16));
    }
    return out;
  };
  let groups: number[];
  if (halves.length === 1) {
    const parsed = parseGroups(halves[0]!);
    if (!parsed || parsed.length !== 8) return null;
    groups = parsed;
  } else {
    const left = parseGroups(halves[0]!);
    const right = parseGroups(halves[1]!);
    if (!left || !right) return null;
    const fill = 8 - left.length - right.length;
    if (fill < 0) return null;
    groups = [...left, ...Array(fill).fill(0), ...right];
  }
  let n = BigInt(0);
  for (const group of groups) n = (n << BigInt(16)) + BigInt(group);
  return n;
}

function mappedIpv4(ip: string): string {
  const trimmed = ip.trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  return mapped ? mapped[1]! : trimmed;
}

function ipInCidr(ip: string | null | undefined, cidr: string): boolean {
  if (!ip) return false;
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  if (!range || !Number.isInteger(bits)) return false;

  const ipv4 = parseIpv4(mappedIpv4(ip));
  if (ipv4 != null && !range.includes(":")) {
    if (bits < 0 || bits > 32) return false;
    const rangeInt = parseIpv4(range);
    if (rangeInt == null) return false;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ipv4 & mask) === (rangeInt & mask);
  }

  if (bits < 0 || bits > 128) return false;
  const ip6 = parseIpv6(ip);
  const range6 = parseIpv6(range);
  if (ip6 == null || range6 == null) return false;
  const mask =
    bits === 0 ? BigInt(0) : ((BigInt(1) << BigInt(128)) - BigInt(1)) << BigInt(128 - bits);
  return (ip6 & mask) === (range6 & mask);
}

/** AWS us-west-2 (Boardman, OR) datacenter IP — the device-farm egress region. */
export function isAwsUsWest2Ip(ip: string | null | undefined): boolean {
  return AWS_US_WEST_2_CIDRS.some((cidr) => ipInCidr(ip, cidr));
}

const SCRIPTED_FEATURE_EVENTS_MIN = 4;
const SCRIPTED_FEATURE_SPAN_MS = 100;

type FeatureBurst = { count: number; spanMs: number };

/**
 * Scripted UI-automation tell: >=4 distinct `feature_*` interactions inside a
 * 100ms window. Funnel events are stored as `name@ISO-timestamp` strings.
 * Returns the tightest qualifying window (for diagnostics) or null.
 */
function featureBurstStats(payload: Record<string, unknown>): FeatureBurst | null {
  const events = Array.isArray(payload.funnelEvents) ? payload.funnelEvents : [];
  const feature: Array<{ name: string; at: number }> = [];
  for (const raw of events) {
    if (typeof raw !== "string") continue;
    const sep = raw.lastIndexOf("@");
    if (sep <= 0) continue;
    const name = raw.slice(0, sep);
    if (!name.startsWith("feature_")) continue;
    const at = Date.parse(raw.slice(sep + 1));
    if (!Number.isFinite(at)) continue;
    feature.push({ name, at });
  }
  if (feature.length < SCRIPTED_FEATURE_EVENTS_MIN) return null;
  const distinctNames = new Set(feature.map((e) => e.name));
  if (distinctNames.size < SCRIPTED_FEATURE_EVENTS_MIN) return null;
  const times = feature.map((e) => e.at).sort((a, b) => a - b);
  let best: FeatureBurst | null = null;
  for (let i = 0; i + SCRIPTED_FEATURE_EVENTS_MIN - 1 < times.length; i++) {
    const span = times[i + SCRIPTED_FEATURE_EVENTS_MIN - 1]! - times[i]!;
    if (span <= SCRIPTED_FEATURE_SPAN_MS && (best == null || span < best.spanMs)) {
      best = { count: SCRIPTED_FEATURE_EVENTS_MIN, spanMs: span };
    }
  }
  return best;
}

type InstallBotSignals = {
  awsUsWest2: boolean;
  utcOffset: boolean;
  burst: FeatureBurst | null;
};

function installBotSignals(payload: Record<string, unknown>): InstallBotSignals {
  const ip = typeof payload.ip === "string" ? payload.ip : null;
  const firstIp = typeof payload.firstSeenIp === "string" ? payload.firstSeenIp : null;
  return {
    awsUsWest2:
      isAwsUsWest2Ip(ip) ||
      isAwsUsWest2Ip(firstIp) ||
      // Vercel geo label for those ranges (server-derived, not client-spoofable).
      (typeof payload.region === "string" &&
        payload.region.trim().toUpperCase() === "OR" &&
        typeof payload.city === "string" &&
        payload.city.trim().toLowerCase().startsWith("boardman")),
    utcOffset: payload.timezoneOffsetMinutes === 0,
    burst: featureBurstStats(payload),
  };
}

/**
 * Never-overridden farm/crawler install: AWS us-west-2 device farm, or a
 * Google user-triggered fetcher IP with a Play-farm randomized locale
 * (`en-SG`, `en-JM`, …). Idle reading does not clear these.
 */
export function isLikelyBotInstallPayload(payload: Record<string, unknown>): boolean {
  const signals = installBotSignals(payload);
  if (signals.awsUsWest2) return true;
  const play = playCrawlerSignals(payload);
  return Boolean(play?.userTriggeredFetcher && play.randomizedLocale);
}

/**
 * Human-readable reason for an auto-detected farm/crawler install, or null
 * when the payload does not qualify. Used for the admin bot-flag badge.
 */
export function botInstallReason(payload: Record<string, unknown>): string | null {
  const signals = installBotSignals(payload);
  if (signals.awsUsWest2) {
    const parts = ["AWS us-west-2 datacenter IP (Boardman, OR)"];
    if (signals.utcOffset) parts.push("UTC timezone");
    if (signals.burst) {
      parts.push(`${signals.burst.count} feature events in ${signals.burst.spanMs}ms`);
    }
    return parts.join(" · ");
  }
  return playCrawlerReason(payload);
}

function positiveCount(payload: Record<string, unknown>, key: string): number {
  const v = payload[key];
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** First→last activity span: payload timestamps, else the funnel event log. */
function sessionSpanMs(payload: Record<string, unknown>): number {
  const first = typeof payload.firstSeenAtMs === "number" ? payload.firstSeenAtMs : null;
  const last = typeof payload.lastSeenAtMs === "number" ? payload.lastSeenAtMs : null;
  if (first != null && last != null && Number.isFinite(first) && Number.isFinite(last)) {
    return Math.max(0, last - first);
  }
  const events = Array.isArray(payload.funnelEvents) ? payload.funnelEvents : [];
  let min = Infinity;
  let max = -Infinity;
  for (const raw of events) {
    if (typeof raw !== "string") continue;
    const sep = raw.lastIndexOf("@");
    if (sep <= 0) continue;
    const at = Date.parse(raw.slice(sep + 1));
    if (!Number.isFinite(at)) continue;
    if (at < min) min = at;
    if (at > max) max = at;
  }
  return Number.isFinite(min) && Number.isFinite(max) ? Math.max(0, max - min) : 0;
}

/**
 * Google user-triggered fetchers (Gmail / Docs / Sites / Play fetching a
 * user-generated URL). Compacted from
 * https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers-google.json
 * (snapshot 2026-08-24). IPv6 covers 2001:4860:4801:4000::/55 (4000–41ff).
 */
const GOOGLE_USER_TRIGGERED_FETCHER_CIDRS = [
  "64.233.172.0/23",
  "66.102.6.0/22",
  "66.249.80.0/22",
  "66.249.84.0/23",
  "66.249.88.0/24",
  "66.249.93.0/24",
  "74.125.208.0/21",
  "142.250.32.0/23",
  "172.253.181.0/24",
  "172.253.182.0/23",
  "192.178.8.0/21",
  "2001:4860:4801:4000::/55",
];

export function isGoogleUserTriggeredFetcherIp(ip: string | null | undefined): boolean {
  return GOOGLE_USER_TRIGGERED_FETCHER_CIDRS.some((cidr) => ipInCidr(ip, cidr));
}

/**
 * Heuristic for Play / App Store / cloud review traffic (not a real reader).
 * `66.249.x` is Googlebot / google-proxy; Google user-triggered fetchers use
 * the published CIDRs (`192.178.`, `172.253.`, `66.102.`, `74.125.208+`,
 * IPv6 `2001:4860:4801:4…`). Broader Google infra prefixes still catch Play
 * pre-launch (`108.177.x` is Google ASN / special-crawler-adjacent; not in the
 * published user-triggered-fetcher snapshot). Apple Cupertino ranges cover
 * App Review / TestFlight devices.
 */
export function isLikelyBotIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  if (isGoogleCrawlerIp(ip)) return true;
  const value = ip.trim().toLowerCase();
  if (
    value.startsWith("66.249.") ||
    value.startsWith("66.102.") ||
    value.startsWith("74.125.") ||
    value.startsWith("72.14.") ||
    value.startsWith("209.85.") ||
    value.startsWith("64.233.") ||
    value.startsWith("108.177.") ||
    value.startsWith("142.250.") ||
    value.startsWith("172.217.") ||
    value.startsWith("172.253.") ||
    value.startsWith("192.178.")
  ) {
    return true;
  }
  if (value.startsWith("139.178.") || value.startsWith("17.")) {
    return true;
  }
  return false;
}

/**
 * Googlebot / google-proxy (`66.249.x`) or a published Google user-triggered
 * fetcher address. Broader Google infra (`74.125.x` outside the fetcher
 * /21) can be Google Fi NAT — those stay on `isLikelyBotIp` only.
 */
export function isGoogleCrawlerIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  if (ip.trim().toLowerCase().startsWith("66.249.")) return true;
  return isGoogleUserTriggeredFetcherIp(ip);
}

export function reviewFarmIp(payload: Record<string, unknown>): string | null {
  const ip = typeof payload.ip === "string" ? payload.ip : null;
  const firstIp = typeof payload.firstSeenIp === "string" ? payload.firstSeenIp : null;
  if (isLikelyBotIp(ip)) return ip;
  if (isLikelyBotIp(firstIp)) return firstIp;
  return null;
}

type FunnelEvent = { name: string; at: number };

function parseFunnelEvents(payload: Record<string, unknown>): FunnelEvent[] {
  const events = Array.isArray(payload.funnelEvents) ? payload.funnelEvents : [];
  const out: FunnelEvent[] = [];
  for (const raw of events) {
    if (typeof raw !== "string") continue;
    const sep = raw.lastIndexOf("@");
    if (sep <= 0) continue;
    const at = Date.parse(raw.slice(sep + 1));
    if (!Number.isFinite(at)) continue;
    out.push({ name: raw.slice(0, sep), at });
  }
  return out;
}

const MIN_RAPID_CANCELS = 3;
const MAX_RAPID_CANCEL_SPAN_MS = 4 * 60_000;

type OauthCancelLoop = { cancels: number; spanMs: number };

/**
 * Play Robo / pre-launch tell: several OAuth cancels packed into a few minutes
 * (often 1–4s after each Google Sign-In tap). A person retrying over days does
 * not match this window.
 */
function rapidOauthCancelLoop(payload: Record<string, unknown>): OauthCancelLoop | null {
  const cancelAt = parseFunnelEvents(payload)
    .filter((e) => e.name === "sign_in_canceled_google" || e.name === "sign_in_canceled_apple")
    .map((e) => e.at)
    .sort((a, b) => a - b);
  if (cancelAt.length >= MIN_RAPID_CANCELS) {
    const span = cancelAt[cancelAt.length - 1]! - cancelAt[0]!;
    if (span <= MAX_RAPID_CANCEL_SPAN_MS) {
      return { cancels: cancelAt.length, spanMs: span };
    }
  }
  const cancels =
    positiveCount(payload, "signInCancelApple") + positiveCount(payload, "signInCancelGoogle");
  if (cancels >= MIN_RAPID_CANCELS && sessionSpanMs(payload) <= 10 * 60_000) {
    return { cancels, spanMs: sessionSpanMs(payload) };
  }
  return null;
}

/**
 * Region → allowed `timezoneOffsetMinutes` (local minus UTC), including DST
 * variants. Omitted regions are unknown (no mismatch). Jamaica is UTC-5 year
 * round; UTC-7 is Pacific Daylight / Arizona — a Play-farm fingerprint.
 */
const REGION_UTC_OFFSETS_MINUTES: Record<string, number[]> = {
  JM: [-300],
  TT: [-240],
  BB: [-240],
  NG: [60],
  GH: [0],
  ZA: [120],
  KE: [180],
  SG: [480],
  PH: [480],
  HK: [480],
  IN: [330],
  IE: [0, 60],
  GB: [0, 60],
  BE: [60, 120],
  NL: [60, 120],
  DE: [60, 120],
  FR: [60, 120],
  NZ: [720, 780],
  AU: [480, 570, 600, 630, 660],
};

function languageRegion(language: string | null): string | null {
  if (!language) return null;
  const parts = language.trim().split(/[-_]/).filter(Boolean);
  for (let i = parts.length - 1; i >= 1; i--) {
    const part = parts[i]!;
    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
  }
  return null;
}

function payloadLanguage(payload: Record<string, unknown>): string | null {
  for (const key of ["language", "deviceLanguage"] as const) {
    const v = payload[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function timezoneOffsetMinutes(payload: Record<string, unknown>): number | null {
  const v = payload.timezoneOffsetMinutes;
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : null;
}

export function formatUtcOffsetLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

type LocaleTimezoneMismatch = { language: string; region: string; tzLabel: string };

function localeTimezoneMismatch(payload: Record<string, unknown>): LocaleTimezoneMismatch | null {
  const language = payloadLanguage(payload);
  const region = languageRegion(language);
  const offset = timezoneOffsetMinutes(payload);
  if (!language || !region || offset == null) return null;
  const allowed = REGION_UTC_OFFSETS_MINUTES[region];
  if (!allowed || allowed.includes(offset)) return null;
  return { language, region, tzLabel: formatUtcOffsetLabel(offset) };
}

/**
 * Play pre-launch / Google fetcher farms rotate device locales (`en-SG`,
 * `en-JM`, …) independently of timezone. Matching TZ does not make them human.
 */
function playFarmRandomizedLocale(payload: Record<string, unknown>): string | null {
  const language = payloadLanguage(payload);
  const region = languageRegion(language);
  if (!language || !region) return null;
  if (!(region in REGION_UTC_OFFSETS_MINUTES)) return null;
  return language;
}

export type PlayCrawlerSignals = {
  ip: string;
  googleCrawler: boolean;
  userTriggeredFetcher: boolean;
  mismatch: LocaleTimezoneMismatch | null;
  randomizedLocale: string | null;
  cancelLoop: OauthCancelLoop | null;
};

/**
 * Google/Apple review IP plus a Play-farm tell: randomized locale (en-SG on
 * a Google user-triggered fetcher), locale contradicts timezone (en-JM on
 * UTC-7), and/or a packed OAuth cancel loop.
 */
export function playCrawlerSignals(payload: Record<string, unknown>): PlayCrawlerSignals | null {
  const ip = reviewFarmIp(payload);
  if (!ip) return null;
  const mismatch = localeTimezoneMismatch(payload);
  const cancelLoop = rapidOauthCancelLoop(payload);
  const userTriggeredFetcher = isGoogleUserTriggeredFetcherIp(ip);
  const randomizedLocale = userTriggeredFetcher ? playFarmRandomizedLocale(payload) : null;
  if (!mismatch && !cancelLoop && !randomizedLocale) return null;
  return {
    ip,
    googleCrawler: isGoogleCrawlerIp(ip),
    userTriggeredFetcher,
    mismatch,
    randomizedLocale,
    cancelLoop,
  };
}

function formatSpanShort(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
}

function googleFetcherIpLabel(signals: PlayCrawlerSignals): string {
  if (signals.ip.trim().toLowerCase().startsWith("66.249.")) {
    return "Googlebot / Google proxy IP";
  }
  if (signals.userTriggeredFetcher || signals.googleCrawler) {
    return "Google user-triggered fetcher IP";
  }
  return "Google/Apple review-farm IP";
}

function playCrawlerReason(payload: Record<string, unknown>): string | null {
  const signals = playCrawlerSignals(payload);
  if (!signals) return null;
  const parts = [googleFetcherIpLabel(signals)];
  if (signals.mismatch) {
    parts.push(`locale ${signals.mismatch.language} vs ${signals.mismatch.tzLabel}`);
  } else if (signals.randomizedLocale) {
    parts.push(`randomized locale ${signals.randomizedLocale}`);
  }
  if (signals.cancelLoop) {
    parts.push(
      `${signals.cancelLoop.cancels} OAuth cancels in ${formatSpanShort(signals.cancelLoop.spanMs)}`,
    );
  }
  return parts.join(" · ");
}

const MIN_HUMAN_READING_SECONDS = 300;
const MIN_HUMAN_SESSION_SPAN_MS = 2 * 60 * 60_000;

/**
 * Behavioral override for IP-only bot flags (Google Fi / carrier NAT can
 * egress from Google-owned ranges like 74.125.x). Requires 5 minutes of app
 * usage (or reading, on older builds) or a multi-hour session — not sign-in
 * cancel friction (Play Robo hammers Google Sign-In) and not a 4-minute
 * first-launch tap tour. App Review devices often accrue a minute or two of
 * idle reader time; that is not enough. AWS device-farm and Google
 * user-triggered-fetcher + randomized locale (en-SG, …) detection are never
 * overridden.
 */
export function isHumanLikeInstall(payload: Record<string, unknown>): boolean {
  return (
    positiveCount(payload, "totalUsageSeconds") >= MIN_HUMAN_READING_SECONDS ||
    positiveCount(payload, "totalReadingSeconds") >= MIN_HUMAN_READING_SECONDS ||
    sessionSpanMs(payload) >= MIN_HUMAN_SESSION_SPAN_MS
  );
}
