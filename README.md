# Europe Trip Guide

Pick a European country or city, browse places by interest, save favourites to a trip board, and see the route between the cities you've saved.

## Run it

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## What's in v0.1

- 11 sample cities across 9 countries, 4 places each (one per interest), in `src/data/`.
- Country and city pickers plus interest chips (food, outdoors, museums, nightlife).
- Leaflet map with OpenStreetMap tiles; clicking a city dot selects that city.
- Trip board saved in the browser (localStorage). Cities join the route in the order you save places, can be reordered, and the map draws a dashed route with straight-line distances.
- Local tips per country (tipping, opening hours) shown when a country or city is selected.

## Layout

```
src/
  App.jsx              state and layout
  useTrip.js           trip board state + persistence
  geo.js               straight-line distance helper
  components/          MapView, PlaceCard, Filters, TripBoard
  data/                cities.js (cities, countries, tips), places.js
```

## Later

Train-first travel times, seasonal events, hidden-gem alternatives, and a real places API.
