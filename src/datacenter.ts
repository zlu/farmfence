import { isAwsUsEast1Ip, isAwsUsWest2Ip } from "./install.js";

/** IPv4 CIDR membership (dotted-quad only; IPv6/parse failures return false). */
function ipv4InCidr(ip: string | null | undefined, cidr: string): boolean {
  if (!ip) return false;
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const toInt = (value: string): number | null => {
    const octets = value.split(".").map(Number);
    if (octets.length !== 4) return null;
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return null;
    return ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
  };
  const ipInt = toInt(ip.trim());
  const rangeInt = range ? toInt(range) : null;
  if (ipInt == null || rangeInt == null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

/**
 * Meta / Facebook (AS32934) datacenter egress — link-preview / link-safety
 * crawlers. Real users never egress from these ranges.
 */
const META_DATACENTER_CIDRS = [
  "66.220.144.0/20",
  "31.13.24.0/21",
  "31.13.64.0/18",
  "173.252.64.0/18",
  "69.63.176.0/20",
  "69.171.224.0/19",
  "204.15.20.0/22",
];

export function isMetaDatacenterIp(ip: string | null | undefined): boolean {
  return META_DATACENTER_CIDRS.some((cidr) => ipv4InCidr(ip, cidr));
}

/** Bingbot crawler egress (Microsoft's documented crawler ranges). */
const BINGBOT_CIDRS = ["40.77.0.0/16", "207.46.0.0/16", "157.55.0.0/16"];

export function isBingbotIp(ip: string | null | undefined): boolean {
  return BINGBOT_CIDRS.some((cidr) => ipv4InCidr(ip, cidr));
}

/**
 * Datacenter crawler egress that can never belong to a residential user.
 * Includes Meta/Facebook link-preview crawlers, Bingbot, and AWS EC2
 * headless browsers (us-west-2 Boardman device farm, us-east-1 Ashburn
 * scrapers / link fetchers).
 */
export function isDatacenterCrawlerIp(ip: string | null | undefined): boolean {
  return (
    isMetaDatacenterIp(ip) ||
    isBingbotIp(ip) ||
    isAwsUsWest2Ip(ip) ||
    isAwsUsEast1Ip(ip)
  );
}

/** Human-readable auto reason for datacenter crawler egress, or null. */
export function datacenterCrawlerReason(ip: string | null | undefined): string | null {
  if (isMetaDatacenterIp(ip)) return "Meta/Facebook datacenter IP";
  if (isBingbotIp(ip)) return "Bingbot crawler IP";
  if (isAwsUsWest2Ip(ip)) return "AWS us-west-2 datacenter IP (Boardman, OR)";
  if (isAwsUsEast1Ip(ip)) return "AWS us-east-1 datacenter IP (Ashburn, VA)";
  return null;
}

/**
 * Tencent Cloud / Aceville hosting egress — HK/SG/CN cloud VMs
 * (AS132203 Aceville + AS45090 TENCENT-CN). Soft signal only: real Chinese
 * users and CDNs can share these ranges. Use as corroboration in combo
 * detectors, not as a never-override drop.
 */
const TENCENT_CLOUD_CIDRS = [
  "1.12.0.0/14",
  "43.128.0.0/13", // Aceville 43.128–43.135 (HK/SG)
  "43.152.0.0/14", // 43.152–43.155
  "43.160.0.0/12", // Aceville edge 43.160–43.175 (incl. US POP)
  "49.51.0.0/16",
  "49.232.0.0/14", // Beijing Tencent
  "101.32.0.0/16",
  "110.238.0.0/16",
  "119.8.0.0/16",
  "119.28.0.0/16",
  "129.226.0.0/16",
  "150.40.0.0/16",
  "150.109.0.0/16",
  // TENCENT-CN (AS45090) Beijing — LCSH subject-scrape farm (152.136.228.x)
  "152.136.0.0/16",
  "162.14.0.0/16",
];

export function isTencentCloudIp(ip: string | null | undefined): boolean {
  return TENCENT_CLOUD_CIDRS.some((cidr) => ipv4InCidr(ip, cidr));
}

/**
 * Huawei Cloud (AS55990) hosting egress — CN ECS VMs. Soft signal only;
 * use as corroboration with zh locale / near-square probes, not alone.
 */
const HUAWEI_CLOUD_CIDRS = [
  "113.44.0.0/16", // hwclouds-dns.com ECS (incl. 113.44.120.x scrape farm)
  "159.138.0.0/16",
  "114.119.0.0/16",
];

export function isHuaweiCloudIp(ip: string | null | undefined): boolean {
  return HUAWEI_CLOUD_CIDRS.some((cidr) => ipv4InCidr(ip, cidr));
}

/** Tencent or Huawei cloud hosting egress (soft CN scrape-farm signal). */
export function isCnCloudHostingIp(ip: string | null | undefined): boolean {
  return isTencentCloudIp(ip) || isHuaweiCloudIp(ip);
}
