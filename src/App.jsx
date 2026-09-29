import { useMemo, useState } from 'react'
import { cities, cityById, citiesInCountry } from './data/cities.js'
import { countryByCode } from './data/countries.js'
import { placeById, places } from './data/places.js'
import { placeMatches } from './lib/search.js'
import { eventsDuringTrip, seasonNotes, tripDays, tripLegs, tripPace, tripSuggestions } from './lib/trip.js'
import { useTrip } from './useTrip.js'
import SearchBar from './components/SearchBar.jsx'
import CityExplorer from './components/CityExplorer.jsx'
import Filters from './components/Filters.jsx'
import PlaceCard from './components/PlaceCard.jsx'
import MapView from './components/MapView.jsx'
import TripBoard from './components/TripBoard.jsx'
import TripSummary from './components/TripSummary.jsx'
import CountryTips from './components/CountryTips.jsx'
import HiddenGems, { GemPairs } from './components/HiddenGems.jsx'
import BestTime from './components/BestTime.jsx'
import TripSeasons from './components/TripSeasons.jsx'
import TripPanel from './components/TripPanel.jsx'
import DailyItinerary from './components/DailyItinerary.jsx'
import { buildDays } from './utils/tripCalculations.js'

const PAGE = 24

export default function App() {
  const [country, setCountry] = useState('')
  const [cityId, setCityId] = useState('')
  const [query, setQuery] = useState('')
  const [gemMode, setGemMode] = useState(false)
  const [activeInterests, setActiveInterests] = useState(() => new Set())
  const [focusedId, setFocusedId] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const [fitTripRequest, setFitTripRequest] = useState(0)
  const [tripTab, setTripTab] = useState('trip')
  const trip = useTrip()

  const legs = useMemo(() => tripLegs(trip.cityIds), [trip.cityIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const days = tripDays(trip.startDate, trip.endDate)
  const pace = tripPace(days, trip.cityIds.length)
  const suggestions = tripSuggestions({ days, cityIds: trip.cityIds, legs })
  // One entry per trip day (empty without dates): date, city, and the travel leg on travel days.
  const itineraryDays = buildDays({ startDate: trip.startDate, endDate: trip.endDate, stops: trip.stops, legs })

  const visiblePlaces = useMemo(
    () =>
      places.filter((p) => {
        const c = cityById[p.cityId]
        return (
          (!country || c.country === country) &&
          (!cityId || p.cityId === cityId) &&
          (!gemMode || cityId || c.hiddenGem) &&
          (activeInterests.size === 0 || activeInterests.has(p.category)) &&
          placeMatches(p, query)
        )
      }),
    [country, cityId, gemMode, activeInterests, query],
  )

  // Cities the map should frame when no places match (e.g. a country with every filter off).
  const fitCities = cityId ? [cityById[cityId]] : country ? citiesInCountry(country) : []

  const resetPaging = () => setShown(PAGE)

  const selectCountry = (code) => {
    setCountry(code)
    if (cityId && cityById[cityId].country !== code) setCityId('')
    resetPaging()
  }

  const selectCity = (id) => {
    setCityId(id)
    if (id) setCountry(cityById[id].country)
    resetPaging()
  }

  const toggleInterest = (id) => {
    setActiveInterests((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    resetPaging()
  }

  // Show a place on the map. If filters hide it, switch to its city so its marker appears.
  const focusPlace = (id) => {
    const place = placeById[id]
    if (!visiblePlaces.some((p) => p.id === id)) {
      selectCity(place.cityId)
      setGemMode(false)
      if (activeInterests.size > 0 && !activeInterests.has(place.category)) setActiveInterests(new Set())
    }
    setFocusedId(id)
    // On stacked layouts the map is above the lists, so bring it into view.
    if (window.innerWidth <= 1200) document.querySelector('.map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickFromSearch = {
    country: (code) => {
      setQuery('')
      setCityId('')
      selectCountry(code)
    },
    city: (id) => {
      setQuery('')
      selectCity(id)
    },
    place: (id) => {
      setQuery('')
      focusPlace(id)
    },
  }

  const tipsCountry = cityId ? cityById[cityId].country : country
  const selectedCity = cityId ? cityById[cityId] : null
  const listTitle = query.trim()
    ? `${visiblePlaces.length} result${visiblePlaces.length === 1 ? '' : 's'} for “${query.trim()}”`
    : `${visiblePlaces.length} place${visiblePlaces.length === 1 ? '' : 's'}${selectedCity ? ` in ${selectedCity.name}` : country ? ` in ${countryByCode[country].name}` : ''}`

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Europe Trip Guide</h1>
          <p>Places worth seeing across Europe, and the trip that connects them.</p>
        </div>
        <SearchBar
          query={query}
          onQueryChange={(q) => {
            setQuery(q)
            resetPaging()
          }}
          onPickCountry={pickFromSearch.country}
          onPickCity={pickFromSearch.city}
          onPickPlace={pickFromSearch.place}
        />
        <a className="btn trip-jump" href="#my-trip">
          🧳 My Trip{trip.cityIds.length ? ` (${trip.cityIds.length})` : ''}
        </a>
      </header>

      <aside className="sidebar">
        <CityExplorer
          country={country}
          city={selectedCity}
          gemMode={gemMode}
          tripCityIds={trip.cityIds}
          onSelectCountry={selectCountry}
          onSelectCity={selectCity}
          onAddCity={trip.addCity}
          onToggleGemMode={() => {
            setGemMode((g) => !g)
            resetPaging()
          }}
        >
          {selectedCity && <HiddenGems city={selectedCity} tripCityIds={trip.cityIds} onSelectCity={selectCity} onAddCity={trip.addCity} />}
          {!selectedCity && gemMode && <GemPairs country={country} onSelectCity={selectCity} />}
          {selectedCity && <BestTime city={selectedCity} />}
          {tipsCountry && <CountryTips code={tipsCountry} />}
        </CityExplorer>

        <section className="places">
          <h2 className="section-title">Places</h2>
          <Filters activeInterests={activeInterests} onToggleInterest={toggleInterest} onClearInterests={() => setActiveInterests(new Set())} />
          <p className="list-count">{listTitle}</p>
          <div className="place-list">
            {visiblePlaces.slice(0, shown).map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                city={cityById[p.cityId]}
                saved={trip.savedIds.has(p.id)}
                focused={focusedId === p.id}
                onToggleSave={() => trip.togglePlace(p.id)}
                onFocus={() => focusPlace(p.id)}
              />
            ))}
          </div>
          {visiblePlaces.length > shown && (
            <button type="button" className="btn more-btn" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({visiblePlaces.length - shown} left)
            </button>
          )}
          {visiblePlaces.length === 0 && <p className="empty">No places match. Try clearing a filter or the search.</p>}
        </section>
      </aside>

      <main className="map-panel">
        <MapView
          places={visiblePlaces}
          cities={cities}
          fitCities={fitCities}
          savedIds={trip.savedIds}
          routeCities={trip.cityIds.map((id) => cityById[id])}
          legs={legs}
          focusedId={focusedId}
          fitTripRequest={fitTripRequest}
          onFocus={setFocusedId}
          onToggleSave={trip.togglePlace}
          onSelectCity={selectCity}
        />
      </main>

      <section className="trip-panel">
        <TripPanel tab={tripTab} onTabChange={setTripTab}>
          {tripTab === 'trip' && (
            <>
              <TripBoard
                trip={trip}
                legs={legs}
                days={days}
                onSelectCity={selectCity}
                onFocusPlace={focusPlace}
                onViewTrip={() => setFitTripRequest((n) => n + 1)}
              />
              <TripSummary cityIds={trip.cityIds} legs={legs} days={days} pace={pace} suggestions={suggestions}>
                <TripSeasons
                  events={eventsDuringTrip(trip.startDate, trip.endDate, trip.cityIds)}
                  notes={seasonNotes(trip.startDate, trip.endDate, trip.cityIds)}
                  hasDates={Boolean(days)}
                />
              </TripSummary>
            </>
          )}
          {tripTab === 'days' && <DailyItinerary trip={trip} days={itineraryDays} tripLength={days} onFocusPlace={focusPlace} />}
        </TripPanel>
      </section>
    </div>
  )
}
