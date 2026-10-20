# farmfence

Exclude **device-farm**, **app-review**, and **crawler** traffic from product analytics.

Named for the fence around AWS Device Farm (Boardman, OR), AWS us-east-1
scrapers (Ashburn, VA), Google Play Robo / pre-launch fetchers, and Meta / Bing
link-preview crawlers — traffic that looks like installs or visits but is never
a real user.

**Status: experimental `0.x`.** Extracted from a real product and useful as
dogfood, not yet a general-purpose bot filter. Prefer the install-path
never-override helpers; treat broad IP helpers as soft signals and tune for
your traffic before dropping users.

## Install

```bash
npm install farmfence
# or pin a GitHub tag: npm install github:zlu/farmfence#v0.1.2
```

## Usage

Start with the install helpers — they combine IP, locale, geo, and funnel
signals and are the safest defaults:

```ts
import {
  isLikelyBotInstallPayload,
  botInstallReason,
  isHumanLikeInstall,
} from "farmfence";

if (isLikelyBotInstallPayload(payload)) {
  // never-override farm / review traffic
  console.log(botInstallReason(payload));
} else if (payload.likelyBot && !isHumanLikeInstall(payload)) {
  // broader Google/Apple IP flag without human override
}
```

Web / IP-only checks are coarser and easier to misuse:

```ts
import {
  isDatacenterCrawlerIp,
  datacenterCrawlerReason,
  isLikelyBotIp,
  isDatacenterHeadlessProbePayload,
  datacenterHeadlessProbeReason,
  isCloudLocaleProbePayload,
  cloudLocaleProbeReason,
  isTencentCloudIp,
} from "farmfence";

// Soft signal — flag or sample, don't blindly drop
if (isDatacenterCrawlerIp(ip)) {
  console.log(datacenterCrawlerReason(ip));
} else if (isLikelyBotIp(ip)) {
  // coarse Google / Apple prefixes; many real users share these NATs
}

// Spaced headless probes (single payload — keep burst clustering in the app).
// Decide sensitive paths from your own routes; do not enable them site-wide.
const webProbeOptions = { isSensitivePath: isEpubPreviewOrOtherProtectedPath };
if (isDatacenterHeadlessProbePayload(payload, webProbeOptions)) {
  console.log(datacenterHeadlessProbeReason(payload, webProbeOptions));
} else if (isCloudLocaleProbePayload(payload)) {
  // zh-CN desktop scrapers (near-square screen and/or Tencent egress)
  console.log(cloudLocaleProbeReason(payload));
}

// Soft only — never drop on Tencent Cloud IP alone
if (isTencentCloudIp(ip)) {
  // corroboration for combo detectors
}
```

## What it detects

| Signal | Never overridden? |
| --- | --- |
| AWS us-west-2 / Boardman device farm | yes (install path) |
| AWS us-east-1 / Ashburn EC2 scrapers | yes (EC2 CIDR; not city alone) |
| Google user-triggered fetcher + Play randomized locale (`en-SG`, …) | yes |
| Google / Apple review-farm IP + locale↔TZ mismatch or OAuth cancel loop | yes (install path) |
| Meta / Bing / AWS datacenter crawler IP | yes (web path) |
| Explicit automation UA (`Lightpanda`, Playwright, Puppeteer, Selenium, etc.) | yes |
| Web headless probes (`Etc/Unknown`, `@posix`, iPhone Safari Version≫iOS — guest preview does not exempt; UTC+800×600/1280×1024/1600×1200, Boardman/Falkenstein/Centreville city, Washington+UTC, East-Asia UTC English or America/* TZ, ES+Yekaterinburg+ru, LATAM+Asia/Shanghai, non-CN+Asia/Shanghai+en (any screen), LATAM/US+UTC+X11+en, desktop UA + iPad screen, Android phone UA + classic headless screen, US X11 Linux + America/Los_Angeles + 1920×1080, US X11 Linux + Europe/Kiev, Reston/Herndon + America/Los_Angeles, UTC+stale Mac Catalina Chrome) | `Etc/Unknown` / `@posix` / spoofed Safari always (unsigned, within 45s/≤4 PV bounds); others when shallow |
| Sensitive-path China-TZ proxy farm (non-CN + Shanghai TZ + English + stale desktop Chrome/Edge/Firefox 110–125) | yes; does not age out, CN and signed-in exempt |
| Web zh cloud locale probes (near-square desktop; Tencent/Huawei desktop shallow; Tencent/Huawei mobile shallow) | yes for near-square (guest preview does not exempt); soft path when shallow |
| Broader Google infra IP alone | no — `isHumanLikeInstall` can clear |
| Tencent Cloud IP alone | no — soft corroboration only |

## Caveats

- **`isDatacenterCrawlerIp` includes large AWS us-west-2 and us-east-1 EC2
  ranges**, not only Device Farm / Facebook fetchers. That footprint covers a
  lot of Oregon and Northern Virginia EC2 (VPNs, backends, corporate egress).
  Same for coarse `isLikelyBotIp` Google / Apple prefixes — use them as soft
  signals, not drop rules. **Ashburn city/region alone is never a bot signal**
  (people live there); only EC2 CIDRs, or Ashburn + UTC/headless/POSIX
  corroboration on the web probe helper. **Boardman / The Dalles /
  Falkenstein (Hetzner) city + shallow visit** is a bot signal (no
  residential web egress). **zh-CN alone is never a bot signal**
  (diaspora / VPN); only shallow desktop + near-square randomized screen
  and/or Tencent/Aceville corroboration.
  **LATAM geo + Asia/Shanghai** (or other China mainland IANA TZ) flags
  only with a classic headless screen or English locale — a Chinese
  traveler (`zh` + laptop) is spared.   **Non-CN + Asia/Shanghai + en +
  near-square** catches Alibaba/Tencent cloud Mac farms and the same
  fingerprint on VN/DE (and other) exits.   **LATAM + UTC + X11 Linux +
  en** catches Querétaro-style scrapes (1920×1080 alone is not enough).
  **US + UTC + X11 Linux + en** (often `1600×1200`) catches Ace Data
  Centers San Jose / Cogent NYC Linux aarch64 farms. **`1600×1200`** is
  a classic Xvfb/VNC headless screen. **US + America/Los_Angeles + X11
  Linux + 1920×1080** catches LogicWeb / Ashburn blog scrapers (NYC geo
  with PT timezone). **Reston/Herndon + America/Los_Angeles** catches
  Cisco OpenDNS/Umbrella POP scanners (ET geo with PT TZ); engaged
  sessions are spared. **Washington + UTC** (or classic headless screen)
  catches GCP us-east egress MaxMind maps to DC; **`1280×1024`** is a
  classic headless screen; **UTC + Mac 10.15 + Chrome ≤120 + en**
  catches stock Puppeteer UAs even when the screen rotates. Strong
  geo↔TZ mismatch rules (LATAM/non-CN Shanghai/LATAM-UTC-X11/US-UTC-X11/
  Reston-PT/US-X11) allow up to **45s** usage so slow scrapes (e.g. 16s
  Fortaleza, 33s Shanghai-proxy preview) are not missed; weaker headless
  rules stay at 15s. **Android phone UA (`Mobile` token) + classic headless
  screen** (800×600–1600×1200) catches spoofed-device probes whose virtual
  display leaks through (Nexus 5 UA on 1600×1200, Tencent Guangzhou);
  tablets and engaged sessions are spared. **Tencent CIDRs include
  `101.42.0.0/15` and `43.138.0.0/15` (Guangzhou)**;
  **Huawei AS136907** includes `124.243.128.0/18` (SG) and
  `149.232.128.0/19` (MX). Near-square is orientation-agnostic
  (portrait + perfect square). Same-IP / same-UA burst clustering
  stays in the app — it needs a window of rows.
- **Funnel event names are product-shaped** (`sign_in_canceled_google`,
  reading-time fields, etc.). Other apps may only get IP / locale / geo signals
  unless event names match or you adapt the helpers. Pass `opts.isShallow`
  from your own funnel-aware shallow check when needed.
- **CIDR lists are snapshots** and will go stale. Behavioral results can change
  in `0.x` without an API break.
- Payload fields are optional and shape-tolerant. Pass what you already store
  (`ip`, `language`, `timezoneOffsetMinutes`, `funnelEvents`, `region`,
  `city`, …). Prefer server-derived geo; client-supplied city/region is spoofable.

## License

MIT
