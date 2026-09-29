/**
 * One-shot assertions for Play-crawler / human-override / datacenter detection.
 * Run: npm test
 */
import {
  botInstallReason,
  datacenterCrawlerReason,
  isAwsUsWest2Ip,
  isDatacenterCrawlerIp,
  isGoogleCrawlerIp,
  isGoogleUserTriggeredFetcherIp,
  isHumanLikeInstall,
  isLikelyBotInstallPayload,
  isLikelyBotIp,
  playCrawlerSignals,
} from "../src/index.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const playFarm = {
  ip: "66.249.88.66",
  firstSeenIp: "66.249.88.66",
  language: "en-JM",
  timezoneOffsetMinutes: -420,
  totalReadingSeconds: 0,
  signInAttemptGoogle: 8,
  signInCancelGoogle: 8,
  firstSeenAtMs: 1_787_572_760_490,
  lastSeenAtMs: 1_787_573_012_067,
  funnelEvents: [
    "install@2026-08-24T04:59:20.625756",
    "sign_in_attempt_google@2026-08-24T05:00:48.245698",
    "sign_in_canceled_google@2026-08-24T05:00:55.104521",
    "sign_in_attempt_google@2026-08-24T05:00:56.163672",
    "sign_in_canceled_google@2026-08-24T05:01:15.462595",
    "sign_in_attempt_google@2026-08-24T05:01:17.804433",
    "sign_in_canceled_google@2026-08-24T05:01:22.247997",
    "sign_in_attempt_google@2026-08-24T05:01:29.079722",
    "sign_in_canceled_google@2026-08-24T05:01:31.455094",
    "sign_in_attempt_google@2026-08-24T05:01:32.755266",
    "sign_in_canceled_google@2026-08-24T05:01:34.243357",
    "sign_in_attempt_google@2026-08-24T05:01:40.243482",
    "sign_in_canceled_google@2026-08-24T05:01:42.332259",
    "sign_in_attempt_google@2026-08-24T05:02:36.036636",
    "sign_in_canceled_google@2026-08-24T05:02:39.560607",
    "sign_in_attempt_google@2026-08-24T05:02:40.491367",
    "sign_in_canceled_google@2026-08-24T05:02:42.291200",
  ],
};

assert(isLikelyBotIp("66.249.88.66"), "66.249 is a bot IP");
assert(isLikelyBotIp("108.177.6.4"), "108.177 is Google infra / Play-farm egress");
assert(!isGoogleCrawlerIp("108.177.6.4"), "108.177.6 is not a published Googlebot/fetcher CIDR");
assert(isGoogleCrawlerIp("66.249.88.66"), "66.249 is Google crawler/proxy");
assert(isGoogleUserTriggeredFetcherIp("66.249.88.66"), "66.249.88 is a published fetcher /27");
assert(!isHumanLikeInstall(playFarm), "Play cancel loop must not count as human");
assert(isLikelyBotInstallPayload(playFarm), "Google fetcher + en-JM is never overridden");
const play = playCrawlerSignals(playFarm);
assert(play?.mismatch?.region === "JM", "en-JM vs UTC-7 mismatch");
assert(play?.randomizedLocale === "en-JM", "en-JM is a Play-farm randomized locale");
assert(play?.cancelLoop && play.cancelLoop.cancels >= 3, "rapid OAuth cancels");
const reason = botInstallReason(playFarm) ?? "";
assert(reason.includes("Googlebot") || reason.includes("proxy"), reason);
assert(reason.includes("en-JM"), reason);
assert(reason.includes("UTC-7"), reason);

const googleFetcherSg = {
  ip: "192.178.9.10",
  language: "en-SG",
  timezoneOffsetMinutes: 480,
  totalReadingSeconds: 400,
  firstSeenAtMs: 0,
  lastSeenAtMs: 3_600_000,
};
assert(isGoogleUserTriggeredFetcherIp("192.178.9.10"), "192.178.8/21 is a published fetcher range");
assert(isGoogleUserTriggeredFetcherIp("172.253.181.4"), "172.253.181 is a published fetcher range");
assert(isGoogleUserTriggeredFetcherIp("2001:4860:4801:4004::1"), "fetcher IPv6 /64");
assert(!isGoogleUserTriggeredFetcherIp("2001:4860:4801:4200::1"), "IPv6 outside compacted /55");
assert(playCrawlerSignals(googleFetcherSg)?.randomizedLocale === "en-SG", "en-SG on matching UTC+8 is still a bot");
assert(isLikelyBotInstallPayload(googleFetcherSg), "fetcher + en-SG is never overridden by reading");
const sgReason = botInstallReason(googleFetcherSg) ?? "";
assert(sgReason.includes("user-triggered"), sgReason);
assert(sgReason.includes("en-SG"), sgReason);

const ipv6Fetcher = {
  ip: "2001:4860:4801:4100::aa",
  language: "en-SG",
  timezoneOffsetMinutes: 480,
};
assert(isLikelyBotInstallPayload(ipv6Fetcher), "IPv6 fetcher + en-SG is a bot");

const googleFiReader = {
  ip: "74.125.210.131",
  language: "en-US",
  timezoneOffsetMinutes: -420,
  totalReadingSeconds: 3600,
  firstSeenAtMs: 0,
  lastSeenAtMs: 3_600_000,
};
assert(isHumanLikeInstall(googleFiReader), "Fi user who reads an hour is human");
assert(playCrawlerSignals(googleFiReader) == null, "en-US + UTC-7 is not a locale mismatch");
assert(!isLikelyBotInstallPayload(googleFiReader), "en-US is not a randomized Play locale");

const appleReviewIdle = {
  ip: "139.178.131.76",
  language: "en",
  timezoneOffsetMinutes: -420,
  totalReadingSeconds: 98,
  firstSeenAtMs: 0,
  lastSeenAtMs: 3 * 60_000,
};
assert(!isHumanLikeInstall(appleReviewIdle), "App Review idle reader time is not human");

const cancelThenRead = {
  ip: "74.125.210.131",
  language: "en-US",
  timezoneOffsetMinutes: -420,
  totalReadingSeconds: 400,
  signInAttemptGoogle: 8,
  signInCancelGoogle: 8,
  firstSeenAtMs: 0,
  lastSeenAtMs: 4 * 60_000,
};
assert(isHumanLikeInstall(cancelThenRead), "5min read may override an IP-only flag");
assert(!isLikelyBotInstallPayload(cancelThenRead), "en-US Google infra is not never-overridden");

const organizerOnGoogleIp = {
  ip: "74.125.210.131",
  language: "en-US",
  timezoneOffsetMinutes: -420,
  totalUsageSeconds: 400,
  totalReadingSeconds: 0,
  firstSeenAtMs: 0,
  lastSeenAtMs: 4 * 60_000,
};
assert(isHumanLikeInstall(organizerOnGoogleIp), "5min app usage may override an IP-only flag");

const shortGoogleIp = {
  ip: "74.125.210.131",
  language: "en-US",
  timezoneOffsetMinutes: -420,
  totalReadingSeconds: 0,
  signInAttemptGoogle: 1,
  firstSeenAtMs: 0,
  lastSeenAtMs: 4 * 60_000,
};
assert(!isHumanLikeInstall(shortGoogleIp), "4-minute empty Google-IP session is not human");

const awsFarm = {
  ip: "54.244.1.1",
  timezoneOffsetMinutes: 0,
  region: "OR",
  city: "Boardman",
  totalReadingSeconds: 5000,
};
assert(isLikelyBotInstallPayload(awsFarm), "AWS farm is never overridden");

const awsFarmEdtBounce = {
  ip: "54.186.170.162",
  firstSeenIp: "54.186.170.162",
  region: "OR",
  city: "Boardman",
  language: "en-US",
  timezoneOffsetMinutes: -240,
  totalReadingSeconds: 0,
  funnelEvents: [
    "install@2026-09-14T07:19:51.280800",
    "feature_stories_rail_seen@2026-09-14T07:19:53.187187",
  ],
};
assert(isAwsUsWest2Ip("54.186.170.162"), "54.184/13 Boardman EC2 is AWS us-west-2");
assert(isAwsUsWest2Ip("44.241.37.80"), "44.224/11 Boardman EC2 is AWS us-west-2");
assert(isAwsUsWest2Ip("54.185.231.0"), "54.185 is inside 54.184/13");
assert(isLikelyBotInstallPayload(awsFarmEdtBounce), "Boardman + EDT bounce is a bot without UTC/burst");
assert(
  (botInstallReason(awsFarmEdtBounce) ?? "").includes("Boardman"),
  "Boardman farm reason mentions Boardman",
);

const boardmanScraperIp = "35.91.101.0";
assert(isAwsUsWest2Ip(boardmanScraperIp), "35.80/12 Boardman EC2 is AWS us-west-2");
assert(isDatacenterCrawlerIp(boardmanScraperIp), "Boardman EC2 is a datacenter crawler");
assert(
  datacenterCrawlerReason(boardmanScraperIp)?.includes("AWS us-west-2"),
  "Boardman EC2 datacenter reason",
);

console.log("farmfence checks passed");
console.log("play farm reason:", reason);
