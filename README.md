# Eurowander

A travel guide for Europe. Pick a country or city, discover places by interest, save favourites, and build a multi-country trip that leans on trains, with a route map, travel-time estimates, pace, local tips, hidden-gem alternatives and seasonal events.

Everything runs in the browser. The guide itself is built-in sample data; photos, extra places and weather come from free, keyless public sources (Wikipedia/Wikimedia Commons, OpenStreetMap and Open-Meteo), and the app works without them. There's no backend, no login and no paid API.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Pages

| Address | What |
| --- | --- |
| `/` | Landing page: what makes Eurowander different, a sample train route, hidden-gem swaps |
| `/explore` | The planner |
| `/country/it` | The planner showing one country |
| `/city/rome` | The planner showing one city |
| `/trip` | The planner, opened on My Trip |
| `/trip#share=…` | A shared trip link. The trip is packed into the part after `#`, so it never reaches a server |

The build (`npm run build`) also writes a static HTML page for every city and country (`dist/city/rome.html`...) with its own title, description, preview image, structured data and a readable summary, plus `sitemap.xml` and `robots.txt` (`scripts/prerender.mjs`). `vercel.json` serves those at clean addresses and sends every other path to the app.

## Live data (free, no keys, with fallbacks)

- **Photos**: the lead image of each city's or place's English Wikipedia article, from Wikimedia Commons, with the photographer and licence credited on the photo. A photo is only used when the article's coordinates are near the city or place; titles that differ from the name are in `src/data/wikiTitles.js`. Looked up in batches of 50, cached for 30 days. No photo means the illustrated tile.
- **More places**: opening a city adds up to 24 notable places from OpenStreetMap (Overpass API): named museums, landmarks, parks, markets, bars and so on that also have a Wikidata entry, skipping ones already in the built-in data. They're marked "From OpenStreetMap", work like any other place (save, days, share), and are cached per city for 14 days. Places a trip uses are kept in localStorage.
- **Weather**: Open-Meteo. City pages show the next 7 days. With trip dates, the Trip tab shows the forecast for each day up to 16 days ahead, and last year's weather on the same dates (labelled as such) for days further out. Forecasts are cached for 3 hours.

When a source can't be reached, the app says so in a line with a Try again button and carries on with the built-in data.

## Features

- **Explore**: country chips, city cards and a city page (description, cost, popular interests, coordinates).
- **Search**: countries, cities and places, including words like "museum", "restaurant" or "park". Typing also filters the list and map.
- **Interest filters**: Food, Outdoors, Museums, Nightlife, History, Shopping. Pick several at once, or none to see everything.
- **Map**: Leaflet with OpenStreetMap tiles. City and place markers, popups with a save button, and the trip route drawn stop to stop.
- **Place cards**: image tile, category, city, rating, cost ($ to $$$, or Free), a heart to save, and "Show on map".
- **My Trip**: add cities (+) or places (♡) from any country, reorder, remove, clear. Saved in localStorage.
- **Train-first travel**: sample train times for 60+ city pairs. Pairs without data get a clearly labelled rough estimate from distance.
- **Trip summary**: cities, countries, days (from optional dates), estimated travel time, days per city and pace, plus gentle suggestions when the plan is tight.
- **Country tips**: currency, tipping, dinner times, shop hours, Sundays, transport, trains, plug types and a cultural tip.
- **Hidden gems**: "Want something less crowded?" alternatives on famous cities (Venice → Chioggia, Treviso; Barcelona → Girona; Prague → Brno…), and a toggle that shows only the quieter towns.
- **Best time to visit and events**: per-city season strip, plus sample yearly events. With trip dates set, the summary flags overlaps ("You're visiting Munich during Oktoberfest") and busy or cheaper seasons.
- **Daily itinerary** (Days tab): trip dates create Day 1, Day 2… Each day shows its date and city. Add saved places to a day, remove them, move them between days, reorder them, leave days empty, and add a note. Days are shared across stops automatically; +/- sets a stop's length.
- **Optimize route**: orders a day's places by nearest neighbour from the first place to cut backtracking. It's a rough guide, not the best possible route.
- **Day on the map**: pick a day to see its places as numbered markers joined in order. The line follows any reordering.
- **Nearby places**: viewing a place lists the closest sample places with approximate straight-line distances, a heart and "+ Day".
- **Timeline** tab: every date with its city, activities and notes. Travel days are styled differently and show the journey and its approximate time.
- **Travel-day advice**: 3+ hours of travel on a day suggests planning fewer activities. Nothing is removed.
- **Budget** tab: total budget, estimated spending and remaining, split into accommodation, food, transportation, attractions, shopping and other. Rough built-in estimates (from each city's Budget / Moderate / Expensive level, which you can override) plus your own expenses, marked estimated or paid. €, $ or £ at a fixed rough rate.
- **Compare** two cities side by side: cost, food, nightlife, museums, outdoors, history, typical stay, best months, train links and hidden gems. No overall winner.
- **Quiz**: four questions, simple points against the city data, and a plain explanation of each match.
- **Surprise me**: optional interests, budget and season, then a random matching city with View city, Add to trip and Try another.
- **Place status**: ❤️ Saved, 📍 Want to visit or ✓ Visited for every saved place.
- **Planning progress**: dates, cities, transport, activities on days, budget and days planned, with the actual counts.
- **Notes** for the whole trip, each city and each day, and a trip name.
- **Printable summary** with a Print / Save as PDF button (the browser's own print). Print CSS hides navigation, the map and buttons.
- **Light/dark toggle** in the header, remembered in the browser; follows the system setting until you choose.
- **Search autocomplete**: best matches first, matching letters highlighted, "did you mean" for typos, recent picks, arrow keys and Enter, and `/` to jump to the search box.
- **Share a trip** as a link (stops, dates, places, days and notes). Opening one shows what's in it and asks before replacing your trip; the replaced trip is kept in `travel-app-trip-previous`.
- **Install and offline**: a web app manifest and service worker (`public/sw.js`) let the app be installed and reopen offline; an Install app button appears when the browser offers it.
- **Loading, empty and error states**: page loading and download errors, a crash screen that keeps the trip safe, not-found pages, an offline notice, a notice when map tiles fail, skeletons while weather loads.
- **Accessibility**: skip links, arrow-key tabs, focus kept inside dialogs, a labelled map, reduced-motion support and colours that pass contrast checks in both themes (checked with axe-core).
- Responsive (desktop three columns, tablet two, phone stacked), with sticky trip tabs, full-screen dialogs and larger touch targets on phones.

### Rules the numbers follow

- Trip days count both the start and end date.
- Pace: under 2 days per city is fast-paced, 2 to 3 is moderate, over 3 is relaxed.
- Rough rail estimate: straight-line distance × 1.25 at 100 km/h, plus 20 minutes.
- Suggestions appear when there are under 1.5 days per city (with 3+ cities), fewer days than cities, more than 3 hours of travel per day on average, or a single leg of 7 hours or more.
- Ratings, travel times and event dates are sample values, not live data.
- Days per stop: stops with a fixed length keep it; the remaining days are split evenly (spare days go to earlier stops). The first day at each stop after the first is its travel day.
- Travel day: 3 hours or more of travel shows "Travel day — consider planning fewer activities."
- Cost levels (per day, euros, rough): Budget room €70 / food €30 / local transport €6; Moderate €120 / €45 / €8; Expensive €190 / €65 / €10. Rooms are doubles (one per two travellers); the last day of the trip has no night.
- Place entry: free €0, $ €10, $$ €20, $$$ €35 per person. Train fare: €0.14 per km, at least €10.
- Quiz and Surprise Me rules are written out at the top of `src/utils/matching.js`.

## Layout

```
src/
  App.jsx                 page state (selection, search, filters) and layout
  useTrip.js              trip state + localStorage (stops, dates, place statuses, itinerary, notes) and migrations
  useBudget.js            budget state + localStorage
  useTheme.js             light/dark preference
  useCloudSync.js         saves the trip and budget to the signed-in account (accounts only)
  utils/
    distance.js           straight-line distance and "~450 m" formatting
    routeOptimizer.js     nearest-neighbour "Optimize route"
    tripCalculations.js   days, city per day, travel days, travel-day advice, progress
    budgetCalculations.js estimates, totals, money formatting
    nearby.js             nearby places
    cityInfo.js           connections, stay, cost and gem facts for a city
    matching.js           quiz scoring and Surprise Me filters
  lib/
    storage.js            every localStorage key, safe read/write, backup before migrating
    statuses.js           Saved / Want to visit / Visited
    trip.js               trip maths: legs, days, pace, suggestions, events, seasons
    search.js             search index and matching
    format.js             months, durations, cost labels
    geo.js                straight-line distance
    router.jsx            tiny router (real paths on the site, #/paths in the preview build)
    share.js              packing a trip into a link and back
    meta.js, pageMeta.js  page titles, descriptions and canonical links
    net.js                fetch with timeout, localStorage cache with expiry
    photos.js             Wikipedia / Wikimedia Commons photos and credits
    osmPlaces.js          places from OpenStreetMap
    extraPlaces.js        registry for places added while the app runs
    weather.js            Open-Meteo forecasts and last year's weather
    pwa.js, motion.js     install prompt, online state, reduced motion
    supabase.js           sign-in by email link and the session (plain fetch, no SDK)
    account.jsx           who's signed in, for the whole app
    cloudTrips.js         the account's saved trips (Supabase table `trips`)
    cloudSync.js          keeps this browser's trip and the account's copy in step
  components/
    SearchBar, CityExplorer, Filters, PlaceCard, Thumb,
    MapView, RouteView, TripBoard, TripSummary, TripSeasons,
    CountryTips, HiddenGems, BestTime,
    TripPanel (tabs), TripDates, DailyItinerary, ItineraryDay, DayPicker, DayRoute,
    NearbyPlaces, TripTimeline, BudgetPlanner, CityComparison, TravelQuiz, SurpriseMe,
    StatusPicker, TripProgress, TripNotes, PrintTrip, Modal, ThemeToggle,
    ShareTrip, Weather, OsmStatus, InstallButton, OfflineNotice, PageStates, ErrorBoundary,
    Account (sign-in, saved trips, header button and notice)
  pages/Landing.jsx       the home page
  Root.jsx                routes: landing, planner (loaded on demand), not found
  data/
    countries.js  cities.js  places.js  interests.js
    countryTips.js  trainTimes.js  events.js  costs.js
    europe-outline.json   country shapes drawn under the map tiles
  styles/styles.css
```

## Swapping sample data for APIs later

Components only read data through the exports of `src/data/` (for example `getCity`, `placesInCity`, `getTrainTime`, `eventsInCity`, `getCountryTips`), and every record has a stable `id`. To switch to a real source, keep those function names and shapes and change what's behind them. Records carry an `image` field (null for now); when set, `Thumb` uses it instead of looking up a Wikipedia photo. Places added at runtime go through `registerPlaces` in `src/lib/extraPlaces.js`.

## Saved data (localStorage)

| Key | What |
| --- | --- |
| `travel-app-trip` | The trip (version 3): name, stops with saved places and days, dates, place statuses, itinerary by day number, notes |
| `travel-app-trip-backup` | The trip exactly as it was before its first migration (written once, never overwritten) |
| `travel-app-budget` | Budget total, currency, travellers, city cost overrides, category estimates, expenses |
| `travel-app-theme` | `light` or `dark` (missing = follow the system) |
| `travel-app-trip-previous` | The trip as it was before a shared trip replaced it |
| `travel-app-extra-places` | OpenStreetMap places the trip uses |
| `travel-app-recent-searches` | The last few search suggestions picked |
| `travel-app-session` | The signed-in session (accounts only; removed on sign-out) |
| `travel-app-cloud` | Which of the account's saved trips this browser's trip is (accounts only) |
| `eurowander-cache-*` | Cached photos, OpenStreetMap places and weather (safe to clear) |

Older trips (the first `{ placeIds, cityOrder }` shape and v2 `{ stops, startDate, endDate }`) are migrated on load: saved places keep their stop and become ❤️ Saved. Nothing is ever deleted from storage. The itinerary is keyed by day number, so changing the start date keeps the plan; if the trip gets shorter, plans past the new end appear under "Outside your dates" instead of disappearing.

The trip is one plain object, so cloud saving serialises it as is (share links do too).

## Accounts (optional)

People can sign in with an emailed link to keep their trips in an account and open them on any device. Signing in is optional: without it everything stays in the browser, as before. Accounts use a free Supabase project, called straight from the browser with the public anon key; row-level security (in `supabase/schema.sql`) lets each person read and write only their own trips.

- **First sign-in:** the trip in the browser (with its itinerary, budget, notes and statuses) is uploaded as a saved trip. If the browser's trip is empty, the most recent saved trip opens instead.
- **While signed in:** every change is saved to the account a moment after it's made, and a tab that comes back into focus picks up changes made on another device. The browser copy stays, so the app still works offline.
- **Your trips:** the header's account button lists saved trips, opens another one, starts a new one or deletes one. Opening a shared trip link while signed in saves it as a new trip rather than writing over the open one.
- **Sign out:** a copy of the open trip stays in the browser.

Accounts switch on only when the build has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Without them there's no sign-in button and nothing about accounts runs.

### Setting up Supabase

1. Create a free project at supabase.com.
2. In **SQL Editor**, paste `supabase/schema.sql` and run it.
3. In **Authentication > URL Configuration**, set **Site URL** to `https://eurowander.vercel.app` and add `https://eurowander.vercel.app/**` (and `http://localhost:5173/**` for local work) to **Redirect URLs**.
4. Copy the **Project URL** and the **publishable** key (`sb_publishable_…`, or the older **anon public** key). Both are under the project's **Connect** button and **Project Settings > API Keys**. Never use the secret or `service_role` key in the app.
5. In Vercel, **Settings > Environment Variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with those values, then redeploy. For local work, put them in `.env.local`.

Supabase's built-in email sender is limited to a few emails an hour; for more, add your own SMTP provider under **Authentication > Emails**.

## Deploying

The app is a static site, so any static host works. On Vercel: import this repo at vercel.com/new, keep the detected Vite preset (build `npm run build`, output `dist`), and deploy. Every push to `main` redeploys. `vercel.json` handles the clean city/country addresses and sends other paths to the app.
