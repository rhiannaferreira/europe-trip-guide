// Approximate fastest travel times between sample cities, in minutes. Real times vary by service and day.
// Each pair works in both directions. `mode` is 'train' unless there's no sensible rail link.
export const trainTimes = [
  // France, Benelux, UK
  { from: 'paris', to: 'brussels', minutes: 85, mode: 'train', note: 'Eurostar / TGV' },
  { from: 'paris', to: 'london', minutes: 136, mode: 'train', note: 'Eurostar via the Channel Tunnel' },
  { from: 'paris', to: 'amsterdam', minutes: 200, mode: 'train', note: 'Eurostar' },
  { from: 'paris', to: 'rouen', minutes: 80, mode: 'train' },
  { from: 'paris', to: 'reims', minutes: 45, mode: 'train', note: 'TGV' },
  { from: 'paris', to: 'chartres', minutes: 65, mode: 'train' },
  { from: 'paris', to: 'barcelona', minutes: 395, mode: 'train', note: 'Direct TGV' },
  { from: 'paris', to: 'zurich', minutes: 245, mode: 'train', note: 'TGV Lyria' },
  { from: 'paris', to: 'berlin', minutes: 480, mode: 'train', note: 'Direct day train or Nightjet' },
  { from: 'paris', to: 'munich', minutes: 340, mode: 'train', note: 'TGV via Stuttgart' },
  { from: 'london', to: 'brussels', minutes: 120, mode: 'train', note: 'Eurostar' },
  { from: 'london', to: 'amsterdam', minutes: 240, mode: 'train', note: 'Eurostar' },
  { from: 'london', to: 'york', minutes: 110, mode: 'train' },
  { from: 'london', to: 'edinburgh', minutes: 260, mode: 'train' },
  { from: 'york', to: 'edinburgh', minutes: 150, mode: 'train' },
  { from: 'london', to: 'dublin', minutes: 480, mode: 'rail + ferry', note: 'Train to Holyhead, then ferry. Flying is quicker.' },
  { from: 'brussels', to: 'amsterdam', minutes: 115, mode: 'train', note: 'Eurostar' },
  { from: 'brussels', to: 'bruges', minutes: 60, mode: 'train' },
  { from: 'brussels', to: 'ghent', minutes: 30, mode: 'train' },
  { from: 'bruges', to: 'ghent', minutes: 25, mode: 'train' },
  { from: 'brussels', to: 'berlin', minutes: 420, mode: 'train', note: 'Change in Frankfurt or Cologne' },
  { from: 'amsterdam', to: 'utrecht', minutes: 30, mode: 'train' },
  { from: 'amsterdam', to: 'berlin', minutes: 360, mode: 'train', note: 'Direct IC' },
  { from: 'utrecht', to: 'berlin', minutes: 330, mode: 'train' },

  // Germany, Central Europe
  { from: 'berlin', to: 'leipzig', minutes: 75, mode: 'train', note: 'ICE' },
  { from: 'berlin', to: 'munich', minutes: 240, mode: 'train', note: 'ICE' },
  { from: 'berlin', to: 'prague', minutes: 255, mode: 'train', note: 'EuroCity along the Elbe' },
  { from: 'leipzig', to: 'munich', minutes: 195, mode: 'train', note: 'ICE' },
  { from: 'leipzig', to: 'prague', minutes: 240, mode: 'train', note: 'Change in Dresden' },
  { from: 'munich', to: 'salzburg', minutes: 105, mode: 'train' },
  { from: 'munich', to: 'vienna', minutes: 240, mode: 'train', note: 'Railjet' },
  { from: 'munich', to: 'zurich', minutes: 210, mode: 'train', note: 'EuroCity Express' },
  { from: 'munich', to: 'prague', minutes: 330, mode: 'train' },
  { from: 'munich', to: 'venice', minutes: 400, mode: 'train', note: 'Via the Brenner Pass' },
  { from: 'salzburg', to: 'vienna', minutes: 145, mode: 'train', note: 'Railjet' },
  { from: 'vienna', to: 'graz', minutes: 155, mode: 'train' },
  { from: 'vienna', to: 'prague', minutes: 240, mode: 'train' },
  { from: 'vienna', to: 'brno', minutes: 90, mode: 'train' },
  { from: 'vienna', to: 'venice', minutes: 450, mode: 'train', note: 'Railjet via Villach, or Nightjet' },
  { from: 'prague', to: 'brno', minutes: 150, mode: 'train' },
  { from: 'zurich', to: 'lucerne', minutes: 45, mode: 'train' },
  { from: 'zurich', to: 'vienna', minutes: 470, mode: 'train', note: 'Railjet or Nightjet' },

  // Italy
  { from: 'rome', to: 'florence', minutes: 95, mode: 'train', note: 'Frecciarossa / Italo' },
  { from: 'rome', to: 'venice', minutes: 225, mode: 'train', note: 'Frecciarossa' },
  { from: 'florence', to: 'venice', minutes: 125, mode: 'train', note: 'Frecciarossa' },
  { from: 'florence', to: 'lucca', minutes: 80, mode: 'train' },
  { from: 'venice', to: 'treviso', minutes: 30, mode: 'train' },
  { from: 'venice', to: 'chioggia', minutes: 60, mode: 'bus', note: 'Bus from Piazzale Roma, or boat via Lido' },
  { from: 'zurich', to: 'venice', minutes: 290, mode: 'train', note: 'Via Milan' },

  // Iberia
  { from: 'barcelona', to: 'girona', minutes: 40, mode: 'train', note: 'AVE' },
  { from: 'barcelona', to: 'madrid', minutes: 150, mode: 'train', note: 'AVE / Ouigo / Iryo' },
  { from: 'madrid', to: 'seville', minutes: 150, mode: 'train', note: 'AVE' },
  { from: 'barcelona', to: 'seville', minutes: 330, mode: 'train', note: 'AVE' },
  { from: 'lisbon', to: 'porto', minutes: 170, mode: 'train', note: 'Alfa Pendular' },
  { from: 'lisbon', to: 'coimbra', minutes: 100, mode: 'train', note: 'Alfa Pendular' },
  { from: 'porto', to: 'coimbra', minutes: 60, mode: 'train', note: 'Alfa Pendular' },
  { from: 'lisbon', to: 'seville', minutes: 420, mode: 'bus', note: 'No direct train; buses or a flight' },
  { from: 'lisbon', to: 'madrid', minutes: 540, mode: 'bus', note: 'No direct train; buses or a flight' },

  // Corridor cities (Cologne, Strasbourg, Lyon, Nice, Milan)
  { from: 'cologne', to: 'amsterdam', minutes: 160, mode: 'train', note: 'ICE' },
  { from: 'cologne', to: 'utrecht', minutes: 130, mode: 'train', note: 'ICE' },
  { from: 'cologne', to: 'brussels', minutes: 110, mode: 'train', note: 'ICE / Eurostar' },
  { from: 'cologne', to: 'paris', minutes: 200, mode: 'train', note: 'Eurostar' },
  { from: 'cologne', to: 'berlin', minutes: 260, mode: 'train', note: 'ICE' },
  { from: 'cologne', to: 'munich', minutes: 270, mode: 'train', note: 'ICE' },
  { from: 'cologne', to: 'strasbourg', minutes: 170, mode: 'train', note: 'Change in Mannheim or Karlsruhe' },
  { from: 'strasbourg', to: 'paris', minutes: 110, mode: 'train', note: 'TGV' },
  { from: 'strasbourg', to: 'zurich', minutes: 135, mode: 'train', note: 'Change in Basel' },
  { from: 'strasbourg', to: 'munich', minutes: 220, mode: 'train', note: 'TGV via Stuttgart' },
  { from: 'strasbourg', to: 'lyon', minutes: 225, mode: 'train', note: 'TGV' },
  { from: 'strasbourg', to: 'reims', minutes: 110, mode: 'train', note: 'TGV' },
  { from: 'lyon', to: 'paris', minutes: 120, mode: 'train', note: 'TGV' },
  { from: 'lyon', to: 'nice', minutes: 275, mode: 'train', note: 'TGV via Marseille' },
  { from: 'lyon', to: 'barcelona', minutes: 300, mode: 'train', note: 'Direct TGV' },
  { from: 'nice', to: 'paris', minutes: 345, mode: 'train', note: 'TGV' },
  { from: 'milan', to: 'zurich', minutes: 200, mode: 'train', note: 'EuroCity via the Gotthard' },
  { from: 'milan', to: 'venice', minutes: 145, mode: 'train', note: 'Frecciarossa' },
  { from: 'milan', to: 'florence', minutes: 115, mode: 'train', note: 'Frecciarossa' },
  { from: 'milan', to: 'rome', minutes: 190, mode: 'train', note: 'Frecciarossa' },
  { from: 'milan', to: 'paris', minutes: 430, mode: 'train', note: 'Direct TGV or Frecciarossa' },

  // Greece, Croatia, Ireland
  { from: 'athens', to: 'thessaloniki', minutes: 260, mode: 'train', note: 'Check current service status' },
  { from: 'split', to: 'sibenik', minutes: 90, mode: 'bus', note: 'No coastal railway' },
  { from: 'split', to: 'dubrovnik', minutes: 270, mode: 'bus', note: 'Coastal bus or summer catamaran' },
  { from: 'sibenik', to: 'dubrovnik', minutes: 330, mode: 'bus' },
  { from: 'dublin', to: 'galway', minutes: 145, mode: 'train' },
]

// Returns the sample connection between two cities in either direction, or undefined.
export function getTrainTime(fromId, toId) {
  return trainTimes.find((t) => (t.from === fromId && t.to === toId) || (t.from === toId && t.to === fromId))
}
