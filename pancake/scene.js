/* Create your own Dutch pancake: where every piece goes, and how it gets there.
   The order of tapping never matters: for a given set of toppings the picture is always the same.

   From the bottom up:
     plate, pancake
     cooked    baked into the batter (fixed places)
     spread    Nutella, peanut butter
     cheese    melted over all of that
     fresh     laid on top, in rings around the cups; the rings are shared out between the fruits
     sprinkle  coconut, chocolate chips
     drizzle   syrups, honey
     sugar     the powdered sugar of the plain pancake (gone as soon as anything savory is on)
     cup       whipped cream and ice cream, each in its own cup
     side      shot glasses next to the plate */
(function () {
  'use strict';
  var PK = window.PK, A = PK.art, TAU = A.TAU, rnd = A.rnd;

  var COOKED_ORDER = ['apple', 'bacon', 'tomato', 'onion', 'green_pepper', 'mushroom', 'tuna', 'ham', 'walnuts', 'almonds', 'raisins'];
  var SPREADS = ['nutella', 'peanut_butter'];
  var CHEESES = ['gouda', 'mozzarella', 'brie'];
  var FRESH = ['banana', 'strawberries', 'blueberries', 'mango', 'papaya', 'pineapple', 'rum_raisins'];
  var SPRINKLES = ['coconut', 'chocolate_chips'];
  var DRIZZLES = ['caramel_syrup', 'chocolate_syrup', 'strawberry_syrup', 'honey'];
  var CUPS = ['whipped_cream', 'ice_vanilla', 'ice_chocolate', 'ice_strawberry', 'ice_oreo', 'ice_hazelnut', 'ice_pistachio'];
  var SHOTS = ['banana_liqueur', 'rum', 'coconut_rum', 'amaretto', 'grand_marnier'];
  // where each shot glass stands, measured from the middle of the plate in pancake radii
  var SHOT_POS = { banana_liqueur: [-1.05, 0.6], rum: [1.05, 0.6], coconut_rum: [-0.84, 0.71], amaretto: [0.84, 0.71], grand_marnier: [-0.63, 0.79] };

  // How long things take to arrive and to leave (ms), and the pause between two pieces of the same topping.
  var TIME = {
    cooked: { i: 780, o: 240, s: 55 }, spread: { i: 800, o: 280, s: 0 }, cheese: { i: 1150, o: 320, s: 0 },
    fresh: { i: 560, o: 200, s: 40 }, sprinkle: { i: 460, o: 180, s: 6 }, drizzle: { i: 950, o: 280, s: 0 },
    cup: { i: 950, o: 240, s: 0 }, side: { i: 800, o: 240, s: 0 }
  };
  var KIND = {};
  COOKED_ORDER.forEach(function (id) { KIND[id] = 'cooked'; });
  SPREADS.forEach(function (id) { KIND[id] = 'spread'; });
  CHEESES.forEach(function (id) { KIND[id] = 'cheese'; });
  FRESH.forEach(function (id) { KIND[id] = 'fresh'; });
  SPRINKLES.forEach(function (id) { KIND[id] = 'sprinkle'; });
  DRIZZLES.forEach(function (id) { KIND[id] = 'drizzle'; });
  CUPS.forEach(function (id) { KIND[id] = 'cup'; });
  SHOTS.forEach(function (id) { KIND[id] = 'side'; });

  /* ---------- fixed places, worked out once ---------- */

  var FIX = {};
  function buildFixed() {
    var placed = [], i, j, t;
    // Bacon: five whole strips, placed by hand like on the photos.
    var bacon = [[-0.5, -0.22, 1.05], [0.06, -0.52, -0.2], [0.56, -0.06, 1.3], [-0.16, 0.3, 0.35], [0.4, 0.53, -0.45]];
    FIX.bacon = [];
    for (i = 0; i < bacon.length; i++) {
      FIX.bacon.push({ u: bacon[i][0], v: bacon[i][1], rot: bacon[i][2], seed: 101 + i * 37 });
      for (j = -2; j <= 2; j++) placed.push({ u: bacon[i][0] + Math.cos(bacon[i][2]) * j * 0.11, v: bacon[i][1] + Math.sin(bacon[i][2]) * j * 0.11, r: 0.06, id: 'bacon' });
    }
    // Everything else finds the roomiest free spot, one piece at a time, so no two pieces sit on top of
    // each other and the first few pieces of a topping are already well spread.
    function placeOne(id, rad, R, out) {
      var best = null, bestS = -1e9, c, rr, th, u, v, s, k, q, d;
      for (c = 0; c < 90; c++) {
        rr = Math.sqrt(R()) * (0.9 - rad); th = R() * TAU; u = Math.cos(th) * rr; v = Math.sin(th) * rr; s = 1e9;
        for (k = 0; k < placed.length; k++) {
          q = placed[k]; d = Math.sqrt((u - q.u) * (u - q.u) + (v - q.v) * (v - q.v)) - (rad + q.r) * (q.id === id ? 1.5 : 1);
          if (d < s) s = d;
        }
        if (s > bestS) { bestS = s; best = [u, v]; }
      }
      placed.push({ u: best[0], v: best[1], r: rad, id: id });
      out.push({ u: best[0], v: best[1], rot: R() * TAU, seed: Math.floor(R() * 1e6) });
    }
    function tier(ids, seed) {
      var gens = [], max = 0;
      for (i = 0; i < ids.length; i++) { FIX[ids[i]] = []; gens.push(rnd(seed + i * 977)); max = Math.max(max, A.COOKED[ids[i]].n); }
      for (t = 0; t < max; t++) for (i = 0; i < ids.length; i++) if (t < A.COOKED[ids[i]].n) placeOne(ids[i], A.COOKED[ids[i]].rad, gens[i], FIX[ids[i]]);
    }
    tier(['apple'], 5);
    tier(['tomato', 'onion', 'green_pepper', 'mushroom', 'tuna'], 12);
    tier(['ham', 'walnuts', 'almonds', 'raisins'], 23);

    function scatter(n, seed, rmax, jit) {
      var R = rnd(seed), out = [], a0 = R() * TAU, r, th;
      for (i = 0; i < n; i++) {
        r = rmax * Math.sqrt((i + 0.6) / n); th = a0 + i * 2.39996;
        out.push({ u: Math.cos(th) * r + (R() - 0.5) * jit, v: Math.sin(th) * r + (R() - 0.5) * jit, rot: R() * TAU, seed: Math.floor(R() * 1e6) });
      }
      return out;
    }
    FIX.coconut = scatter(110, 61, 0.86, 0.07);
    FIX.chocolate_chips = scatter(34, 67, 0.83, 0.06);
    SPREADS.concat(CHEESES, DRIZZLES).forEach(function (id) { FIX[id] = [{ u: 0, v: 0, rot: 0, seed: 1 }]; });
    SHOTS.forEach(function (id) { FIX[id] = [{ u: 0, v: 0, x: SHOT_POS[id][0], y: SHOT_POS[id][1], rot: 0, seed: 1 }]; });
  }

  // The cups stand together in the middle. Patterns are listed from the far side to the near side,
  // in cup radii, and staggered so a cup at the back shows between the ones in front of it.
  var CUP_AT = [null,
    [[0, 0]],
    [[-1.1, 0], [1.1, 0]],
    [[0, -0.95], [-1.12, 0.6], [1.12, 0.6]],
    [[0, -1.55], [-1.2, 0], [1.2, 0], [0, 1.55]],
    [[-1.15, -1.25], [1.15, -1.25], [0, 0], [-1.15, 1.25], [1.15, 1.25]],
    [[-1.1, -1.9], [1.1, -1.9], [-2.2, 0], [2.2, 0], [-1.1, 1.9], [1.1, 1.9]],
    [[-1.1, -1.9], [1.1, -1.9], [-2.2, 0], [0, 0], [2.2, 0], [-1.1, 1.9], [1.1, 1.9]]];
  var CUP_R = [0, 0.19, 0.17, 0.16, 0.145, 0.135, 0.125, 0.12];      // the more cups, the smaller
  var CUP_RHO = [0, 0.19, 0.36, 0.34, 0.37, 0.37, 0.4, 0.385];       // how much of the middle they take up

  /* ---------- the pieces that are on the pancake right now ---------- */

  var M = {};                         // topping id -> its pieces
  var cur = {};                       // topping id -> true when it is on
  var sugar = { a: 1, t: 1 };
  var noSugarGroup = {};              // filled by init: ids of the toppings that go without powdered sugar
  function pieces(id) { return M[id] || (M[id] = []); }
  function isOn(id) { return !!cur[id]; }

  function fixed(id, quota) {
    var list = pieces(id), have = {}, src = FIX[id], stag = TIME[KIND[id]].s, i, p, d, fresh = 0;
    for (i = 0; i < list.length; i++) { p = list[i]; have[p.i] = p; p.target = p.i < quota ? 1 : 0; if (!p.target) p.delay = 0; }
    for (i = 0; i < quota && i < src.length; i++) {
      if (have[i]) continue;
      d = src[i];
      list.push({ id: id, i: i, u: d.u, v: d.v, tu: d.u, tv: d.v, rot: d.rot, trot: d.rot, x: d.x, y: d.y, sc: 1, seed: d.seed, a: 0, target: 1, delay: (fresh++) * stag });
    }
    list.sort(function (a, b) { return a.i - b.i; });
  }

  function dealCups() {
    var ids = CUPS.filter(isOn), n = ids.length, i, list, p, at;
    CUPS.forEach(function (id) {
      list = pieces(id); i = ids.indexOf(id);
      if (i < 0) { if (list[0]) { list[0].target = 0; list[0].delay = 0; } return; }
      at = CUP_AT[n][i];
      if (!list[0]) list.push({ id: id, i: 0, u: at[0] * CUP_R[n], v: 0.03 + at[1] * CUP_R[n], rot: 0, trot: 0, rc: CUP_R[n], sc: 1, seed: 40 + CUPS.indexOf(id) * 7, a: 0, target: 1, delay: 0 });
      p = list[0]; p.target = 1; p.tu = at[0] * CUP_R[n]; p.tv = 0.03 + at[1] * CUP_R[n]; p.trc = CUP_R[n];
    });
    return n;
  }

  // Fresh toppings lie in rings around the middle, like on the photos. With more than one kind,
  // the places in each ring are dealt out in turn, so every kind is spread over the whole pancake.
  function dealFresh(nCups) {
    var ids = FRESH.filter(isOn), n = ids.length, slots = {}, rings, pitch, j, i, c, r, th, id, off = 0, rin, R, sl;
    FRESH.forEach(function (f) { slots[f] = []; });
    if (n) {
      rin = CUP_RHO[nCups] + 0.14;
      if (nCups === 0) rings = n <= 2 ? [0.41, 0.77] : [0.31, 0.56, 0.8];
      else if (nCups === 1) rings = n <= 2 ? [0.42, 0.77] : [0.4, 0.6, 0.81];
      else rings = [Math.min(0.58, rin + 0.05), 0.81];
      pitch = n === 1 ? 0.45 : n === 2 ? 0.38 : 0.33;
      for (j = rings.length - 1; j >= 0; j--) {
        r = rings[j]; c = Math.round(TAU * r / pitch);
        if (n <= 4 && c >= n) c -= c % n;
        for (i = 0; i < c; i++) {
          th = Math.PI / 2 + j * Math.PI / c + i / c * TAU; id = ids[(i + off) % n];
          R = rnd(j * 1000 + i * 7 + FRESH.indexOf(id) * 53 + 9);
          slots[id].push({ u: Math.cos(th) * r + (R() - 0.5) * 0.02, v: Math.sin(th) * r + (R() - 0.5) * 0.02, rot: A.TOP[id].rot(th, R), seed: Math.floor(R() * 1e6) });
        }
        off += c + 1;
      }
      if (nCups === 0) {              // no cup in the middle: one piece goes there
        id = ids[off % n]; R = rnd(77 + FRESH.indexOf(id));
        slots[id].push({ u: 0, v: 0.01, rot: A.TOP[id].rot(0.6, R), seed: Math.floor(R() * 1e6) });
      }
    }
    FRESH.forEach(function (f) {
      var list = pieces(f), fresh = 0, k, p, best, bd, d;
      sl = slots[f];
      for (k = 0; k < list.length; k++) list[k].keep = false;
      for (i = 0; i < sl.length; i++) {
        best = null; bd = 0.3;        // a piece that is already close by slides over; otherwise a new one drops in
        for (k = 0; k < list.length; k++) {
          p = list[k]; if (p.keep) continue;
          d = (p.tu - sl[i].u) * (p.tu - sl[i].u) + (p.tv - sl[i].v) * (p.tv - sl[i].v);
          if (d < bd) { bd = d; best = p; }
        }
        if (best) { best.keep = true; best.tu = sl[i].u; best.tv = sl[i].v; best.trot = sl[i].rot; best.target = 1; }
        else list.push({ id: f, i: i, u: sl[i].u, v: sl[i].v, tu: sl[i].u, tv: sl[i].v, rot: sl[i].rot, trot: sl[i].rot, sc: 1, seed: sl[i].seed, a: 0, target: 1, delay: (fresh++) * TIME.fresh.s, keep: true });
      }
      for (k = 0; k < list.length; k++) if (!list[k].keep) { list[k].target = 0; list[k].delay = 0; }
    });
  }

  // Say which toppings are on. instant: show the result at once, without the little animations.
  function sync(on, instant) {
    var id, nCooked, f, nCups, both, any = false, p;
    cur = {};
    for (id in on) if (on[id] && KIND[id]) cur[id] = true;
    if (instant) M = {};

    // Cooked in. With many kinds at once each one gets fewer pieces, so the pancake stays readable.
    nCooked = COOKED_ORDER.filter(isOn).length;
    f = nCooked <= 2 ? 1 : nCooked <= 4 ? 0.8 : nCooked <= 6 ? 0.65 : 0.5;
    COOKED_ORDER.forEach(function (c) { fixed(c, isOn(c) ? Math.max(2, Math.round(FIX[c].length * f)) : 0); });

    both = isOn('nutella') && isOn('peanut_butter');
    SPREADS.forEach(function (s, i) {
      fixed(s, isOn(s) ? 1 : 0);
      p = pieces(s)[0];
      if (p) { p.tu = both ? (i ? 0.2 : -0.2) : 0; p.tv = both ? (i ? 0.06 : -0.04) : 0; if (p.a === 0) { p.u = p.tu; p.v = p.tv; } }
    });
    CHEESES.forEach(function (c) { fixed(c, isOn(c) ? 1 : 0); });

    nCups = dealCups();
    dealFresh(nCups);

    f = FRESH.filter(isOn).length >= 4 ? 0.7 : 1;
    SPRINKLES.forEach(function (s) { fixed(s, isOn(s) ? Math.round(FIX[s].length * f) : 0); });
    f = DRIZZLES.filter(isOn).length >= 3 ? 0.78 : 1;         // several syrups at once: thinner lines
    DRIZZLES.forEach(function (d) { fixed(d, isOn(d) ? 1 : 0); p = pieces(d)[0]; if (p) p.sc = f; });
    SHOTS.forEach(function (s) { fixed(s, isOn(s) ? 1 : 0); });

    for (id in cur) if (noSugarGroup[id]) any = true;
    sugar.t = any ? 0 : 1;

    if (instant) { settle(); render(); } else kick();
  }

  function settle() {
    var id, list, i, p;
    for (id in M) {
      list = M[id];
      for (i = list.length - 1; i >= 0; i--) {
        p = list[i];
        if (!p.target) { list.splice(i, 1); continue; }
        p.a = 1; p.delay = 0; p.u = p.tu; p.v = p.tv; p.rot = p.trot; if (p.trc) p.rc = p.trc;
      }
    }
    sugar.a = sugar.t;
  }

  function tick(dt) {
    var busy = false, id, list, i, p, T, k = 1 - Math.exp(-dt / 105), d;
    for (id in M) {
      list = M[id]; T = TIME[KIND[id]];
      for (i = list.length - 1; i >= 0; i--) {
        p = list[i];
        if (p.a < p.target) {
          busy = true;
          if (p.delay > 0) { p.delay -= dt; continue; }
          p.a = Math.min(1, p.a + dt / T.i);
        } else if (p.a > p.target) {
          busy = true; p.a = Math.max(0, p.a - dt / T.o);
        }
        if (p.target === 0 && p.a <= 0) { list.splice(i, 1); continue; }
        if (Math.abs(p.tu - p.u) > 0.001 || Math.abs(p.tv - p.v) > 0.001) { p.u += (p.tu - p.u) * k; p.v += (p.tv - p.v) * k; busy = true; } else { p.u = p.tu; p.v = p.tv; }
        d = p.trot - p.rot;
        if (Math.abs(d) > 0.01) { while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; p.rot += d * k; if (Math.abs(d) > 0.01) busy = true; else p.rot = p.trot; }
        if (p.trc && Math.abs(p.trc - p.rc) > 0.0005) { p.rc += (p.trc - p.rc) * k; busy = true; } else if (p.trc) p.rc = p.trc;
      }
    }
    if (sugar.a !== sugar.t) {
      d = dt / 520; sugar.a = sugar.a < sugar.t ? Math.min(sugar.t, sugar.a + d) : Math.max(sugar.t, sugar.a - d * 1.4); busy = true;
    }
    return busy;
  }

  /* ---------- drawing it ---------- */

  var canvas, ctx, W = 0, H = 0, dpr = 1, st = null, base = null, sugarCv = null, onDraw = null;

  function stageFor(w, h) {
    // The scene needs 2.44 pancake radii across and 1.54 down. Spare height goes mostly above the plate,
    // where the two buttons sit in the corners and where the toppings drop in from.
    var R = Math.min(w / 2.44, h / 1.54);
    return { cx: w / 2, cy: (h - 1.54 * R) * 0.7 + 0.66 * R, R: R, k: 0.5, up: 0.866 };
  }
  function byDepth(a, b) { return (a.v - b.v) || (a.u - b.u); }

  // Draw the whole scene. live: use the saved-up plate, pancake and sugar pictures (only right for the page's own canvas).
  function drawScene(g, s, live) {
    var i, j, list, all, id, sa, fall;
    if (live && base) g.drawImage(base, 0, 0, W, H);
    else { A.drawPlate(g, s); A.drawPancake(g, s); }

    var under = [];
    for (i = 0; i < COOKED_ORDER.length; i++) {
      id = COOKED_ORDER[i]; list = M[id];
      if (list) for (j = 0; j < list.length; j++) { A.drawCooked(g, s, id, list[j], list[j].a); if (list[j].a > 0.5) under.push(list[j]); }
    }
    // spreads and melted cheese lie over what is cooked in: its shapes still show through
    for (i = 0; i < SPREADS.length; i++) { list = M[SPREADS[i]]; if (list && list[0]) A.drawBlob(g, s, SPREADS[i], list[0], list[0].a, under); }
    for (i = 0; i < CHEESES.length; i++) { list = M[CHEESES[i]]; if (list && list[0]) A.drawBlob(g, s, CHEESES[i], list[0], list[0].a, under); }

    all = [];
    for (i = 0; i < FRESH.length; i++) { list = M[FRESH[i]]; if (list) all = all.concat(list); }
    all.sort(byDepth);
    for (i = 0; i < all.length; i++) A.drawTop(g, s, all[i].id, all[i], all[i].a);

    for (i = 0; i < SPRINKLES.length; i++) { id = SPRINKLES[i]; list = M[id]; if (list) for (j = 0; j < list.length; j++) A.SPRINKLE[id](g, s, list[j], list[j].a); }
    for (i = 0; i < DRIZZLES.length; i++) { list = M[DRIZZLES[i]]; if (list && list[0]) A.drawDrizzle(g, s, DRIZZLES[i], list[0], list[0].a); }

    // Powdered sugar: the last dusting, over the pancake and the fresh toppings, under the cups.
    if (sugar.a > 0.001) {
      sa = sugar.a; fall = sugar.t ? -(1 - A.outCubic(sa)) * s.R * 0.1 : 0;   // it sifts down when it comes back
      g.save(); g.globalAlpha = Math.min(1, sa * 1.15);
      if (live && sugarCv) g.drawImage(sugarCv, 0, fall, W, H);
      else { g.translate(0, fall); A.drawSugar(g, s); }
      g.restore();
    }

    all = [];
    for (i = 0; i < CUPS.length; i++) { list = M[CUPS[i]]; if (list && list[0]) all.push(list[0]); }
    all.sort(byDepth);
    for (i = 0; i < all.length; i++) A.drawCup(g, s, all[i].id, all[i], all[i].a);

    all = [];
    for (i = 0; i < SHOTS.length; i++) { list = M[SHOTS[i]]; if (list && list[0]) all.push(list[0]); }
    all.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < all.length; i++) A.drawShot(g, s, all[i].id, all[i], all[i].a);
  }

  function render() {
    if (!ctx || !st) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawScene(ctx, st, true);
    if (onDraw) onDraw();
  }

  function offscreen(paint) {
    var c = document.createElement('canvas'), g;
    c.width = canvas.width; c.height = canvas.height; g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(g);
    return c;
  }
  function resize() {
    var r = canvas.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height), d;
    if (w < 20 || h < 20) return;
    d = Math.min(window.devicePixelRatio || 1, 3);
    while (d > 1 && w * d * h * d > 5e6) d -= 0.25;       // keep very large screens light
    if (w === W && h === H && d === dpr) return;
    W = w; H = h; dpr = d;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    st = stageFor(W, H);
    base = offscreen(function (g) { A.drawPlate(g, st); A.drawPancake(g, st); });
    sugarCv = offscreen(function (g) { A.drawSugar(g, st); });
    render();
  }

  var running = false, last = 0;
  function frame(now) {
    var dt = Math.min(50, now - last), busy;
    last = now; busy = tick(dt); render();
    if (busy) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }

  // Move time on by hand (for testing a frame in the middle of an animation).
  function step(ms) { var left = ms; while (left > 0) { tick(Math.min(16, left)); left -= 16; } render(); }

  function counts() {
    var out = {}, id, n, i;
    for (id in M) { n = 0; for (i = 0; i < M[id].length; i++) if (M[id][i].target) n++; if (n) out[id] = n; }
    return out;
  }
  // Where every piece ends up, as text: the same set of toppings always gives the same answer,
  // whatever order they were tapped in.
  function layout() {
    var out = [], id, i, p;
    for (id in M) for (i = 0; i < M[id].length; i++) { p = M[id][i]; if (p.target) out.push(id + ':' + (p.x != null ? p.x : p.tu).toFixed(3) + ',' + (p.y != null ? p.y : p.tv).toFixed(3)); }
    return out.sort().join(' ');
  }
  function animating() {
    var id, i, p;
    if (sugar.a !== sugar.t) return true;
    for (id in M) for (i = 0; i < M[id].length; i++) { p = M[id][i]; if (p.a !== p.target || Math.abs(p.tu - p.u) > 0.001 || Math.abs(p.tv - p.v) > 0.001) return true; }
    return false;
  }

  function init(cv, opts) {
    canvas = cv; ctx = cv.getContext('2d');
    noSugarGroup = (opts && opts.noSugar) || {};
    onDraw = (opts && opts.onDraw) || null;
    buildFixed();
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
  }

  PK.scene = {
    init: init, sync: sync, settle: settle, render: render, resize: resize, step: step,
    stageFor: stageFor, drawStill: function (g, s) { drawScene(g, s, false); },
    counts: counts, layout: layout, animating: animating, layerOf: function (id) { return KIND[id]; },
    sugarOn: function () { return sugar.t === 1; }, sugarShown: function () { return +sugar.a.toFixed(3); }, fixed: FIX
  };
})();
