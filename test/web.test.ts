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
assert(!isNearSquareDesktopProbeScreen(1920, 1080), "1920x1080 is a real desktop");
assert(!isNearSquareDesktopProbeScreen(1512, 982), "MacBook 1512x982 is real");

assert(isTencentCloudIp("43.134.117.10"), "Aceville SG is Tencent");
assert(isTencentCloudIp("43.135.33.1"), "Aceville HK is Tencent");
assert(isTencentCloudIp("49.232.32.8"), "Beijing Tencent");
assert(isTencentCloudIp("152.136.228.208"), "TENCENT-CN Beijing 152.136/16");
assert(!isTencentCloudIp("8.8.8.8"), "Google DNS is not Tencent");
assert(isHuaweiCloudIp("113.44.120.122"), "Huawei Cloud Beijing ECS");
assert(isCnCloudHostingIp("113.44.120.122"), "Huawei counts as CN cloud");
assert(isCnCloudHostingIp("43.135.0.3"), "Aceville counts as CN cloud");
assert(!isHuaweiCloudIp("8.8.8.8"), "Google DNS is not Huawei");

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