// Every word a guest can read on the vote page, in one table.
//
// To add a language, copy the whole "en" block, rename it (nl, es, ...) and translate the right-hand
// side. Keep the {curly} words as they are: the page fills those in. Open the page with ?lang=nl
// to see it. Anything missing in a language falls back to English.
//
// Design titles and captions live in designs.js, product names and notes in products.js. A language
// can override them here, for example:
//   designs:  { '33': { title: '...', caption: '...' } }
//   products: { 'https://...product-link...': { title: '...', note: '...' } }
window.VOTE_STRINGS = {
  en: {
    docTitle: "Vote for our next T-shirt | Linda's Dutch Pancakes",
    logoAlt: "Linda's Dutch Pancakes",

    // Voting
    headline: 'Vote for our next T-shirt',
    intro: '{count} designs, {max} votes. Help us pick.',
    introOne: '{count} designs, 1 vote. Help us pick.',
    viewAll: 'All designs',
    viewOne: 'One by one',
    standings: 'Standings',
    vote: 'Vote',
    voted: 'Voted',
    voteFor: 'Vote for {title}',
    votedFor: 'You voted for {title}',
    next: 'Next',
    prev: 'Previous design',
    position: '{n} of {count}',
    goTo: 'Show {title}',
    shownOn: 'Shown on {colour}',
    shirts: { white: 'white', cream: 'cream', blue: "Linda's blue", navy: 'navy', black: 'black' },
    lookCloser: 'Look closer',
    wholeShirt: 'Whole shirt',
    yourPick: 'Your pick',
    votesLeftMany: '{n} votes left',
    votesLeftOne: '1 vote left',
    votesLeftNone: 'No votes left',
    statusVoted: 'Got it. {left}.',
    statusLast: 'That was your last vote. Thanks.',
    statusNoneLeft: 'No votes left. Tap Standings to see who is ahead.',
    statusRemoved: 'That design just left the vote. You get your vote back.',
    closed: 'Voting is closed for now. Thanks for helping.',
    localOnly: 'Votes saved on this device only',

    // Standings
    thanksTitle: 'Thanks for voting',
    thanksSub: 'Here is how it stands right now.',
    standingsTitle: 'The standings',
    standingsSub: 'Updated as the votes come in.',
    pickNote: 'Your votes help us pick which shirt to make next. No promises, but we do listen.',
    lead: 'In the lead',
    totalTied: '{total}, tied {n} ways at the top',
    countOne: '1 vote',
    countMany: '{n} votes',
    totalOne: '1 vote so far',
    totalMany: '{n} votes so far',
    noVotesYet: 'No votes yet. Somebody has to go first.',
    backToDesigns: 'Back to the designs',
    voteMore: 'Vote some more',
    done: 'Done',

    // On sale now
    saleTitle: 'On sale now',
    saleSubQr: 'These are in our online shop already. Point your phone camera at a code.',
    saleSubLink: 'These are in our online shop already.',
    ships: 'Ships to US addresses',
    elsewhere: "Somewhere else? Linda's shirts are also in the gift shop.",
    openInShop: 'View in the shop',
    priceFrom: 'from {price}',
    qrAlt: 'QR code for {title}'
  }
};
