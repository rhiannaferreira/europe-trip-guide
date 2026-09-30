// How-to answers for the site-wide assistant, one per topic. Each can point at the page that has the feature.
export const HELP = {
  general: {
    text: 'Eurowander helps you find places across Europe, save them to a trip, and plan the days. Browse the map and filter by interest, save places with the heart, and see your cities, dates, days and budget under My trip. Build my trip makes a whole route from your preferences. I can open cities, suggest places, add things to your trip, or start a new trip for you.',
    to: '/explore',
    label: 'Explore the map',
  },
  share: { text: 'Open My trip and press “Create share link”. The whole trip is packed into the link, so nothing is uploaded; whoever opens it is asked before it replaces their own trip. Built trips have their own Share button on the Build page.', to: '/trip', label: 'Open My trip' },
  accounts: { text: 'Your trip is saved in this browser automatically. Signing in to save trips to an account is optional and appears in the header when it’s switched on for the site.', to: '/trip', label: 'Open My trip' },
  build: { text: 'Build my trip asks for your dates or trip length, countries, must-see cities, interests, pace and budget (all optional), then plans a whole route with nights per city. You can swap cities, change nights, plan the days, and save it to My trip. You can also just tell me, for example “Plan 10 days in Italy and Greece for food”.', to: '/build', label: 'Build my trip' },
  itinerary: { text: 'Set your trip dates under My trip, then open the Days tab to put saved places on each day. Each day shows its route on the map, and the Timeline tab lays out travel days.', to: '/trip', label: 'Open My trip' },
  budget: { text: 'The Budget tab under My trip estimates rooms, food, transport and entry costs from each city’s cost level. Set a total, currency and travellers, and add your own expenses. They’re rough estimates, not live prices.', to: '/trip', label: 'Open My trip' },
  compare: { text: 'Compare puts two cities side by side: costs, typical stay, best months, interests and train links. It’s in the header of the explore page.', tool: 'compare', label: 'Open Compare' },
  quiz: { text: 'The Quiz asks a few questions about what you like, your pace, budget and season, and suggests the cities that match best.', tool: 'quiz', label: 'Take the quiz' },
  surprise: { text: 'Surprise me picks a random city that fits the interests, budget and season you choose. Press it again for another one.', tool: 'surprise', label: 'Open Surprise me' },
  print: { text: 'Open My trip and use Print, next to the trip notes. It makes a printable summary, and choosing “Save as PDF” as the printer gives you a file.', to: '/trip', label: 'Open My trip' },
  offline: { text: 'Eurowander can be installed as an app (look for Install in the header), and pages you’ve opened keep working offline. Live photos, places and weather need a connection.', to: '/explore', label: 'Explore the map' },
  weather: { text: 'With trip dates set, My trip shows a live forecast for days within 16 days, and last year’s weather for later dates. City pages show the forecast too. Build my trip has a Weather tab for built trips.', to: '/trip', label: 'Open My trip' },
  gems: { text: 'Hidden gems are smaller, less crowded cities near famous ones. Turn on the hidden gems filter on the explore page, or ask me for “less touristy cities”.', to: '/explore', label: 'Explore the map' },
  dark_mode: { text: 'Use the moon/sun button in the header to switch between light and dark. It follows your device until you choose.', to: null },
  save_places: { text: 'Press the heart on any place card to save it. Its city joins your trip, and you can mark places as want to go or visited under My trip. You can also ask me, for example “Save the Louvre”.', to: '/trip', label: 'Open My trip' },
}
