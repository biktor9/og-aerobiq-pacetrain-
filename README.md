# PaceTrain

A weekly training planner for runners, skiers, cyclists and orienteers. It imports
your activities from [intervals.icu](https://intervals.icu), reads the recordings
properly (pauses, GPS, elevation), and puts a coach on top of the plan, the
morning check-ins and what you actually did.

## What it does

- **Week planner** — a session per day with discipline, zone, duration and a
  block structure. Drag a session onto another day if plans change. An interval
  session can be planned by reps and time (`4 × 8′`), by distance (`8 × 800 m`),
  with a total distance for the whole session, or left open — a zone, a total
  time and maybe the kilometres — until the reps are decided. Warm-up and
  cool-down can be written in minutes or in kilometres, whichever you think in;
  kilometres are converted at your easy pace so the total and the week's
  distance stay right.
- **A page you arrange yourself** — press **✎ Edit** in the corner of the Plan
  page and the page itself becomes the editor: it keeps the exact layout you
  saved — the same rows, the same widths — so what you arrange is what you get.
  Press and drag any block to move it: it takes the place of whatever block you
  drop it on, tiles included, or use the arrows for a one-place nudge. **×** takes
  a block off the page and **⤢** changes its size. Tiles sit together in a row
  exactly as they do on a normal week, and a card ends the row — so a tile placed
  between two cards stays between them. Small tiles can be widened or enlarged,
  and cards can be half width so two sit side by side. There are twelve tiles and
  ten cards to choose from, and anything you remove waits in the bar along the
  bottom, ready to be added back. Percentages can be drawn as bars that fill from
  the left or as rings that close. Your layout and your sizes are remembered per
  account.
- **The week at a glance** — the plan's own progress ("plan done so far"), what
  the week will come to once skipped sessions are dropped (time and running
  kilometres), and the last four weeks beside next week in one calendar. Each
  calendar day is coloured by how it went against the plan: red when it was
  skipped, yellow at half the planned time, green when the plan was followed and
  blue for more than planned — with the colours blending in between, and blue as
  deep as it goes at twice the plan.
- **Heart-rate zones** — the week's time as one bar over Z1–Z5, using *your own*
  boundaries (typed in Settings, in bpm) and only the sports you tick. Where
  intervals.icu sends its own zone times those are used; otherwise each session's
  average and peak heart rate are placed against your numbers.
- **intervals.icu import** — pulls activities for a day, the week or any range,
  and refreshes the numbers it owns when you import again. Strava activities that
  intervals.icu lists but may not serve over its API are skipped with an
  explanation instead of arriving as empty rows.
- **Analysis** — kilometre splits taken straight from the watch's own laps, best
  efforts over 400 m to marathon, and interval detection that uses intervals.icu's
  laps when they exist: the analysis lists every lap, and a tick decides which
  ones count. Without laps it reads the stream (power, pace or heart rate).
- **Recovery** — a morning score built from night HRV, resting heart rate, sleep,
  soreness, life stress, training form and your own words, against *your*
  baseline: the rolling 14-day average, or a number you typed yourself. Logging
  an illness caps the score and shows in the calendar.
- **Maps** — the GPS trace of a session on satellite imagery, and a heat map of
  everything you have run inside an area you choose (week, month or year; the area
  stays put until you change it). Scroll to zoom, drag to pan.
- **Coach** — an AI that reads the plan, the week so far, the recovery number and
  your notes. Works offline when no DeepSeek key is configured.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Drizzle ORM on SQLite ·
better-auth · Zod · hand-written CSS · Vitest + Testing Library.

## Getting started

Node 22 or newer.

```bash
npm install
cp .env.example .env.local     # then fill in the two secrets below
npm run dev                    # http://localhost:3000
```

`.env.local` needs at least `BETTER_AUTH_SECRET` (hex, 32 bytes) and
`ENCRYPTION_KEY` (base64, 32 bytes); the example file shows how to generate both.
`DEEPSEEK_API_KEY` is optional — without it the coach answers from the plan only.
Migrations run automatically before `dev` (`predev`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | migrate, then start the dev server |
| `npm run build` / `npm start` | production build and serve |
| `npm test` | the whole Vitest suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` / `db:migrate` | new migration from `src/db/schema.ts`, then apply it |

## Reading recordings, the honest way

intervals.icu's API has a few rough edges that this app handles explicitly:

- **Pauses.** The `time` stream is elapsed seconds, so a paused watch counts
  minutes of standing still. The clock is rebuilt from the `moving` flag (or from
  speed and distance) so pace is measured over moving time only.
- **Gaps are gaps.** A `null` sample is never turned into `0` — that would invent a
  173 m dip in altitude and a stop at 0 m/s.
- **Routes.** `latlng` arrives as two arrays, `data` (latitudes) and `data2`
  (longitudes). A stream with only one coordinate is ignored rather than paired
  with itself; a wrong map is worse than no map.
- **Average pace.** intervals.icu's `average_speed` is stored and used, because the
  device's own `moving_time` pauses more eagerly (a COROS watch can stop
  auto-pausing 20 minutes earlier than intervals.icu counts).
- **Strava.** Those activities reach intervals.icu but not its API, so they show up
  as a stub with no sport, time or distance. They are skipped, and the import says
  how many.

## Deploying

The app runs on **Cloudflare Workers + D1** (no server to look after). Local
development keeps using a SQLite file; the driver is chosen by `DATABASE_DRIVER`.

```bash
npx wrangler login
npx wrangler d1 create pacetrain     # copy database_id into wrangler.jsonc
npm run db:migrate:d1                # apply ./drizzle to the remote database
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put ENCRYPTION_KEY
npm run deploy
```

The full walkthrough — secrets, custom domain, updates, local Worker preview and
the limits worth knowing about (UTC time zone, D1 quotas) — is in
[DEPLOY.md](DEPLOY.md).

## Privacy

Your intervals.icu API key and DeepSeek key are stored encrypted (AES-256-GCM with
`ENCRYPTION_KEY`); the key is only decrypted on the server, per request. Everything
else — activities, GPS traces, wellness, sick notes, chat history — lives in the
SQLite file under `data/`, which is gitignored. Nothing leaves the machine except
requests to intervals.icu and, when you ask the coach something, DeepSeek.

## Maps

Satellite tiles come from Esri World Imagery and need no API key; attribution is
drawn on every map (*Imagery © Esri, Maxar, Earthstar Geographics*). The map itself
is ~200 lines of Web Mercator and SVG — no map library, no dependency.

## Tests

```bash
npm test        # 512 tests over 47 files
```
