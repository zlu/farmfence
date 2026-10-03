/**
 * Run: npx tsx test/web.test.ts
 */
import {
  datacenterHeadlessProbeReason,
  isDatacenterHeadlessProbePayload,
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

console.log("farmfence web probe checks passed");
