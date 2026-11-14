/* Linda's Dutch Pancakes: the home screen of the guest touchscreen.

   THIS IS THE FILE TO CHANGE. Everything a guest reads on the home screen is in here.

   The same page works two ways:
     lindas-aruba.com/kiosk/?kiosk=1   the big touchscreen (pages open inside the screen, with a HOME button)
     lindas-aruba.com/kiosk/           a normal page for phones and laptops (plain links)

   ── Switching a tile off ──
   Change   on: true   to   on: false   and the tile is gone, on the touchscreen and on the website.
   Two more words work if you want a tile in one place only:
     on: 'web'     only on the normal page, never on the touchscreen
     on: 'kiosk'   only on the touchscreen
   The tiles show in the order they are listed here. Move a whole line up or down to change the order.

   ── What each word means ──
     id        a short name for the tile (used by the page itself, guests never see it)
     on        true / false (or 'web' / 'kiosk', see above)
     title     the big name under the picture, and in the top bar when the page is open
     line      one short line under the title
     link      where the tile goes. For our own pages this is the folder, like '../game/'.
               The touchscreen adds ?kiosk=1 by itself.
     external  false = one of our own pages. The touchscreen opens it inside the screen, under the HOME bar.
               true  = another website. It can not be shown inside the screen, so the touchscreen
                       LEAVES this home screen and opens it as the full page (see the note below).
     picture   which drawing to use: pan, pin, tee, postcard, pancake, book or bag (they live in art.js)
     leaving   external tiles only: the line a guest reads before the touchscreen leaves this home screen

   ── About the online shop tile on the touchscreen ──
   lindasaruba.com forwards to a shop that refuses to be shown inside a frame, so there is no HOME bar
   on it. When a guest opens the shop, the touchscreen is on the shop website and THIS PAGE CAN NOT
   BRING IT BACK. Coming back depends on the kiosk browser: its own home button, or its setting that
   returns to the start page after a while without a touch. If the kiosk browser has neither, set the
   shop tile to   on: 'web'   so it only shows on the normal page.
   On the normal page the shop simply opens in a new tab. */

window.LINDAS_KIOSK = {

  tiles: [
    { id: 'game',     on: true, title: "Linda's Breakfast Rush",        line: 'Run our kitchen. Win extra gift shop discount.', link: '../game/',     external: false, picture: 'pan' },
    { id: 'map',      on: true, title: 'Where are you from?',           line: 'Put a pin on your home town.',                   link: '../map/',      external: false, picture: 'pin' },
    { id: 'vote',     on: true, title: 'Vote for our next T-shirt',     line: 'Pick our next shirt. See what is on sale.',      link: '../vote/',     external: false, picture: 'tee' },
    { id: 'postcard', on: true, title: 'Aruba photo postcard',          line: 'Make a selfie postcard on your own phone.',      link: '../postcard/', external: false, picture: 'postcard' },
    { id: 'pancake',  on: true, title: 'Create your own Dutch pancake', line: 'Tap toppings onto a pancake. No washing up.',    link: '../pancake/',  external: false, picture: 'pancake' },
    { id: 'stories',  on: true, title: 'Stories from our gift shop',    line: 'Four short stories. One is about hot sauce.',    link: '../stories/',  external: false, picture: 'book' },
    { id: 'shop',     on: true, title: 'Our online shop',               line: 'T-shirts and mugs, shipped to US addresses.',    link: 'https://lindasaruba.com', external: true, picture: 'bag',
      leaving: 'You are leaving this screen and going to lindasaruba.com, our online shop.' }
  ],

  /* The other words on the screen.
     The labels in CAPITALS use the brand's capital-letter font, which has letters only:
     keep those to capital letters and spaces (no digits, no punctuation). */
  words: {
    kioskTitle: 'Waiting for a table?',
    kioskLine: 'Tap a picture to pass the time.',
    webTitle: "Fun things from Linda's",
    webLine: 'Small things to play with, at the restaurant or at home.',
    webFooter: "Linda's Dutch Pancakes, Palm Beach, Aruba. Since 2001.",
    webBack: "Back to the Linda's website",
    homeButton: 'HOME',
    loading: 'One moment',
    notWorking: 'This one is not working right now. Tap HOME and pick another.',
    leavingGo: 'OPEN THE SHOP',
    leavingStay: 'STAY HERE',
    stillTitle: 'Still there?',
    stillLine: 'Back to the start in',
    stillButton: 'KEEP GOING'
  },

  /* Touchscreen timing, in seconds. */
  timing: {
    idleSeconds: 90,      // a page is open and nobody touches the screen for this long: back to the home screen
    warnSeconds: 10,      // the last seconds of that show "Still there?" with a countdown
    attractSeconds: 20    // the home screen starts its gentle "tap me" movement after this long without a touch
  },

  /* Where the HOME bar sits when a page is open: 'top' or 'bottom'.
     'bottom' is easier to reach on a tall screen that stands upright. */
  homeBar: 'top'
};
