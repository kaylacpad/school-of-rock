# History of Rock

An interactive, explorable version of the "History of Rock" chalkboard from *School of Rock*.

## What's where

| Path | What it is |
|---|---|
| `data/chart.json` | The chalkboard itself, transcribed from the movie: every genre box, arrow, and name in the original chart's coordinates, plus genre descriptions and the lesson captions. |
| `data/artists.json` | Full artist cards (bio, top songs, film placements, influences). The data pipeline will fill this in for every artist. |
| `lib/board.js` | Draws the board and runs every interaction (pan/zoom, panels, tracing, lesson, timeline, search). |
| `app/globals.css` | All the styling: colors, fonts, panel, chalk look. |
| `components/` | The page shell that loads the data into the board. |
| `scripts/check-layout.mjs` | Checks that no name touches a line, box, or another name. |

## Editing the chart

- **Genre descriptions or lesson captions:** edit the text in `data/chart.json`.
- **Spacing:** each list of names can take a `"nudge": [x, y]` (small shift, in original-chart pixels) or a `"rowSpacing"`. Placement itself should stay as in the movie.
- **On-board spellings:** names appear exactly as written on the chalkboard. `"Jackson Brown=>Jackson Browne"` means *show* "Jackson Brown", *link to* "Jackson Browne".

## Deploying

Pushing to the `main` branch on GitHub redeploys the site on Vercel automatically.

## Running it on your computer (optional)

Requires Node.js 20+.

```
npm install
npm run dev        # then open http://localhost:3000
```

Layout check (first time: `npm install --no-save playwright && npx playwright install chromium`):

```
npm run check-layout
```

## Credits

Fonts: Architects Daughter and Cabin Sketch, SIL Open Font License (see `app/fonts`).
