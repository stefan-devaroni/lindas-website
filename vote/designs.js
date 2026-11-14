// The T-shirt designs guests can vote on. This is the only place to add or remove one.
//
//   id       the two-digit number the vote is stored under. Must match the database.
//   title    the name shown under the shirt.
//   file     the picture, inside the designs folder (transparent background).
//   shirt    the shirt colour it is shown on: white, cream, blue, navy or black.
//            Designs with dark lettering only read on white or cream.
//   caption  one short line under the title.
//
// To take a design out of the vote for a while, switch it off in the database instead:
// the page hides anything the database no longer lists.
//
// A design that goes on sale moves from here to products.js. That happened to
// 46, Anatomy of a Dutch Pancake, on 14 November 2026.
window.VOTE_DESIGNS = [
  { id: '33', title: 'Powered by Pancakes',        file: 'designs/33-powered-by-pancakes.webp',        shirt: 'black', caption: 'For people who run on breakfast.' },
  { id: '16', title: 'Greetings from Aruba',       file: 'designs/16-greetings-from-aruba.webp',       shirt: 'white', caption: 'The old postcard, now in your size.' },
  { id: '31', title: 'Half Dutch Half Aruban',     file: 'designs/31-all-pancake.webp',                shirt: 'cream', caption: 'Half windmill, half palm tree, all pancake.' },
  { id: '19', title: 'Four Delft Tiles',           file: 'designs/19-four-tiles.webp',                 shirt: 'navy',  caption: 'Windmill, palm tree, pancake, flamingo.' },
  { id: '05', title: 'Iguana Chef',                file: 'designs/05-iguana-chef.webp',                shirt: 'white', caption: 'He does the flipping. We do the rest.' },
  { id: '15', title: 'Palm Beach Badge',           file: 'designs/15-palm-beach-badge.webp',           shirt: 'blue',  caption: 'Palm Beach, Aruba. Here since 2001.' },
  { id: '08', title: 'Clogs in Bloom',             file: 'designs/08-clogs-in-bloom.webp',             shirt: 'cream', caption: 'Two wooden shoes, a lot of tulips.' },
  { id: '63', title: 'Know the Difference',        file: 'designs/63-size-chart.webp',                 shirt: 'white', caption: 'American pancake, Dutch pancake. Not the same size.' }
];

// How the vote behaves.
window.VOTE_SETTINGS = {
  maxVotes: 3,       // votes per visitor, one per design
  idleSeconds: 45,   // touchscreen (kiosk) only: back to the start after this long without a touch
  shuffle: true      // show the designs in a different order for each visitor, so none gets a head start
};
