# farmfence

Exclude **device-farm**, **app-review**, and **crawler** traffic from product analytics.

Named for the fence around AWS Device Farm (Boardman, OR), Google Play Robo /
pre-launch fetchers, and Meta / Bing link-preview crawlers — traffic that looks
like installs or visits but is never a real user.

## Install

Private dogfood (GitHub):

```bash
npm install github:zlu/farmfence#v0.1.0
```

Public npm (when published):

```bash
npm install farmfence
```

## Usage

```ts
import {
  isLikelyBotIp,
  isDatacenterCrawlerIp,
  datacenterCrawlerReason,
  isLikelyBotInstallPayload,
  botInstallReason,
  isHumanLikeInstall,
} from "farmfence";

// Web / API request IP
if (isDatacenterCrawlerIp(ip) || isLikelyBotIp(ip)) {
  // drop or flag
}

// Mobile install / session payload (geo + locale + funnel events)
if (isLikelyBotInstallPayload(payload)) {
  console.log(botInstallReason(payload));
} else if (payload.likelyBot && !isHumanLikeInstall(payload)) {
  // IP-only flag without human override
}
```

## What it detects

| Signal | Never overridden? |
| --- | --- |
| AWS us-west-2 / Boardman device farm | yes |
| Google user-triggered fetcher + Play randomized locale (`en-SG`, …) | yes |
| Google / Apple review-farm IP + locale↔TZ mismatch or OAuth cancel loop | yes (install path) |
| Meta / Bing / AWS datacenter crawler IP | yes (web path) |
| Broader Google infra IP alone | no — `isHumanLikeInstall` can clear |

Payload fields are optional and shape-tolerant. Pass whatever you already store
(`ip`, `language`, `timezoneOffsetMinutes`, `funnelEvents`, `region`, `city`, …).

## License

MIT
