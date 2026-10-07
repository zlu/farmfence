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

// Spaced headless probes (single payload — keep burst clustering in the app)
if (isDatacenterHeadlessProbePayload(payload)) {
  console.log(datacenterHeadlessProbeReason(payload));
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
| Web headless probes (`Etc/Unknown`, `@posix`, UTC+800×600, Boardman city, KR UTC English) | yes when shallow |
| Web zh desktop cloud locale probes (near-square screen and/or Tencent/Aceville + shallow) | yes when shallow |
| Broader Google infra IP alone | no — `isHumanLikeInstall` can clear |
| Tencent Cloud IP alone | no — soft corroboration only |

## Caveats

- **`isDatacenterCrawlerIp` includes large AWS us-west-2 and us-east-1 EC2
  ranges**, not only Device Farm / Facebook fetchers. That footprint covers a
  lot of Oregon and Northern Virginia EC2 (VPNs, backends, corporate egress).
  Same for coarse `isLikelyBotIp` Google / Apple prefixes — use them as soft
  signals, not drop rules. **Ashburn city/region alone is never a bot signal**
  (people live there); only EC2 CIDRs, or Ashburn + UTC/headless/POSIX
  corroboration on the web probe helper. **  Boardman / The Dalles city +
  shallow visit** is a bot signal (no residential web egress). **zh-CN alone
  is never a bot signal** (diaspora / VPN); only shallow desktop +
  near-square randomized screen and/or Tencent/Aceville corroboration.
  Same-IP / same-UA burst clustering stays in the app — it needs a window
  of rows.
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
