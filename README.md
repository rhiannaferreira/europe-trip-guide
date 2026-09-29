# Europe Trip Guide

A travel guide for Europe. Pick a country or city, discover places by interest, save favourites, and build a multi-country trip that leans on trains, with a route map, travel-time estimates, pace, local tips, hidden-gem alternatives and seasonal events.

Everything runs in the browser from hardcoded sample data. There's no backend, no login and no paid API.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

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
  components/
    SearchBar, CityExplorer, Filters, PlaceCard, Thumb,
    MapView, RouteView, TripBoard, TripSummary, TripSeasons,
    CountryTips, HiddenGems, BestTime,
    TripPanel (tabs), TripDates, DailyItinerary, ItineraryDay, DayPicker, DayRoute,
    NearbyPlaces, TripTimeline, BudgetPlanner, CityComparison, TravelQuiz, SurpriseMe,
    StatusPicker, TripProgress, TripNotes, PrintTrip, Modal, ThemeToggle
  data/
    countries.js  cities.js  places.js  interests.js
    countryTips.js  trainTimes.js  events.js  costs.js
    europe-outline.json   country shapes drawn under the map tiles
  styles/styles.css
```

## Swapping sample data for APIs later

Components only read data through the exports of `src/data/` (for example `getCity`, `placesInCity`, `getTrainTime`, `eventsInCity`, `getCountryTips`), and every record has a stable `id`. To switch to a real source, keep those function names and shapes and change what's behind them. Records already carry an `image` field (null for now); `Thumb` shows a photo as soon as one is set and falls back to the illustrated tile otherwise.

## Saved data (localStorage)

| Key | What |
| --- | --- |
| `travel-app-trip` | The trip (version 3): name, stops with saved places and days, dates, place statuses, itinerary by day number, notes |
| `travel-app-trip-backup` | The trip exactly as it was before its first migration (written once, never overwritten) |
| `travel-app-budget` | Budget total, currency, travellers, city cost overrides, category estimates, expenses |
| `travel-app-theme` | `light` or `dark` (missing = follow the system) |

Older trips (the first `{ placeIds, cityOrder }` shape and v2 `{ stops, startDate, endDate }`) are migrated on load: saved places keep their stop and become ❤️ Saved. Nothing is ever deleted from storage. The itinerary is keyed by day number, so changing the start date keeps the plan; if the trip gets shorter, plans past the new end appear under "Outside your dates" instead of disappearing.

The trip is one plain object, so cloud saving or share links can serialise it as is.

## Deploying

The app is a static site, so any static host works. On Vercel: import this repo at vercel.com/new, keep the detected Vite preset (build `npm run build`, output `dist`), and deploy. Every push to `main` redeploys.
