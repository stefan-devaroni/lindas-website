/* Linda's Breakfast Rush: the game itself.
   Rules, levels, the cook, the guests, and drawing each frame.
   Screens and buttons live in ui.js; drawing helpers in art.js and scene.js. */
(function () {
  'use strict';
  var LBR = window.LBR = window.LBR || {};
  var A = LBR.Art, Snd = LBR.Sound, C = A.C;

  /* ---------- rules ---------- */

  var DISHES = {
    // sugar: powdered sugar goes on every pancake that has no savory topping (the owner's rule).
    plain: { label: 'PLAIN', name: 'Plain pancake', points: 200, sugar: true },
    banana: { label: 'BANANA', name: 'Banana pancake', points: 300, sugar: true },
    baconApple: { label: 'BACON APPLE', name: 'Bacon apple pancake', points: 400, sugar: false }
  };
  var RULES = {
    tipMax: 200,        // speed tip: full when served at once, nothing when patience is gone
    perfectFlip: 50,    // flip early in the flip window
    perfectZone: 0.4,   // the first 40% of the flip window counts as a good flip
    levelClear: 300,
    noWalkouts: 300,
    burnt: -100, wrong: -100, walkout: -150,
    portions: 4,        // one bowl of batter makes four pancakes
    crossTime: { portrait: 0.85, landscape: 1.15 }, // seconds for the cook to cross the floor (per layout, to keep phone and big screen equally hard)
    stars: [0.6, 0.82]  // share of the level's best possible score for 2 and 3 stars (1 star = level passed)
  };
  var T = { whisk: 1.5, chop: 1.0, prep: 2.0, sugar: 0.6, flip: 0.45, toppings: 3.0 };

  var LEVELS = [
    { n: 1, title: 'Opening time', orders: ['plain', 'plain', 'plain', 'plain'], goal: 3, pans: 1,
      patience: 85, gap: 22, maxOpen: 2, cookA: 5, flipWin: 6, cookB: 4, doneWin: 8, tempo: 100, guide: 'all',
      stations: ['flour', 'eggs', 'milk', 'bowl', 'pan1', 'sugar', 'pass', 'bin'] },
    { n: 2, title: 'Banana morning', orders: ['banana', 'plain', 'banana', 'plain', 'banana', 'plain'], goal: 4, pans: 1,
      patience: 74, gap: 17, maxOpen: 3, cookA: 5, flipWin: 5.5, cookB: 4, doneWin: 7, tempo: 104, guide: 'banana',
      stations: ['flour', 'eggs', 'milk', 'bowl', 'pan1', 'sugar', 'pass', 'bin', 'banana', 'board'] },
    { n: 3, title: 'Bacon and apple', orders: ['baconApple', 'plain', 'banana', 'baconApple', 'banana', 'plain'], goal: 4, pans: 1,
      patience: 80, gap: 15, maxOpen: 3, cookA: 5, flipWin: 5.5, cookB: 4, doneWin: 7, tempo: 108, guide: 'baconApple',
      stations: ['flour', 'eggs', 'milk', 'bowl', 'pan1', 'sugar', 'pass', 'bin', 'banana', 'board', 'apple', 'bacon'] },
    { n: 4, title: 'Two pans', orders: ['plain', 'banana', 'baconApple', 'plain', 'banana', 'baconApple', 'plain', 'banana'], goal: 5, pans: 2,
      patience: 68, gap: 10, maxOpen: 4, cookA: 4.5, flipWin: 5.5, cookB: 4, doneWin: 7.5, tempo: 112,
      stations: ['flour', 'eggs', 'milk', 'bowl', 'pan1', 'pan2', 'sugar', 'pass', 'bin', 'banana', 'board', 'apple', 'bacon'] },
    { n: 5, title: 'High season', orders: ['plain', 'banana', 'baconApple', 'plain', 'banana', 'baconApple', 'plain', 'banana', 'baconApple', 'plain'], goal: 7, pans: 2,
      patience: 56, gap: 8.5, maxOpen: 4, cookA: 4, flipWin: 4.6, cookB: 3.5, doneWin: 6.2, tempo: 124,
      stations: ['flour', 'eggs', 'milk', 'bowl', 'pan1', 'pan2', 'sugar', 'pass', 'bin', 'banana', 'board', 'apple', 'bacon'] }
  ];

  var LABELS = { flour: 'FLOUR', eggs: 'EGGS', milk: 'MILK', bowl: 'BOWL', pan1: 'PAN', pan2: 'PAN', sugar: 'SUGAR', pass: 'SERVE', bin: 'BIN', banana: 'BANANA', apple: 'APPLE', bacon: 'BACON', board: 'BOARD', iguana: '' };

  var GRID = {
    portrait: { cols: 4, rows: 5, cells: [
      ['flour', 'eggs', 'milk', 'bowl'],
      ['banana', null, null, 'pan1'],
      ['apple', null, null, 'pan2'],
      ['bacon', null, null, 'sugar'],
      ['board', 'bin', 'iguana', 'pass']] },
    landscape: { cols: 7, rows: 3, cells: [
      ['flour', 'eggs', 'milk', 'bowl', 'pan1', 'pan2', 'sugar'],
      [null, null, null, null, null, null, null],
      ['banana', 'apple', 'bacon', 'board', 'bin', 'iguana', 'pass']] }
  };

  var LINES = {
    tap: ['I supervise. It is a full-time job.', 'I do not flip. I watch.', 'One pancake. One flip.', 'Open since 2001. I keep count.', 'Closed on Sundays. I sleep in.', 'Eight to two. Then the beach.', 'An iguana never hurries. You should.', 'One big thin pancake. Never a stack.'],
    perfect: ['Clean flip.', 'Good flip.', 'That is how it is done.'],
    burnt: ['That one is for the bin.', 'Smells like trouble.', 'Too dark. Even for me.'],
    left: ['We lost one.', 'They walked. It happens.', 'Too slow. Next one.'],
    wrong: ['Nobody asked for that.', 'Wrong plate. Check the cards.'],
    fast: ['Fast hands.', 'They liked that.', 'Hot off the pan.'],
    start: ['Guests are waiting. Go.', 'Batter first. Always.', 'Kitchen is open.']
  };

  function maxLevelScore(cfg) {
    var sum = RULES.levelClear + RULES.noWalkouts;
    for (var i = 0; i < cfg.orders.length; i++) sum += DISHES[cfg.orders[i]].points + RULES.tipMax + RULES.perfectFlip;
    return sum;
  }
  var MAX_TOTAL = 0;
  LEVELS.forEach(function (l) { l.max = maxLevelScore(l); MAX_TOTAL += l.max; });

  /* ---------- state ---------- */

  var canvas = null, g = null;
  var view = { w: 800, h: 600, dpr: 1, safeTop: 0, safeBottom: 0 };
  var layout = null, bgBack = null, bgFront = null, frontRect = null;
  var hooks = {};
  var S = {
    screen: 'title',      // title | intro | play | result | other (name, end, reward: set by ui.js)
    scene: 'facade',      // facade | kitchen
    paused: false,
    time: 0,              // seconds of animation time
    run: null, level: null,
    cook: null, bowl: null, pans: [], board: null, tickets: [],
    hint: null, pop: {}, fx: { parts: [], pops: [], ripples: [], fly: [] },
    iguana: { text: '', t: 0, mood: null, cool: 0 },
    shake: 0, binOpen: 0, bellRing: 0, ids: 0, lastTap: { id: null, at: 0 },
    bot: { on: false, delay: 0.8, timer: 0 },
    reduced: false, kiosk: false, speed: 1
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function isOpen(tk) { return tk.state === 'open'; }
  function active(id) { return id === 'iguana' || (S.level && S.level.cfg.stations.indexOf(id) !== -1); }
  function panById(id) { for (var i = 0; i < S.pans.length; i++) if (S.pans[i].id === id) return S.pans[i]; return null; }
  // Which pancake a plate is, going by what is on it.
  function kindOf(h) { return h.base === 'baconApple' ? 'baconApple' : h.banana ? 'banana' : 'plain'; }
  // The same, but only once it is finished: a pancake that still needs its powdered sugar is 'bare' (nothing on it yet)
  // or 'bananaBare' (banana slices on, sugar still to come).
  function dishKey(h) {
    var kind = kindOf(h);
    if (!DISHES[kind].sugar || h.sugar) return kind;
    return kind === 'banana' ? 'bananaBare' : 'bare';
  }

  /* ---------- layout ---------- */

  function computeLayout() {
    var W = view.w, H = view.h, best = null;
    var hudH = Math.round(clamp(H * 0.07, 46, 84)) + view.safeTop;
    ['portrait', 'landscape'].forEach(function (kind) {
      var G = GRID[kind];
      var bandH = clamp(H * 0.19, 100, 240), stripH = clamp(H * 0.055, 30, 110), padB = 4 + view.safeBottom;
      var availH = H - hudH - bandH - stripH - padB;
      var cw = W / G.cols, ch = availH / G.rows;
      if (cw > ch * 1.45) cw = ch * 1.45;
      if (ch > cw * 1.3) ch = cw * 1.3;
      var u = Math.min(cw, ch);
      if (!best || u > best.u) best = { kind: kind, G: G, u: u, cw: cw, ch: ch, bandH: bandH, stripH: stripH, availH: availH };
    });
    var L = best, G = L.G, u = L.u;
    var extra = Math.max(0, L.availH - L.ch * G.rows);
    var bandH = L.bandH + Math.min(extra * 0.45, Math.max(0, u * 1.9 - L.bandH));
    var stripH = L.stripH + (extra - (bandH - L.bandH));
    var kw = L.cw * G.cols, kx = Math.round((W - kw) / 2), ky = hudH + bandH + stripH;
    var out = {
      kind: L.kind, u: u, cw: L.cw, ch: L.ch, hudH: hudH, W: W, H: H,
      band: { x: 0, y: hudH, w: W, h: bandH },
      strip: { x: 0, y: hudH + bandH, w: W, h: stripH },
      kitchen: { x: kx, y: ky, w: kw, h: L.ch * G.rows },
      cells: {}, stand: {}, slots: [], posts: []
    };
    var fr0 = 99, fr1 = -1, fc0 = 99, fc1 = -1, r, c;
    for (r = 0; r < G.rows; r++) for (c = 0; c < G.cols; c++) if (!G.cells[r][c]) { fr0 = Math.min(fr0, r); fr1 = Math.max(fr1, r); fc0 = Math.min(fc0, c); fc1 = Math.max(fc1, c); }
    out.floor = { x: kx + fc0 * L.cw, y: ky + fr0 * L.ch, w: (fc1 - fc0 + 1) * L.cw, h: (fr1 - fr0 + 1) * L.ch };
    out.fh = Math.round(u * 0.26);
    for (r = 0; r < G.rows; r++) for (c = 0; c < G.cols; c++) {
      var id = G.cells[r][c]; if (!id) continue;
      var front = r === G.rows - 1 || !G.cells[r + 1][c];
      var cell = { id: id, row: r, col: c, x: kx + c * L.cw, y: ky + r * L.ch, w: L.cw, h: L.ch, front: front, layer: r > fr1 ? 'front' : 'back' };
      cell.cx = cell.x + cell.w / 2;
      cell.cy = front ? cell.y + (cell.h - out.fh) * 0.5 : cell.y + cell.h * 0.5 - u * 0.05;
      out.cells[id] = cell;
      var f = out.floor, mx = u * 0.32, top = f.y + u * 0.42, bot = f.y + f.h - u * 0.05;
      if (r < fr0) out.stand[id] = { x: clamp(cell.cx, f.x + mx, f.x + f.w - mx), y: top, dir: 'up' };
      else if (r > fr1) out.stand[id] = { x: clamp(cell.cx, f.x + mx, f.x + f.w - mx), y: bot, dir: 'down' };
      else if (c < fc0) out.stand[id] = { x: f.x + mx, y: clamp(cell.y + cell.h * 0.8, top, bot), dir: 'left' };
      else out.stand[id] = { x: f.x + f.w - mx, y: clamp(cell.y + cell.h * 0.8, top, bot), dir: 'right' };
    }
    // the strip of entrance where guests wait: posts with tulips, four places on the bench
    var pw = clamp(bandH * 0.17, 16, 46), gap = Math.max(4, bandH * 0.04);
    var slotsX = pw + gap * 1.5, slotW;
    if (L.kind === 'portrait') {
      slotW = (W - 2 * slotsX) / 4;
      out.posts = [{ x: gap * 0.5, w: pw, purple: false }, { x: W - pw - gap * 0.5, w: pw, purple: true }];
      out.bandRight = null;
    } else {
      slotW = Math.min(bandH * 0.9, (W * 0.62 - 2 * pw) / 4);
      var midX = slotsX + slotW * 4 + gap;
      out.posts = [{ x: gap * 0.5, w: pw, purple: false }, { x: midX, w: pw, purple: true }, { x: W - pw - gap * 0.5, w: pw, purple: false }];
      out.bandRight = { x: midX + pw, w: W - pw - gap * 0.5 - (midX + pw) };
    }
    for (var i = 0; i < 4; i++) out.slots.push({ x: slotsX + i * slotW, y: hudH + bandH * 0.08, w: slotW, h: bandH * 0.92 });
    out.slotsX = slotsX; out.slotsW = slotW * 4;
    return out;
  }

  function makeCanvas(w, h) { var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * view.dpr)); cv.height = Math.max(1, Math.round(h * view.dpr)); return cv; }

  var STATIC_ART = { flour: A.flour, eggs: A.eggs, milk: A.milk, sugar: A.sugar, banana: A.bananas, apple: A.apples, bacon: A.baconTray };

  // Everything that does not move is drawn once here and reused every frame.
  function renderStatic() {
    if (!layout) return;
    var W = view.w, H = view.h, u = layout.u, k = layout.kitchen, b;
    bgBack = makeCanvas(W, H);
    b = bgBack.getContext('2d'); b.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    b.fillStyle = C.navy; b.fillRect(0, 0, W, H);
    A.entranceBand(b, 0, layout.band.y, W, layout.band.h, { u: u, slotsX: layout.slotsX, slotsW: layout.slotsW, right: layout.bandRight });
    A.entrancePosts(b, layout.band.y, layout.band.h, layout.posts, 0);
    // kitchen: Delft tile wall, then the floor
    var tile = clamp(u * 0.42, 22, 96);
    A.wall(b, 0, layout.strip.y, W, layout.strip.h, tile);
    b.fillStyle = '#FFFFFF'; b.fillRect(0, layout.strip.y, W, Math.max(2, u * 0.03));
    b.fillStyle = 'rgba(40,34,4,0.25)'; b.fillRect(0, layout.strip.y - 1, W, 1.5);
    b.fillStyle = C.blue; b.fillRect(0, k.y, W, H - k.y);
    A.floor(b, k.x, k.y, k.w, H - k.y, u * 0.5);
    if (k.x > 1) { // side gutters on very wide screens: tall blue cabinets
      b.fillStyle = C.blue; b.fillRect(0, k.y, k.x, H - k.y); b.fillRect(k.x + k.w, k.y, W - k.x - k.w, H - k.y);
      b.fillStyle = 'rgba(0,78,173,0.3)'; b.fillRect(k.x - 2, k.y, 2, H - k.y); b.fillRect(k.x + k.w, k.y, 2, H - k.y);
    }
    // front row gets its own layer so the cook can stand behind it
    var fy = layout.floor.y + layout.floor.h;
    frontRect = { x: 0, y: fy, w: W, h: H - fy };
    bgFront = makeCanvas(frontRect.w, frontRect.h);
    var f = bgFront.getContext('2d'); f.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); f.translate(-frontRect.x, -frontRect.y);
    for (var id in layout.cells) {
      var c = layout.cells[id], ctx2 = c.layer === 'front' ? f : b, on = active(id);
      if (id === 'bin') {
        if (c.layer === 'front') A.floor(ctx2, c.x, c.y, c.w, c.h, u * 0.5);
        ctx2.fillStyle = 'rgba(40,34,4,0.1)'; ctx2.fillRect(c.x, c.y, c.w, c.h);
        continue;
      }
      A.counter(ctx2, c.x, c.y, c.w, c.h, { u: u, front: c.front, label: on ? LABELS[id] : '', dim: !on });
      if (on && STATIC_ART[id]) STATIC_ART[id](ctx2, c.cx, c.cy, u);
    }
    // a strip of floor shadow under the back counters
    b.fillStyle = 'rgba(40,34,4,0.12)'; b.fillRect(layout.floor.x, layout.floor.y, layout.floor.w, Math.max(2, u * 0.04));
  }

  function resize(w, h, safeTop, safeBottom) {
    var hadCook = S.cook && layout, nx = 0.5, ny = 0.5;
    if (hadCook) { nx = (S.cook.x - layout.floor.x) / layout.floor.w; ny = (S.cook.y - layout.floor.y) / layout.floor.h; }
    view.w = Math.max(240, Math.round(w)); view.h = Math.max(240, Math.round(h));
    view.safeTop = safeTop || 0; view.safeBottom = safeBottom || 0;
    view.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1, Math.sqrt(3400000 / (view.w * view.h))));
    canvas.width = Math.round(view.w * view.dpr); canvas.height = Math.round(view.h * view.dpr);
    layout = computeLayout();
    if (hadCook) { S.cook.x = layout.floor.x + nx * layout.floor.w; S.cook.y = layout.floor.y + ny * layout.floor.h; }
    renderStatic();
    if (hooks.onLayout) hooks.onLayout(layout);
  }

  /* ---------- runs and levels ---------- */

  function newRun(startLevel) {
    S.run = { levelScores: [0, 0, 0, 0, 0], stars: [0, 0, 0, 0, 0], completed: 0, failScore: 0, won: false, submitted: false, name: '', startLevel: startLevel || 1 };
    prepareLevel(startLevel || 1);
  }
  function runTotal() {
    if (!S.run) return 0;
    var sum = S.run.failScore || 0;
    for (var i = 0; i < 5; i++) sum += S.run.levelScores[i];
    return Math.min(MAX_TOTAL, Math.max(0, Math.round(sum)));
  }

  function shuffle(a, from) {
    for (var i = a.length - 1; i > from; i--) { var j = from + Math.floor(Math.random() * (i - from + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function prepareLevel(n) {
    var cfg = LEVELS[clamp(n, 1, 5) - 1];
    if (!S.run) S.run = { levelScores: [0, 0, 0, 0, 0], stars: [0, 0, 0, 0, 0], completed: 0, failScore: 0, won: false, submitted: false, name: '', startLevel: n };
    S.run.failScore = 0;
    S.level = {
      cfg: cfg, t: 0, orders: shuffle(cfg.orders.slice(), cfg.n === 1 ? 99 : 1), spawned: 0, nextArrival: 1.2,
      served: 0, lost: 0, score: 0, over: false, passed: false, endTimer: 0, reported: false,
      stats: { base: 0, tips: 0, perfect: 0, burnt: 0, wrong: 0, walkouts: 0 },
      guide: !!cfg.guide, guideDish: cfg.guide && cfg.guide !== 'all' ? cfg.guide : null
    };
    S.bowl = { flour: false, eggs: false, milk: false, whisk: -1, batter: 0, portions: RULES.portions };
    S.pans = [];
    for (var i = 1; i <= cfg.pans; i++) S.pans.push({ id: 'pan' + i, state: 'empty', t: 0, dur: 0, bacon: false, apple: false, top: false, flipped: false, flipAnim: -1, seed: 7, steam: 0 });
    S.board = { item: null, prog: -1 };
    S.tickets = [];
    S.fx = { parts: [], pops: [], ripples: [], fly: [] };
    S.pop = {}; S.hint = null; S.shake = 0; S.binOpen = 0; S.bellRing = 0;
    S.iguana = { text: '', t: 0, mood: null, cool: 0 };
    var st = layout.stand.bowl;
    S.cook = { x: layout.floor.x + layout.floor.w / 2, y: clamp(layout.floor.y + layout.floor.h * 0.6, st.y, layout.floor.y + layout.floor.h), dir: 'down', hold: null, target: null, queue: [], busy: null, walk: 0, moving: false, bubble: null };
    S.scene = 'kitchen'; S.screen = 'intro'; S.paused = false;
    S.bot.timer = 0.5;
    renderStatic();
    pushHud();
    if (hooks.onIntro) hooks.onIntro(levelInfo(cfg));
  }

  function levelInfo(cfg) {
    return { n: cfg.n, title: cfg.title, guests: cfg.orders.length, goal: cfg.goal, pans: cfg.pans, max: cfg.max };
  }

  function beginLevel() {
    if (!S.level || S.screen !== 'intro') return;
    S.screen = 'play'; S.paused = false;
    Snd.play('start'); Snd.musicStart(S.level.cfg.tempo);
    iguanaSay(pick(LINES.start), null, true);
    pushHud();
  }

  function addScore(delta) {
    var L = S.level; L.score = Math.max(0, L.score + delta); pushHud();
  }
  function pushHud() {
    if (!hooks.onHud || !S.level) return;
    var L = S.level;
    hooks.onHud({ level: L.cfg.n, score: L.score, total: runBase() + L.score, served: L.served, goal: L.cfg.goal, lost: L.lost, guests: L.cfg.orders.length });
  }
  function runBase() { var s = 0; if (S.run) for (var i = 0; i < 5; i++) if (!S.level || i !== S.level.cfg.n - 1) s += S.run.levelScores[i]; return s; }

  function endLevel(passed) {
    var L = S.level; if (L.over) return;
    L.over = true; L.passed = passed; L.endTimer = 1.4;
    S.cook.queue = []; S.cook.target = null;
    Snd.setSizzle(0); Snd.musicStop(); lastSizzle = 0;
    Snd.play(passed ? 'win' : 'fail');
  }

  function finishLevel() {
    var L = S.level, cfg = L.cfg, R = S.run;
    var bonus = 0;
    if (L.passed) { bonus += RULES.levelClear; if (L.lost === 0) bonus += RULES.noWalkouts; }
    var score = Math.max(0, Math.round(L.score + bonus));
    var stars = 0;
    if (L.passed) { var ratio = score / cfg.max; stars = ratio >= RULES.stars[1] ? 3 : ratio >= RULES.stars[0] ? 2 : 1; }
    if (L.passed) {
      R.levelScores[cfg.n - 1] = score; R.stars[cfg.n - 1] = stars; R.completed = Math.max(R.completed, cfg.n); R.failScore = 0;
      if (cfg.n === 5) R.won = true;
    } else {
      R.failScore = score;
    }
    S.screen = 'result';
    var result = {
      level: cfg.n, title: cfg.title, passed: L.passed, served: L.served, guests: cfg.orders.length, goal: cfg.goal, lost: L.lost,
      base: L.stats.base, tips: L.stats.tips, perfect: L.stats.perfect, perfectPoints: L.stats.perfect * RULES.perfectFlip,
      burnt: L.stats.burnt, burntPoints: L.stats.burnt * RULES.burnt, wrong: L.stats.wrong, wrongPoints: L.stats.wrong * RULES.wrong,
      walkouts: L.stats.walkouts, walkoutPoints: L.stats.walkouts * RULES.walkout,
      bonus: bonus, score: score, stars: stars, total: runTotal(), last: cfg.n === 5, won: R.won
    };
    if (hooks.onLevelEnd) hooks.onLevelEnd(result);
    return result;
  }

  /* ---------- guests ---------- */

  function freeSlot() {
    for (var i = 0; i < 4; i++) { var used = false; for (var j = 0; j < S.tickets.length; j++) if (S.tickets[j].slot === i) used = true; if (!used) return i; }
    return -1;
  }
  function spawnGuest() {
    var L = S.level, slot = freeSlot(); if (slot < 0) return;
    var dish = L.orders[L.spawned++];
    S.tickets.push({ id: ++S.ids, dish: dish, max: L.cfg.patience, t: L.cfg.patience, age: 0, slot: slot, state: 'open', anim: 0, enter: 0, warned: false, look: A.makeLook(Math.floor(Math.random() * 1e9)) });
    L.nextArrival = L.t + L.cfg.gap * (0.9 + Math.random() * 0.2);
    Snd.play('ticket');
  }
  function slotCenter(tk) { var s = layout.slots[tk.slot]; return { x: s.x + s.w / 2, y: s.y + s.h * 0.55 }; }

  function serve(tk, plate) {
    var L = S.level, d = DISHES[tk.dish];
    var tip = Math.round(RULES.tipMax * clamp(tk.t / tk.max, 0, 1) / 10) * 10;
    L.served++; L.stats.base += d.points; L.stats.tips += tip;
    tk.state = 'served'; tk.anim = 0;
    var from = layout.cells.pass, to = slotCenter(tk);
    S.fx.fly.push({ x0: from.cx, y0: from.cy, x1: to.x, y1: to.y, t: 0, plate: plate });
    popup('+' + (d.points + tip), to.x, to.y - layout.u * 0.2, C.navy);
    S.bellRing = 1;
    Snd.play('serve'); if (tip >= RULES.tipMax * 0.5) Snd.play('tip');
    addScore(d.points + tip);
    if (tip >= RULES.tipMax * 0.75) iguanaSay(pick(LINES.fast), 'happy');
    if (L.guideDish && tk.dish === L.guideDish) { L.guide = false; S.hint = null; say('Got it. No more hints'); }
  }
  function guestLeaves(tk) {
    var L = S.level;
    tk.state = 'left'; tk.anim = 0;
    L.lost++; L.stats.walkouts++;
    var p = slotCenter(tk); popup(String(RULES.walkout), p.x, p.y, C.bad);
    Snd.play('leave'); S.shake = Math.max(S.shake, 0.5);
    iguanaSay(pick(LINES.left), 'sad');
    addScore(RULES.walkout);
  }

  function updateGuests(dt) {
    var L = S.level, i, tk, open = 0;
    for (i = 0; i < S.tickets.length; i++) if (isOpen(S.tickets[i])) open++;
    if (!L.over && L.spawned < L.orders.length) {
      if (open === 0 && L.nextArrival > L.t + 1.2) L.nextArrival = L.t + 1.2;
      if (L.t >= L.nextArrival && open < L.cfg.maxOpen && freeSlot() >= 0) spawnGuest();
    }
    for (i = S.tickets.length - 1; i >= 0; i--) {
      tk = S.tickets[i];
      if (tk.enter < 1) tk.enter = Math.min(1, tk.enter + dt / 0.35);
      if (tk.state === 'open') {
        if (L.over) continue;
        tk.age += dt;
        if (tk.age > 0.8) tk.t -= dt;
        if (tk.t <= 0) guestLeaves(tk);
        else if (!tk.warned && tk.t / tk.max < 0.25) { tk.warned = true; Snd.play('warn'); }
      } else {
        tk.anim += dt / (tk.state === 'served' ? 1.5 : 0.9);
        if (tk.anim >= 1) S.tickets.splice(i, 1);
      }
    }
    if (!L.over) {
      if (L.lost > L.cfg.orders.length - L.cfg.goal) endLevel(false);
      else if (L.spawned >= L.orders.length && open === 0) {
        var pending = false; for (i = 0; i < S.tickets.length; i++) if (isOpen(S.tickets[i])) pending = true;
        if (!pending) endLevel(L.served >= L.cfg.goal);
      }
    } else if (!L.reported) {
      L.endTimer -= dt;
      if (L.endTimer <= 0) { L.reported = true; finishLevel(); }
    }
  }

  /* ---------- the cook ---------- */

  function say(text, t) { S.cook.bubble = { text: text, t: t || 1.9 }; }
  function nope(text) { say(text); Snd.play('nope'); S.cook.queue = []; }
  function busy(type, dur, st, done) { S.cook.busy = { type: type, t: 0, dur: dur, st: st, done: done }; }
  function iguanaSay(text, mood, force) {
    var ig = S.iguana; if (!force && ig.cool > 0) return;
    ig.text = text; ig.t = 2.6; ig.mood = mood || null; ig.cool = 6;
  }
  function popup(text, x, y, color) { S.fx.pops.push({ text: text, x: x, y: y, t: 0, color: color || C.navy }); }
  function puff(x, y, color, n, spread) {
    if (S.reduced) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) S.fx.parts.push({ x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread * 0.5, vx: (Math.random() - 0.5) * spread * 1.6, vy: -Math.random() * spread * 1.4 - spread * 0.3, life: 0, max: 0.5 + Math.random() * 0.4, size: layout.u * (0.02 + Math.random() * 0.03), color: color, grow: 1.5 });
  }

  function cookSpeed() { return Math.max(layout.floor.w, layout.floor.h) / (RULES.crossTime[layout.kind] || 1.15); }

  function updateCook(dt) {
    var ck = S.cook;
    if (ck.bubble) { ck.bubble.t -= dt; if (ck.bubble.t <= 0) ck.bubble = null; }
    if (ck.busy) {
      var bz = ck.busy; bz.t += dt;
      var frac = Math.min(1, bz.t / bz.dur);
      if (bz.type === 'whisk') S.bowl.whisk = frac;
      else if (bz.type === 'chop' || bz.type === 'prep') S.board.prog = frac;
      else if (bz.type === 'sugar' && Math.random() < 0.5) { var sc = layout.cells.sugar; puff(ck.x, ck.y - layout.u * 0.4, '#FFFFFF', 1, layout.u * 0.2); if (sc) S.pop.sugar = 0.5; }
      if (bz.t >= bz.dur) { ck.busy = null; bz.done(); }
      ck.moving = false;
      return;
    }
    if (!ck.target && ck.queue.length) ck.target = ck.queue.shift();
    if (ck.target) {
      var sp = layout.stand[ck.target], dx = sp.x - ck.x, dy = sp.y - ck.y, d = Math.sqrt(dx * dx + dy * dy), step = cookSpeed() * dt;
      if (d <= step) {
        ck.x = sp.x; ck.y = sp.y; ck.dir = sp.dir; ck.moving = false;
        var id = ck.target; ck.target = null;
        interact(id);
      } else {
        ck.x += dx / d * step; ck.y += dy / d * step; ck.moving = true; ck.walk += dt * 15;
        ck.dir = Math.abs(dx) > Math.abs(dy) * 0.8 ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      }
    } else ck.moving = false;
  }

  function interact(id) {
    var ck = S.cook, h = ck.hold;
    if (!active(id)) return;
    S.pop[id] = 1;
    switch (id) {
      case 'flour': case 'eggs': case 'milk': case 'banana': case 'apple': case 'bacon':
        if (!h) { ck.hold = { type: id }; Snd.play('pick'); }
        else if (h.type === id) { ck.hold = null; Snd.play('drop'); }
        else nope('Hands full');
        return;
      case 'bowl': useBowl(); return;
      case 'pan1': case 'pan2': usePan(panById(id)); return;
      case 'sugar': useSugar(); return;
      case 'board': useBoard(); return;
      case 'pass': usePass(); return;
      case 'bin': useBin(); return;
    }
  }

  function useBowl() {
    var ck = S.cook, h = ck.hold, b = S.bowl, c = layout.cells.bowl;
    if (h && (h.type === 'flour' || h.type === 'eggs' || h.type === 'milk')) {
      if (b.batter > 0) return nope('Use up the batter first');
      if (b[h.type]) return nope('That is already in');
      b[h.type] = true; ck.hold = null; Snd.play('plop');
      if (h.type === 'flour') puff(c.cx, c.cy - layout.u * 0.1, '#FFFFFF', 8, layout.u * 0.3);
      return;
    }
    if (h && h.type === 'ladle') { b.batter = Math.min(RULES.portions, b.batter + 1); ck.hold = null; Snd.play('plop'); return; }
    if (h) return nope('Hands full');
    if (b.batter > 0) { b.batter--; ck.hold = { type: 'ladle' }; Snd.play('pick'); return; }
    if (b.flour && b.eggs && b.milk) {
      Snd.play('whisk'); b.whisk = 0;
      busy('whisk', T.whisk, 'bowl', function () { b.flour = b.eggs = b.milk = false; b.whisk = -1; b.batter = RULES.portions; Snd.play('ready'); S.pop.bowl = 1; });
      return;
    }
    var miss = []; if (!b.flour) miss.push('flour'); if (!b.eggs) miss.push('eggs'); if (!b.milk) miss.push('milk');
    nope('Needs ' + (miss.length === 3 ? 'flour, eggs and milk' : miss.join(' and ')));
  }

  function resetPan(p) { p.state = 'empty'; p.t = 0; p.dur = 0; p.bacon = p.apple = p.top = p.flipped = false; p.flipAnim = -1; }
  function pour(p) {
    var cfg = S.level.cfg;
    S.cook.hold = null;
    p.top = p.state === 'topReady'; p.state = 'sideA'; p.t = 0; p.dur = cfg.cookA; p.flipped = false; p.flipAnim = -1;
    p.seed = 1 + Math.floor(Math.random() * 900);
    Snd.play('pour');
  }
  function doFlip(p) {
    // A good flip pays once per guest at most, so cooking spare pancakes cannot push a score past the level's maximum.
    var L = S.level, c = layout.cells[p.id], good = p.t / p.dur <= RULES.perfectZone && L.stats.perfect < L.cfg.orders.length;
    p.state = 'sideB'; p.t = 0; p.dur = L.cfg.cookB; p.flipped = true; p.flipAnim = 0;
    Snd.play('flip');
    busy('flip', T.flip, p.id, function () {
      if (good) { L.stats.perfect++; popup('+' + RULES.perfectFlip, c.cx, c.cy - layout.u * 0.3, C.good); Snd.play('perfect'); addScore(RULES.perfectFlip); iguanaSay(pick(LINES.perfect), 'happy'); }
    });
  }
  function usePan(p) {
    var ck = S.cook, h = ck.hold;
    if (!p) return;
    if (p.state === 'flip') return doFlip(p);
    if (p.state === 'sideA') return nope('Not yet. Wait for the ring');
    if (p.state === 'sideB') return nope('Almost. Wait for the ring');
    if (p.state === 'done') {
      if (h) return nope('Hands full');
      ck.hold = { type: 'plate', base: p.top ? 'baconApple' : 'plain', sugar: false, banana: false, seed: p.seed };
      resetPan(p); Snd.play('pick'); return;
    }
    if (p.state === 'burnt') {
      if (h) return nope('Hands full');
      ck.hold = { type: 'burnt' }; resetPan(p); Snd.play('pick'); return;
    }
    if (p.state === 'topCook' || p.state === 'topReady') {
      if (h && h.type === 'ladle') {
        if (p.state === 'topCook') { busy('wait', Math.max(0.05, p.dur - p.t + 0.02), p.id, function () { if (p.state === 'topReady' && S.cook.hold && S.cook.hold.type === 'ladle') pour(p); }); return; }
        return pour(p);
      }
      return nope('Pour batter over it');
    }
    // an empty pan, or one with only bacon or only apple rings in it
    if (!h) {
      // a pan with only one topping in it can be cleared again: take the topping back out
      if (p.bacon) { p.bacon = false; ck.hold = { type: 'bacon' }; Snd.play('pick'); return; }
      if (p.apple) { p.apple = false; ck.hold = { type: 'appleRings' }; Snd.play('pick'); return; }
      return nope('Bring a ladle of batter');
    }
    if (h.type === 'ladle') {
      if (p.bacon || p.apple) return nope(p.bacon ? 'Apple rings first' : 'Bacon first');
      return pour(p);
    }
    if (h.type === 'bacon' || h.type === 'appleRings') {
      var key = h.type === 'bacon' ? 'bacon' : 'apple';
      if (p[key]) return nope('Already in the pan');
      p[key] = true; ck.hold = null; Snd.play('sizzleIn');
      if (p.bacon && p.apple) { p.state = 'topCook'; p.t = 0; p.dur = T.toppings; }
      return;
    }
    if (h.type === 'apple') return nope('Slice it at the board first');
    if (h.type === 'banana' || h.type === 'bananaSlices') return nope('Banana goes on top, at the end');
    if (h.type === 'plate' || h.type === 'burnt') return nope('That does not go back in');
    nope('That goes in the bowl');
  }

  function useSugar() {
    var h = S.cook.hold;
    if (!h || h.type !== 'plate') return nope('Bring a plated pancake');
    if (!DISHES[kindOf(h)].sugar) return nope('No sugar on a savory pancake');
    if (h.sugar) return nope('Already dusted');
    Snd.play('sugar');
    busy('sugar', T.sugar, 'sugar', function () { h.sugar = true; });
  }

  function useBoard() {
    var ck = S.cook, h = ck.hold, b = S.board, hasApple = active('apple');
    if (h && h.type === 'banana') {
      if (b.item) return nope('The board is full');
      ck.hold = null; b.item = 'banana'; b.prog = 0; Snd.play('chop');
      busy('chop', T.chop, 'board', function () { b.item = 'bananaSlices'; b.prog = -1; }); return;
    }
    if (h && h.type === 'apple') {
      if (b.item) return nope('The board is full');
      ck.hold = null; b.item = 'apple'; b.prog = 0; Snd.play('peel');
      busy('prep', T.prep, 'board', function () { b.item = 'appleRings'; b.prog = -1; }); return;
    }
    if (h && h.type === 'plate') {
      if (b.item === 'bananaSlices') {
        if (h.base === 'baconApple') return nope('No banana on bacon apple');
        if (h.sugar) return nope('Banana goes on before the sugar');
        if (h.banana) return nope('Already has banana');
        h.banana = true; b.item = null; Snd.play('plop'); return;
      }
      return nope(b.item === 'appleRings' ? 'Apple rings go in the pan' : 'Slice a banana first');
    }
    if (h && (h.type === 'bananaSlices' || h.type === 'appleRings')) {
      if (b.item) return nope('The board is full');
      b.item = h.type; ck.hold = null; Snd.play('drop'); return;
    }
    if (h) return nope(h.type === 'bacon' ? 'Bacon goes straight in the pan' : 'That does not go on the board');
    if (b.item === 'bananaSlices' || b.item === 'appleRings') { ck.hold = { type: b.item }; b.item = null; Snd.play('pick'); return; }
    nope(hasApple ? 'Bring a banana or an apple' : 'Bring a banana');
  }

  function usePass() {
    var ck = S.cook, h = ck.hold, L = S.level, c = layout.cells.pass;
    if (!h || h.type !== 'plate') return nope(h && h.type === 'burnt' ? 'Burnt goes in the bin' : 'Bring a finished pancake');
    var key = dishKey(h);
    if (key === 'bare') return nope(active('banana') ? 'Finish it first: sugar, or banana then sugar' : 'Dust it with sugar first');
    if (key === 'bananaBare') return nope('Dust it with sugar first');
    var best = null;
    for (var i = 0; i < S.tickets.length; i++) { var tk = S.tickets[i]; if (isOpen(tk) && tk.dish === key && (!best || tk.t / tk.max < best.t / best.max)) best = tk; }
    ck.hold = null;
    if (!best) {
      L.stats.wrong++; popup(String(RULES.wrong), c.cx, c.cy - layout.u * 0.3, C.bad);
      Snd.play('wrong'); say('Nobody ordered that'); iguanaSay(pick(LINES.wrong), 'sad'); ck.queue = [];
      addScore(RULES.wrong);
      return;
    }
    serve(best, h);
  }

  function useBin() {
    var ck = S.cook;
    if (!ck.hold) return nope('Nothing to bin');
    ck.hold = null; S.binOpen = 1; Snd.play('bin');
  }

  /* ---------- pans ---------- */

  var lastSizzle = 0;
  function burn(p) {
    var L = S.level, c = layout.cells[p.id];
    p.state = 'burnt'; p.t = 0;
    L.stats.burnt++; popup(String(RULES.burnt), c.cx, c.cy - layout.u * 0.3, C.bad);
    Snd.play('burn'); S.shake = Math.max(S.shake, 1);
    iguanaSay(pick(LINES.burnt), 'sad');
    addScore(RULES.burnt);
  }
  function updatePans(dt) {
    var cfg = S.level.cfg, sizz = 0;
    for (var i = 0; i < S.pans.length; i++) {
      var p = S.pans[i], c = layout.cells[p.id], hot = false;
      if (p.flipAnim >= 0) { p.flipAnim += dt / 0.5; if (p.flipAnim >= 1) p.flipAnim = -1; }
      switch (p.state) {
        case 'topCook': p.t += dt; hot = true; if (p.t >= p.dur) { p.state = 'topReady'; p.t = 0; Snd.play('ding'); } break;
        case 'topReady': hot = true; break;
        case 'sideA': p.t += dt; hot = true; if (p.t >= p.dur) { p.state = 'flip'; p.t = 0; p.dur = cfg.flipWin; Snd.play('ding'); } break;
        case 'flip': p.t += dt; hot = true; if (p.t >= p.dur) burn(p); break;
        case 'sideB': p.t += dt; hot = true; if (p.t >= p.dur) { p.state = 'done'; p.t = 0; p.dur = cfg.doneWin; Snd.play('ready'); } break;
        case 'done': p.t += dt; hot = true; if (p.t >= p.dur) burn(p); break;
      }
      if (hot) sizz++;
      p.steam -= dt;
      if (p.steam <= 0 && (hot || p.state === 'burnt') && !S.reduced) {
        p.steam = p.state === 'burnt' ? 0.12 : 0.3;
        S.fx.parts.push({ x: c.cx + (Math.random() - 0.5) * layout.u * 0.3, y: c.cy - layout.u * 0.05, vx: (Math.random() - 0.5) * layout.u * 0.1, vy: -layout.u * (0.25 + Math.random() * 0.2), life: 0, max: 0.9 + Math.random() * 0.5, size: layout.u * 0.05, color: p.state === 'burnt' ? 'rgba(60,50,40,' : 'rgba(255,255,255,', grow: 2.4, soft: true });
      }
    }
    if (S.level.over) sizz = 0;
    if (sizz !== lastSizzle) { lastSizzle = sizz; Snd.setSizzle(sizz); }
  }

  /* ---------- the hint engine ----------
     Works out the sensible next tap. It drives the yellow arrow in the guided levels
     and the test bot (window.__game.bot / sim). */
  function advise() {
    var L = S.level, ck = S.cook, h = ck.hold, b = S.bowl, bd = S.board, pans = S.pans, i;
    var open = S.tickets.filter(isOpen).sort(function (x, y) { return x.t / x.max - y.t / y.max; });
    var want = { plain: 0, banana: 0, baconApple: 0 };
    open.forEach(function (tk) { want[tk.dish]++; });
    var guestsLeft = L.orders.length - L.spawned;
    function P(fn) { for (var k = 0; k < pans.length; k++) if (fn(pans[k])) return pans[k]; return null; }
    function go(st, text) { return { st: st, text: text }; }
    function wait(text) { return { st: null, text: text }; }
    function clean(q) { return q.state === 'empty' && !q.bacon && !q.apple; }
    var boardFree = bd.item == null && bd.prog < 0;
    var plainOnWay = 0, baOnWay = 0;
    pans.forEach(function (q) {
      if (q.state === 'burnt') return;
      if (q.state === 'empty') { if (q.bacon || q.apple) baOnWay++; return; }
      if (q.top || q.state === 'topCook' || q.state === 'topReady') baOnWay++; else plainOnWay++;
    });
    var freePan = P(clean);

    function makeBatter() {
      if (b.whisk >= 0) return wait('Whisking');
      if (!b.flour) return go('flour', 'Take the flour');
      if (!b.eggs) return go('eggs', 'Take the eggs');
      if (!b.milk) return go('milk', 'Take the milk');
      return go('bowl', 'Whisk it into batter');
    }
    function getBatter() { return b.batter > 0 ? go('bowl', 'Take a ladle of batter') : makeBatter(); }
    function appleStep() {
      if (bd.item === 'appleRings') return go('board', 'Take the apple rings');
      if (bd.prog >= 0) return wait('Slicing');
      if (bd.item == null) return go('apple', 'Take an apple');
      if (bd.item === 'bananaSlices' && !(want.banana > 0 && (plainOnWay > 0 || freePan))) return go('board', 'Clear the board. Take the slices');
      return null;
    }

    if (h) {
      var p1;
      switch (h.type) {
        case 'burnt': return go('bin', 'Burnt. Put it in the bin');
        case 'flour': case 'eggs': case 'milk':
          if (b.batter === 0 && b.whisk < 0 && !b[h.type]) return go('bowl', h.type === 'eggs' ? 'Put them in the bowl' : h.type === 'milk' ? 'Pour it in the bowl' : 'Put it in the bowl');
          return go(h.type, 'Put it back');
        case 'ladle':
          p1 = P(function (q) { return q.state === 'topReady' || q.state === 'topCook'; });
          if (p1) return go(p1.id, 'Pour the batter over the bacon and apple');
          if (freePan) return go(freePan.id, 'Pour it in the pan');
          return go('bowl', 'No free pan. Pour it back');
        case 'banana': return boardFree ? go('board', 'Slice it at the board') : go('banana', 'The board is full. Put it back');
        case 'apple': return boardFree ? go('board', 'Peel and slice it at the board') : go('apple', 'The board is full. Put it back');
        case 'bananaSlices':
          if (boardFree && want.banana > 0 && (plainOnWay > 0 || freePan)) return go('board', 'Put the slices back on the board');
          return go('bin', 'Bin the slices');
        case 'appleRings':
          p1 = P(function (q) { return q.state === 'empty' && q.bacon && !q.apple; }) || freePan;
          if (p1) return go(p1.id, 'Apple rings go in the pan');
          return boardFree ? go('board', 'No free pan. Put them back') : wait('Wait for a free pan');
        case 'bacon':
          p1 = P(function (q) { return q.state === 'empty' && q.apple && !q.bacon; }) || freePan;
          if (p1) return go(p1.id, 'Bacon goes in the pan');
          return go('bacon', 'No free pan. Put it back');
        case 'plate':
          var key = dishKey(h);
          if (key === 'bare') {
            var slices = bd.item === 'bananaSlices', firstPB = null;
            for (i = 0; i < open.length; i++) if (!firstPB && open[i].dish !== 'baconApple') firstPB = open[i];
            if (firstPB && firstPB.dish === 'banana' && slices) return go('board', 'Put the banana slices on top');
            if (want.plain) return go('sugar', 'Dust it with powdered sugar');
            if (want.banana && slices) return go('board', 'Put the banana slices on top');
            if (want.banana) return go('bin', 'No banana sliced yet. Bin this one');
            return wait('Wait for the next guest');
          }
          if (key === 'bananaBare') {
            if (want.banana) return go('sugar', 'Dust it with powdered sugar');
            return open.length ? go('bin', 'Nobody ordered this. Bin it') : wait('Wait for the next guest');
          }
          if (want[key]) return go('pass', 'Serve it');
          return open.length ? go('bin', 'Nobody ordered this. Bin it') : wait('Wait for the next guest');
      }
      return wait('');
    }

    // hands are empty
    var p = P(function (q) { return q.state === 'flip'; });
    if (p) return go(p.id, 'Flip it now');
    p = P(function (q) { return q.state === 'burnt'; });
    if (p) return go(p.id, 'Burnt. Take it out');

    for (i = 0; i < pans.length; i++) {
      var q = pans[i]; if (q.state !== 'done') continue;
      if (q.top) return go(q.id, 'Slide it onto a plate');
      var slicesReady = bd.item === 'bananaSlices';
      if (want.plain || (want.banana && slicesReady)) return go(q.id, 'Slide it onto a plate');
      if (want.banana && boardFree) return go('banana', 'Take a banana');
      if (q.t > q.dur * 0.55 && !want.banana) return go(q.id, 'Slide it onto a plate');
    }

    var target = null, usedP = 0, usedB = 0;
    for (i = 0; i < open.length && !target; i++) {
      if (open[i].dish === 'baconApple') { if (usedB < baOnWay) usedB++; else target = 'baconApple'; }
      else { if (usedP < plainOnWay) usedP++; else target = open[i].dish; }
    }

    // finish a bacon apple pan that has been started
    p = P(function (q2) { return q2.state === 'topReady' || q2.state === 'topCook'; });
    if (p) return getBatter();
    p = P(function (q2) { return q2.state === 'empty' && (q2.bacon || q2.apple); });
    if (p) {
      if (!p.apple) { var a1 = appleStep(); if (a1) return a1; }
      if (!p.bacon) return go('bacon', 'Take the bacon');
    }
    // slice a banana while its pancake cooks
    if (want.banana && plainOnWay > 0 && boardFree) return go('banana', 'Take a banana');

    if (target && freePan) {
      if (target === 'baconApple') {
        if (b.batter === 0) return makeBatter();
        var a2 = appleStep(); if (a2) return a2;
        if (bd.item === 'bananaSlices' && want.banana) return getBatter();
        return go('bacon', 'Take the bacon');
      }
      return getBatter();
    }
    // nothing to start: get ahead on batter
    if (b.batter === 0 && (guestsLeft > 0 || target)) { var mb = makeBatter(); if (mb.st) return mb; }
    if (P(function (q3) { return q3.state === 'sideA'; })) return wait('Wait for the ring to fill');
    if (P(function (q3) { return q3.state === 'sideB'; })) return wait('Other side. Wait for the ring');
    return wait(open.length ? 'Wait for the pan' : guestsLeft ? 'Wait for the next guest' : '');
  }

  function runBot(dt) {
    var ck = S.cook;
    if (!S.bot.on || S.level.over || ck.busy || ck.target || ck.queue.length) return;
    S.bot.timer -= dt;
    if (S.bot.timer > 0) return;
    var a = advise();
    if (a && a.st) { ck.queue.push(a.st); S.bot.timer = S.bot.delay; }
    else S.bot.timer = 0.1;
  }

  /* ---------- input ---------- */

  function inRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

  function tapStation(id) {
    var ck = S.cook, now = Date.now();
    if (!active(id)) { Snd.play('nope'); say('Not in use yet', 1.2); return false; }
    var last = ck.queue.length ? ck.queue[ck.queue.length - 1] : ck.target;
    if (S.lastTap.id === id && last === id && now - S.lastTap.at < 300) return false; // an accidental double tap
    S.lastTap = { id: id, at: now };
    if (ck.queue.length >= 3) ck.queue[ck.queue.length - 1] = id; else ck.queue.push(id);
    Snd.play('tap');
    return true;
  }

  function tapAt(x, y) {
    if (S.screen !== 'play' || S.paused || !S.level || S.level.over || !layout) return;
    S.fx.ripples.push({ x: x, y: y, t: 0 });
    var i;
    for (i = 0; i < S.tickets.length; i++) if (isOpen(S.tickets[i]) && inRect(x, y, layout.slots[S.tickets[i].slot])) { tapStation('pass'); return; }
    for (var id in layout.cells) {
      if (!inRect(x, y, layout.cells[id])) continue;
      if (id === 'iguana') { iguanaSay(pick(LINES.tap), 'happy', true); Snd.play('tap'); S.pop.iguana = 1; return; }
      tapStation(id); return;
    }
  }

  /* ---------- per-frame update ---------- */

  function update(dt) {
    var L = S.level; if (!L) return;
    if (!L.over) L.t += dt;
    updateGuests(dt);
    if (S.screen !== 'play') return;
    if (!L.over) { updateCook(dt); updatePans(dt); runBot(dt); }
    if (L.guide && !L.over) S.hint = advise(); else S.hint = null;
  }

  function updateFx(dt) {
    var fx = S.fx, i, o;
    for (i = fx.parts.length - 1; i >= 0; i--) { o = fx.parts[i]; o.life += dt; o.x += o.vx * dt; o.y += o.vy * dt; if (!o.soft) o.vy += layout.u * 2.2 * dt; if (o.life >= o.max) fx.parts.splice(i, 1); }
    for (i = fx.pops.length - 1; i >= 0; i--) { o = fx.pops[i]; o.t += dt; if (o.t >= 1.2) fx.pops.splice(i, 1); }
    for (i = fx.ripples.length - 1; i >= 0; i--) { o = fx.ripples[i]; o.t += dt / 0.4; if (o.t >= 1) fx.ripples.splice(i, 1); }
    for (i = fx.fly.length - 1; i >= 0; i--) { o = fx.fly[i]; o.t += dt / 0.38; if (o.t >= 1) fx.fly.splice(i, 1); }
    for (var id in S.pop) { S.pop[id] -= dt / 0.3; if (S.pop[id] <= 0) delete S.pop[id]; }
    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 3);
    if (S.binOpen > 0) S.binOpen = Math.max(0, S.binOpen - dt * 2.2);
    if (S.bellRing > 0) S.bellRing = Math.max(0, S.bellRing - dt * 1.6);
    var ig = S.iguana; if (ig.t > 0) { ig.t -= dt; if (ig.t <= 0) { ig.text = ''; ig.mood = null; } } if (ig.cool > 0) ig.cool -= dt;
  }

  /* ---------- drawing ---------- */

  function panView(p) {
    var v = { bacon: p.bacon, apple: p.apple, raw: p.state === 'empty', batter: false, flip: p.flipAnim, seed: p.seed };
    if (p.state === 'topCook') v.raw = p.t / p.dur < 0.6;
    if (p.state === 'topReady') v.raw = false;
    if (p.state === 'sideA' || p.state === 'flip' || p.state === 'sideB' || p.state === 'done' || p.state === 'burnt') {
      v.batter = true; v.top = p.top; v.burnt = p.state === 'burnt';
      var turned = p.flipped && !(p.flipAnim >= 0 && p.flipAnim < 0.5);
      if (turned) { v.cook = 1; v.topUp = false; }
      else { v.cook = p.state === 'sideA' ? 0.05 + 0.3 * p.t / p.dur : 0.42; v.topUp = true; }
    }
    return v;
  }

  function drawDynamic(id, t) {
    var c = layout.cells[id]; if (!c || !active(id)) return;
    var u = layout.u, pop = S.pop[id] || 0;
    if (pop > 0) { var k = 1 + Math.sin(pop * Math.PI) * 0.07; g.save(); g.translate(c.cx, c.cy); g.scale(k, k); g.translate(-c.cx, -c.cy); }
    if (id === 'bowl') A.bowl(g, c.cx, c.cy, u, S.bowl, t);
    else if (id === 'pan1' || id === 'pan2') { var p = panById(id); A.stove(g, c.cx, c.cy, u, p && p.state !== 'empty' || (p && (p.bacon || p.apple)), t); A.pan(g, c.cx, c.cy, u, p ? panView(p) : null); }
    else if (id === 'board') A.board(g, c.cx, c.cy, u, S.board, t);
    else if (id === 'pass') A.pass(g, c.cx, c.cy, u, S.bellRing);
    else if (id === 'bin') { A.bin(g, c.cx, c.cy - u * 0.04, u, S.binOpen); A.text(g, 'BIN', c.cx, c.y + c.h - layout.fh * 0.46, A.fitText(g, 'BIN', c.w * 0.8, layout.fh * 0.44, A.FONT_LABEL), 'rgba(0,78,173,0.85)', A.FONT_LABEL); }
    else if (id === 'iguana') A.iguana(g, c.cx, c.cy - u * 0.06, u * 0.95, t, S.iguana.mood);
    else if (pop > 0) { g.fillStyle = 'rgba(255,255,255,' + (0.35 * pop).toFixed(3) + ')'; A.circ(g, c.cx, c.cy, u * 0.36); g.fill(); }
    if (pop > 0) g.restore();
  }

  function windowColor(e) { return e < RULES.perfectZone ? C.good : e < 0.75 ? C.warn : C.bad; }

  function drawOverlays(t) {
    var u = layout.u, lw = Math.max(3, u * 0.05), tagPx = clamp(u * 0.125, 9, 26), i, c;
    // pans
    for (i = 0; i < S.pans.length; i++) {
      var p = S.pans[i]; c = layout.cells[p.id];
      var rx = u * 0.37, ry = u * 0.245, cy = c.cy + u * 0.012, tagY = c.cy - u * 0.36 - Math.abs(Math.sin(t * 5)) * u * 0.035;
      if (p.state === 'topCook') A.ring(g, c.cx, cy, rx, ry, p.t / p.dur, C.orange, lw);
      else if (p.state === 'topReady') A.tag(g, 'ADD BATTER', c.cx, tagY, tagPx, C.yellow, C.ink);
      else if (p.state === 'sideA' || p.state === 'sideB') A.ring(g, c.cx, cy, rx, ry, p.t / p.dur, C.yellow, lw);
      else if (p.state === 'flip') { var e = p.t / p.dur; A.ring(g, c.cx, cy, rx, ry, 1 - e, windowColor(e), lw); A.tag(g, 'FLIP', c.cx, tagY, tagPx * 1.15, windowColor(e), e < 0.75 && e >= RULES.perfectZone ? C.ink : '#FFFFFF'); }
      else if (p.state === 'done') { var e2 = p.t / p.dur; A.ring(g, c.cx, cy, rx, ry, 1 - e2, e2 < 0.6 ? C.good : e2 < 0.82 ? C.warn : C.bad, lw); A.tag(g, 'READY', c.cx, tagY, tagPx * 1.1, e2 < 0.82 ? C.good : C.bad, '#FFFFFF'); }
      else if (p.state === 'burnt') A.tag(g, 'BURNT', c.cx, c.cy - u * 0.36, tagPx, C.burnt, '#FFFFFF');
    }
    // bowl
    c = layout.cells.bowl;
    var b = S.bowl, pipY = c.cy + u * (c.front ? 0.34 : 0.3);
    if (b.whisk >= 0) A.ring(g, c.cx, c.cy - u * 0.07, u * 0.39, u * 0.25, b.whisk, C.yellow, lw);
    else if (b.batter > 0) { var items = []; for (i = 0; i < RULES.portions; i++) items.push({ on: i < b.batter, color: C.batter }); A.pips(g, c.cx, pipY, u, items); }
    else A.pips(g, c.cx, pipY, u, [{ on: b.flour, color: '#FFFFFF' }, { on: b.eggs, color: C.yellow }, { on: b.milk, color: C.pale }]);
    // board, sugar
    var bz = S.cook.busy;
    if (bz && (bz.type === 'chop' || bz.type === 'prep')) { c = layout.cells.board; A.ring(g, c.cx, c.cy, u * 0.42, u * 0.28, bz.t / bz.dur, C.yellow, lw); }
    if (bz && bz.type === 'sugar') { c = layout.cells.sugar; A.ring(g, c.cx, c.cy, u * 0.3, u * 0.3, bz.t / bz.dur, C.yellow, lw); }
    // where the cook is going next
    var ck = S.cook, marks = (ck.target ? [ck.target] : []).concat(ck.queue);
    for (i = 0; i < marks.length; i++) {
      c = layout.cells[marks[i]]; if (!c) continue;
      g.strokeStyle = i === 0 ? 'rgba(0,78,173,0.9)' : 'rgba(0,78,173,0.45)'; g.lineWidth = Math.max(2, u * 0.035);
      A.rr(g, c.x + u * 0.04, c.y + u * 0.04, c.w - u * 0.08, c.h - u * 0.08, u * 0.1); g.stroke();
    }
    // the guide
    var hint = S.hint;
    if (hint && hint.st && layout.cells[hint.st] && !(ck.target === hint.st)) {
      c = layout.cells[hint.st];
      var pulse = S.reduced ? 0.7 : 0.55 + 0.45 * Math.abs(Math.sin(t * 4.5));
      g.strokeStyle = 'rgba(239,189,64,' + pulse.toFixed(3) + ')'; g.lineWidth = Math.max(3, u * 0.06);
      A.rr(g, c.x + u * 0.03, c.y + u * 0.03, c.w - u * 0.06, c.h - u * 0.06, u * 0.1); g.stroke();
      A.arrow(g, c.cx, c.y + u * 0.12, u, S.reduced ? 0 : t);
    }
    // particles
    var fx = S.fx, o;
    for (i = 0; i < fx.parts.length; i++) {
      o = fx.parts[i]; var f = o.life / o.max;
      if (o.soft) { g.fillStyle = o.color + (0.5 * (1 - f)).toFixed(3) + ')'; A.circ(g, o.x, o.y, o.size * (1 + f * o.grow)); g.fill(); }
      else { g.globalAlpha = 1 - f; g.fillStyle = o.color; A.circ(g, o.x, o.y, o.size * (1 + f * 0.5)); g.fill(); g.globalAlpha = 1; }
    }
    for (i = 0; i < fx.ripples.length; i++) { o = fx.ripples[i]; g.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - o.t)).toFixed(3) + ')'; g.lineWidth = Math.max(2, u * 0.03); A.circ(g, o.x, o.y, u * (0.08 + o.t * 0.28)); g.stroke(); g.strokeStyle = 'rgba(0,78,173,' + (0.5 * (1 - o.t)).toFixed(3) + ')'; g.lineWidth = 1.5; A.circ(g, o.x, o.y, u * (0.1 + o.t * 0.3)); g.stroke(); }
    for (i = 0; i < fx.fly.length; i++) { o = fx.fly[i]; var e3 = o.t * o.t * (3 - 2 * o.t); A.dish(g, o.x0 + (o.x1 - o.x0) * e3, o.y0 + (o.y1 - o.y0) * e3 - Math.sin(e3 * Math.PI) * u * 0.6, u * (0.24 - 0.06 * e3), o.plate, 0.8); }
    // speech
    var bpx = clamp(u * 0.15, 12, 26);
    if (ck.bubble) A.bubble(g, ck.bubble.text, ck.x, ck.y - u * 1.02, bpx, 6, view.w - 6);
    if (S.iguana.text && layout.cells.iguana) { c = layout.cells.iguana; A.bubble(g, S.iguana.text, c.cx - u * 0.15, c.cy - u * 0.34, bpx, 6, view.w - 6); }
    // score popups
    for (i = 0; i < fx.pops.length; i++) {
      o = fx.pops[i]; var a = o.t < 0.8 ? 1 : 1 - (o.t - 0.8) / 0.4, px = clamp(u * 0.34, 20, 64);
      g.globalAlpha = Math.max(0, a); g.font = px.toFixed(1) + 'px ' + A.FONT_SCRIPT; g.textAlign = 'center'; g.textBaseline = 'middle';
      var py = o.y - o.t * u * 0.5;
      g.lineJoin = 'round'; g.strokeStyle = '#FFFDF6'; g.lineWidth = px * 0.22; g.strokeText(o.text, o.x, py);
      g.fillStyle = o.color; g.fillText(o.text, o.x, py); g.globalAlpha = 1;
    }
    // the hint line, on the tile wall above the counters
    if (hint && hint.text) {
      var hp = clamp(u * 0.17, 13, 30), s = layout.strip;
      g.font = '600 ' + hp.toFixed(1) + 'px ' + A.FONT_BODY;
      var w = Math.min(view.w - 12, g.measureText(hint.text).width + hp * 2.4), hh = Math.min(s.h - 4, hp * 1.9), hx = (view.w - w) / 2, hy = s.y + (s.h - hh) / 2;
      g.fillStyle = 'rgba(40,34,4,0.25)'; A.rr(g, hx + 1, hy + 2.5, w, hh, hh / 2); g.fill();
      g.fillStyle = C.creamLight; A.rr(g, hx, hy, w, hh, hh / 2); g.fill();
      g.fillStyle = hint.st ? C.yellow : C.pale; A.circ(g, hx + hh * 0.5, hy + hh / 2, hh * 0.2); g.fill();
      A.text(g, hint.text, hx + hh * 0.5 + (w - hh * 0.5) / 2 - hp * 0.2, hy + hh / 2 + 1, A.fitText(g, hint.text, w - hh * 1.2, hp, A.FONT_BODY, '600'), C.ink, A.FONT_BODY, 'center', '600');
    }
  }

  function drawGuests(t) {
    for (var i = 0; i < S.tickets.length; i++) {
      var tk = S.tickets[i], s = layout.slots[tk.slot], frac = tk.t / tk.max;
      var mood = tk.state === 'served' ? 4 : tk.state === 'left' ? 3 : frac > 0.6 ? 0 : frac > 0.3 ? 1 : 2;
      var e = tk.enter, ease = 1 - (1 - e) * (1 - e);
      g.save();
      var served = tk.state === 'served' && tk.anim > 0.26;
      if (tk.state === 'left') { g.globalAlpha = Math.max(0, 1 - tk.anim); g.translate(-tk.anim * s.w * 0.35, 0); }
      else if (tk.state === 'served' && tk.anim > 0.75) g.globalAlpha = Math.max(0, 1 - (tk.anim - 0.75) * 4);
      else if (e < 1) { g.globalAlpha = ease; g.translate(0, (1 - ease) * s.h * 0.25); }
      A.guestCard(g, s.x, s.y, s.w, s.h, {
        look: tk.look, dish: tk.dish, label: DISHES[tk.dish].label, frac: frac, mood: mood, t: t + tk.id,
        state: served ? 'served' : tk.state === 'left' ? 'left' : 'open', anim: tk.anim,
        urgent: frac < 0.25, shake: frac < 0.25 && tk.state === 'open' && !S.reduced ? layout.u * 0.012 : 0
      });
      g.restore();
    }
  }

  function drawKitchen(t) {
    var W = view.w, H = view.h, u = layout.u, id, c;
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (S.shake > 0 && !S.reduced) {
      g.fillStyle = C.navy; g.fillRect(0, 0, W, H);
      g.translate((Math.random() - 0.5) * S.shake * u * 0.08, (Math.random() - 0.5) * S.shake * u * 0.08);
    }
    g.drawImage(bgBack, 0, 0, W, H);
    drawGuests(t);
    for (id in layout.cells) { c = layout.cells[id]; if (c.layer === 'back') drawDynamic(id, t); }
    var ck = S.cook;
    A.cook(g, ck.x, ck.y, u * 0.9, { dir: ck.dir, walk: ck.walk, moving: ck.moving, hold: ck.hold, work: ck.busy && ck.busy.type !== 'wait' ? ck.busy.t / ck.busy.dur : -1, t: t });
    g.drawImage(bgFront, frontRect.x, frontRect.y, frontRect.w, frontRect.h);
    for (id in layout.cells) { c = layout.cells[id]; if (c.layer === 'front') drawDynamic(id, t); }
    drawOverlays(t);
  }

  function draw() {
    if (!g || !layout) return;
    var t = S.time;
    if (S.scene === 'kitchen' && S.level && S.cook) drawKitchen(t);
    else {
      g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      var hero = hooks.hero ? hooks.hero() : null;
      A.facade(g, view.w, view.h, hero || { x: 0, y: 0, w: view.w, h: view.h }, S.reduced ? 0 : t);
    }
  }

  /* ---------- main loop ---------- */

  var lastTs = 0, lastRaf = 0;
  function step(dt) { update(dt); updateFx(dt); }
  function tick(now) {
    var dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000)); lastTs = now;
    if (!S.paused) {
      S.time += dt;
      if (S.level && layout && (S.screen === 'play' || S.screen === 'result' || S.screen === 'intro')) {
        var n = Math.max(1, Math.round(S.speed));
        for (var i = 0; i < n; i++) { if (S.screen === 'play') step(dt); else updateFx(dt); }
      }
    }
    draw();
  }
  function frame() {
    lastRaf = performance.now();
    tick(lastRaf);
    window.requestAnimationFrame(frame);
  }
  // Some browsers slow animation frames to a crawl when the window is covered or embedded.
  // If that happens while the page still counts as visible, a plain timer keeps the kitchen running.
  function watchdog() {
    if (document.hidden) return;
    var now = performance.now();
    if (now - lastRaf > 150) tick(now);
  }

  function pause() { if (S.screen !== 'play' || S.paused) return false; S.paused = true; Snd.hold(true); return true; }
  function resume() { if (!S.paused) return; S.paused = false; Snd.hold(false); lastTs = performance.now(); }

  // Stop in the middle of a run and keep what was earned so far (used by "Stop and save score").
  function abandon() {
    if (S.level && S.run && !S.level.reported) S.run.failScore = Math.max(0, Math.round(S.level.score));
    S.screen = 'other'; S.paused = false; S.bot.on = false;
    Snd.hold(false); Snd.musicStop(); Snd.setSizzle(0); lastSizzle = 0;
  }

  function toTitle() {
    S.level = null; S.run = null; S.scene = 'facade'; S.screen = 'title'; S.paused = false; S.bot.on = false;
    Snd.hold(false); Snd.musicStop(); Snd.setSizzle(0); lastSizzle = 0;
  }

  function init(opts) {
    canvas = opts.canvas; g = canvas.getContext('2d');
    hooks = opts.hooks || {};
    S.kiosk = !!opts.kiosk;
    try { S.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { S.reduced = false; }
    lastTs = lastRaf = performance.now();
    window.requestAnimationFrame(frame);
    window.setInterval(watchdog, 16);
  }

  /* ---------- test hooks ---------- */

  // Plays a level without drawing, with the bot tapping every `delay` seconds. Used to tune the levels.
  function sim(level, delay) {
    var keepHooks = hooks, keepRun = S.run; hooks = {};
    Snd.hold(true);
    S.run = null; newRun(level || 1);
    S.screen = 'play'; S.bot.on = true; S.bot.delay = delay == null ? 0.8 : delay;
    var guard = 0, res = null;
    hooks.onLevelEnd = function (r) { res = r; };
    while (!res && guard++ < 60 * 400) step(1 / 60);
    var out = res ? { level: res.level, passed: res.passed, served: res.served, lost: res.lost, score: res.score, stars: res.stars, seconds: Math.round(S.level.t), burnt: res.burnt, wrong: res.wrong, perfect: res.perfect, max: S.level.cfg.max } : { stuck: true };
    S.bot.on = false; hooks = keepHooks; S.run = keepRun; toTitle();
    if (hooks.onTestReset) hooks.onTestReset();
    return out;
  }

  window.__game = {
    get state() { return S; },
    get layout() { return layout; },
    levels: LEVELS, rules: RULES, dishes: DISHES, timings: T, maxTotal: MAX_TOTAL,
    advise: function () { return S.level ? advise() : null; },
    tap: function (id) { if (S.screen === 'play' && !S.paused) return tapStation(id); return false; },
    win: function () {
      if (!S.level) newRun(1);
      if (S.screen === 'intro') beginLevel();
      if (S.screen !== 'play') return null;
      var L = S.level; L.served = Math.max(L.served, L.cfg.goal);
      if (!L.over) endLevel(true);
      L.reported = true; return finishLevel();
    },
    fail: function () {
      if (!S.level) newRun(1);
      if (S.screen === 'intro') beginLevel();
      if (S.screen !== 'play') return null;
      var L = S.level; if (!L.over) endLevel(false);
      L.reported = true; return finishLevel();
    },
    reward: function () { return hooks.onTestReward ? hooks.onTestReward() : null; },
    bot: function (on, delay) { S.bot.on = on !== false; if (delay != null) S.bot.delay = delay; return S.bot; },
    step: function (seconds) { var n = Math.round((seconds || 1) * 60); for (var i = 0; i < n; i++) if (S.screen === 'play') step(1 / 60); return S.level ? Math.round(S.level.t * 10) / 10 : null; },
    sim: sim,
    // Average cost of one update and one full redraw, in milliseconds (a rough check, not a frame-rate measurement).
    perf: function (n) {
      n = n || 120; var t0 = performance.now();
      for (var i = 0; i < n; i++) { if (S.screen === 'play') step(1 / 60); draw(); }
      try { g.getImageData(0, 0, 1, 1); } catch (e) { /* canvas not readable when opened from disk */ }
      return Math.round((performance.now() - t0) / n * 100) / 100;
    }
  };
  // The test hooks above only exist on this computer, never on the public site.
  if (!/^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(window.location.hostname)) { try { delete window.__game; } catch (e) { window.__game = undefined; } }

  LBR.Game = {
    init: init, resize: resize, renderStatic: renderStatic,
    newRun: newRun, prepareLevel: prepareLevel, beginLevel: beginLevel,
    pause: pause, resume: resume, abandon: abandon, toTitle: toTitle, tapAt: tapAt,
    runTotal: runTotal, state: S, LEVELS: LEVELS, DISHES: DISHES, RULES: RULES, MAX_TOTAL: MAX_TOTAL
  };
})();
