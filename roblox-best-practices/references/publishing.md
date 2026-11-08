# Publishing: discovery, store listing, audience gates, and launch readiness

What decides whether players find a Roblox experience, and what has to be true before it goes public. None of it is Luau. The engine side of the same topics (odds disclosure, ad gating, the link ban, analytics events) is in [monetization-policy.md](monetization-policy.md) and [growth-apis.md](growth-apis.md); running the game after launch is in [live-ops.md](live-ops.md).

> **Platform policy moves faster than the engine.** Every number here links to its source. When web access is available, re-read that page before quoting a number to the user. The dated state of each fact is in [api-currency.md](api-currency.md#publishing-platform-state).

## Contents

- [How discovery chooses experiences](#how-discovery-chooses-experiences)
- [How a new experience is tested](#how-a-new-experience-is-tested)
- [Store listing and metadata](#store-listing-and-metadata)
- [Icon, thumbnails, and video](#icon-thumbnails-and-video)
- [Audience gates: maturity and age tiers](#audience-gates-maturity-and-age-tiers)
- [Marketing the platform does not allow](#marketing-the-platform-does-not-allow)
- [Launch readiness checklist](#launch-readiness-checklist)

## How discovery chooses experiences

| Surface | How it picks |
|---|---|
| Home, Recommended for You | Personalized per player, in two stages: retrieval picks a candidate set, ranking orders it |
| Discover charts (Top Trending, Up-and-Coming, Top Earning, Top Playing Now) | The same list for everyone, built from statistics with country and device filters. No formula is published |
| Standout Games | Picked by people on Roblox's curation team, for novelty in genre, gameplay, or visual style. Creators nominate through a survey |
| Search | Semantic matching in every supported language; a query in double quotes matches titles exactly |
| Sponsored, notifications, friends, the details page | Bring traffic, but none of it counts toward ranking in Recommended for You |

Source: [discovery](https://create.roblox.com/docs/discovery), [discovery FAQ](https://create.roblox.com/docs/discovery-faq), [Standout Games](https://create.roblox.com/docs/creator-programs/standout-games).

**Recommended for You ranks on what players do after they find the experience,** as an average per player, counting only players who arrived organically from that sort. Roblox publishes two tiers and no weights:

| Tier | Signal |
|---|---|
| Most important | Play-through rate from Recommended for You |
| Most important | First-play bounce rate, a negative signal, in buckets under 60 seconds and 61 to 180 seconds |
| Most important | Play days per player: day 1, days 2 to 7, days 8 to 28 |
| Most important | Playtime per player, counted up to 60 minutes per player per day |
| Important | Intentional co-play days (joining a friend, invites, private and reserved servers) |
| Important | Qualified play sessions per player, which filter out accidental clicks |
| Important | Spend days and Robux spent per player |

- No single signal decides the rank. Strength in retention alone or in monetization alone still earns impressions; strength in both earns wider distribution.
- **Not signals:** likes, dislikes, favorites, thumbnail click-through, update frequency, and the benchmark bands in the dashboard. A genre tag is not a ranking input, but a wrong one causes bounces, which is.
- **A custom thumbnail is required** before Home recommends the experience at all.
- Because the average is per player, a small experience whose players stay is not disadvantaged against a large one.

## How a new experience is tested

- There is no waiting period and no published minimum. A very small number of plays from any source makes the experience retrievable, and the system tests it with a small group of players every day ([discovery FAQ](https://create.roblox.com/docs/discovery-faq)).
- Signals arrive in stages: first-session play-through and bounce, then day 1, days 2 to 7, days 8 to 28.
- Ads, friends, search, social posts, and teleports **speed up consideration only.** Their players are excluded from ranking, so impressions can fall when a campaign ends without that being a penalty.
- A temporary drop in play-through rate while impressions grow is normal. Most signals update within 24 hours, and the effect on impressions shows a few days later.
- A weak start carries no penalty. The window moves, testing continues, and an experience whose retention improves can grow again.
- Story-driven and finite experiences are not penalized for the lower long-term retention their genre has.

**What this means for a launch:** money spent on traffic buys a test, not a rank. The first session and the following four weeks of retention decide what the test finds, so the onboarding has to work before traffic is bought.

## Store listing and metadata

From [publish games and places](https://create.roblox.com/docs/production/publishing/publish-games-and-places) and [discovery](https://create.roblox.com/docs/discovery):

- **Title:** no repeated words, at most one or two emoji. Keep it once players know it; a rename means players searching the old name stop finding it.
- **Description:** the first sentence says what the experience is and what the player does. Include the relevant keywords once. Repeated or irrelevant keywords can demote the experience.
- **Genre and subgenre:** set them to the gameplay a player will meet. They can change about once every three months, and Roblox may reclassify.
- **Exposure is reduced, not removed,** for metadata that implies a money reward ("Robux!", "free"), metadata that does not match the content, and experiences that closely copy an existing one. A banner in the Creator Dashboard, updated daily, shows reduced exposure. Quality is reassessed on every update, so the penalty is recoverable.
- **Localize the listing** for each target market. Search is semantic in every supported language, and Automatic Translation covers in-experience text ([automatic translation](https://create.roblox.com/docs/production/localization/automatic-translations)).

## Icon, thumbnails, and video

| Asset | Requirement |
|---|---|
| Icon | Square, at least 512x512, one per locale, moderated. Shown as small as about 150x150, so check it at that size ([experience icons](https://create.roblox.com/docs/production/publishing/experience-icons)) |
| Thumbnail | Up to 10 images or videos per details page, 16:9, ideally 1920x1080; other ratios are stretched. Under 3 MB for personalization uploads. Keep text and key elements off the bottom edge, where the player count can cover them ([thumbnails](https://create.roblox.com/docs/production/publishing/thumbnails)) |
| Video | 3 uploads per month, and a rejected video still uses one. Not shown on Xbox, PlayStation, or VR |
| Event thumbnails | Up to 5 per event |

**Video must show the real game.** Allowed: camera angles including the Studio free camera, light post-processing, a logo overlay, highlights of mechanics that exist, in-game UI text, music from the Roblox catalog. Not allowed: mechanics, UI, or interactions the game lacks; artificially enhanced graphics; real-world footage; voice-over, narration, voice chat, or music with lyrics; advertising, discounts, or "free" claims.

**Thumbnail personalization is the only official asset test.** Activate 2 to 5 thumbnails; the system shows each to random players, learns which wins per player group, and shifts impressions to each group's winner. It measures qualified play-through rate, not clicks, so a thumbnail that draws clicks and then bounces loses. Include the current winner in every new test so its traffic is kept, and test a new set at each major update. There is no icon test: judge an icon change by before-and-after play-through rate, knowing that seasonality muddies it.

**Design:** one clear subject, colour that sets the genre's mood, little or no text, and every element visible in the live build. Claims that faces or exaggerated expressions raise conversion are not established; test them with personalization instead of assuming them.

## Audience gates: maturity and age tiers

- **Complete the Maturity & Compliance Questionnaire before going public.** Without it, Roblox restricts the experience for every player ([content maturity](https://create.roblox.com/docs/production/promotion/content-maturity)).
- The label sets the ceiling on reach:

| Label | Reachable tiers |
|---|---|
| Minimal, Mild | Roblox Kids (5 to 8), Roblox Select (9 to 15), standard |
| Moderate | Roblox Select and standard (16+) |
| Content May Vary | Age-checked 16+ only |
| Restricted | ID-verified 18+ only |

- **A new experience first reaches only age-checked players aged 16 and over.** Reaching 16+ needs an age-checked creator account in good standing that is at least 2 days old.
- **Reaching players under 16** needs, on top: identity verification, 2-Step Verification, a Minimal, Mild, or Moderate rating, two consecutive months of Roblox Plus or Premium or a refundable publishing fee, and passing an evaluation. The evaluation releases to 16+, checks bots against real players hourly, runs a safety review, and then needs a threshold of plays by highly engaged age-checked players inside a window, tracked in the Audience Reach dashboard ([Kids and Select](https://create.roblox.com/docs/production/publishing/kids-and-select)). **[Verify]** the threshold and the expedited-review fee: the docs and a staff post disagree ([api-currency.md](api-currency.md#publishing-platform-state)).
- For a genre with a young audience, plan the evaluation as part of the launch, not after it. The first weeks of players are 16+, so the Ads Manager Engagement objective and marketing aimed at older players are the official ways to reach the threshold.
- Free-form user creation is for 16+ only; social hangouts are 16+, or 18+ ID-verified when they have private spaces.
- **One country can lose a game.** On a legal request Roblox can make a game undiscoverable and unplayable in a single country, leaving every other country and its analytics unchanged ([regional content availability](https://create.roblox.com/docs/production/promotion/regional-content-availability)). Players vanishing from one country with nothing broken is this before it is a bug.

## Marketing the platform does not allow

From the [Community Standards](https://about.roblox.com/community-standards) and the pages linked in each item:

- **No off-platform links inside the experience,** for any player: no URL, handle, or invite. Social links live on the experience page and are visible only to age-checked users 16 and older ([social media links](https://create.roblox.com/docs/production/promotion/social-media-links)). For players under 16, any community outside Roblox is invisible, so it cannot be the main funnel.
- **No contests, giveaways, raffles, or gambling** run by the creator with Roblox content or systems.
- **No misleading metadata or assets:** deceptive, sensational, or duplicative content used to boost discovery is spam.
- **Rewards for likes or favorites:** no official rule allows or bans them. The game cannot detect a like, so the promise may be misleading, and likes are not a ranking signal anyway. Do not build one. A reward for joining an off-platform server points at a service the game may not name; do not build that either.
- **Referral rewards** through the platform's own invite system, fixed rather than random, break none of the rules found ([growth-apis.md](growth-apis.md#referrals-and-invites)).
- **Rarity claims in promotion** agree with the disclosed odds ([monetization-policy.md](monetization-policy.md#paid-random-items)).
- **Paid brand content** is registered with Roblox at least 5 business days before it goes live and carries the standard ad label ([advertising policies](https://devforum.roblox.com/t/-/4527365)).
- **Paid creator videos** aimed at children carry a spoken and an on-screen disclosure with a plain word such as "paid" or "ad" at the start. Regulators have found that adult-style hashtags are not enough for a young audience ([CARU decision](https://bbbprograms.org/media/newsroom/decisions/roblox-advertising), [FTC endorsement guides](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking)).

## Launch readiness checklist

Each item has a stable ID for reports. **Evidence** says where it can be confirmed: `code` means the agent can check the source, `place` means a read of the open place (through Studio MCP), and `hub` means only the user can confirm it in Creator Hub. Never report a `hub` item as done without the user saying so.

| ID | Item | Evidence |
|---|---|---|
| `pub-questionnaire` | Maturity & Compliance Questionnaire completed, rating chosen for the intended audience | hub |
| `pub-age-tier-plan` | If the audience includes players under 16: account requirements met and the evaluation planned | hub |
| `pub-custom-thumbnail` | At least one custom thumbnail, 16:9, nothing important on the bottom edge | hub |
| `pub-thumbnail-set` | 2 to 5 thumbnails active in personalization | hub |
| `pub-icon` | Icon at least 512x512, subject readable at 150x150 | hub |
| `pub-video` | A gameplay video that follows the authenticity rules | hub |
| `pub-assets-match` | Every element in the icon, thumbnails, and video exists in the live build | place |
| `pub-listing` | Title without repeated words, at most two emoji; first description sentence states the game; genre and subgenre accurate | hub |
| `pub-no-money-claims` | No "Robux", "free", or reward promise in the title, description, or assets | hub |
| `pub-localized` | Listing and in-experience text translated for the target markets | hub, place |
| `mon-odds` | Paid random items disclose odds summing to 100% before purchase, boosted odds while active | code |
| `mon-policy-gates` | `ArePaidRandomItemsRestricted`, `IsPaidItemTradingAllowed`, and `AreAdsAllowed` branches exist | code |
| `mkt-no-links` | No URL, handle, or invite in any in-experience string | code, place |
| `mkt-no-contests` | No giveaway, raffle, or like-for-reward mechanic | code |
| `mkt-referral` | Invite button and a server-side, once-per-invitee referral reward, if referrals are used | code |
| `data-onboarding-funnel` | Onboarding funnel logged from the server, step 1 on join; economy events on every source and sink | code |
| `ops-first-event` | First Experience Event and update announcement drafted | hub |

A static checker, where the project has one, covers part of the `code` rows. Read the rest against [monetization-policy.md](monetization-policy.md) and [growth-apis.md](growth-apis.md), with the review gate in [review-checklist.md](review-checklist.md).
