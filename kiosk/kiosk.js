/* Linda's Dutch Pancakes: the home screen that opens the guest pages.

   Two ways to use the same page:
     ?kiosk=1    the big touchscreen. A tile opens its page in a frame under a HOME bar.
                 After 90 seconds without a touch (touches inside the open page count) it asks
                 "Still there?" and goes back to the tiles.
     (nothing)   a normal page for phones and laptops. Every tile is a plain link.

   For testing:
     ?kiosk=1&idle=20     20 seconds instead of 90
     ?kiosk=1&attract=3   the "tap me" movement on the home screen starts after 3 seconds
     window.__kiosk       state, open(id), home()

   The tiles and all the words are in tiles.js. The drawings are in art.js. */

(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  var CFG = window.LINDAS_KIOSK || {};
  var ART = window.LindasKioskArt || { picture: function () { return ''; }, tulip: function () { return ''; }, house: '', arrowOut: '' };
  function $(id) { return doc.getElementById(id); }

  /* ── the address bar options ── */
  var query = {};
  try { new URLSearchParams(window.location.search).forEach(function (v, k) { query[k] = v; }); } catch (e) { query = {}; }
  var KIOSK = query.kiosk === '1';

  var timing = CFG.timing || {};
  function seconds(v, fallback) { v = parseFloat(v); return v > 0 ? v : fallback; }
  var IDLE_S = Math.max(3, seconds(query.idle, seconds(timing.idleSeconds, 90)));
  var WARN_S = Math.min(seconds(timing.warnSeconds, 10), Math.max(2, Math.round(IDLE_S / 3)));
  var ATTRACT_S = seconds(query.attract, query.idle ? Math.min(seconds(timing.attractSeconds, 20), IDLE_S) : seconds(timing.attractSeconds, 20));

  /* ── the words (tiles.js can change every one of them) ── */
  var WORDS = {
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
  };
  Object.keys(CFG.words || {}).forEach(function (k) { if (typeof CFG.words[k] === 'string' && CFG.words[k]) WORDS[k] = CFG.words[k]; });

  // The capital-letter font has letters only. Anything else falls back to the body font.
  function caps(el, text) {
    el.textContent = text;
    el.classList.toggle('plain', /[^A-Za-z ]/.test(text));
  }

  /* ── which tiles show ── */
  function isOn(t) {
    if (!t || !t.id || !t.title || !t.link) return false;
    if (t.on === 'kiosk') return KIOSK;
    if (t.on === 'web') return !KIOSK;
    return !(t.on === false || t.on === 0 || t.on === 'off' || t.on === 'false' || t.on === 'no');
  }
  var TILES = (CFG.tiles || []).filter(isOn);
  function tileById(id) { for (var i = 0; i < TILES.length; i++) if (TILES[i].id === id) return TILES[i]; return null; }

  // Our own pages get ?kiosk=1 on the touchscreen. Other websites are opened exactly as written.
  function address(t) {
    if (t.external || !KIOSK) return t.link;
    return t.link + (t.link.indexOf('?') < 0 ? '?' : '&') + 'kiosk=1';
  }
  function siteName(link) {
    try { return new URL(link, window.location.href).hostname.replace(/^www\./, ''); } catch (e) { return link; }
  }

  /* ── what the page is doing right now (also for testing: window.__kiosk.state) ── */
  var state = {
    mode: KIOSK ? 'kiosk' : 'web',
    screen: 'home',          // 'home' | 'page' (a page in the frame) | 'leaving' (the line before the shop opens)
    open: null,              // the id of the open tile
    frameLoaded: false,      // the page in the frame has finished loading
    frameWatched: false,     // touches inside the frame are being counted
    frameProblem: false,     // the frame could not show the page
    attract: false,          // the home screen is doing its "tap me" movement
    warning: false,          // "Still there?" is on the screen
    secondsLeft: null,       // the number in the countdown
    idleSeconds: IDLE_S, warnSeconds: WARN_S, attractSeconds: ATTRACT_S,
    lastTouch: Date.now(),
    lastTouchFrom: 'start',  // 'screen' or 'page': where the last touch was
    idleReturns: 0,          // how many times it went back to the home screen by itself
    fit: null                // how the tiles were laid out: { layout, columns, rows, picture, title }
  };

  var $home = $('home'), $tiles = $('tiles'), $viewer = $('viewer'), $frameBox = $('frameBox'), $frameNote = $('frameNote'),
      $leaving = $('leaving'), $still = $('still');
  var frame = null, lastOpener = null;

  // A title may wrap between words, but never inside a word like "T-shirt".
  function setTitle(el, text) {
    String(text).split(' ').forEach(function (word, i) {
      if (i) el.appendChild(doc.createTextNode(' '));
      if (word.indexOf('-') < 0) { el.appendChild(doc.createTextNode(word)); return; }
      var whole = doc.createElement('span'); whole.className = 'whole'; whole.textContent = word; el.appendChild(whole);
    });
  }

  /* ── build the home screen ── */
  function build() {
    $('welcomeTitle').textContent = KIOSK ? WORDS.kioskTitle : WORDS.webTitle;
    $('welcomeLine').textContent = KIOSK ? WORDS.kioskLine : WORDS.webLine;
    $('footLine').textContent = WORDS.webFooter;
    $('footBack').textContent = WORDS.webBack;

    var garden = $('garden');
    [['a', 'red'], ['b', 'purple'], ['c', 'purple'], ['d', 'red']].forEach(function (t) {
      var el = doc.createElement('div');
      el.className = 'tulip tulip-' + t[0];
      el.innerHTML = ART.tulip(t[1]);
      garden.appendChild(el);
    });

    TILES.forEach(function (t) {
      // On the touchscreen a tile is a button (nothing to long-press or drag). On the normal page it is a plain link.
      var el = doc.createElement(KIOSK ? 'button' : 'a');
      el.className = 'tile';
      el.setAttribute('data-id', t.id);
      if (KIOSK) el.type = 'button';
      else {
        el.href = address(t);
        if (t.external) { el.target = '_blank'; el.rel = 'noopener'; }
      }
      var pic = doc.createElement('span'); pic.className = 'tile-pic'; pic.innerHTML = ART.picture(t.picture);
      var text = doc.createElement('span'); text.className = 'tile-text';
      var title = doc.createElement('span'); title.className = 'tile-title'; setTitle(title, t.title);
      if (t.external && !KIOSK) {
        var out = doc.createElement('span'); out.className = 'tile-out'; out.innerHTML = ART.arrowOut; title.appendChild(out);
        el.setAttribute('aria-label', t.title + '. ' + (t.line || '') + ' Opens ' + siteName(t.link) + ' in a new tab.');
      }
      var lineEl = doc.createElement('span'); lineEl.className = 'tile-line'; lineEl.textContent = t.line || '';
      text.appendChild(title); text.appendChild(lineEl);
      el.appendChild(pic); el.appendChild(text);
      $tiles.appendChild(el);
    });
    if (!TILES.length) {
      var p = doc.createElement('p'); p.className = 'empty'; p.textContent = 'Nothing to show right now.';
      $tiles.appendChild(p);
    }
  }

  /* ── touchscreen: make every tile fit on one screen, as big as it can be ── */
  function tileSpan() {
    var els = $tiles.children, top = Infinity, bottom = -Infinity, i, r;
    for (i = 0; i < els.length; i++) { r = els[i].getBoundingClientRect(); if (r.top < top) top = r.top; if (r.bottom > bottom) bottom = r.bottom; }
    return bottom - top;
  }
  function widestTitle() {   // how wide the longest title is, counted in letter-heights
    var probe = doc.createElement('span'), widest = 0;
    probe.className = 'tile-title';
    probe.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap;font-size:100px;margin:0';
    $tiles.appendChild(probe);
    TILES.forEach(function (t) { probe.textContent = t.title; widest = Math.max(widest, probe.getBoundingClientRect().width / 100); });
    $tiles.removeChild(probe);
    return Math.min(16, Math.max(8, widest * 1.02));
  }
  function fit() {
    if (!KIOSK || !TILES.length || $home.hidden) return;
    var vw = root.clientWidth, vh = root.clientHeight, k = Math.min(vh * 0.0178, vw * 0.016);
    var upright = vh > vw;
    var side = vw * (upright ? 0.125 : 0.11);            // the tulips stand in this strip on both sides
    var W = vw - 2 * side, H = $tiles.clientHeight, n = TILES.length;
    if (W < 80 || H < 80) return;
    var gx = k * 1.5, gy = k * 1.5, best = null, c, rows, tw, th, pic;
    function consider(o) { if (!best || o.score > best.score + 0.5) best = o; }
    // In a list the longest title should still fit on one line beside its picture.
    var widest = widestTitle();
    function titleSize(list, p, cell) { return list ? Math.min(p * 0.27, (cell - p * 1.2) / widest) : p * 0.2; }
    for (c = 1; c <= n; c++) {
      rows = Math.ceil(n / c);
      tw = (W - (c - 1) * gx) / c; th = (H - (rows - 1) * gy) / rows;
      // "stack": the picture with its words under it. Two lines of title and two of text take about 0.86 of a picture.
      pic = Math.min(tw * 0.76, th / 1.86);
      consider({ list: false, c: c, rows: rows, tw: tw, pic: pic, score: titleSize(false, pic, tw) });
      // "list": the picture with its words beside it. Only on a screen that stands upright.
      if (upright) { pic = Math.min(th, tw * 0.3); consider({ list: true, c: c, rows: rows, tw: tw, pic: pic, score: titleSize(true, pic, tw) }); }
    }                                                    // the winner is the layout with the biggest letters
    function apply(p) {
      var cell = best.list ? best.tw : Math.min(best.tw, p * 1.6), title = titleSize(best.list, p, cell);
      $tiles.style.setProperty('--pic', p.toFixed(1) + 'px');
      $tiles.style.setProperty('--title', title.toFixed(1) + 'px');
      $tiles.style.setProperty('--line', (title * (best.list ? 0.56 : 0.58)).toFixed(1) + 'px');
      $tiles.style.setProperty('--cell', cell.toFixed(1) + 'px');
      $tiles.style.setProperty('--gap-x', gx.toFixed(1) + 'px');
      $tiles.style.setProperty('--gap-y', gy.toFixed(1) + 'px');
      $tiles.style.setProperty('--grid', (best.c * cell + (best.c - 1) * gx + 2).toFixed(1) + 'px');
    }
    $tiles.classList.toggle('list', best.list);
    pic = best.pic; apply(pic);
    for (var tries = 0; tries < 30 && tileSpan() > H + 0.5; tries++) { pic *= 0.97; apply(pic); }   // long titles wrap: shrink until it fits
    state.fit = { layout: best.list ? 'list' : 'stack', columns: best.c, rows: best.rows, picture: Math.round(pic), title: Math.round(titleSize(best.list, pic, best.list ? best.tw : Math.min(best.tw, pic * 1.6))) };
  }

  /* ── touchscreen: a page in the frame ── */
  function closeFrame() {
    if (frame) { frame.removeEventListener('load', frameLoaded); if (frame.parentNode) frame.parentNode.removeChild(frame); }
    frame = null;
    state.frameLoaded = false; state.frameWatched = false; state.frameProblem = false;
  }
  function frameWindow() {   // the page inside the frame, or null when it can not be read (another website, or a browser error page)
    try {
      var w = frame && frame.contentWindow;
      if (!w || !w.document || !w.location || w.location.href === 'about:blank') return null;
      return w;
    } catch (e) { return null; }
  }
  var ACTIVITY = ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'mousedown', 'keydown', 'wheel', 'scroll', 'input'];
  function touchedInPage() { touched('page'); }
  // Touches inside the open page count too. The pages are on the same website, so this page may listen inside the frame.
  // A page that reloads itself gets a new window, so this is checked again a few times a second.
  function watchFrame() {
    var w = frameWindow();
    if (!w) { state.frameWatched = false; return; }
    if (!w.__lindasHomeScreenListens) {
      w.__lindasHomeScreenListens = true;
      ACTIVITY.forEach(function (name) { w.addEventListener(name, touchedInPage, { capture: true, passive: true }); });
    }
    state.frameWatched = true;
  }
  function frameLoaded() {
    if (!frame) return;
    if (!frameWindow()) {   // nothing readable came back: the page is missing or the internet is down
      state.frameProblem = true; state.frameLoaded = false;
      frame.classList.remove('ready');
      $frameNote.textContent = WORDS.notWorking;
      return;
    }
    state.frameProblem = false; state.frameLoaded = true;
    frame.classList.add('ready');
    watchFrame();
  }
  function showPage(t) {
    closeFrame();
    hideSheets();
    state.screen = 'page'; state.open = t.id;
    $('barTitle').textContent = t.title;
    $frameNote.textContent = WORDS.loading;
    frame = doc.createElement('iframe');
    frame.className = 'frame';
    frame.title = t.title;
    frame.setAttribute('allow', 'autoplay; fullscreen');
    frame.addEventListener('load', frameLoaded);
    frame.src = address(t);                 // set before it goes on the page, so the browser's history does not grow
    $frameBox.appendChild(frame);
    $viewer.hidden = false;
    $home.hidden = true;
    setAttract(false);
    try { $('homeBtn').focus({ preventScroll: true }); } catch (e) { /* fine without */ }
  }

  /* ── touchscreen: the line before the online shop opens ── */
  function showLeaving(t) {
    closeFrame();
    $viewer.hidden = true; $home.hidden = false;
    state.screen = 'leaving'; state.open = t.id;
    $('leavingPic').innerHTML = ART.picture(t.picture);
    $('leavingTitle').textContent = t.title;
    $('leavingLine').textContent = t.leaving || ('You are leaving this screen and going to ' + siteName(t.link) + '.');
    $leaving.hidden = false;
    leavingSince = Date.now();
    setAttract(false);
    try { $('leavingStay').focus({ preventScroll: true }); } catch (e) { /* fine without */ }
  }
  var leavingSince = 0;
  function leave() {
    var t = tileById(state.open);
    if (!t || !t.external) { home(); return; }
    if (Date.now() - leavingSince < 700) return;   // a double tap on the tile must not count as "yes, open the shop"
    // The shop refuses to be shown in a frame, so the whole screen goes there.
    // Coming back is up to the kiosk browser (its home button, or its return-to-start timer). See tiles.js.
    window.location.href = t.link;
  }

  function hideSheets() { $leaving.hidden = true; $still.hidden = true; state.warning = false; state.secondsLeft = null; }

  /* ── open a tile, go home ── */
  function open(id) {
    var t = tileById(id);
    if (!t) return false;
    if (!KIOSK) { if (t.external) window.open(t.link, '_blank', 'noopener'); else window.location.href = address(t); return true; }
    lastOpener = id;
    state.lastTouch = Date.now();
    if (t.external) showLeaving(t); else showPage(t);
    return true;
  }
  function home() {
    closeFrame();
    hideSheets();
    $viewer.hidden = true;
    $home.hidden = false;
    state.screen = 'home'; state.open = null;
    state.lastTouch = Date.now();
    if (KIOSK) {
      fit();
      // for a keyboard, if the kiosk has one: back on the tile that was open
      var el = lastOpener && $tiles.querySelector('[data-id="' + lastOpener + '"]');
      if (el) { try { el.focus({ preventScroll: true }); } catch (e) { /* fine without */ } }
    }
    return true;
  }

  /* ── touchscreen: the clock that brings it back to the home screen ── */
  function touched(from) {
    state.lastTouch = Date.now();
    state.lastTouchFrom = from === 'page' ? 'page' : 'screen';
    if (state.attract) setAttract(false);
  }
  var nudgeTimer = 0, nudgeAt = -1;
  function nudgeNext() {
    var els = $tiles.querySelectorAll('.tile');
    if (!els.length) return;
    for (var i = 0; i < els.length; i++) els[i].classList.remove('nudge');
    nudgeAt = (nudgeAt + 1) % els.length;
    void els[nudgeAt].offsetWidth;            // start the movement again from the beginning
    els[nudgeAt].classList.add('nudge');
  }
  function setAttract(on) {
    if (state.attract === on) return;
    state.attract = on;
    root.classList.toggle('attract', on);
    clearInterval(nudgeTimer);
    if (on) { nudgeAt = -1; nudgeNext(); nudgeTimer = setInterval(nudgeNext, 2300); }
    else { var els = $tiles.querySelectorAll('.nudge'); for (var i = 0; i < els.length; i++) els[i].classList.remove('nudge'); }
  }
  function tick() {
    var idle = Date.now() - state.lastTouch;
    if (state.screen === 'home') {
      if ($still.hidden === false) hideSheets();
      setAttract(idle >= ATTRACT_S * 1000);
      return;
    }
    watchFrame();
    var left = IDLE_S * 1000 - idle;
    if (left <= 0) { state.idleReturns++; home(); return; }
    if (left <= WARN_S * 1000) {
      state.warning = true; state.secondsLeft = Math.ceil(left / 1000);
      $('stillCount').textContent = String(state.secondsLeft);
      $still.hidden = false;
    } else if (state.warning) {
      state.warning = false; state.secondsLeft = null; $still.hidden = true;
    }
  }

  /* ── touchscreen: keep the screen still ── */
  function harden() {
    var stop = function (e) { e.preventDefault(); };
    ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange', 'gestureend'].forEach(function (name) { doc.addEventListener(name, stop); });
    // This screen never scrolls, so no finger movement needs the browser: no pinch-zoom, no pull-to-refresh.
    // (The pages in the frame are their own documents and keep their own scrolling.)
    doc.addEventListener('touchmove', stop, { passive: false });
    window.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    doc.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) >= 0) e.preventDefault();
    });
    var lastTouchEnd = 0;
    doc.addEventListener('touchend', function (e) {     // double-tap zoom on older browsers
      var now = Date.now();
      if (now - lastTouchEnd < 320 && !(e.target.closest && e.target.closest('button'))) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
    var vp = doc.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  }

  /* ── go ── */
  build();

  if (KIOSK) {
    root.classList.add('kiosk');
    doc.title = "Linda's Dutch Pancakes";
    // no links that leave the screen
    var foot = $('foot'); if (foot && foot.parentNode) foot.parentNode.removeChild(foot);
    var logo = $('logo'), plain = doc.createElement('span');
    plain.className = 'logo'; plain.id = 'logo';
    while (logo.firstChild) plain.appendChild(logo.firstChild);
    logo.parentNode.replaceChild(plain, logo);

    $('homeIcon').innerHTML = ART.house;
    caps($('homeLabel'), WORDS.homeButton);
    caps($('leavingGoLabel'), WORDS.leavingGo);
    caps($('leavingStayLabel'), WORDS.leavingStay);
    caps($('stillLabel'), WORDS.stillButton);
    $('stillTitle').textContent = WORDS.stillTitle;
    $('stillLine').textContent = WORDS.stillLine;
    if (CFG.homeBar === 'bottom') $viewer.classList.add('bar-bottom');

    harden();

    $tiles.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('.tile') : null;
      if (el) open(el.getAttribute('data-id'));
    });
    $('homeBtn').addEventListener('click', home);
    $('leavingGo').addEventListener('click', leave);
    $('leavingStay').addEventListener('click', home);
    // "Still there?": a touch anywhere on it means yes. The clock hides it a moment later, so the touch never lands on the page below.
    $still.addEventListener('click', function () { touched('screen'); });

    ACTIVITY.forEach(function (name) { window.addEventListener(name, function () { touched('screen'); }, { capture: true, passive: true }); });
    setInterval(tick, 250);

    var refit = 0;
    window.addEventListener('resize', function () { clearTimeout(refit); refit = setTimeout(fit, 80); });
    window.addEventListener('orientationchange', function () { setTimeout(fit, 350); });
    window.addEventListener('load', fit);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fit, function () {});
    if (doc.fonts && doc.fonts.load) { doc.fonts.load("40px 'Olivier'").then(fit, function () {}); doc.fonts.load("20px 'Telegrafico'"); }
    // A guest came back from the online shop with the browser's back button: start clean.
    window.addEventListener('pageshow', function (e) { if (e.persisted) home(); });
    fit();
  }

  window.__kiosk = {
    state: state,
    tiles: TILES,
    open: open,
    home: home,
    fit: fit,
    touch: function () { touched('screen'); }
  };
})();
