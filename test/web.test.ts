/**
 * Run: npx tsx test/web.test.ts
 */
import {
  isCnCloudHostingIp,
  isHuaweiCloudIp,
  isTencentCloudIp,
} from "../src/datacenter.js";
import {
  cloudLocaleProbeReason,
  datacenterHeadlessProbeReason,
  isAutomatedBrowserUserAgent,
  isCloudLocaleProbePayload,
  isDatacenterHeadlessProbePayload,
  isNearSquareDesktopProbeScreen,
  isShallowWebProbePayload,
} from "../src/web.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  isAutomatedBrowserUserAgent("Lightpanda/1.0"),
  "Lightpanda must be recognized as explicit browser automation",
);
assert(
  datacenterHeadlessProbeReason({
    country: "TR",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 720,
    totalUsageSeconds: 30,
    funnelReached: ["reader_opened", "reader_engaged"],
    userAgent: "Lightpanda/1.0",
  }) === "Lightpanda headless browser",
  "Lightpanda must flag regardless of synthetic engagement or elapsed time",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "205.169.39.52",
    city: "Saginaw",
    country: "US",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
    totalUsageSeconds: 0,
  }),
  "Saginaw UTC 800x600 shallow should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "34.72.176.129",
    city: "Council Bluffs",
    country: "US",
    timezone: "Etc/Unknown",
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Council Bluffs Etc/Unknown should flag",
);

assert(
  isDatacenterHeadlessProbePayload(
    {
      ip: "34.122.147.229",
      city: "Council Bluffs",
      country: "US",
      timezone: "Etc/Unknown",
      language: "en-US",
      screenWidth: 1024,
      screenHeight: 1024,
      pageViewCount: 2,
      totalUsageSeconds: 7,
      funnelReached: [
        "home_viewed",
        "page_view",
        "preview_reader_opened",
        "reader_engaged",
      ],
      entryPath: "/",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.60 Safari/537.36 Edge/12.246",
    },
    { isShallow: false },
  ),
  "Council Bluffs Etc/Unknown + reader_engaged must still flag (guest preview)",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "34.122.147.229",
    city: "Council Bluffs",
    country: "US",
    timezone: "Etc/Unknown",
    language: "en-US",
    screenWidth: 1024,
    screenHeight: 1024,
    pageViewCount: 2,
    funnelReached: ["home_viewed", "reader_engaged"],
    entryPath: "/",
    signedIn: true,
    email: "reader@example.com",
  }),
  "Signed-in Etc/Unknown must not auto-flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "51.38.135.19",
    city: "Warsaw",
    country: "PL",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 720,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Lone Warsaw OVH UTC 1280x720 shallow should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "98.87.15.12",
    city: "Ashburn",
    country: "US",
    timezone: "UTC",
    language: "en-US@posix",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Ashburn POSIX locale should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    city: "Boardman",
    country: "US",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 360,
    screenHeight: 780,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Boardman shallow (any TZ) should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "91.98.178.78",
    city: "Falkenstein",
    country: "DE",
    region: "SN",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
    totalUsageSeconds: 0,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.5477.1190 Safari/537.36",
  }),
  "Hetzner Falkenstein shallow (PT TZ spoof) should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "65.195.109.151",
    city: "New York City",
    country: "US",
    region: "NY",
    timezone: "Europe/Kiev",
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 900,
    pageViewCount: 3,
    totalUsageSeconds: 6,
    funnelReached: ["home_viewed", "login_opened", "login_abandoned", "app_nudge_shown"],
    entryPath: "/",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  }),
  "US X11 Linux Europe/Kiev shallow should flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Vyshneve",
    country: "UA",
    timezone: "Europe/Kiev",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  }),
  "UA residential Europe/Kiev must not flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "45.40.50.104",
    city: "Singapore",
    country: "SG",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    screenWidth: 820,
    screenHeight: 1180,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["character_opened"],
    entryPath: "/discover/the_cherry_orchard_se/characters/epihodov",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Safari/605.1.15",
  }),
  "SG Shanghai zh Mac UA + iPad 820x1180 should flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Singapore",
    country: "SG",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    screenWidth: 1512,
    screenHeight: 982,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  }),
  "SG Chinese traveler on real MacBook screen must not flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "45.78.58.170",
    city: "Osaka",
    country: "JP",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["app_nudge_shown"],
    entryPath: "/collections/anne-carson",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  }),
  "JP America/New_York shallow should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "194.26.202.49",
    city: "Centreville",
    country: "US",
    region: "VA",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["app_nudge_shown"],
    entryPath: "/collections/anne-carson",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  }),
  "Centreville VA X11 Linux shallow should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "45.76.146.8",
    city: "Singapore",
    country: "SG",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    totalUsageSeconds: 1,
    funnelReached: ["app_nudge_shown"],
    entryPath: "/collections/anne-carson",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  }),
  "SG UTC 800x600 Mac Catalina Chrome should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "94.131.127.240",
    city: "Madrid",
    country: "ES",
    timezone: "Asia/Yekaterinburg",
    language: "ru-RU",
    screenWidth: 2144,
    screenHeight: 1206,
    pageViewCount: 1,
    totalUsageSeconds: 1,
    funnelReached: ["app_nudge_shown"],
    entryPath: "/collections/anne-carson",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64; rv:157.0) Gecko/20100101 Firefox/157.0",
  }),
  "ES Asia/Yekaterinburg ru-RU should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "71.167.211.120",
    city: "New York City",
    country: "US",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 393,
    screenHeight: 852,
    pageViewCount: 1,
    totalUsageSeconds: 15,
    funnelReached: ["app_nudge_shown"],
    entryPath: "/collections/anne-carson",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1",
  }),
  "iPhone iOS 18 + Safari Version/26 should flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "New York City",
    country: "US",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 393,
    screenHeight: 852,
    pageViewCount: 1,
    totalUsageSeconds: 15,
    funnelReached: ["app_nudge_shown"],
    entryPath: "/collections/anne-carson",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6.2 Mobile/15E148 Safari/604.1",
  }),
  "Real iPhone iOS 18 + Safari Version/18 must not flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    city: "Anyang-si",
    country: "KR",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 360,
    screenHeight: 800,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "KR UTC English mobile should flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Ashburn",
    country: "US",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 1512,
    screenHeight: 982,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Ashburn residential laptop must not flag on city alone",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "203.0.113.10",
    city: "Austin",
    country: "US",
    timezone: "America/Chicago",
    language: "en-US",
    screenWidth: 1512,
    screenHeight: 982,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Normal US residential timezone + laptop screen must not flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "85.237.212.64",
    city: "Warsaw",
    country: "PL",
    timezone: "Europe/Warsaw",
    language: "pl-PL",
    screenWidth: 360,
    screenHeight: 910,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
  }),
  "Real-looking Warsaw Android must not flag",
);

// LATAM geo + Asia/Shanghai + 800×600 / en-US (Oct 2026 Melmoth pair).
assert(
  isDatacenterHeadlessProbePayload({
    ip: "209.14.136.78",
    city: "Campinas",
    country: "BR",
    timezone: "Asia/Shanghai",
    timezoneOffsetMinutes: 480,
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    funnelReached: ["book_detail_opened"],
    entryPath: "/discover/melmoth_the_wanderer_se",
    totalUsageSeconds: 0,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "BR + Asia/Shanghai + 800x600 en-US shallow should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "45.4.202.255",
    city: "Quito",
    country: "EC",
    timezone: "Asia/Shanghai",
    timezoneOffsetMinutes: 480,
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 720,
    pageViewCount: 1,
    funnelReached: ["book_detail_opened"],
    totalUsageSeconds: 0,
  }),
  "EC + Asia/Shanghai + en-US (non-800 screen) should flag via locale",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "209.14.136.78",
    city: "Campinas",
    country: "BR",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    screenWidth: 1512,
    screenHeight: 982,
    pageViewCount: 1,
    funnelReached: ["home_viewed"],
    totalUsageSeconds: 0,
  }),
  "Chinese traveler in BR (zh + laptop) must not flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "209.14.136.78",
    city: "Campinas",
    country: "BR",
    timezone: "America/Sao_Paulo",
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    funnelReached: ["book_detail_opened"],
    totalUsageSeconds: 0,
  }),
  "LATAM + local TZ must not flag on screen alone",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "43.119.100.92",
    city: "Singapore",
    country: "SG",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1366,
    screenHeight: 1366,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened", "app_nudge_shown"],
  }),
  "SG + Asia/Shanghai + en-US perfect square must flag",
);

// Oct 2026 VN / DE + Asia/Shanghai + 1366×1366 Mac farm (same family as SG).
assert(
  isDatacenterHeadlessProbePayload({
    ip: "113.161.68.210",
    city: "Ho Chi Minh City",
    country: "VN",
    timezone: "Asia/Shanghai",
    timezoneOffsetMinutes: 480,
    language: "en-US",
    screenWidth: 1366,
    screenHeight: 1366,
    pageViewCount: 1,
    totalUsageSeconds: 7,
    funnelReached: ["character_opened"],
  }),
  "VN + Asia/Shanghai + en-US perfect square must flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "80.134.177.253",
    city: "Krefeld",
    country: "DE",
    timezone: "Asia/Shanghai",
    timezoneOffsetMinutes: 480,
    language: "en-US",
    screenWidth: 1366,
    screenHeight: 1366,
    pageViewCount: 1,
    totalUsageSeconds: 7,
    funnelReached: ["character_opened"],
  }),
  "DE + Asia/Shanghai + en-US perfect square must flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "80.134.177.253",
    city: "Krefeld",
    country: "DE",
    timezone: "Asia/Shanghai",
    language: "zh-CN",
    screenWidth: 1366,
    screenHeight: 1366,
    pageViewCount: 1,
    totalUsageSeconds: 7,
    funnelReached: ["character_opened"],
  }),
  "Chinese traveler in DE (zh + square) must not flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "80.134.177.253",
    city: "Krefeld",
    country: "DE",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 7,
    funnelReached: ["character_opened"],
  }),
  "DE + Asia/Shanghai + en 1920x1080 should flag (proxy farm)",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "37.111.194.84",
    city: "Dhaka",
    country: "BD",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 23,
    funnelReached: ["character_opened"],
    entryPath: "/discover/the_jealousies_of_a_country_town_se/characters/victurnien",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  }),
  "BD + Asia/Shanghai + en 1920x1080 should flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    city: "Houston",
    country: "US",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 33,
    funnelReached: ["character_opened"],
    entryPath: "/discover/dr_wortle_s_school_se/characters/dr_wortle",
  }),
  "US + Asia/Shanghai + en 1920x1080 33s should flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Shanghai",
    country: "CN",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1366,
    screenHeight: 1366,
    pageViewCount: 1,
    totalUsageSeconds: 7,
    funnelReached: ["character_opened"],
  }),
  "CN geo + Asia/Shanghai + en square must not flag via non-CN rule",
);

// Oct 2026 LogicWeb / Ashburn X11 Linux PT-timezone blog farm.
assert(
  isDatacenterHeadlessProbePayload({
    ip: "149.57.176.235",
    city: "New York City",
    country: "US",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: [],
    entryPath: "/blog/todays-review-on-a-classic",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  }),
  "NYC + LA TZ + X11 Linux 1920x1080 must flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "172.121.172.128",
    city: "Santa Clara",
    country: "US",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 15,
    funnelReached: ["chapters_index_opened"],
    entryPath: "/discover/what_is_to_be_done_se/chapters",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
  }),
  "Santa Clara + ET TZ + X11 Linux 1920x1080 must flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "136.162.128.120",
    city: "Ashburn",
    country: "US",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["app_nudge_shown"],
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  }),
  "Ashburn + X11 Linux (no UTC) must flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "203.0.113.10",
    city: "Los Angeles",
    country: "US",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed"],
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  }),
  "Real Mac in LA must not flag on TZ+screen alone",
);

// Oct 2026 MX Querétaro + UTC + X11 1920×1080 (LATAM was outside UTC country list).
assert(
  isDatacenterHeadlessProbePayload({
    ip: "187.243.192.244",
    city: "Santiago de Querétaro",
    country: "MX",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["discover_opened"],
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  }),
  "MX + UTC + X11 Linux must flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Santiago de Querétaro",
    country: "MX",
    timezone: "America/Mexico_City",
    language: "es-MX",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["discover_opened"],
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  }),
  "MX Linux with local TZ must not flag on screen alone",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Santiago de Querétaro",
    country: "MX",
    timezone: "UTC",
    language: "es-MX",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["discover_opened"],
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  }),
  "MX + UTC + es locale must not flag",
);

// Fortaleza: 16s slipped the old 15s gate — strong mismatch allows ≤45s.
assert(
  isDatacenterHeadlessProbePayload({
    ip: "201.20.90.179",
    city: "Fortaleza",
    country: "BR",
    timezone: "Asia/Shanghai",
    timezoneOffsetMinutes: 480,
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 16,
    funnelReached: ["character_opened"],
    entryPath: "/discover/the_jealousies_of_a_country_town_se/characters/victurnien",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  }),
  "BR + Asia/Shanghai with 16s usage must still flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    ip: "201.20.90.179",
    city: "Fortaleza",
    country: "BR",
    timezone: "Asia/Shanghai",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 60,
    funnelReached: ["character_opened"],
  }),
  "BR + Asia/Shanghai with 60s usage must not flag",
);

const shanghaiPreviewFarm = {
  country: "BO",
  city: "La Paz",
  timezone: "Asia/Shanghai",
  language: "en-US",
  screenWidth: 1920,
  screenHeight: 1080,
  pageViewCount: 1,
  totalUsageSeconds: 90,
  funnelReached: ["reader_opened", "reader_engaged", "preview_reader_opened"],
};

assert(
  isDatacenterHeadlessProbePayload(
    {
      ...shanghaiPreviewFarm,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    },
    { isSensitivePath: true },
  ),
  "Sensitive Shanghai/en/non-CN Edge 120 must not age out after reader engagement",
);

assert(
  isDatacenterHeadlessProbePayload(
    {
      ...shanghaiPreviewFarm,
      country: "TN",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    },
    { isSensitivePath: true },
  ),
  "Sensitive Shanghai/en/non-CN Firefox 120 must flag",
);

assert(
  isDatacenterHeadlessProbePayload(
    {
      ip: "95.141.213.93",
      country: "JO",
      city: "Amman",
      timezone: "Asia/Shanghai",
      language: "en-US",
      screenWidth: 1920,
      screenHeight: 1080,
      pageViewCount: 1,
      totalUsageSeconds: 25,
      funnelReached: [
        "reader_opened",
        "preview_reader_opened",
        "preview_lens_opened",
      ],
      entryPath:
        "/reader?bookId=backwater_se&chapter=vii&character=harriett&lens=characters&preview=1",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    },
    { isSensitivePath: true },
  ),
  "Sensitive Shanghai/en/JO current X11 Linux Chrome must not age out on preview milestones",
);

assert(
  datacenterHeadlessProbeReason(
    {
      ...shanghaiPreviewFarm,
      country: "CA",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
    },
    { isSensitivePath: true },
  )?.includes("proxy farm"),
  "High-confidence China-TZ proxy reason should be available to consumers",
);

assert(
  !isDatacenterHeadlessProbePayload(
    {
      ...shanghaiPreviewFarm,
      country: "CN",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    },
    { isSensitivePath: true },
  ),
  "CN geo must remain exempt from the China-TZ proxy-farm detector",
);

assert(
  !isDatacenterHeadlessProbePayload(
    {
      ...shanghaiPreviewFarm,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    },
    { isSensitivePath: false },
  ),
  "A non-sensitive path must not use the persistent China-TZ farm signal",
);

assert(
  !isDatacenterHeadlessProbePayload(
    {
      ...shanghaiPreviewFarm,
      signedIn: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
    },
    { isSensitivePath: true },
  ),
  "Signed-in visitors remain exempt from the China-TZ proxy-farm detector",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Saginaw",
    country: "US",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 800,
    screenHeight: 600,
    pageViewCount: 1,
    funnelReached: ["home_viewed", "login_completed"],
    totalUsageSeconds: 0,
  }),
  "Engaged milestone must clear shallow probe",
);

assert(
  !isShallowWebProbePayload({
    pageViewCount: 1,
    totalUsageSeconds: 40,
    funnelReached: ["home_viewed"],
  }),
  "usage > 15s is not shallow",
);

assert(
  datacenterHeadlessProbeReason(
    {
      city: "Saginaw",
      country: "US",
      timezone: "UTC",
      language: "en-US",
      screenWidth: 800,
      screenHeight: 600,
      pageViewCount: 5,
      funnelReached: ["home_viewed", "page_view"],
    },
    { isShallow: true },
  ) != null,
  "opts.isShallow override can force the probe check",
);

assert(
  datacenterHeadlessProbeReason(
    {
      city: "Saginaw",
      country: "US",
      timezone: "UTC",
      language: "en-US",
      screenWidth: 800,
      screenHeight: 600,
      pageViewCount: 1,
      funnelReached: ["home_viewed", "page_view"],
    },
    { isShallow: false },
  ) == null,
  "opts.isShallow false skips the probe",
);

// --- cloud locale (zh-CN desktop scrapers) ---

assert(isNearSquareDesktopProbeScreen(1261, 1160), "1261x1160 is near-square probe");
assert(isNearSquareDesktopProbeScreen(1397, 1254), "1397x1254 is near-square probe");
assert(isNearSquareDesktopProbeScreen(1205, 1039), "1205x1039 is near-square probe");
assert(isNearSquareDesktopProbeScreen(1255, 1353), "1255x1353 portrait near-square");
assert(isNearSquareDesktopProbeScreen(1196, 1365), "1196x1365 portrait near-square");
assert(isNearSquareDesktopProbeScreen(1366, 1366), "1366x1366 perfect square probe");
assert(!isNearSquareDesktopProbeScreen(1920, 1080), "1920x1080 is a real desktop");
assert(!isNearSquareDesktopProbeScreen(1512, 982), "MacBook 1512x982 is real");

assert(isTencentCloudIp("43.134.117.10"), "Aceville SG is Tencent");
assert(isTencentCloudIp("43.135.33.1"), "Aceville HK is Tencent");
assert(isTencentCloudIp("43.159.128.150"), "Aceville 43.156–43.159 gap");
assert(isTencentCloudIp("49.232.32.8"), "Beijing Tencent");
assert(isTencentCloudIp("152.136.228.208"), "TENCENT-CN Beijing 152.136/16");
assert(isTencentCloudIp("101.42.1.26"), "TENCENT-CN Beijing 101.42/15");
assert(isTencentCloudIp("101.43.255.1"), "TENCENT-CN Beijing 101.43 upper");
assert(isTencentCloudIp("170.106.75.238"), "Aceville US POP 170.106");
assert(!isTencentCloudIp("8.8.8.8"), "Google DNS is not Tencent");
assert(!isTencentCloudIp("101.41.0.1"), "101.41 is outside TENCENT-CN 101.42/15");
assert(isHuaweiCloudIp("113.44.120.122"), "Huawei Cloud Beijing ECS");
assert(isHuaweiCloudIp("116.204.107.221"), "HWCSNET Huawei public cloud");
assert(isHuaweiCloudIp("124.243.135.125"), "Huawei Cloud SG 124.243/18");
assert(isHuaweiCloudIp("149.232.133.96"), "Huawei Cloud MX 149.232/19");
assert(isCnCloudHostingIp("113.44.120.122"), "Huawei counts as CN cloud");
assert(isCnCloudHostingIp("43.135.0.3"), "Aceville counts as CN cloud");
assert(!isHuaweiCloudIp("8.8.8.8"), "Google DNS is not Huawei");
assert(!isHuaweiCloudIp("124.243.100.1"), "124.243.100 outside Huawei /18");

assert(
  isCloudLocaleProbePayload({
    ip: "43.134.117.10",
    country: "SG",
    city: "Singapore",
    language: "zh-CN",
    timezone: "Asia/Singapore",
    timezoneOffsetMinutes: 480,
    screenWidth: 1383,
    screenHeight: 1227,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened", "app_nudge_shown"],
    entryPath: "/pathway/world_voices",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "zh-CN near-square Mac on Tencent SG should flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "149.232.143.10",
    country: "MX",
    city: "Mexico City",
    language: "zh-CN",
    timezone: "America/Mexico_City",
    timezoneOffsetMinutes: -360,
    screenWidth: 1397,
    screenHeight: 1254,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened"],
    entryPath: "/discover/short_fiction_8_se?q=fiction",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  }),
  "zh-CN near-square Win from MX geo should flag without Tencent IP",
);

assert(
  isCloudLocaleProbePayload({
    ip: "43.135.33.10",
    country: "US",
    city: "Santa Clara",
    language: "zh-CN",
    timezone: "America/Los_Angeles",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened"],
    entryPath: "/discover/candide_fr?q=fiction",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "zh-CN + Tencent + common 1920x1080 shallow desktop should flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "152.136.228.208",
    country: "CN",
    city: "Beijing",
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 2,
    totalUsageSeconds: 3,
    funnelReached: [
      "discover_opened",
      "discover_search_submitted:Adultery -- Fiction",
    ],
    entryPath: "/discover",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "zh-CN + TENCENT-CN 152.136 + LCSH subject search should flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "101.42.1.26",
    country: "CN",
    city: "Beijing",
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    screenWidth: 1134,
    screenHeight: 1210,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["questions_opened"],
    entryPath: "/discover/short_fiction_10_se/questions/how-fear-of-the-unknown",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
  }),
  "zh-CN + TENCENT-CN 101.42 shallow questions scrape should flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "124.243.135.125",
    country: "SG",
    city: "Singapore",
    language: "zh-CN",
    timezone: "Asia/Singapore",
    screenWidth: 1255,
    screenHeight: 1353,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened", "app_nudge_shown"],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  }),
  "zh-CN Huawei SG near-square desktop should flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "149.232.133.96",
    country: "MX",
    city: "Mexico City",
    language: "zh-CN",
    timezone: "America/Mexico_City",
    screenWidth: 1196,
    screenHeight: 1365,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened"],
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  }),
  "zh-CN Huawei MX portrait near-square should flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "43.128.84.217",
    country: "SG",
    city: "Singapore",
    language: "zh-CN",
    timezone: "Asia/Singapore",
    screenWidth: 430,
    screenHeight: 932,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["book_detail_opened", "app_nudge_shown"],
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
  }),
  "zh-CN Aceville iPhone shallow must flag",
);

assert(
  !isCloudLocaleProbePayload({
    ip: "43.128.84.217",
    country: "SG",
    language: "zh-CN",
    screenWidth: 430,
    screenHeight: 932,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["login_completed"],
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1",
  }),
  "engaged zh mobile on Aceville must not flag",
);

assert(
  isCloudLocaleProbePayload({
    ip: "152.136.228.208",
    country: "CN",
    language: "zh-CN",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 2,
    totalUsageSeconds: 4,
    funnelReached: [
      "discover_opened",
      "discover_search_submitted:Adultery -- Fiction",
      "discover_search_results_0:Adultery -- Fiction",
      "discover_search_submitted:Marriage -- Fiction",
      "discover_search_results_1_5:Marriage -- Fiction",
    ],
    entryPath: "/discover",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "multiple LCSH search milestones must not evade shallow+Tencent probe",
);

assert(
  !isCloudLocaleProbePayload({
    ip: "203.0.113.10",
    country: "CN",
    city: "Shanghai",
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    screenWidth: 1512,
    screenHeight: 982,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed"],
    entryPath: "/",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  }),
  "Real zh-CN MacBook bounce must not flag",
);

assert(
  !isCloudLocaleProbePayload({
    ip: "43.134.117.10",
    country: "SG",
    language: "zh-CN",
    timezone: "Asia/Singapore",
    screenWidth: 1383,
    screenHeight: 1227,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["login_completed"],
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "Engaged zh visitor must not flag",
);

// Santa Clara Aceville farm: direct /reader?preview=1 (Oct 2026). Guest
// preview milestones previously exempted via shallow=false.
assert(
  isCloudLocaleProbePayload({
    ip: "43.173.108.209",
    country: "US",
    city: "Santa Clara",
    language: "zh-CN",
    timezone: "America/Los_Angeles",
    screenWidth: 1248,
    screenHeight: 1117,
    pageViewCount: 2,
    totalUsageSeconds: 0,
    funnelReached: [
      "reader_opened",
      "preview_reader_opened",
      "preview_first_win_shown",
      "login_opened",
    ],
    entryPath: "/reader?bookId=sense_and_sensibility_se&preview=1&chapter=xi",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
  }),
  "zh guest-preview near-square Aceville Santa Clara must flag",
);

assert(
  isCloudLocaleProbePayload(
    {
      ip: "170.106.75.238",
      country: "US",
      city: "Santa Clara",
      language: "zh-CN",
      screenWidth: 1372,
      screenHeight: 1291,
      pageViewCount: 1,
      totalUsageSeconds: 0,
      funnelReached: [
        "reader_opened",
        "preview_reader_opened",
        "preview_first_win_shown",
        "preview_gate_shown",
      ],
      entryPath: "/reader?bookId=war_and_peace&preview=1&chapter=xv",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    },
    { isShallow: false },
  ),
  "near-square guest preview must flag even when opts.isShallow is false",
);

assert(
  !isCloudLocaleProbePayload({
    ip: "43.134.117.10",
    country: "SG",
    language: "en-US",
    timezone: "Asia/Singapore",
    screenWidth: 1383,
    screenHeight: 1227,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed"],
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  }),
  "en-US must not match cloud locale probe",
);

assert(
  cloudLocaleProbeReason(
    {
      language: "zh-CN",
      screenWidth: 1261,
      screenHeight: 1160,
      pageViewCount: 5,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
    },
    { isShallow: true },
  ) != null,
  "opts.isShallow override works for cloud locale probe",
);

// Oct 2026 GCP → Washington DC Mac Chrome/116 farm (rotated 34.x IPs).
const gcpWashingtonUa =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36";

assert(
  isDatacenterHeadlessProbePayload({
    ip: "34.181.254.28",
    city: "Washington",
    country: "US",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 1024,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
    userAgent: gcpWashingtonUa,
  }),
  "GCP Washington UTC 1280x1024 Chrome/116 must flag",
);

assert(
  isDatacenterHeadlessProbePayload({
    ip: "34.21.19.157",
    city: "Washington",
    country: "US",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    entryPath: "/",
    userAgent: gcpWashingtonUa,
  }),
  "GCP Washington UTC stale Catalina Chrome (rotated screen) must flag",
);

assert(
  datacenterHeadlessProbeReason({
    ip: "34.181.254.28",
    city: "Austin",
    country: "US",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 1024,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    userAgent: gcpWashingtonUa,
  }) === "UTC headless desktop probe",
  "UTC + 1280x1024 alone must flag via headless screen list",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Washington",
    country: "US",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 1512,
    screenHeight: 982,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  }),
  "Real DC MacBook (local TZ, modern Chrome) must not flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Austin",
    country: "US",
    timezone: "America/Chicago",
    language: "en-US",
    screenWidth: 1280,
    screenHeight: 1024,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    userAgent: gcpWashingtonUa,
  }),
  "Local-TZ 1280x1024 without DC/UTC corroboration must not flag",
);

// Oct 2026 Ace Data Centers San Jose / Cogent NYC Linux aarch64 Chrome farm.
const aceSanJoseUa =
  "Mozilla/5.0 (X11; Linux aarch64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36";

assert(
  datacenterHeadlessProbeReason({
    ip: "23.27.145.157",
    city: "San Jose",
    country: "US",
    region: "CA",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1600,
    screenHeight: 1200,
    pageViewCount: 1,
    totalUsageSeconds: 6,
    funnelReached: ["home_viewed"],
    entryPath: "/",
    userAgent: aceSanJoseUa,
  }) === "UTC X11 Linux probe from US geo",
  "US + UTC + X11 Linux aarch64 1600x1200 must flag",
);

assert(
  datacenterHeadlessProbeReason({
    ip: "149.57.180.151",
    city: "New York City",
    country: "US",
    region: "NY",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1600,
    screenHeight: 1200,
    pageViewCount: 1,
    totalUsageSeconds: 8,
    funnelReached: ["home_viewed"],
    entryPath: "/",
    userAgent: aceSanJoseUa,
  }) === "UTC X11 Linux probe from US geo",
  "NYC Cogent twin of Ace San Jose farm must flag",
);

assert(
  datacenterHeadlessProbeReason({
    city: "Austin",
    country: "US",
    timezone: "UTC",
    language: "en-US",
    screenWidth: 1600,
    screenHeight: 1200,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
  }) === "UTC headless desktop probe",
  "UTC + 1600x1200 (no X11) must flag via headless screen list",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "San Jose",
    country: "US",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 1600,
    screenHeight: 1200,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    userAgent: aceSanJoseUa,
  }),
  "San Jose residential X11 with local PT TZ must not flag",
);

// Oct 2026 Cisco OpenDNS / Umbrella Reston POP (ET geo + PT browser TZ).
assert(
  datacenterHeadlessProbeReason({
    ip: "146.112.163.41",
    city: "Reston",
    country: "US",
    region: "VA",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed"],
    entryPath: "/",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  }) === "US East Coast OpenDNS POP + Pacific TZ probe",
  "Reston OpenDNS + America/Los_Angeles shallow must flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Reston",
    country: "US",
    timezone: "America/New_York",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 1,
    totalUsageSeconds: 0,
    funnelReached: ["home_viewed", "page_view"],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  }),
  "Reston resident on Eastern TZ must not flag",
);

assert(
  !isDatacenterHeadlessProbePayload({
    city: "Reston",
    country: "US",
    timezone: "America/Los_Angeles",
    language: "en-US",
    screenWidth: 1920,
    screenHeight: 1080,
    pageViewCount: 3,
    totalUsageSeconds: 120,
    funnelReached: ["home_viewed", "discover_opened", "book_detail_opened"],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  }),
  "Engaged Reston+PT session (corp OpenDNS) must not flag",
);

console.log("farmfence web probe checks passed");