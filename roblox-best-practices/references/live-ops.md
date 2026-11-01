# Live ops: reading the numbers, ads, re-engagement, and the first 90 days

Running a Roblox experience once it is public. None of it is Luau; instrumenting the events these dashboards read is in [growth-apis.md](growth-apis.md), and what has to be true before launch is in [publishing.md](publishing.md).

> **Platform numbers go stale fast.** Each one links to its source; re-read the page before quoting it when web access is available. Dated state: [api-currency.md](api-currency.md#publishing-platform-state).

## Contents

- [Reading the analytics dashboard](#reading-the-analytics-dashboard)
- [What good retention looks like](#what-good-retention-looks-like)
- [When impressions fall](#when-impressions-fall)
- [Ads Manager](#ads-manager)
- [Re-engagement tools and their limits](#re-engagement-tools-and-their-limits)
- [Payout programs](#payout-programs)
- [Update cadence and events](#update-cadence-and-events)
- [The first 90 days](#the-first-90-days)
- [Operations checklist](#operations-checklist)

## Reading the analytics dashboard

- **Thresholds.** Every KPI unlocks after more than 10 daily players and 10 play hours for 7 days in a row. Comparison with similar experiences needs about 100 daily players. Experiments rarely reach significance below about 1,000 ([analytics dashboard](https://create.roblox.com/docs/production/analytics/analytics-dashboard)).
- **Retention** is a cohort by first-play date: D1 returned the next day, D7 on the eighth day, D30 on the thirty-first ([retention](https://create.roblox.com/docs/production/analytics/retention)).
- **New User First Session Retention** (Engagement page) shows the share of new players still playing a given number of minutes into their first session. It is the closest view of first-play bounce.
- **Acquisition** splits new players by source with impressions, plays, conversion, and 7-day playtime per new player; the Home Recommendations tab shows the Recommended for You signals and a list of similar experiences.
- **Monetization:** payer conversion is the share of daily players who paid, ARPPU the revenue per paying player, and ARPDAU the two multiplied. High ARPPU with low ARPDAU means a small group carries the revenue ([monetization](https://create.roblox.com/docs/production/analytics/monetization)).
- **Small experiences:** before the KPI threshold, the Share Links tab counts visits from links you made, and the Watchlist follows up to nine competing experiences by their public stats.
- Charts export to CSV, except in the first 48 hours after enrolling. Event-driven charts (funnels, economy, custom) appear about 24 hours after the first event.

## What good retention looks like

- Roblox publishes no platform median. The dashboard shows a band from the 50th to the 90th percentile of similar experiences, and that band is the right target per genre. The band printed in the docs is an illustration, not a median.
- The best public figures come from a third party over large games only: median D1 about 10%, D7 under 2%, D30 under 1%, with the top 1% of large games near 22% on D1 ([api-currency.md](api-currency.md#publishing-platform-state)). That is about half the mobile median, so mobile targets do not transfer.
- Roblox's own ladder: D1 depends on the core loop, a short first experience that reaches the fun within about five minutes, and performance; D7 on progression; D30 on regular updates and social systems such as trading, parties, and leaderboards.
- Simple rules on first-day playtime and rounds played predict churn almost as well as a model does. Build the funnel before building anything predictive.

## When impressions fall

Roblox names four causes ([discovery FAQ](https://create.roblox.com/docs/discovery-faq)):

1. Your own update changed gameplay, onboarding, or performance.
2. The recommendation system changed.
3. Overall Home traffic moved with the season: weekly peaks are usually on Saturday, with summer, back-to-school, and holidays shifting the base.
4. A competing experience now holds the same players better.

Work through them in order: read Acquisition by source, compare the signals on the Home Recommendations tab before and after the date, check the reduced-exposure banner, then the error and performance reports for the release. A fall right after a paid campaign ends is the campaign's players leaving the count, not a penalty. If a code change caused it, it is a bug: trace it to its cause before changing anything ([diagnosis.md](diagnosis.md)).

## Ads Manager

How it works ([Ads Manager](https://create.roblox.com/docs/production/promotion/ads-manager), [advertise](https://create.roblox.com/docs/production/promotion/advertise)):

- Campaigns serve as sponsored tiles on Home and in Search. Roblox sets the bid; there is no manual bidding and no keyword targeting. A campaign needs at least 10 ad credits. Converting Robux to ad credit cannot be undone.
- Audiences: all players, new players, recent players (needs 10,000 recent players), lapsed players (needs 20,000), with location, age, gender, genre, and device targeting.
- Reports show spend, impressions, clicks, plays, cost per play, playtime, earnings, and return on ad spend. Data can lag 48 hours, plays and earnings are attributed for 30 days, and the first 24 hours are a learning phase.
- An experience that closely copies another can end up with no spend and no conversions.

How to use it:

- **Test, then scale.** Start broad with many creatives, scale the ones that perform, and keep a campaign running around each update. Narrow targeting costs more.
- **If nothing improves after 3 to 5 days, stop and fix the onboarding** before spending more.
- **Scale only while cost per play stays below the expected earnings per player** over the attribution window.
- **Judge ads by their own numbers** (cost per play, playtime, retention of the ad cohort, return on spend), never by Recommended for You rank: ad players do not count toward it.
- The **Engagement** objective targets the highly engaged players that count toward the under-16 evaluation, costs more per play, and does not stop by itself when the threshold is reached.

## Re-engagement tools and their limits

| Tool | Limits | Use well |
|---|---|---|
| Experience notifications | 100+ visits to unlock; one per player per experience per day; personalized ones only to opted-in players 13+ | Personal, with one clear action ("your egg has hatched"). No fake urgency. Test wording with separate strings |
| Experience Events | Up to 10 live or upcoming; RSVP with Notify Me; up to 5 thumbnails each | A public event with 1,000+ RSVPs in its first week can enter the Trending Events chart. Submit for free off-platform featuring at least 7 days ahead ([experience events](https://create.roblox.com/docs/production/promotion/experience-events)) |
| Update announcements | 60 characters, one every 3 days | Say what changed, not "bug fixes" |
| Referral rewards | One banner at a time; experience live at least one day | An invite button in the experience; invites create co-play, which is a ranking signal |
| Badges | 5 free per day per experience, then a Robux fee each | Event rewards |
| Private servers | Changing the price cancels every active subscription | Reserved and private sessions count as intentional co-play |
| Standout Games | Nomination by survey, reviewed continuously | Only for an experience that is genuinely novel; prepare a video, trailer, and localization |

## Payout programs

- **Creator Rewards** pays for daily engagement by active spenders who start the experience among their first three of the day and play 10 minutes or more, and a share of the first purchases of new or returning players brought in by the experience ([Creator Rewards](https://create.roblox.com/docs/creator-rewards)). The second part needs an ID-verified owner and an average of 100+ daily players over 60 days. Paid campaigns that bring new players can therefore earn here even though they do not affect ranking.
- **Roblox Plus** sign-ups started in the experience with `MarketplaceService:PromptRobloxSubscriptionPurchase` and Robux transfers with `PromptRobuxTransferAsync` pay the creator a share ([Roblox Plus](https://create.roblox.com/docs/production/monetization/roblox-plus)).
- **DevEx** needs 30,000 earned Robux; the rate is in [api-currency.md](api-currency.md#publishing-platform-state).

## Update cadence and events

- Roblox's guidance: a small update every 2 to 4 weeks and a larger feature update every 2 to 3 months ([retention](https://create.roblox.com/docs/production/analytics/retention)). Update frequency itself is not a signal; updates count through the return days and co-play they produce.
- A fixed weekly or fortnightly slot turns each update into an appointment, and a live event just before it concentrates players. Measure an event by the retention of its cohort and the average concurrency afterwards. A peak is an event metric: the biggest hits have fallen to about an eighth of their peak within days.
- Refresh the thumbnail set at each major update, keeping the current winner. Seasonal art stays only while its content is live.
- Check the reduced-exposure banner after every release.

## The first 90 days

Day 0 is the public release. This turns the documentation into an order of work; Roblox publishes no weekly targets.

| Days | Goal | Do | Read |
|---|---|---|---|
| -14 to 0 | Ready to be tested | Finish the launch checklist in [publishing.md](publishing.md#launch-readiness-checklist); playtest the first session; prepare 3 to 5 thumbnails, a video, and 10+ ad creatives | Error and crash reports |
| 0 to 7 | Trigger retrieval, read the first session | A small broad campaign; invite friends and community; the Engagement objective if the under-16 evaluation is pending | Cost per play, first-session retention, onboarding funnel, play-through rate |
| 3 to 10 | Fix before scaling | No progress after 3 to 5 days means stop spending and fix the funnel step with the biggest drop | D1 per daily cohort, funnel steps |
| 7 to 30 | Prove D1 and D7 | Scale only while cost per play is below expected earnings; first small update; first event; personal notifications | D1 and D7 against the similar-games band, ARPDAU, payer conversion |
| 30 to 60 | Hold days 8 to 28 | Small updates every 2 to 4 weeks; new thumbnails alongside the winner; Standout Games nomination if novel; off-platform featuring 7+ days before an event | Play days in days 8 to 28, co-play, Insights, reduced-exposure banner |
| 60 to 90 | Scale what worked | Experiments only near 1,000 daily players; Managed Pricing; lapsed-player campaigns once 20,000 exist; plan the larger update | Return on ad spend, D30, Creator Rewards |

## Operations checklist

| ID | Item | Evidence |
|---|---|---|
| `ops-cadence` | Roadmap holds dated small updates every 2 to 4 weeks and a larger one every 2 to 3 months | user |
| `ops-featuring` | Each event submitted for off-platform featuring at least 7 days ahead, with its own thumbnails | hub |
| `ops-exposure-banner` | Reduced-exposure banner checked after every release | hub |
| `ops-thumbnail-refresh` | New thumbnail test at each major update, current winner included | hub |
| `mkt-ads-plan` | Campaign plan names its creatives and the day it is judged; scaling waits on the 3-to-5-day read | user |
| `mkt-ads-metrics` | Ads judged on cost per play, playtime, cohort retention, and return on spend | user |
| `mkt-disclosure` | Paid creator content carries spoken and on-screen disclosure | user |
| `mkt-brand-registration` | Paid brand content registered with Roblox before going live, with the ad label | hub |
| `data-benchmarks` | Retention compared with the similar-games band, not mobile figures | hub |
| `data-event-review` | Each event reviewed on cohort retention and average concurrency, not peak | hub |
