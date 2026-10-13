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
  isCloudLocaleProbePayload,
  isDatacenterHeadlessProbePayload,
  isNearSquareDesktopProbeScreen,
  isShallowWebProbePayload,
} from "../src/web.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

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

// Fortaleza: 16s slipped the old 15s gate — strong mismatch allows ≤30s.
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
    totalUsageSeconds: 45,
    funnelReached: ["character_opened"],
  }),
  "BR + Asia/Shanghai with 45s usage must not flag",
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

console.log("farmfence web probe checks passed");