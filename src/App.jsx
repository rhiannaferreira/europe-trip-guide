import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
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
import NearbyPlaces from './components/NearbyPlaces.jsx'
import TripTimeline from './components/TripTimeline.jsx'
import BudgetPlanner from './components/BudgetPlanner.jsx'
import { useBudget } from './useBudget.js'
import Modal from './components/Modal.jsx'
import CityComparison from './components/CityComparison.jsx'
import TravelQuiz from './components/TravelQuiz.jsx'
import SurpriseMe from './components/SurpriseMe.jsx'
import TripProgress from './components/TripProgress.jsx'
import TripNotes from './components/TripNotes.jsx'
import PrintTrip from './components/PrintTrip.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import InstallButton from './components/InstallButton.jsx'
import { useTheme } from './useTheme.js'
import { autoEstimates, formatMoney, summarizeBudget } from './utils/budgetCalculations.js'
import { buildDays, tripProgress } from './utils/tripCalculations.js'
import { Link, cityPath, countryPath, navigate } from './lib/router.jsx'
import { setPageMeta } from './lib/meta.js'
import { cityMeta, countryMeta } from './lib/pageMeta.js'
import ShareTrip, { SharedTripDialog } from './components/ShareTrip.jsx'
import { usePlacesVersion } from './lib/extraPlaces.js'
import { useOsmPlaces } from './lib/osmPlaces.js'
import OsmStatus from './components/OsmStatus.jsx'
import { CityWeather, TripWeather } from './components/Weather.jsx'
import AccountPanel, { AccountButton, AccountNotice } from './components/Account.jsx'
import { useCloudSync } from './useCloudSync.js'

const PAGE = 24

// Skip links move focus without changing the URL (the # would clash with routes in the preview build).
const skipTo = (id) => (e) => {
  e.preventDefault()
  const el = document.getElementById(id)
  el?.focus()
  el?.scrollIntoView({ block: 'start' })
}

const scrollToTrip = () => document.getElementById('my-trip-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// The planner. Which country or city is shown comes from the URL (/country/it, /city/rome), so the
// back button, bookmarks and shared links all work.
export default function App({ route }) {
  const cityId = route.name === 'city' ? route.id : ''
  const country = cityId ? cityById[cityId].country : route.name === 'country' ? route.code : ''
  const [query, setQuery] = useState('')
  const [gemMode, setGemMode] = useState(false)
  const [activeInterests, setActiveInterests] = useState(() => new Set())
  const [focusedId, setFocusedId] = useState(null)
  const [shown, setShown] = useState(PAGE)
  const [fitTripRequest, setFitTripRequest] = useState(0)
  const [tripTab, setTripTab] = useState('trip')
  const [selectedDay, setSelectedDay] = useState(null)
  const trip = useTrip()
  const budget = useBudget()
  // Signed in: the trip and budget are also saved to the account (does nothing when accounts are off).
  const cloud = useCloudSync(trip, budget)
  const { theme, toggle: toggleTheme } = useTheme()
  // Which discovery tool is open in a dialog ('compare', or null), and the two compared cities.
  const [tool, setTool] = useState(null)
  const [comparePair, setComparePair] = useState(['barcelona', 'lisbon'])

  // Places from OpenStreetMap join the list when a city is opened; the version changes when they arrive.
  const placesVersion = usePlacesVersion()
  const osm = useOsmPlaces(cityId ? cityById[cityId] : null)

  const legs = useMemo(() => tripLegs(trip.cityIds), [trip.cityIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const days = tripDays(trip.startDate, trip.endDate)
  const pace = tripPace(days, trip.cityIds.length)
  const suggestions = tripSuggestions({ days, cityIds: trip.cityIds, legs })
  // One entry per trip day (empty without dates): date, city, and the travel leg on travel days.
  const itineraryDays = buildDays({ startDate: trip.startDate, endDate: trip.endDate, stops: trip.stops, legs })
  // The day drawn on the map: only while the Days tab is open, and only if that day still exists.
  const shownDay = tripTab === 'days' ? itineraryDays.find((d) => d.number === selectedDay) : null
  const dayView = shownDay ? { day: shownDay, places: (trip.itinerary[shownDay.number]?.placeIds || []).map((id) => placeById[id]) } : null

  const budgetSummary = summarizeBudget(
    budget,
    autoEstimates({ stops: trip.stops, totalDays: days, legs, levelOverrides: budget.cityLevels, travellers: budget.travellers, currency: budget.currency }),
  )
  const progress = tripProgress({
    stops: trip.stops,
    startDate: trip.startDate,
    endDate: trip.endDate,
    tripLength: days,
    days: itineraryDays,
    legs,
    itinerary: trip.itinerary,
    budgetSummary,
    formatMoney: (n) => formatMoney(n, budget.currency),
  })

  const selectDay = (n) => {
    setSelectedDay(n)
    if (n && window.innerWidth <= 1200) document.querySelector('.map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
    [country, cityId, gemMode, activeInterests, query, placesVersion],
  )

  // Cities the map should frame when no places match (e.g. a country with every filter off).
  const fitCities = cityId ? [cityById[cityId]] : country ? citiesInCountry(country) : []

  const resetPaging = () => setShown(PAGE)

  const selectCountry = (code) => {
    resetPaging()
    if (cityId && code && cityById[cityId].country === code) return
    navigate(code ? countryPath(code) : '/explore')
  }

  const selectCity = (id) => {
    resetPaging()
    if (id === cityId) return
    navigate(id ? cityPath(id) : country ? countryPath(country) : '/explore')
  }

  // Title, description and canonical link for the page being shown.
  useEffect(() => {
    if (cityId) setPageMeta(cityMeta(cityById[cityId]))
    else if (country) setPageMeta(countryMeta(country))
    else if (route.name === 'trip') setPageMeta({ title: 'My trip', path: '/trip' })
    else setPageMeta({ title: 'Explore Europe', path: '/explore' })
  }, [cityId, country, route.name])

  // /trip opens on the trip panel.
  useEffect(() => {
    if (route.name === 'trip') setTimeout(scrollToTrip, 50)
  }, [route.name])

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
    // Make sure the card is on the current page of results, so its details and nearby places can open.
    const index = visiblePlaces.findIndex((p) => p.id === id)
    if (index >= shown) setShown(index + 1)
    // On stacked layouts the map is above the lists, so bring it into view.
    if (window.innerWidth <= 1200) document.querySelector('.map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Side by side, bring the place's card (with its nearby places) into view in the list.
    else setTimeout(() => document.querySelector('.place-card.focused')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
  }

  // From a dialog: close it and open the city in the explorer.
  const viewCity = (id) => {
    setTool(null)
    selectCity(id)
    setTimeout(() => document.querySelector('.explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const openCompare = (withCityId) => {
    if (withCityId) setComparePair(([a, b]) => (a === withCityId || b === withCityId ? [a, b] : [withCityId, a === withCityId ? b : a]))
    setTool('compare')
  }

  const pickFromSearch = {
    country: (code) => {
      setQuery('')
      resetPaging()
      navigate(countryPath(code))
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
      <nav className="skip-links" aria-label="Skip links">
        <a className="skip-link" href="#places-title" onClick={skipTo('places-title')}>
          Skip to places
        </a>
        <a className="skip-link" href="#my-trip-panel" onClick={skipTo('my-trip-panel')}>
          Skip to my trip
        </a>
      </nav>
      <header className="app-header">
        <div className="brand">
          <h1>
            <Link to="/" className="brand-link">
              Eurowander
            </Link>
          </h1>
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
        <nav className="header-nav" aria-label="Discover">
          <button type="button" className="btn nav-btn" onClick={() => openCompare()}>
            <span aria-hidden="true">⚖️</span> <span className="nav-label">Compare</span>
          </button>
          <button type="button" className="btn nav-btn" onClick={() => setTool('quiz')}>
            <span aria-hidden="true">🧭</span> <span className="nav-label">Quiz</span>
          </button>
          <button type="button" className="btn nav-btn" onClick={() => setTool('surprise')}>
            <span aria-hidden="true">🎲</span> <span className="nav-label">Surprise me</span>
          </button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <InstallButton />
          <AccountButton cloud={cloud} onOpen={() => setTool('account')} />
        </nav>
        <button type="button" className="btn trip-jump" onClick={scrollToTrip}>
          🧳 My Trip{trip.cityIds.length ? ` (${trip.cityIds.length})` : ''}
        </button>
        <AccountNotice cloud={cloud} onOpen={() => setTool('account')} />
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
          onCompareCity={openCompare}
          onToggleGemMode={() => {
            setGemMode((g) => !g)
            resetPaging()
          }}
        >
          {selectedCity && <HiddenGems city={selectedCity} tripCityIds={trip.cityIds} onSelectCity={selectCity} onAddCity={trip.addCity} />}
          {!selectedCity && gemMode && <GemPairs country={country} onSelectCity={selectCity} />}
          {selectedCity && <CityWeather city={selectedCity} />}
          {selectedCity && <BestTime city={selectedCity} />}
          {tipsCountry && <CountryTips code={tipsCountry} />}
        </CityExplorer>

        <section className="places">
          <h2 className="section-title" id="places-title" tabIndex={-1}>
            Places
          </h2>
          <Filters activeInterests={activeInterests} onToggleInterest={toggleInterest} onClearInterests={() => setActiveInterests(new Set())} />
          <p className="list-count">{listTitle}</p>
          {selectedCity && <OsmStatus state={osm} city={selectedCity} />}
          <div className="place-list">
            {visiblePlaces.slice(0, shown).map((p) => (
              <PlaceCard
                key={p.id}
                place={p}
                city={cityById[p.cityId]}
                saved={trip.savedIds.has(p.id)}
                status={trip.statuses[p.id]}
                onStatusChange={(s) => trip.setStatus(p.id, s)}
                focused={focusedId === p.id}
                onToggleSave={() => trip.togglePlace(p.id)}
                onFocus={() => focusPlace(p.id)}
              >
                <NearbyPlaces
                  place={p}
                  savedIds={trip.savedIds}
                  days={itineraryDays}
                  onToggleSave={trip.togglePlace}
                  onAddToDay={trip.assignToDay}
                  onFocusPlace={focusPlace}
                />
              </PlaceCard>
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

      <main className="map-panel" aria-label="Map">
        <MapView
          places={visiblePlaces}
          cities={cities}
          fitCities={fitCities}
          savedIds={trip.savedIds}
          routeCities={trip.cityIds.map((id) => cityById[id])}
          legs={legs}
          focusedId={focusedId}
          fitTripRequest={fitTripRequest}
          dayView={dayView}
          onFocus={setFocusedId}
          onFocusPlace={focusPlace}
          onToggleSave={trip.togglePlace}
          onSelectCity={selectCity}
        />
        {dayView && (
          <div className="day-banner" role="status">
            <span>
              <strong>Day {dayView.day.number}</strong> · {cityById[dayView.day.cityId].name} ·{' '}
              {dayView.places.length === 0 ? 'nothing planned yet' : `${dayView.places.length} place${dayView.places.length === 1 ? '' : 's'} in order`}
            </span>
            <button type="button" className="link-btn" onClick={() => setSelectedDay(null)} aria-label="Close day view">
              ✕
            </button>
          </div>
        )}
      </main>

      {tool === 'compare' && (
        <Modal title="Compare two cities" onClose={() => setTool(null)} wide>
          <CityComparison
            a={comparePair[0]}
            b={comparePair[1]}
            onChange={(a, b) => setComparePair([a, b])}
            tripCityIds={trip.cityIds}
            onViewCity={viewCity}
            onAddCity={trip.addCity}
          />
        </Modal>
      )}

      {tool === 'quiz' && (
        <Modal title="Find your destination" onClose={() => setTool(null)}>
          <TravelQuiz tripCityIds={trip.cityIds} onViewCity={viewCity} onAddCity={trip.addCity} />
        </Modal>
      )}

      {tool === 'surprise' && (
        <Modal title="Surprise me" onClose={() => setTool(null)}>
          <SurpriseMe tripCityIds={trip.cityIds} onViewCity={viewCity} onAddCity={trip.addCity} />
        </Modal>
      )}

      {tool === 'print' && (
        <Modal title="Printable trip summary" onClose={() => setTool(null)} wide>
          <div className="print-actions no-print">
            {/* The hosted preview page can't open the print dialog, so it gets a note instead of the button. */}
            {import.meta.env.VITE_PREVIEW ? (
              <span className="rule">Printing isn't available in this preview. In the app, a Print / Save as PDF button appears here.</span>
            ) : (
              <>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  🖨️ Print / Save as PDF
                </button>
                <span className="rule">Choose “Save as PDF” as the printer to get a file.</span>
              </>
            )}
          </div>
          <PrintTrip trip={trip} days={itineraryDays} legs={legs} budgetSummary={budgetSummary} currency={budget.currency} />
        </Modal>
      )}

      {tool === 'account' && (
        <Modal title="Your account" onClose={() => setTool(null)}>
          <AccountPanel cloud={cloud} currentName={trip.displayName} />
        </Modal>
      )}

      {route.name === 'trip' && route.share && (
        <SharedTripDialog
          code={route.share}
          trip={
            // Signed in, an opened shared trip becomes a new saved trip instead of writing over the open one.
            cloud.phase === 'on'
              ? {
                  ...trip,
                  replace: (data) => {
                    cloud.detach().then(() => trip.replace(data))
                  },
                }
              : trip
          }
        />
      )}

      <section className="trip-panel" id="my-trip-panel" aria-label="My trip" tabIndex={-1}>
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
              {trip.stops.length > 0 && (
                <TripProgress
                  items={progress}
                  onGo={{ activities: () => setTripTab('days'), itinerary: () => setTripTab('days'), budget: () => setTripTab('budget') }}
                />
              )}
              {itineraryDays.length > 0 && <TripWeather days={itineraryDays} />}
              {trip.stops.length > 0 && <ShareTrip trip={trip} />}
              <TripNotes trip={trip} onOpenPrint={() => setTool('print')} />
              <TripSummary cityIds={trip.cityIds} legs={legs} days={days} pace={pace} suggestions={suggestions}>
                <TripSeasons
                  events={eventsDuringTrip(trip.startDate, trip.endDate, trip.cityIds)}
                  notes={seasonNotes(trip.startDate, trip.endDate, trip.cityIds)}
                  hasDates={Boolean(days)}
                />
              </TripSummary>
            </>
          )}
          {tripTab === 'timeline' && (
            <TripTimeline
              stops={trip.stops}
              legs={legs}
              days={itineraryDays}
              itinerary={trip.itinerary}
              statuses={trip.statuses}
              onOpenDay={(n) => {
                setTripTab('days')
                setSelectedDay(n)
                setTimeout(() => document.getElementById(`day-${n}-title`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
              }}
            />
          )}
          {tripTab === 'budget' && <BudgetPlanner trip={trip} legs={legs} totalDays={days} budget={budget} />}
          {tripTab === 'days' && <DailyItinerary trip={trip} days={itineraryDays} tripLength={days} selectedDay={selectedDay} onSelectDay={selectDay} onFocusPlace={focusPlace} />}
        </TripPanel>
      </section>
    </div>
  )
}
