/**
 * Browser-timezone ↔ IP-geo contradiction — proxy-farm tell after the
 * Shanghai-TZ wave learned to rotate. Farms spoof a random IANA zone
 * (America/*, Africa/*, or headless-default UTC) while egressing through
 * residential proxies elsewhere:
 *
 *   GB/London IP    + America/Chicago TZ
 *   US/Princeton IP + UTC TZ
 *   PH/Cabanatuan   + Africa/Maputo TZ   (Oct 23 — slipped deep-link-only gates)
 *
 * A real browser's IANA timezone follows the OS. Transatlantic VPN
 * (Americas TZ on EU geo / vice versa) is common enough that analytics
 * soft-flags skip that corridor; hard path blocks stay product-local.
 */

export type TzRegion = "americas" | "europe" | "asia" | "oceania" | "africa";

const COUNTRY_REGION: Record<string, TzRegion> = {
  // Americas
  US: "americas", CA: "americas", MX: "americas", GT: "americas",
  BZ: "americas", HN: "americas", SV: "americas", NI: "americas",
  CR: "americas", PA: "americas", BS: "americas", CU: "americas",
  JM: "americas", HT: "americas", DO: "americas", PR: "americas",
  TT: "americas", BB: "americas", CO: "americas", VE: "americas",
  EC: "americas", PE: "americas", BR: "americas", BO: "americas",
  PY: "americas", CL: "americas", AR: "americas", UY: "americas",
  GY: "americas", SR: "americas", GF: "americas",
  // Europe
  GB: "europe", IE: "europe", FR: "europe", DE: "europe", NL: "europe",
  BE: "europe", LU: "europe", CH: "europe", AT: "europe", IT: "europe",
  ES: "europe", PT: "europe", DK: "europe", NO: "europe", SE: "europe",
  FI: "europe", IS: "europe", PL: "europe", CZ: "europe", SK: "europe",
  HU: "europe", RO: "europe", BG: "europe", GR: "europe", HR: "europe",
  SI: "europe", RS: "europe", BA: "europe", ME: "europe", MK: "europe",
  AL: "europe", EE: "europe", LV: "europe", LT: "europe", UA: "europe",
  BY: "europe", MD: "europe", RU: "europe", TR: "europe", CY: "europe",
  MT: "europe",
  // Asia
  CN: "asia", HK: "asia", TW: "asia", MO: "asia", JP: "asia",
  KR: "asia", IN: "asia", PK: "asia", BD: "asia", LK: "asia",
  NP: "asia", SG: "asia", MY: "asia", ID: "asia", TH: "asia",
  VN: "asia", PH: "asia", KH: "asia", LA: "asia", MM: "asia",
  BN: "asia", MN: "asia", KZ: "asia", UZ: "asia", TM: "asia",
  KG: "asia", TJ: "asia", AF: "asia", IR: "asia", IQ: "asia",
  SA: "asia", AE: "asia", QA: "asia", KW: "asia", OM: "asia",
  BH: "asia", IL: "asia", JO: "asia", LB: "asia", SY: "asia",
  YE: "asia", GE: "asia", AM: "asia", AZ: "asia",
  // Oceania
  AU: "oceania", NZ: "oceania", FJ: "oceania", PG: "oceania",
  // Africa
  ZA: "africa", NG: "africa", KE: "africa", EG: "africa",
  MA: "africa", DZ: "africa", TN: "africa", GH: "africa",
  ET: "africa", TZ: "africa", UG: "africa", AO: "africa",
  MZ: "africa", MG: "africa", CM: "africa", CI: "africa",
  SN: "africa", ZW: "africa", ZM: "africa", BW: "africa",
  NA: "africa", LY: "africa", SD: "africa",
};

function timezoneRegion(tz: string): TzRegion | null {
  if (tz.startsWith("America/") || tz.startsWith("US/")) return "americas";
  if (tz.startsWith("Europe/")) return "europe";
  if (tz === "Atlantic/Reykjavik" || tz === "Atlantic/Faeroe") return "europe";
  if (tz.startsWith("Asia/")) return "asia";
  if (tz === "Indian/Christmas" || tz === "Indian/Cocos") return "asia";
  if (
    tz.startsWith("Australia/") ||
    tz.startsWith("Pacific/") ||
    tz === "Antarctica/Macquarie"
  ) {
    return "oceania";
  }
  if (tz.startsWith("Africa/")) return "africa";
  return null;
}

export function isUtcTimezoneName(tz: string | null | undefined): boolean {
  if (!tz) return false;
  return /^(?:UTC|Etc\/UTC|Etc\/GMT|GMT)$/i.test(tz.trim());
}

/**
 * Transatlantic VPN corridor — Americas TZ on EU geo (and reverse) is
 * common for real travelers; do not soft-flag analytics on that alone.
 */
export function isTransatlanticVpnCorridor(
  tzRegion: TzRegion,
  countryRegion: TzRegion,
): boolean {
  return (
    (tzRegion === "americas" && countryRegion === "europe") ||
    (tzRegion === "europe" && countryRegion === "americas")
  );
}

/**
 * Why the browser timezone contradicts the IP country, or null when they
 * agree (or either side is unknown — unknown never convicts).
 */
export function tzGeoMismatchReason(
  timezone: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const tz = typeof timezone === "string" ? timezone.trim() : "";
  const cc = typeof country === "string" ? country.trim().toUpperCase() : "";
  if (!tz || !cc) return null;

  // UTC is the headless/container default. Real US browsers report an
  // America/* zone (a handful of UTC+0 countries report Atlantic/* or
  // Africa/* names instead), so UTC on US geo is a synthetic tell.
  if (isUtcTimezoneName(tz)) {
    return cc === "US"
      ? "UTC browser timezone on US geo (headless default)"
      : null;
  }

  const tzRegion = timezoneRegion(tz);
  const ccRegion = COUNTRY_REGION[cc];
  if (!tzRegion || !ccRegion || tzRegion === ccRegion) return null;
  return `browser timezone ${tz} (${tzRegion}) on ${cc} (${ccRegion}) geo`;
}

/**
 * Analytics soft-flag: continental TZ↔geo lie, excluding the common
 * transatlantic VPN corridor. UTC-on-US is always strong.
 */
export function tzGeoMismatchFarmReason(
  timezone: string | null | undefined,
  country: string | null | undefined,
): string | null {
  const reason = tzGeoMismatchReason(timezone, country);
  if (!reason) return null;
  if (isUtcTimezoneName(timezone)) return reason;

  const tz = typeof timezone === "string" ? timezone.trim() : "";
  const cc = typeof country === "string" ? country.trim().toUpperCase() : "";
  const tzRegion = timezoneRegion(tz);
  const ccRegion = COUNTRY_REGION[cc];
  if (!tzRegion || !ccRegion) return null;
  if (isTransatlanticVpnCorridor(tzRegion, ccRegion)) return null;
  return reason;
}
