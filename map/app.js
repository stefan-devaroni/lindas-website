// Linda's guest map: draws the map and runs the "add your home town" steps.
// Plain script, no libraries. Text is in strings.js, storage in store.js, shapes and cities in the data-*.js files.
(function () {
  'use strict';

  // ---------- settings ----------
  var KIOSK_IDLE_MS = 45000;      // kiosk: back to the start screen after this long without a touch
  var KIOSK_COOLDOWN_MS = 20000;  // kiosk: pause between two pins
  var DROP_SHOW_MS = 8000;        // how long "You are guest ..." stays on screen
  var REFRESH_MS = 60000;         // how often new pins are fetched
  var ARC_COUNT = 40;             // lines to Aruba are drawn for the newest places only, so they stay readable
  var ARUBA = { lon: -70.04, lat: 12.57 };   // Palm Beach
  var FAST = ['US', 'NL', 'CA', 'CO', 'VE', 'BR', 'AR', 'CL', 'PE', 'DE', 'GB', 'AW'];
  var VIEWS = {                   // [west, south, east, north]
    home: [-128, -38, 32, 60],
    world: [-168, -56, 180, 74],
    na: [-128, 7, -60, 56],
    sa: [-84, -56, -33, 14],
    eu: [-11.5, 35, 31, 62]
  };
  var REGIONS = [['home', 'regionHome'], ['world', 'regionWorld'], ['na', 'regionNa'], ['sa', 'regionSa'], ['eu', 'regionEu']];
  var COLORS = { land: '#D6EAFB', landOn: '#A6D5F6', coast: '#62B8E6', pin: 'rgba(235,137,23,.9)', pinTop: '#EB8917', pinEdge: '#FBF8EE', pinText: '#282204', arc: 'rgba(0,78,173,.2)', fresh: '#EFBD40', ink: '#282204' };

  var W = window.LINDAS_MAP_WORLD, U = window.LINDAS_MAP_USA, C = window.LINDAS_MAP_CITIES, Store = window.LindasMapStore;
  var ALL = window.LINDAS_MAP_STRINGS || {};
  var query = {};
  window.location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) query[p[0]] = p[1] == null ? '' : p[1]; });
  var kiosk = query.kiosk === '1';
  var lang = ALL[query.lang] ? query.lang : 'en';
  var S = ALL[lang] || {}, EN = ALL.en || {};
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var stageMq = window.matchMedia ? window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 5/4)') : { matches: false };

  function $(id) { return document.getElementById(id); }

  // ---------- text ----------
  function raw(key) { return S[key] != null ? S[key] : EN[key]; }
  function t(key, vars) {
    var s = raw(key);
    if (s == null) return key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function fmt(n) { try { return Number(n).toLocaleString(lang === 'en' ? 'en-US' : lang); } catch (e) { return String(n); } }
  function plural(key, n) { var a = raw(key) || ['{n}', '{n}']; return (n === 1 ? a[0] : a[1]).split('{n}').join(fmt(n)); }
  // Builds text with pieces put in, without ever treating data as HTML.
  function rich(tpl, parts) {
    var frag = document.createDocumentFragment();
    String(tpl).split(/(\{[a-z]+\})/).forEach(function (bit) {
      var m = /^\{([a-z]+)\}$/.exec(bit);
      if (m && parts[m[1]] != null) { var v = parts[m[1]]; frag.appendChild(typeof v === 'string' ? document.createTextNode(v) : v); }
      else if (bit) frag.appendChild(document.createTextNode(bit));
    });
    return frag;
  }
  function numSpan(n) { return h('span', { class: 'num', text: fmt(n) }); }
  function pluralRich(key, n) { var a = raw(key) || ['{n}', '{n}']; return rich(n === 1 ? a[0] : a[1], { n: numSpan(n) }); }
  // Telegrafico only has the letters A to Z: any other text uses the body font.
  function setLabel(el, text) { el.textContent = text; el.classList.add('lbl'); el.classList.toggle('plain', !/^[A-Za-z ]+$/.test(text)); }

  function h(tag, props, kids) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'label') setLabel(el, v);
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  // Small fixed drawings (never built from data).
  var ICONS = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" fill="#282204"/><circle cx="12" cy="9" r="2.6" fill="#EFBD40"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    drop: '<svg viewBox="0 0 42 54" aria-hidden="true"><path d="M21 2C10.5 2 2 10.4 2 20.8 2 34.5 21 52 21 52s19-17.5 19-31.2C40 10.4 31.5 2 21 2z" fill="#EB8917" stroke="#FBF8EE" stroke-width="3"/><circle cx="21" cy="20.5" r="7" fill="#FBF8EE"/></svg>'
  };
  function icon(name) { var s = document.createElement('span'); s.style.display = 'contents'; s.innerHTML = ICONS[name]; return s.firstChild; }

  if (!W || !U || !C || !Store) {
    document.body.appendChild(h('p', { class: 'toast', text: t('loadError') }));
    return;
  }

  // ---------- places ----------
  var countryBy = {};
  W.countries.forEach(function (c) { if (c.c) countryBy[c.c] = c; });
  var stateBy = {};
  U.states.forEach(function (s) { stateBy[s.c] = s; });
  function countryName(code) { var c = countryBy[code]; return c ? (c[lang] || c.n) : code; }
  function fromCountry(code) { var m = raw('fromCountry') || {}; return m[code] || countryName(code); }

  var FOLD = { 'ø': 'o', 'ł': 'l', 'ß': 'ss', 'đ': 'd', 'ı': 'i', 'æ': 'ae', 'œ': 'oe', 'ð': 'd', 'þ': 'th' };
  function norm(s) { // "São Paulo" -> "sao paulo", so search works without accents
    s = String(s).toLowerCase();
    if (s.normalize) s = s.normalize('NFD');
    return s.replace(/[̀-ͯ]/g, '').replace(/[øłßđıæœðþ]/g, function (ch) { return FOLD[ch]; }).replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var cityCache = {}, cityIndex = null;
  function citiesOf(cc) { // biggest first
    if (cityCache[cc]) return cityCache[cc];
    var d = C[cc], out = [];
    if (d) {
      var names = d.n.split('|'), regs = d.r ? d.r.split('|') : null;
      for (var i = 0; i < names.length; i++) out.push({ id: d.i[i], name: names[i], r: regs ? regs[i] : '', lat: d.a[i] / 100, lon: d.o[i] / 100, pop: d.p[i], c: cc, key: norm(names[i]) });
    }
    return (cityCache[cc] = out);
  }
  function cityById(id) {
    if (!cityIndex) { cityIndex = {}; Object.keys(C).forEach(function (cc) { citiesOf(cc).forEach(function (x) { cityIndex[x.id] = x; }); }); }
    return cityIndex[id] || null;
  }
  function placeLabel(p, full) { // p: { c, r, id }
    var city = p.id ? cityById(p.id) : null;
    var st = p.c === 'US' && p.r && stateBy[p.r] ? stateBy[p.r].n : '';
    if (city) return city.name + ', ' + (st || countryName(p.c));
    if (st) return full ? st + ', ' + countryName('US') : st;
    return full ? countryName(p.c) : '';
  }

  // ---------- map geometry ----------
  // Miller projection: like the familiar wall map, a little less stretched near the poles.
  var D2R = Math.PI / 180, R = 100;
  function PX(lon) { return lon * D2R * R; }
  function PY(lat) { lat = Math.max(-85, Math.min(85, lat)); return -1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * D2R)) * R; }

  function decode(str, factor) { // polyline text -> list of rings, each [x0, y0, x1, y1, ...]
    var rings = [], parts = str ? str.split(' ') : [];
    for (var p = 0; p < parts.length; p++) {
      var s = parts[p], n = s.length, i = 0, x = 0, y = 0, out = [], b, shift, res;
      while (i < n) {
        shift = 0; res = 0;
        do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        x += (res & 1) ? ~(res >> 1) : (res >> 1);
        shift = 0; res = 0;
        do { b = s.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        y += (res & 1) ? ~(res >> 1) : (res >> 1);
        out.push(x / factor, y / factor);
      }
      if (out.length) rings.push(out);
    }
    return rings;
  }
  function project(rings) { return rings.map(function (r) { var o = new Array(r.length); for (var i = 0; i < r.length; i += 2) { o[i] = PX(r[i]); o[i + 1] = PY(r[i + 1]); } return o; }); }
  function pathOf(rings, close) {
    var p = new Path2D();
    rings.forEach(function (r) { p.moveTo(r[0], r[1]); for (var i = 2; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); if (close) p.closePath(); });
    return p;
  }
  function boxOf(rings) {
    var b = [1e9, 1e9, -1e9, -1e9];
    rings.forEach(function (r) { for (var i = 0; i < r.length; i += 2) { if (r[i] < b[0]) b[0] = r[i]; if (r[i] > b[2]) b[2] = r[i]; if (r[i + 1] < b[1]) b[1] = r[i + 1]; if (r[i + 1] > b[3]) b[3] = r[i + 1]; } });
    return b;
  }
  var shapes = [];
  W.countries.forEach(function (c) {
    if (!c.p) return;
    var hi = project(decode(c.p, 100));
    shapes.push({ c: c.c, hi: pathOf(hi, true), lo: project(decode(c.q || c.p, 100)), box: boxOf(hi) });
  });
  // While the map moves, the light shapes are drawn as two big paths (all land, and land with guests): much less work per frame.
  var loAll = pathOf([].concat.apply([], shapes.map(function (s) { return s.lo; })), true), loOn = new Path2D();
  function rebuildLoOn() { loOn = pathOf([].concat.apply([], shapes.filter(function (s) { return has[s.c]; }).map(function (s) { return s.lo; })), true); }
  var lakesPath = pathOf(project(decode(W.lakes, 100)), true);
  var bordersPath = pathOf(project(decode(U.borders, 100)), false);
  var arubaX = PX(ARUBA.lon), arubaY = PY(ARUBA.lat);

  // ---------- state ----------
  var state = {
    kiosk: kiosk, lang: lang, screen: 'attract', view: 'home',
    total: 0, countries: 0, today: 0, places: 0, byCountry: [], demo: 0,
    deviceOnly: false, pending: 0, me: null, pick: null, lastAdd: null, cooldownUntil: 0, ready: false
  };
  var data = { total: 0, today: 0, countries: 0, by_country: [], pins: [] };
  var demoPins = [], places = [], arcs = [], has = {}, newest = [];
  var fresh = null;       // the pin that just dropped
  var K_ME = 'lindas_map_me';

  var mapEl = $('map'), landC = $('land'), pinsC = $('pins'), fxC = $('fx'), marksEl = $('marks');
  var lctx = landC.getContext('2d'), pctx = pinsC.getContext('2d'), fctx = fxC.getContext('2d');
  var vw = 0, vh = 0, dpr = 1, homeK = 1;
  var focus = { l: 6, t: 6, r: 6, b: 6 };
  var view = { x: 0, y: 0, k: 1 };       // what the map shows now
  var drawn = { x: 0, y: 0, k: 1 };      // the view the pins were last painted at
  var pinsCss = '';
  var anim = null;

  // ---------- view ----------
  function computeFocus() { // the part of the map that is not under the title, the side panel or the buttons
    if (!stageMq.matches) { focus = { l: 6, t: 6, r: 6, b: 6 }; return; }
    var m = mapEl.getBoundingClientRect(), s = $('side').getBoundingClientRect(), b = $('bottom').getBoundingClientRect(), br = document.querySelector('.brand').getBoundingClientRect();
    focus = { l: 14, t: Math.max(10, br.bottom - m.top + 4), r: Math.max(10, m.right - s.left + 10), b: Math.max(10, m.bottom - b.top + 6) };
  }
  function fit(b, bottom) { // bottom: room to keep free at the bottom, when it is not the usual buttons
    var X0 = PX(b[0]), X1 = PX(b[2]), Y0 = PY(b[3]), Y1 = PY(b[1]);
    var fb = bottom || focus.b;
    var fw = Math.max(60, vw - focus.l - focus.r), fh = Math.max(60, vh - focus.t - fb);
    var k = Math.min(fw / (X1 - X0), fh / (Y1 - Y0));
    return { k: k, x: (X0 + X1) / 2 - (focus.l + fw / 2 - vw / 2) / k, y: (Y0 + Y1) / 2 - (focus.t + fh / 2 - vh / 2) / k };
  }
  function sx(X) { return (X - view.x) * view.k + vw / 2; }
  function sy(Y) { return (Y - view.y) * view.k + vh / 2; }
  function pinView(p) { // shows the place and Aruba together
    var w = Math.min(p.lon, ARUBA.lon), e = Math.max(p.lon, ARUBA.lon), s = Math.min(p.lat, ARUBA.lat), n = Math.max(p.lat, ARUBA.lat);
    var padX = Math.max(13, (e - w) * 0.22), padY = Math.max(9, (n - s) * 0.3);
    var card = state.screen === 'drop' && stageMq.matches ? Math.min(vh * 0.32, 330) : 0;   // the "You are guest ..." card
    return fit([Math.max(-179, w - padX), Math.max(-58, s - padY), Math.min(179, e + padX), Math.min(78, n + padY)], card);
  }
  function currentTarget() {
    if (VIEWS[state.view]) return fit(VIEWS[state.view]);
    if (fresh) return pinView(fresh);
    if (state.me) return pinView(state.me);
    return fit(VIEWS.home);
  }
  // Moving the map. Repainting thousands of pins for every frame would stutter, so while the map moves:
  //  - the land is repainted from the light shapes (cheap),
  //  - the pins are NOT repainted: their picture is slid and stretched by the browser, and painted sharp again at the end.
  function copyView(v) { return { x: v.x, y: v.y, k: v.k }; }
  function coverBoth(a, b) { // one view that shows everything view a and view b show
    var x0 = Math.min(a.x - vw / 2 / a.k, b.x - vw / 2 / b.k), x1 = Math.max(a.x + vw / 2 / a.k, b.x + vw / 2 / b.k);
    var y0 = Math.min(a.y - vh / 2 / a.k, b.y - vh / 2 / b.k), y1 = Math.max(a.y + vh / 2 / a.k, b.y + vh / 2 / b.k);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, k: Math.min(vw / (x1 - x0), vh / (y1 - y0)) };
  }
  function sameView(a, b) { return Math.abs(a.k / b.k - 1) < 0.02 && Math.abs(a.x - b.x) * b.k < 2 && Math.abs(a.y - b.y) * b.k < 2; }
  function syncPins() { // put the pins picture (painted at view "drawn") where the current view needs it
    var s = view.k / drawn.k, tx = vw / 2 * (1 - s) + (drawn.x - view.x) * view.k, ty = vh / 2 * (1 - s) + (drawn.y - view.y) * view.k;
    var css = Math.abs(s - 1) < 1e-4 && Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05 ? '' : 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
    if (css !== pinsCss) { pinsCss = css; pinsC.style.transform = css; fxC.style.transform = css; }
  }
  function stopAnim() { if (anim) { cancelAnimationFrame(anim.raf); clearTimeout(anim.timer); anim = null; } }
  function flyTo(target, ms) {
    stopAnim();
    hideTip();
    if (reduceMotion || !ms || document.hidden) { view = copyView(target); drawAll(); return; }
    var from = copyView(view), t0 = null, a = {};
    var cover = coverBoth(from, target);
    if (!sameView(drawn, cover)) { view = cover; drawPins(); view = copyView(from); syncPins(); }
    function finish() { if (anim !== a) return; stopAnim(); view = copyView(target); drawAll(); }
    function step(now) {
      if (anim !== a) return;
      if (t0 === null) t0 = now;
      var u = Math.min(1, (now - t0) / ms), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      view.k = from.k * Math.pow(target.k / from.k, e);
      view.x = from.x + (target.x - from.x) * e;
      view.y = from.y + (target.y - from.y) * e;
      if (u >= 1) { finish(); return; }
      drawLand(true); syncPins(); placeMarks();
      a.raf = requestAnimationFrame(step);
    }
    anim = a;
    a.raf = requestAnimationFrame(step);
    a.timer = setTimeout(finish, ms + 500);   // also ends when the tab is in the background and frames do not run
  }
  function setView(name, instant) {
    if (!VIEWS[name]) name = 'home';
    state.view = name;
    markChips();
    flyTo(fit(VIEWS[name]), instant ? 0 : 800);
  }

  // ---------- drawing ----------
  function drawLand(lo) {
    var c = lctx, k = view.k * dpr, i, s, p;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, landC.width, landC.height);
    c.setTransform(k, 0, 0, k, (vw / 2 - view.x * view.k) * dpr, (vh / 2 - view.y * view.k) * dpr);
    var x0 = view.x - vw / 2 / view.k, x1 = view.x + vw / 2 / view.k, y0 = view.y - vh / 2 / view.k, y1 = view.y + vh / 2 / view.k;
    c.lineJoin = 'round';
    c.lineWidth = 0.9 / view.k;
    c.strokeStyle = COLORS.coast;
    if (lo) {
      c.fillStyle = COLORS.land; c.fill(loAll, 'evenodd');
      c.fillStyle = COLORS.landOn; c.fill(loOn, 'evenodd');
      c.stroke(loAll);
    } else {
      for (i = 0; i < shapes.length; i++) {
        s = shapes[i];
        if (s.box[2] < x0 || s.box[0] > x1 || s.box[3] < y0 || s.box[1] > y1) continue;
        p = s.hi;
        c.fillStyle = has[s.c] ? COLORS.landOn : COLORS.land;
        c.fill(p, 'evenodd');
        c.stroke(p);
      }
    }
    c.globalCompositeOperation = 'destination-out';   // lakes: cut out of the land
    c.fill(lakesPath, 'evenodd');
    c.globalCompositeOperation = 'source-over';
    c.stroke(lakesPath);
    if (view.k * D2R * R > 5) {                        // state lines once they are wide enough to read
      c.strokeStyle = 'rgba(255,255,255,.95)';
      c.lineWidth = 1 / view.k;
      c.stroke(bordersPath);
    }
  }

  function zoomFactor() { return Math.max(0.85, Math.min(1.55, Math.pow(view.k / homeK, 0.32))); }
  function pinBase() { return Math.max(3.1, Math.min(5.4, vw / 370)); }
  function radius(n, base) { // one guest = a small dot; more guests at one place = a bigger dot
    if (n <= 1) return base;
    return Math.min(base * 5, Math.max(base * 1.7, base * (1 + 0.62 * Math.log(n))));
  }
  function arcCtl(x1, y1, x2, y2) { // a gentle bow, always to the upper or left side
    var dx = x2 - x1, dy = y2 - y1, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 14) return null;
    var nx = dy / d, ny = -dx / d;
    if (ny > 0.0001 || (Math.abs(ny) <= 0.0001 && nx > 0)) { nx = -nx; ny = -ny; }
    var lift = Math.min(d * 0.2, 150);
    return [(x1 + x2) / 2 + nx * lift, (y1 + y2) / 2 + ny * lift];
  }
  function drawPins() {
    var c = pctx, i, p, x, y, r, ctl;
    drawn = copyView(view);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, vw, vh);
    var zf = zoomFactor(), base = pinBase() * zf, ax = sx(arubaX), ay = sy(arubaY);

    // thin lines from the newest places to Aruba
    c.lineWidth = 1.2; c.strokeStyle = COLORS.arc; c.lineCap = 'round';
    c.beginPath();
    for (i = 0; i < arcs.length; i++) {
      p = arcs[i]; x = sx(p.X); y = sy(p.Y); ctl = arcCtl(x, y, ax, ay);
      if (ctl) { c.moveTo(x, y); c.quadraticCurveTo(ctl[0], ctl[1], ax, ay); }
    }
    c.stroke();

    // dots, biggest first so small ones stay on top
    var labels = [];
    c.beginPath();
    for (i = 0; i < places.length; i++) {
      p = places[i]; x = sx(p.X); y = sy(p.Y); r = radius(p.n, base);
      if (x < -r || x > vw + r || y < -r || y > vh + r) continue;
      c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832);
      if (p.n > 1 && r >= 6.5) labels.push(x, y, r, p.n);
    }
    c.fillStyle = COLORS.pin; c.fill();
    c.lineWidth = 1; c.strokeStyle = COLORS.pinEdge; c.stroke();

    // Counts. Biggest dots first; a count is left out where a bigger counted dot already sits,
    // so a busy area shows a few clear numbers instead of a pile of them.
    var shown = [], grid = {}, cell = 90, j, a, b, o, key, bucket, free;
    for (i = 0; i < labels.length; i += 4) {
      var gx = Math.floor(labels[i] / cell), gy = Math.floor(labels[i + 1] / cell);
      free = true;
      for (a = gx - 1; a <= gx + 1 && free; a++) {
        for (b = gy - 1; b <= gy + 1 && free; b++) {
          bucket = grid[a * 1000 + b];
          if (!bucket) continue;
          for (j = 0; j < bucket.length; j++) {
            o = bucket[j];
            var ddx = labels[o] - labels[i], ddy = labels[o + 1] - labels[i + 1], lim = (labels[o + 2] + labels[i + 2]) * 0.92;
            if (ddx * ddx + ddy * ddy < lim * lim) { free = false; break; }
          }
        }
      }
      if (!free) continue;
      key = gx * 1000 + gy;
      (grid[key] = grid[key] || []).push(i);
      shown.push(i);
    }
    if (shown.length) {
      c.beginPath();
      for (j = 0; j < shown.length; j++) { i = shown[j]; c.moveTo(labels[i] + labels[i + 2], labels[i + 1]); c.arc(labels[i], labels[i + 1], labels[i + 2], 0, 6.2832); }
      c.fillStyle = COLORS.pinTop; c.fill(); c.stroke();
      c.fillStyle = COLORS.pinText; c.textAlign = 'center'; c.textBaseline = 'middle';
      var lastSize = 0;
      for (j = 0; j < shown.length; j++) {
        i = shown[j];
        var n = labels[i + 3], digits = n < 10 ? 1 : n < 100 ? 2 : n < 1000 ? 3 : 4;
        var size = Math.round(Math.max(9, Math.min(22, labels[i + 2] * (digits === 1 ? 1.3 : digits === 2 ? 1.05 : digits === 3 ? 0.8 : 0.66))));
        if (size !== lastSize) { c.font = '700 ' + size + 'px "Segoe UI", system-ui, sans-serif'; lastSize = size; }
        c.fillText(String(n), labels[i], labels[i + 1] + 0.5);
      }
    }

    drawFx();
    syncPins();
  }
  // The pin that just dropped, on its own small layer: its line to Aruba grows without repainting all the pins.
  function drawFx() {
    var c = fctx, i;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, vw, vh);
    if (!fresh) return;
    function dx(X) { return (X - drawn.x) * drawn.k + vw / 2; }
    function dy(Y) { return (Y - drawn.y) * drawn.k + vh / 2; }
    var x = dx(fresh.X), y = dy(fresh.Y), ax = dx(arubaX), ay = dy(arubaY), ctl = arcCtl(x, y, ax, ay);
    if (ctl && fresh.p > 0) {
      c.beginPath(); c.moveTo(x, y);
      var steps = 36, upto = Math.round(steps * fresh.p);
      for (i = 1; i <= upto; i++) { var u = i / steps, v = 1 - u; c.lineTo(v * v * x + 2 * v * u * ctl[0] + u * u * ax, v * v * y + 2 * v * u * ctl[1] + u * u * ay); }
      c.lineCap = 'round';
      c.lineWidth = 5; c.strokeStyle = 'rgba(251,248,238,.9)'; c.stroke();
      c.lineWidth = 2.6; c.strokeStyle = '#EB8917'; c.stroke();
    }
    if (fresh.landed) {
      c.beginPath(); c.arc(x, y, Math.max(pinBase() * zoomFactor() * 1.5, 6), 0, 6.2832);
      c.fillStyle = COLORS.fresh; c.fill(); c.lineWidth = 2; c.strokeStyle = COLORS.ink; c.stroke();
    }
  }

  // Things drawn as page elements on top of the map: Aruba, "You", newest pins, the dropping pin, the label.
  var marks = {};
  function mark(name, cls, lon, lat, kids) {
    var m = marks[name];
    if (!m) { m = marks[name] = { el: h('div', { class: 'mark ' + cls }, kids) }; marksEl.appendChild(m.el); }
    m.X = PX(lon); m.Y = PY(lat);
    return m.el;
  }
  function unmark(name) { var m = marks[name]; if (m) { marksEl.removeChild(m.el); delete marks[name]; } }
  function placeMarks() {
    Object.keys(marks).forEach(function (k) {
      var m = marks[k];
      m.el.style.transform = 'translate(' + sx(m.X).toFixed(1) + 'px,' + sy(m.Y).toFixed(1) + 'px)';
    });
  }
  function drawAll() { drawLand(false); drawPins(); placeMarks(); }

  var tipTimer = null;
  function hideTip() { clearTimeout(tipTimer); unmark('tip'); }
  function showTip(p) {
    hideTip();
    var text = placeLabel(p, true) + '  ·  ' + plural('pinGuests', p.n);
    mark('tip', 'tip', p.lon, p.lat, [h('div', { class: 'box', text: text })]);
    placeMarks();
    tipTimer = setTimeout(hideTip, 5000);
  }
  function updateMeMark() {
    if (state.me && !kiosk) { unmark('me'); mark('me', 'me', state.me.lon, state.me.lat, [h('i'), h('span', { class: 'name', label: t('you') })]); }
    else unmark('me');
  }
  function updateRipples() {
    ['r0', 'r1', 'r2'].forEach(unmark);
    newest.slice(0, 3).forEach(function (p, i) { mark('r' + i, 'ripple ' + 'abc'.charAt(i), p.lon, p.lat, [h('i')]); });
  }

  // ---------- data -> screen ----------
  function placeKey(p) { return p.city_id ? 'c' + p.city_id : p.country + '|' + (p.region || '') + '|' + (+p.lat).toFixed(2) + ',' + (+p.lon).toFixed(2); }
  function applyData(d) {
    if (d) data = d;
    var by = {}, byKey = {}, total = data.total, i;
    data.by_country.forEach(function (r) { by[r.country] = r.n; });
    places = [];
    function addPin(p) {
      var k = placeKey(p), q = byKey[k];
      if (q) { q.n += p.n; return; }
      q = byKey[k] = { c: p.country, r: p.region || null, id: p.city_id || null, lat: p.lat, lon: p.lon, n: p.n, last: Date.parse(p.last) || 0, X: PX(p.lon), Y: PY(p.lat) };
      places.push(q);
    }
    data.pins.forEach(addPin);
    demoPins.forEach(function (p) { addPin(p); total += p.n; by[p.country] = (by[p.country] || 0) + p.n; });
    var list = Object.keys(by).map(function (c) { return { country: c, n: by[c] }; }).sort(function (a, b) { return b.n - a.n || (a.country < b.country ? -1 : 1); });
    has = {};
    list.forEach(function (r) { has[r.country] = true; });
    rebuildLoOn();
    newest = places.slice().sort(function (a, b) { return b.last - a.last; }).slice(0, ARC_COUNT);
    arcs = newest;
    places.sort(function (a, b) { return b.n - a.n; });

    state.total = total;
    state.today = data.today;
    state.countries = demoPins.length ? list.length : Math.max(data.countries, 0);
    state.places = places.length;
    state.byCountry = list;
    state.deviceOnly = Store.deviceOnly();
    state.pending = Store.pendingCount();
    state.ready = true;

    renderCount();
    renderBy();
    var note = $('note');
    note.hidden = !state.deviceOnly;
    note.textContent = state.deviceOnly ? t('deviceOnly') : '';
    updateRipples();
    drawAll();
  }
  function renderCount() {
    var el = $('count');
    el.textContent = '';
    if (!state.total) { el.appendChild(h('p', { class: 'line', text: t('empty') })); return; }
    var line = h('p', { class: 'line' });
    line.appendChild(rich(t('countLine'), { guests: pluralRich('guests', state.total), countries: pluralRich('countries', state.countries) }));
    el.appendChild(line);
    if (state.today > 0) { var td = h('p', { class: 'today' }); td.appendChild(rich(t('today'), { n: numSpan(state.today) })); el.appendChild(td); }
  }
  function renderBy() {
    var el = $('by'), list = state.byCountry;
    el.textContent = '';
    if (!list.length) return;
    el.appendChild(h('h2', { label: t('byCountry') }));
    var rem = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
    var room = stageMq.matches ? Math.max(3, Math.min(12, Math.floor((window.innerHeight - 17 * rem) / (2.7 * rem)))) : 10;
    if (kiosk && !stageMq.matches) room = Math.max(3, Math.min(10, Math.floor((window.innerHeight - (el.getBoundingClientRect().top + window.pageYOffset) - 4.2 * rem) / (2.7 * rem))));   // upright kiosk: only what fits without scrolling
    if (list.length === room + 1) room++;
    var max = list[0].n;
    list.slice(0, room).forEach(function (r) {
      var bar = h('i');
      bar.style.width = Math.max(3, Math.round(r.n / max * 100)) + '%';
      el.appendChild(h('div', { class: 'row' }, [bar, h('span', { text: countryName(r.country) }), h('span', { class: 'n', text: fmt(r.n) })]));
    });
    if (list.length > room) el.appendChild(h('p', { class: 'more', text: plural('more', list.length - room) }));
  }
  var ctaTimer = null;
  function renderCta() {
    var el = $('cta');
    el.textContent = '';
    clearTimeout(ctaTimer);
    if (!kiosk && state.me) {   // this phone already added a pin
      el.appendChild(h('p', { class: 'onmap', text: t('onMap') }));
      el.appendChild(h('button', { class: 'btn-ghost', type: 'button', label: t('showMyPin'), onclick: showMe }));
      return;
    }
    var wait = kiosk ? state.cooldownUntil - Date.now() : 0;
    var b = h('button', { class: 'btn-add', type: 'button', id: 'add', onclick: openPicker }, [icon('pin'), h('span', { label: wait > 0 ? t('wait') : t('add') })]);
    if (wait > 0) { b.disabled = true; ctaTimer = setTimeout(renderCta, wait + 60); }
    el.appendChild(b);
  }
  function renderRegions() {
    var el = $('regions');
    el.textContent = '';
    REGIONS.forEach(function (r) {
      el.appendChild(h('button', { class: 'chip', type: 'button', 'data-view': r[0], label: t(r[1]), onclick: function () { setView(r[0]); } }));
    });
    markChips();
  }
  function markChips() {
    var chips = $('regions').children;
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i].getAttribute('data-view') === state.view);
  }
  function showMe() {
    if (!state.me) return;
    state.view = 'pin'; markChips();
    window.scrollTo(0, 0);
    flyTo(pinView(state.me), 800);
  }
  function toast(text) {
    var el = h('p', { class: 'toast', text: text });
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5000);
  }

  // ---------- picking a place ----------
  var picker = $('picker'), stack = [], pickerOpen = false, histOn = false, typed = '', keyHandler = null;

  function openPicker() {
    if (pickerOpen || sending) return;
    if (kiosk && Date.now() < state.cooldownUntil) return;
    hideTip();
    pickerOpen = true; stack = [];
    document.documentElement.classList.add('picking');
    picker.hidden = false;
    state.screen = 'pick';
    go(stepCountry);
    if (!kiosk && window.history && window.history.pushState) { try { window.history.pushState({ lindasMap: 1 }, ''); histOn = true; } catch (e) { histOn = false; } }
  }
  function go(step) { stack.push(step); renderStep(); }
  function renderStep() {
    typed = ''; keyHandler = null;
    picker.textContent = '';
    stack[stack.length - 1]();
  }
  function back() { if (stack.length > 1) { stack.pop(); renderStep(); } else closePicker(); }
  function closePicker() {
    if (!pickerOpen) return;
    pickerOpen = false; keyHandler = null; stack = [];
    document.documentElement.classList.remove('picking');
    picker.hidden = true; picker.textContent = '';
    state.pick = null;
    if (state.screen === 'pick') state.screen = 'attract';
    if (histOn) { histOn = false; try { window.history.back(); } catch (e) { /* nothing to undo */ } }
  }
  // The phone's own back button goes one step back instead of leaving the page.
  window.addEventListener('popstate', function () {
    if (!pickerOpen || !histOn) return;
    histOn = false;
    if (stack.length > 1) { stack.pop(); renderStep(); try { window.history.pushState({ lindasMap: 1 }, ''); histOn = true; } catch (e) { /* fine */ } }
    else closePicker();
  });

  function frame(title, sub) {
    var first = stack.length <= 1;
    var head = h('div', { class: 'p-head' }, [
      h('button', { class: 'nav back' + (first ? ' off' : ''), type: 'button', onclick: back, 'aria-label': t('back') }, [icon('back'), h('span', { label: t('back') })]),
      h('h2', null, [title, sub ? h('span', { class: 'sub', text: sub }) : null]),
      h('button', { class: 'nav x', type: 'button', onclick: closePicker }, [h('span', { label: t('close') })])
    ]);
    var body = h('div', { class: 'p-body' });
    picker.appendChild(head);
    picker.appendChild(body);
    return body;
  }
  function tap(el, fn) { // short "pressed" look, then go on
    el.addEventListener('click', function () { el.classList.add('hit'); setTimeout(fn, 110); });
    return el;
  }

  // A small picture of the country instead of a flag (flag emoji do not show on Windows).
  function drawShape(cv, cc) {
    var c = countryBy[cc];
    if (!c || !c.p) return;
    var rings = project(decode(c.p, 100)), info = rings.map(function (r) {
      var b = boxOf([r]), a = 0;
      for (var i = 0, j = r.length - 2; i < r.length; j = i, i += 2) a += r[j] * r[i + 1] - r[i] * r[j + 1];
      return { r: r, b: b, a: Math.abs(a / 2), cx: (b[0] + b[2]) / 2, cy: (b[1] + b[3]) / 2 };
    }).sort(function (p, q) { return q.a - p.a; });
    var main = info[0], keep = info.filter(function (o) { return o === main || (o.a >= main.a * 0.06 && Math.abs(o.cx - main.cx) < PX(30) && Math.abs(o.cy - main.cy) < PX(30)); });
    var b = boxOf(keep.map(function (o) { return o.r; })), pad = 8, size = cv.width;
    var k = Math.min((size - 2 * pad) / Math.max(0.01, b[2] - b[0]), (size - 2 * pad) / Math.max(0.01, b[3] - b[1]));
    var ox = (size - (b[2] - b[0]) * k) / 2 - b[0] * k, oy = (size - (b[3] - b[1]) * k) / 2 - b[1] * k;
    var g = cv.getContext('2d');
    g.beginPath();
    keep.forEach(function (o) { var r = o.r; g.moveTo(r[0] * k + ox, r[1] * k + oy); for (var i = 2; i < r.length; i += 2) g.lineTo(r[i] * k + ox, r[i + 1] * k + oy); g.closePath(); });
    g.fillStyle = '#BDDFFF'; g.fill('evenodd');
    g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = '#27AAE1'; g.stroke();
  }

  function stepCountry() {
    state.pick = { step: 'country' };
    var body = frame(t('pickCountry'));
    var grid = h('div', { class: 'fast' });
    FAST.forEach(function (cc) {
      if (!countryBy[cc]) return;
      var pic;
      if (cc === 'AW') pic = h('span', { class: 'home-dot', 'aria-hidden': 'true' });   // Aruba is too small to draw: show the Linda's dot
      else { pic = h('canvas', { width: '132', height: '132', 'aria-hidden': 'true' }); drawShape(pic, cc); }
      grid.appendChild(tap(h('button', { class: 'tile', type: 'button', 'data-c': cc }, [pic, h('span', { text: countryName(cc) })]), function () { pickCountry(cc); }));
    });
    var other = tap(h('button', { class: 'tile other', type: 'button', id: 'another' }, [h('span', { label: t('another') })]), function () { go(stepAll); });
    body.appendChild(h('div', { class: 'scroll' }, [grid, other]));
  }
  function pickCountry(cc) {
    if (cc === 'US') go(stepStates);
    else go(function () { stepCities(cc, null); });
  }

  function match(key, q) { // 0 = starts with it, 1 = a word starts with it, 2 = has it somewhere, -1 = no
    if (!q) return 0;
    if (key.indexOf(q) === 0) return 0;
    if ((' ' + key).indexOf(' ' + q) >= 0) return 1;
    if (q.length >= 3 && key.indexOf(q) >= 0) return 2;
    return -1;
  }
  function pager(scroll) { // kiosk: big buttons, so nobody has to drag a list
    function page(dir) { scroll.scrollTop += dir * Math.max(120, scroll.clientHeight * 0.8); }
    var el = h('div', { class: 'pager' }, [
      h('button', { type: 'button', 'aria-label': t('up'), onclick: function () { page(-1); } }, [icon('up')]),
      h('button', { type: 'button', 'aria-label': t('down'), onclick: function () { page(1); } }, [icon('down')])
    ]);
    el.check = function () { setTimeout(function () { el.style.visibility = scroll.scrollHeight > scroll.clientHeight + 6 ? 'visible' : 'hidden'; }, 30); };
    return el;
  }
  function keyboard(onKey) {
    var kb = h('div', { class: 'kb' });
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (ch) {
      kb.appendChild(h('button', { type: 'button', 'data-key': ch, label: ch, onclick: function () { onKey(ch.toLowerCase()); } }));
    });
    kb.appendChild(h('button', { type: 'button', class: 'wide', 'data-key': 'space', label: t('space'), onclick: function () { onKey(' '); } }));
    kb.appendChild(h('button', { type: 'button', class: 'wide', 'data-key': 'del', label: t('del'), onclick: function () { onKey('del'); } }));
    return kb;
  }
  // A list with an optional "just my ..." button and search. items: [{ label, small, key, pick }]
  function searchList(body, items, opts) {
    var top = h('div', { class: 'find' });
    var list = h('div', { class: 'list' }), none = h('p', { class: 'none', text: t('noMatch') });
    none.hidden = true;
    var scroll = h('div', { class: 'scroll' }, [list, none]);
    var pg = pager(scroll), typedEl = null;
    function render(text) {
      var q = norm(text), ranked = [];
      items.forEach(function (it, i) { var r = match(it.key, q); if (r >= 0) ranked.push([r, i, it]); });
      if (q) ranked.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      list.textContent = '';
      ranked.forEach(function (r) {
        var it = r[2];
        list.appendChild(tap(h('button', { class: 'tile', type: 'button' }, [h('span', { text: it.label }), it.small ? h('small', { text: it.small }) : null]), it.pick));
      });
      none.hidden = ranked.length > 0;
      scroll.scrollTop = 0;
      pg.check();
    }
    if (opts.skip) top.appendChild(tap(h('button', { class: 'tile skip', type: 'button', id: 'skip' }, [h('span', { label: opts.skip.label })]), opts.skip.pick));
    if (opts.search) {
      if (kiosk) {
        typedEl = h('div', { class: 'typed', id: 'typed', 'data-hint': t('typeHint') });
        top.appendChild(typedEl);
        keyHandler = function (k) {
          if (k === 'del') typed = typed.slice(0, -1);
          else if (typed.length < 24 && !(k === ' ' && (!typed || typed.slice(-1) === ' '))) typed += k;
          typedEl.textContent = typed;
          render(typed);
        };
      } else {
        var input = h('input', { type: 'search', id: 'search', placeholder: t('search'), 'aria-label': t('search'), autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'search' });
        input.addEventListener('input', function () { render(input.value); });
        top.appendChild(input);
      }
    }
    if (top.firstChild) body.appendChild(top);
    body.appendChild(h('div', { class: 'scroll-wrap' }, [scroll, pg]));
    if (opts.search && kiosk) body.appendChild(keyboard(function (k) { keyHandler(k); }));
    render('');
  }

  function stepAll() {
    state.pick = { step: 'all' };
    var body = frame(t('allCountries'));
    var items = W.countries.filter(function (c) { return c.c && !c.hide; }).map(function (c) {
      var name = countryName(c.c);
      return { label: name, key: norm(name), pick: function () { pickCountry(c.c); } };
    }).sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });
    searchList(body, items, { search: true });
  }

  function usMap(onPick) {
    var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'), box = [1e9, 1e9, -1e9, -1e9];
    svg.setAttribute('class', 'usmap');
    svg.setAttribute('aria-hidden', 'true');
    U.states.forEach(function (s) {
      var d = '';
      decode(s.p, 10).forEach(function (r) {
        for (var i = 0; i < r.length; i += 2) {
          d += (i ? 'L' : 'M') + r[i] + ' ' + r[i + 1];
          if (r[i] < box[0]) box[0] = r[i]; if (r[i] > box[2]) box[2] = r[i];
          if (r[i + 1] < box[1]) box[1] = r[i + 1]; if (r[i + 1] > box[3]) box[3] = r[i + 1];
        }
        d += 'Z';
      });
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('data-r', s.c);
      p.addEventListener('click', function () { p.setAttribute('class', 'hit'); setTimeout(function () { onPick(s.c); }, 130); });
      svg.appendChild(p);
    });
    U.states.forEach(function (s) { // two-letter names where the state is big enough to hold them
      if (s.aw < 30) return;
      var tx = document.createElementNS(NS, 'text');
      tx.setAttribute('x', s.ax); tx.setAttribute('y', s.ay);
      tx.textContent = s.c;
      svg.appendChild(tx);
    });
    svg.setAttribute('viewBox', [Math.floor(box[0] - 4), Math.floor(box[1] - 4), Math.ceil(box[2] - box[0] + 8), Math.ceil(box[3] - box[1] + 8)].join(' '));
    return svg;
  }
  function stepStates() {
    state.pick = { step: 'state', country: 'US' };
    var body = frame(t('pickState'), t('pickStateHint'));
    function choose(code) { go(function () { stepCities('US', code); }); }
    var list = h('div', { class: 'list' });
    U.states.forEach(function (s) {
      list.appendChild(tap(h('button', { class: 'tile', type: 'button', 'data-r': s.c }, [h('span', { text: s.n })]), function () { choose(s.c); }));
    });
    if (countryBy.PR) { // people from Puerto Rico look for it here; it is kept as its own place
      list.appendChild(tap(h('button', { class: 'tile', type: 'button', 'data-c': 'PR' }, [h('span', { text: countryName('PR') })]), function () { go(function () { stepCities('PR', null); }); }));
    }
    var scroll = h('div', { class: 'scroll' }, [list]), pg = pager(scroll);
    var skip = tap(h('button', { class: 'tile skip', type: 'button', id: 'skip' }, [h('span', { label: t('justCountry') })]), function () { submitCountry('US'); });
    body.appendChild(h('div', { class: 'us' }, [
      h('div', { class: 'mapbox' }, [usMap(choose)]),
      h('div', { class: 'us-side' }, [skip, h('div', { class: 'scroll-wrap' }, [scroll, pg])])
    ]));
    pg.check();
  }
  function stepCities(cc, region) {
    var all = citiesOf(cc), list = region ? all.filter(function (x) { return x.r === region; }) : all;
    state.pick = { step: 'city', country: cc, region: region || null };
    var body = frame(region && stateBy[region] ? stateBy[region].n : countryName(cc), list.length ? t('pickCity') : '');
    var items = list.map(function (x) {
      return { label: x.name, small: !region && x.r ? x.r : '', key: x.key, pick: function () { submit({ c: cc, r: x.r || region || null, id: x.id, lat: x.lat, lon: x.lon }); } };
    });
    searchList(body, items, {
      skip: { label: region ? t('justState') : t('justCountry'), pick: function () { if (region) submitState(region); else submitCountry(cc); } },
      search: list.length > 12
    });
  }
  function submitCountry(cc) { var c = countryBy[cc]; if (c && c.x != null) submit({ c: cc, r: null, id: null, lat: c.y, lon: c.x }); }
  function submitState(code) { var s = stateBy[code]; if (s) submit({ c: 'US', r: code, id: null, lat: s.y, lon: s.x }); }

  // ---------- the pin drops ----------
  var sending = false, dropTimer = null, dropEl = $('drop');
  function readMe() {
    try {
      var m = JSON.parse(window.localStorage.getItem(K_ME));
      if (m && typeof m.c === 'string' && isFinite(m.lat) && isFinite(m.lon)) return { c: m.c.slice(0, 2), r: m.r ? String(m.r).slice(0, 3) : null, id: m.id ? Number(m.id) || null : null, lat: +m.lat, lon: +m.lon, n: Number(m.n) || 0, sid: m.sid || null, t: m.t || 0 };
    } catch (e) { /* no saved pin */ }
    return null;
  }
  function saveMe() { try { window.localStorage.setItem(K_ME, JSON.stringify(state.me)); } catch (e) { /* private mode: not remembered */ } }

  function submit(sel) {
    if (sending) return;
    sending = true;
    closePicker();
    state.screen = 'drop';
    document.documentElement.classList.add('dropping');
    window.scrollTo(0, 0);
    setTimeout(function () { window.scrollTo(0, 0); }, 80);   // again, after the phone's back step has settled
    dropEl.textContent = ''; dropEl.className = 'drop sending'; dropEl.hidden = false;
    dropEl.appendChild(h('span', { label: t('sending') }));
    fresh = { c: sel.c, r: sel.r, id: sel.id, lon: sel.lon, lat: sel.lat, X: PX(sel.lon), Y: PY(sel.lat), p: 0, landed: false };
    state.view = 'pin'; markChips();
    flyTo(pinView(fresh), 900);
    var t0 = Date.now();
    function after(res) {
      setTimeout(function () {
        sending = false;
        if (!res || !res.ok) { endDrop(true); toast(t('badPlace')); return; }
        land(sel, res);
      }, Math.max(0, 1000 - (Date.now() - t0)));
    }
    Store.add({ country: sel.c, region: sel.r, city_id: sel.id, lat: sel.lat, lon: sel.lon, source: kiosk ? 'kiosk' : 'web' }).then(after, function () { after(null); });
  }
  function land(sel, res) {
    state.lastAdd = { country: sel.c, region: sel.r, city_id: sel.id, lat: sel.lat, lon: sel.lon, local: !!res.local, total: res.total, countries: res.countries, same_country: res.same_country };
    if (kiosk) state.cooldownUntil = Date.now() + KIOSK_COOLDOWN_MS;
    else { state.me = { c: sel.c, r: sel.r, id: sel.id, lat: sel.lat, lon: sel.lon, n: res.same_country, sid: res.id || null, t: Date.now() }; saveMe(); }
    applyData(Store.current());           // counters and the new dot
    mark('drop', 'droppin', sel.lon, sel.lat, [h('i'), icon('drop')]);
    placeMarks();
    // the card
    dropEl.hidden = true; dropEl.textContent = ''; dropEl.className = 'drop';
    var where = placeLabel(sel, false);
    if (where) dropEl.appendChild(h('p', { class: 'place', text: where }));
    var line = h('p', { class: 'line' });
    line.appendChild(rich(res.same_country === 1 && raw('dropFirst') ? t('dropFirst') : t('dropLine'), { n: h('b', { text: fmt(res.same_country) }), country: fromCountry(sel.c) }));
    dropEl.appendChild(line);
    if (res.local) dropEl.appendChild(h('p', { class: 'small', text: t('deviceOnly') }));
    dropEl.appendChild(h('button', { class: 'btn-done', type: 'button', id: 'done', label: t('done'), onclick: function () { endDrop(false); } }));
    var bar = h('div', { class: 'bar' }, [h('i')]);
    bar.style.setProperty('--ms', DROP_SHOW_MS + 'ms');
    dropEl.appendChild(bar);
    dropEl.hidden = false;
    // the dot appears when the pin lands, then the line to Aruba grows
    setTimeout(function () { if (fresh) { fresh.landed = true; drawFx(); growArc(); } }, reduceMotion ? 0 : 520);
    clearTimeout(dropTimer);
    dropTimer = setTimeout(function () { endDrop(false); }, DROP_SHOW_MS);
  }
  function growArc() {
    var t0 = null, f = fresh;
    function step(now) {
      if (fresh !== f) return;
      if (t0 === null) t0 = now;
      f.p = Math.min(1, (now - t0) / 1100);
      drawFx();
      if (f.p < 1) requestAnimationFrame(step);
    }
    if (reduceMotion || document.hidden) { f.p = 1; drawFx(); return; }
    requestAnimationFrame(step);
    setTimeout(function () { if (fresh === f && f.p < 1) { f.p = 1; drawFx(); } }, 1600);
  }
  function endDrop(failed) {
    clearTimeout(dropTimer);
    if (state.screen !== 'drop') return;
    dropEl.hidden = true; dropEl.textContent = '';
    unmark('drop');
    fresh = null;
    drawFx();
    state.screen = 'attract';
    document.documentElement.classList.remove('dropping');
    updateMeMark();
    renderCta();
    setView('home');
    if (!failed) refresh();
  }

  // ---------- start screen ----------
  function goHome() { // kiosk: nobody touched the screen for a while
    if (sending) return;
    if (pickerOpen) closePicker();
    if (state.screen === 'drop') endDrop(false);
    hideTip();
    if (state.view !== 'home') setView('home');
  }
  function refresh() {
    return Store.load().then(function (d) { applyData(d); });
  }
  function resize() {
    if (mapEl.clientWidth < 2 || mapEl.clientHeight < 2) return;
    vw = mapEl.clientWidth; vh = mapEl.clientHeight;     // the inside of the map box, where the canvases sit
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    [landC, pinsC, fxC].forEach(function (cv) { cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); });
    computeFocus();
    homeK = fit(VIEWS.home).k;
    stopAnim();
    var tg = currentTarget();
    view = { x: tg.x, y: tg.y, k: tg.k };
    renderBy();
    drawAll();
  }

  mapEl.addEventListener('click', function (e) { // tap a dot to see where it is
    if (state.screen !== 'attract' || anim) return;
    var r = mapEl.getBoundingClientRect(), x = e.clientX - r.left - mapEl.clientLeft, y = e.clientY - r.top - mapEl.clientTop, base = pinBase() * zoomFactor(), best = null, bd = 1e9;
    for (var i = 0; i < places.length; i++) {
      var p = places[i], dx = sx(p.X) - x, dy = sy(p.Y) - y, d = Math.sqrt(dx * dx + dy * dy) - radius(p.n, base);
      if (d < bd) { bd = d; best = p; }
    }
    if (best && bd <= 14) showTip(best); else hideTip();
  });

  function setupKiosk() {
    var root = document.documentElement;
    root.classList.add('kiosk');
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    // no links that leave the page
    var logo = $('logo');
    if (logo) { logo.removeAttribute('href'); logo.setAttribute('role', 'img'); logo.setAttribute('tabindex', '-1'); }
    function stop(e) { e.preventDefault(); }
    ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange'].forEach(function (ev) { document.addEventListener(ev, stop); });
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    window.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) >= 0) e.preventDefault(); });
    var idle = null;
    function poke() { clearTimeout(idle); idle = setTimeout(goHome, KIOSK_IDLE_MS); }
    ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, poke, { passive: true, capture: true }); });
    poke();
  }
  document.addEventListener('keydown', function (e) { // a real keyboard works too, if the kiosk has one
    if (!pickerOpen || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { back(); return; }
    if (!keyHandler) return;
    if (/^[a-zA-Z]$/.test(e.key)) keyHandler(e.key.toLowerCase());
    else if (e.key === ' ') keyHandler(' ');
    else if (e.key === 'Backspace') keyHandler('del');
    else return;
    e.preventDefault();
  });

  // ---------- testing ----------
  function demo(n) { // draws n made-up places on this screen only; nothing is sent. demo(0) removes them.
    n = Math.max(0, Math.floor(Number(n) || 0));
    var seed = 20011 + n;
    function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var z = Math.imul(seed ^ seed >>> 15, 1 | seed); z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z; return ((z ^ z >>> 14) >>> 0) / 4294967296; }
    var weight = { US: 60, NL: 14, CA: 9, CO: 5, VE: 4, BR: 5, AR: 5, CL: 3, PE: 2, DE: 3, GB: 3, AW: 1 }, pool = [];
    Object.keys(C).forEach(function (cc) {
      var list = citiesOf(cc), w = (weight[cc] || 0.15) / list.length;
      list.forEach(function (x) { pool.push({ x: x, k: -Math.log(1 - rnd()) / (w * (1 + Math.log(1 + x.pop) / 3)) }); });
    });
    pool.sort(function (a, b) { return a.k - b.k; });
    var now = Date.now();
    demoPins = pool.slice(0, n).map(function (o) {
      var x = o.x, big = x.pop > 2000 ? 9 : x.pop > 500 ? 4 : x.pop > 100 ? 1.6 : 0.5;
      return { country: x.c, region: x.r || null, city_id: x.id, lat: x.lat, lon: x.lon, n: 1 + Math.floor(-Math.log(1 - rnd()) * big * (weight[x.c] ? 1.5 : 0.6)), last: new Date(now - rnd() * 5184e6).toISOString() };
    });
    state.demo = demoPins.length;
    var t0 = window.performance.now();
    applyData(null);
    return { places: state.places, guests: state.total, countries: state.countries, drawMs: Math.round((window.performance.now() - t0) * 10) / 10 };
  }
  window.__map = {
    state: state,
    demo: demo,
    setView: setView,
    refresh: refresh,
    forget: function () { state.me = null; try { window.localStorage.removeItem(K_ME); } catch (e) { /* nothing saved */ } updateMeMark(); renderCta(); drawAll(); },
    store: Store,
    // How long painting takes, measured on spare canvases that paint without the graphics card (the slow case), in milliseconds.
    // land and pins = painting the still picture once. moving = one frame while the map moves (light land only; pins are not repainted).
    bench: function (rounds) {
      rounds = rounds || 5;
      var keepL = lctx, keepP = pctx, a = document.createElement('canvas'), b = document.createElement('canvas');
      a.width = b.width = landC.width; a.height = b.height = landC.height;
      lctx = a.getContext('2d', { willReadFrequently: true }); pctx = b.getContext('2d', { willReadFrequently: true });
      function avg(fn) {
        fn();
        var t0 = window.performance.now();
        for (var i = 0; i < rounds; i++) fn();
        lctx.getImageData(0, 0, 1, 1); pctx.getImageData(0, 0, 1, 1);
        return Math.round((window.performance.now() - t0) / rounds * 10) / 10;
      }
      var out = { places: places.length, land: avg(function () { drawLand(false); }), pins: avg(drawPins), moving: avg(function () { drawLand(true); syncPins(); placeMarks(); }) };
      lctx = keepL; pctx = keepP;
      return out;
    }
  };

  // ---------- go ----------
  try { if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'; } catch (e) { /* fine without */ }
  document.title = t('pageTitle');
  $('title').textContent = t('title');
  var logoImg = document.querySelector('#logo img');
  if (logoImg) logoImg.alt = t('logoAlt');
  if (kiosk) setupKiosk();
  state.me = kiosk ? null : readMe();
  renderRegions();
  renderCta();
  mark('aruba', 'aruba', ARUBA.lon, ARUBA.lat, [h('span', { class: 'dot' }), h('span', { class: 'name', label: t('aruba') })]);
  updateMeMark();
  resize();
  applyData(Store.current());     // pins from the last visit show at once
  refresh();
  Store.onChange(function () { applyData(Store.current()); });

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(resize, 30); });
  setInterval(function () { if (!document.hidden && state.screen === 'attract') refresh(); }, REFRESH_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && state.screen === 'attract') { resize(); refresh(); } });
})();
