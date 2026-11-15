# Weekend League ⚽🏆

A fast, good-looking website for running football game-night tournaments with friends.
Pick a format, tick who is playing, enter scores on your phone — tables, brackets,
Elo ranking and all-time stats update instantly.

**No accounts, no server, no build step.** Static HTML/CSS/JS that runs on GitHub Pages,
works offline once loaded, and can be installed on a phone like an app.
The interface is in Polish and English (detected automatically, switchable in the header).

## Tournament formats

| Format | How it works |
|---|---|
| **League** (Liga) | Everyone plays everyone, optionally home and away. Ranking by points → goal difference → goals scored; players still level are separated by a mini-league of their games against each other (points → goal difference → goals), then wins. |
| **Knockout** (Puchar) | Single-elimination bracket. Byes go to the top seeds when the player count is not a power of two. Draws are decided by a penalty shoot-out. Optional third-place match. |
| **Swiss system** (System szwajcarski) | A fixed number of rounds; each round pairs players with similar records and never repeats a pairing (the pairing looks ahead, so later rounds can always be completed without rematches). Odd player counts: one player rests per round (+3 points), never the same player twice. Tie-break: Buchholz. Correcting a result re-draws the following round if it has no results yet. |
| **Groups + knockout** (Grupy + puchar) | World-Cup style: balanced groups (random or seeded “snake” draw by Elo), top 1/2/4 advance to a bracket; group winners meet runners-up from other groups. |
| **King of the Couch** (Król Kanapy) | Winner stays on, loser goes to the back of the queue. First player to win N in a row is crowned (or end the night and the most wins takes it). |

Seeding can be random or based on the current Elo ranking.

## Features

- **Live tournament page** — “now playing” spotlight with the next matches, progress bar,
  standings, bracket with connector lines, group tables, per-tournament stats.
- **Fast score entry** — big +/− steppers or type the score; penalty shoot-out appears
  automatically for knockout draws. Correcting an old knockout result warns you how many
  later results it will reset, then rebuilds the bracket.
- **Champion celebration** — trophy, podium and confetti when a tournament ends.
- **Player profiles** — emoji or initials avatar, colour, favourite club; Elo history chart,
  form, streaks, clean sheets, nemesis / favourite victim, head-to-head table.
- **All-time stats** — sortable Elo ranking, records (biggest win, longest streaks,
  best attack/defence…), head-to-head comparison, hall of fame.
- **Sharing** — a text summary for WhatsApp/Messenger and a view-only link that carries a
  compressed snapshot of the tournament inside the URL (friends can open it on any phone,
  and save it to their own device).
- **Backup** — export/import all data as a JSON file (moves your history between devices).
- **PWA** — installable, works offline after the first visit, responsive from 320 px phones
  to large TVs (fullscreen button on the tournament page).

## Where is the data?

Everything is stored in the browser (`localStorage`) of the device you use. For a
tournament night, keep one device as the scorekeeper (for example the laptop connected to
the TV or the host's phone) and send view-only links to friends. Export a backup from
**Settings** now and then, or to move to another device.

Share links and backup files are treated as untrusted: they are validated field by field
(ids, scores, options, sizes) and rejected as a whole if anything is wrong. Saving a shared
tournament you already have asks first and shows both result counts, so an old link can never
silently overwrite newer results. A Content Security Policy blocks inline scripts as a second
line of defence.

Elo: everyone starts at 1000; bigger wins and upsets earn more points. Penalty shoot-outs
count as draws in all statistics (football convention) — the shoot-out only decides who
advances.

## Run locally

ES modules need to be served over HTTP (opening `index.html` directly from disk will not
work). Any static server is fine:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Tests

The tournament engine and statistics are pure modules with unit tests (Node 18+, no
dependencies):

```bash
npm test
```

The tests simulate complete tournaments of every format and size and check the invariants
(every pair meets exactly once in a league, brackets resolve with correct byes, Swiss never
repeats a pairing across hundreds of random tournaments, editing results clears exactly the
dependent matches, Elo is zero-sum, stats match the raw match records), plus validation tests
(every tournament the engine can produce passes, malformed or hostile input is rejected).

## Deploy on GitHub Pages with your own domain

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch
   `main`, folder `/ (root)`. The site appears at `https://<username>.github.io/<repo>/`
   (all paths are relative, so it works under that sub-path too).
3. **Custom domain**: enter your domain in **Settings → Pages → Custom domain** (GitHub
   adds a `CNAME` file to the repo), then configure DNS at your registrar:
   - apex domain (`example.com`): `A` records to `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153` (optionally `AAAA` to `2606:50c0:8000::153`,
     `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`);
   - subdomain (`liga.example.com` or `www`): a `CNAME` record pointing to `<username>.github.io`.
4. When the certificate is ready, tick **Enforce HTTPS**.
5. Optional: in `index.html`, change `og:image` to the absolute URL
   (`https://your-domain/assets/og-image.jpg`) so link previews show the image in every app.

## Project structure

```
index.html              app shell, meta tags, inline SVG icon sprite
css/app.css             the whole design system (dark "stadium night" theme)
js/main.js              router, header/tab bar, rendering loop
js/core/formats.js      tournament engine (all formats, results, progression)
js/core/stats.js        Elo, player stats, records, head-to-head
js/core/store.js        localStorage persistence
js/core/share.js        share-link snapshots and text summaries
js/core/validate.js     strict validation of share links, backups and stored data
js/core/i18n.js         Polish/English translations
js/core/demo.js         optional demo data
js/views/*.js           pages
sw.js                   offline support (network-first)
assets/                 fonts (Oswald, SIL OFL), icons, social preview image
tests/                  unit tests
```
