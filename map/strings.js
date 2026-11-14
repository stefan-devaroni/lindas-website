// All text the guest map shows, in one place.
// To add Dutch or Spanish later: copy the "en" block, name it "nl" or "es", translate the right-hand side,
// and open the page with ?lang=nl or ?lang=es. Country names in Dutch and Spanish are already in data-world.js.
// Labels set in the Telegrafico font may only use the letters A to Z. Anything else falls back to the body font by itself.
window.LINDAS_MAP_STRINGS = {
  en: {
    pageTitle: "Guest map | Linda's Dutch Pancakes",
    logoAlt: "Linda's Dutch Pancakes",
    title: 'Where are you from?',
    add: 'Add your home town',
    wait: 'One moment',

    // Counters. Each pair is [one, more than one].
    guests: ['{n} guest', '{n} guests'],
    countries: ['{n} country', '{n} countries'],
    countLine: '{guests} from {countries}',
    today: '{n} today',
    empty: 'No pins yet. Be the first.',
    byCountry: 'By country',
    more: ['and {n} more country', 'and {n} more countries'],
    pinGuests: ['{n} guest', '{n} guests'],

    // Map
    regionHome: 'Atlantic',
    regionWorld: 'World',
    regionNa: 'North America',
    regionSa: 'South America',
    regionEu: 'Europe',
    aruba: 'Aruba',
    you: 'You',
    onMap: 'You are on the map',
    showMyPin: 'Show my pin',
    deviceOnly: 'Pins saved on this device only',

    // Picking a place
    pickCountry: 'Where is home?',
    another: 'Another country',
    allCountries: 'Pick your country',
    pickState: 'Pick your state',
    pickStateHint: 'Tap the map or the list',
    pickCity: 'Pick the nearest city',
    justCountry: 'Just my country',
    justState: 'Just my state',
    search: 'Search',
    typeHint: 'Type the first letters',
    noMatch: 'Nothing found. Try fewer letters.',
    back: 'Back',
    close: 'Close',
    space: 'Space',
    del: 'Delete',
    up: 'Up',
    down: 'Down',

    // After the pin drops
    sending: 'Adding your pin',
    dropLine: 'You are guest {n} from {country}',
    dropFirst: 'You are the first guest from {country}',
    done: 'Done',
    badPlace: 'That place did not work. Please pick another one.',
    loadError: 'The map could not load. Please try again.',

    // "from the United States" reads better than "from United States"
    fromCountry: {
      US: 'the United States', NL: 'the Netherlands', GB: 'the United Kingdom', DO: 'the Dominican Republic',
      BS: 'the Bahamas', PH: 'the Philippines', AE: 'the United Arab Emirates', CZ: 'the Czech Republic',
      KY: 'the Cayman Islands', VG: 'the British Virgin Islands', VI: 'the US Virgin Islands',
      TC: 'the Turks and Caicos Islands', FK: 'the Falkland Islands', MV: 'the Maldives', SC: 'the Seychelles',
      GM: 'the Gambia', CF: 'the Central African Republic', MH: 'the Marshall Islands', SB: 'the Solomon Islands',
      FO: 'the Faroe Islands', CK: 'the Cook Islands', MP: 'the Northern Mariana Islands', KM: 'the Comoros',
      IM: 'the Isle of Man', AX: 'the Åland Islands'
    }
  }
};
