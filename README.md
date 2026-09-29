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
- Responsive (desktop three columns, tablet two, phone stacked) with light and dark themes.

### Rules the numbers follow

- Trip days count both the start and end date.
- Pace: under 2 days per city is fast-paced, 2 to 3 is moderate, over 3 is relaxed.
- Rough rail estimate: straight-line distance × 1.25 at 100 km/h, plus 20 minutes.
- Suggestions appear when there are under 1.5 days per city (with 3+ cities), fewer days than cities, more than 3 hours of travel per day on average, or a single leg of 7 hours or more.
- Ratings, travel times and event dates are sample values, not live data.

## Layout

```
src/
  App.jsx                 page state (selection, search, filters) and layout
  useTrip.js              trip state + localStorage (stops, saved places, dates)
  lib/
    trip.js               trip maths: legs, days, pace, suggestions, events, seasons
    search.js             search index and matching
    format.js             months, durations, cost labels
    geo.js                straight-line distance
  components/
    SearchBar, CityExplorer, Filters, PlaceCard, Thumb,
    MapView, RouteView, TripBoard, TripSummary, TripSeasons,
    CountryTips, HiddenGems, BestTime
  data/
    countries.js  cities.js  places.js  interests.js
    countryTips.js  trainTimes.js  events.js
    europe-outline.json   country shapes drawn under the map tiles
  styles/styles.css
```

## Swapping sample data for APIs later

Components only read data through the exports of `src/data/` (for example `getCity`, `placesInCity`, `getTrainTime`, `eventsInCity`, `getCountryTips`), and every record has a stable `id`. To switch to a real source, keep those function names and shapes and change what's behind them. Records already carry an `image` field (null for now); `Thumb` shows a photo as soon as one is set and falls back to the illustrated tile otherwise.

The trip is one plain object (`{ stops, startDate, endDate }`), so cloud saving or share links can serialise it as is.
