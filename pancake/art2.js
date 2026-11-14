/* Create your own Dutch pancake: drawing, part 2.
   Everything that goes on top of the pancake: spreads, melted cheese, fresh fruit, sprinkles,
   syrups, the little cups, the shot glasses next to the plate, and the small icons on the buttons. */
(function () {
  'use strict';
  var PK = window.PK, A = PK.art, TAU = A.TAU;
  var rnd = A.rnd, mix = A.mix, rgba = A.rgba, c01 = A.c01, outCubic = A.outCubic, outBack = A.outBack, inQuad = A.inQuad;
  var X = A.X, Y = A.Y, L2S = A.L2S, S = A.S, ell = A.ell, poly = A.poly, blob = A.blob, flatT = A.flatT;

  /* ---------- fresh, laid on top ---------- */

  // A flat slice with a little thickness: the outline is lifted and the side filled in.
  function prism(g, st, p, pts, h, top, side, line) {
    var B = S(st, p, pts), n = B.length, lift = h * st.R * st.up * (p.sc || 1), i, a, b;
    g.fillStyle = side; g.strokeStyle = side; g.lineWidth = 0.6; g.lineJoin = 'round';
    poly(g, B); g.fill();
    for (i = 0; i < n; i++) {
      a = B[i]; b = B[(i + 1) % n];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(b[0], b[1] - lift); g.lineTo(a[0], a[1] - lift); g.closePath(); g.fill(); g.stroke();
    }
    g.beginPath(); g.moveTo(B[0][0], B[0][1] - lift); for (i = 1; i < n; i++) g.lineTo(B[i][0], B[i][1] - lift); g.closePath();
    g.fillStyle = top; g.fill();
    if (line) { g.strokeStyle = line; g.lineWidth = Math.max(0.8, st.R * 0.005); g.stroke(); }
    return lift;
  }
  function ovalPts(n, rx, ry) { var o = [], i, a; for (i = 0; i < n; i++) { a = i / n * TAU; o.push([Math.cos(a) * rx, Math.sin(a) * ry]); } return o; }

  var TOP = {};

  TOP.banana = {
    sr: 0.105, rot: function (th, r) { return th + (r() - 0.5) * 0.7; },
    draw: function (g, st, p) {
      var geo = p.geo || (p.geo = { pts: ovalPts(20, 0.118, 0.07) }), R = st.R * (p.sc || 1);
      var lift = prism(g, st, p, geo.pts, 0.013, '#FBEDB4', '#E3C56A', '#D6B352');
      var q = L2S(st, p, 0, 0), i, a, e;
      // a slice cut on the slant: pale rim, softer middle, three small seed spots
      g.save(); g.translate(q[0], q[1] - lift); g.scale(1, st.k); g.rotate(p.rot || 0);
      g.strokeStyle = 'rgba(236,212,132,0.9)'; g.lineWidth = R * 0.008; g.beginPath(); g.ellipse(0, 0, R * 0.09, R * 0.05, 0, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(243,222,150,0.9)'; g.beginPath(); g.ellipse(0, 0, R * 0.05, R * 0.027, 0, 0, TAU); g.fill();
      g.fillStyle = '#B48A45';
      for (i = 0; i < 3; i++) { a = i * TAU / 3 + 0.5; e = R * 0.017; g.beginPath(); g.ellipse(Math.cos(a) * e * 1.5, Math.sin(a) * e, R * 0.0085, R * 0.005, a, 0, TAU); g.fill(); }
      g.restore();
    }
  };

  TOP.strawberries = {
    sr: 0.07, rot: function (th, r) { return r() * TAU; },
    draw: function (g, st, p) {
      var r = rnd(p.seed), R = st.R * (p.sc || 1), cut = r() < 0.6, q = L2S(st, p, 0, 0), i, a, d;
      function drop(s) {              // a quartered strawberry: round at one end, a point at the other
        g.beginPath(); g.moveTo(0.092 * R * s, 0);
        g.bezierCurveTo(0.03 * R * s, -0.07 * R * s, -0.085 * R * s, -0.072 * R * s, -0.08 * R * s, 0);
        g.bezierCurveTo(-0.085 * R * s, 0.072 * R * s, 0.03 * R * s, 0.07 * R * s, 0.092 * R * s, 0); g.closePath();
      }
      g.save(); g.translate(q[0], q[1]); g.scale(1, 0.78);
      g.save(); g.translate(0, R * 0.016); g.rotate(p.rot || 0); drop(1); g.fillStyle = '#A51B21'; g.fill(); g.restore();
      g.translate(0, -R * 0.012); g.rotate(p.rot || 0);
      drop(1); g.fillStyle = '#E0282B'; g.fill(); g.strokeStyle = '#B01C22'; g.lineWidth = Math.max(0.8, R * 0.006); g.stroke();
      if (cut) {                      // cut side up: pink inside, pale heart
        g.save(); g.translate(-0.004 * R, 0); drop(0.76); g.fillStyle = '#F4776A'; g.fill(); g.restore();
        g.beginPath(); g.moveTo(-0.05 * R, 0); g.quadraticCurveTo(-0.005 * R, -0.022 * R, 0.045 * R, 0); g.quadraticCurveTo(-0.005 * R, 0.022 * R, -0.05 * R, 0);
        g.fillStyle = '#FCD3C6'; g.fill();
      } else {                        // skin side up: seeds and a shine
        g.fillStyle = 'rgba(255,150,140,0.7)'; ell(g, -0.02 * R, -0.022 * R, 0.035 * R, 0.014 * R, -0.3); g.fill();
        g.fillStyle = '#F8D56A';
        for (i = 0; i < 7; i++) { a = r() * TAU; d = Math.sqrt(r()) * 0.05 * R; g.beginPath(); g.arc(Math.cos(a) * d - 0.008 * R, Math.sin(a) * d * 0.8, Math.max(0.6, R * 0.0055), 0, TAU); g.fill(); }
      }
      g.restore();
    }
  };

  TOP.blueberries = {
    sr: 0.07, rot: function (th, r) { return r() * TAU; },
    draw: function (g, st, p) {
      var R = st.R * (p.sc || 1), off = [[0.004, -0.034], [-0.037, 0.01], [0.036, 0.014]], i, q, rr = 0.036 * R, gr;
      for (i = 0; i < 3; i++) {
        q = L2S(st, p, off[i][0], off[i][1]);
        g.fillStyle = 'rgba(40,30,40,0.2)'; ell(g, q[0] + rr * 0.15, q[1] + rr * 0.1, rr * 1.05, rr * 0.6); g.fill();
        gr = g.createRadialGradient(q[0] - rr * 0.35, q[1] - rr * 1.15, rr * 0.1, q[0], q[1] - rr * 0.75, rr * 1.05);
        gr.addColorStop(0, '#7D93DE'); gr.addColorStop(0.55, '#4257A8'); gr.addColorStop(1, '#2A3876');
        g.fillStyle = gr; g.beginPath(); g.arc(q[0], q[1] - rr * 0.75, rr, 0, TAU); g.fill();
        g.strokeStyle = '#222E63'; g.lineWidth = Math.max(0.7, R * 0.005); g.stroke();
        g.fillStyle = '#1E2857'; g.beginPath(); g.arc(q[0] + rr * 0.15, q[1] - rr * 1.2, rr * 0.26, 0, TAU); g.fill();   // the little crown
        g.fillStyle = 'rgba(160,178,235,0.9)'; g.beginPath(); g.arc(q[0] + rr * 0.15, q[1] - rr * 1.2, rr * 0.1, 0, TAU); g.fill();
      }
    }
  };

  TOP.mango = {
    sr: 0.1, rot: function (th, r) { return th + 1.05 + (r() - 0.5) * 0.3; },
    draw: function (g, st, p) {
      var geo = p.geo, i, t, x, b, top, bot, lift, q;
      if (!geo) {
        top = []; bot = [];
        for (i = 0; i <= 12; i++) { t = i / 12; x = (t - 0.5) * 0.27; b = 0.03 * Math.sin(t * Math.PI); top.push([x, -b - 0.034 * Math.sin(t * Math.PI) - 0.004]); bot.push([x, -b + 0.022 * Math.sin(t * Math.PI) + 0.004]); }
        geo = p.geo = { pts: top.concat(bot.reverse()), top: top };
      }
      lift = prism(g, st, p, geo.pts, 0.024, '#FBBC3C', '#DF9226', '#D98C22');
      g.beginPath();
      for (i = 2; i <= 10; i++) { q = L2S(st, p, geo.top[i][0], geo.top[i][1] + 0.014); if (i > 2) g.lineTo(q[0], q[1] - lift); else g.moveTo(q[0], q[1] - lift); }
      g.strokeStyle = 'rgba(255,224,130,0.95)'; g.lineWidth = Math.max(0.8, st.R * (p.sc || 1) * 0.009); g.lineCap = 'round'; g.stroke();
    }
  };

  TOP.papaya = {
    sr: 0.075, rot: function (th, r) { return r() * TAU; },
    draw: function (g, st, p) {
      var geo = p.geo, r, lift, a, b, j;
      if (!geo) { r = rnd(p.seed); j = function () { return (r() - 0.5) * 0.014; }; geo = p.geo = { pts: [[-0.07 + j(), -0.04 + j()], [0.07 + j(), -0.04 + j()], [0.075 + j(), 0.04 + j()], [-0.07 + j(), 0.042 + j()]] }; }
      lift = prism(g, st, p, geo.pts, 0.045, '#F78F56', '#D76B35', '#CC6230');
      a = L2S(st, p, -0.04, -0.012); b = L2S(st, p, 0.04, -0.016);
      g.beginPath(); g.moveTo(a[0], a[1] - lift); g.lineTo(b[0], b[1] - lift);
      g.strokeStyle = 'rgba(255,196,150,0.9)'; g.lineWidth = Math.max(0.8, st.R * (p.sc || 1) * 0.011); g.lineCap = 'round'; g.stroke();
    }
  };

  TOP.pineapple = {
    sr: 0.085, rot: function (th, r) { return th + (r() - 0.5) * 1.1; },
    draw: function (g, st, p) {
      var geo = p.geo || (p.geo = { pts: [[-0.105, -0.034], [0.105, -0.03], [0.102, 0.034], [-0.103, 0.032]] }), lift, i, a, b;
      lift = prism(g, st, p, geo.pts, 0.038, '#F9DE5E', '#DBAE2B', '#CFA226');
      g.strokeStyle = 'rgba(214,170,40,0.85)'; g.lineWidth = Math.max(0.7, st.R * (p.sc || 1) * 0.005); g.lineCap = 'round';
      for (i = -2; i <= 2; i++) {     // the fibres run across
        a = L2S(st, p, i * 0.04 - 0.008, -0.022); b = L2S(st, p, i * 0.04 + 0.008, 0.022);
        g.beginPath(); g.moveTo(a[0], a[1] - lift); g.lineTo(b[0], b[1] - lift); g.stroke();
      }
    }
  };

  TOP.rum_raisins = {
    sr: 0.075, rot: function (th, r) { return r() * TAU; },
    draw: function (g, st, p) {
      var R = st.R * (p.sc || 1), off = [[-0.03, -0.012, 0.4], [0.026, -0.018, -0.5], [-0.004, 0.022, 0.1], [0.045, 0.02, 0.9]], i, q;
      q = L2S(st, p, 0.004, 0.004);   // a little puddle of rum
      g.fillStyle = 'rgba(214,128,30,0.62)'; ell(g, q[0], q[1], R * 0.092, R * 0.078 * st.k); g.fill();
      g.strokeStyle = 'rgba(160,84,18,0.45)'; g.lineWidth = Math.max(0.7, R * 0.005); g.stroke();
      g.fillStyle = 'rgba(255,220,150,0.6)'; ell(g, q[0] - R * 0.04, q[1] - R * 0.012, R * 0.02, R * 0.006, -0.2); g.fill();
      for (i = 0; i < 4; i++) {       // plump and shiny
        q = L2S(st, p, off[i][0], off[i][1]);
        g.fillStyle = '#6A2A2E'; ell(g, q[0], q[1] - R * 0.012, R * 0.033, R * 0.023, off[i][2]); g.fill();
        g.strokeStyle = '#3A1418'; g.lineWidth = Math.max(0.6, R * 0.004); g.stroke();
        g.fillStyle = 'rgba(255,235,220,0.9)'; ell(g, q[0] - R * 0.01, q[1] - R * 0.021, R * 0.009, R * 0.0045, -0.5); g.fill();
      }
    }
  };

  // a: 0 = not there, 1 = lying on the pancake. It drops from above and lands with a small squash.
  function drawTop(g, st, id, p, a) {
    var def = TOP[id], icon = !!st.icon, t = icon ? 1 : c01(a / 0.62), land = icon ? 0 : c01((a - 0.62) / 0.38);
    var fall = -(1 - t * t) * st.R * 0.7, sq = Math.sin(land * Math.PI), bx = X(st, p.u), by = Y(st, p.v), s = p.sc || 1;
    g.save();
    if (!icon) {
      g.globalAlpha *= Math.min(1, a * 5);
      g.fillStyle = 'rgba(70,40,5,' + (0.2 * t).toFixed(3) + ')';
      ell(g, bx + st.R * 0.01, by + st.R * 0.012, def.sr * st.R * s * (1.5 - 0.4 * t), def.sr * st.R * st.k * s * (1.5 - 0.4 * t)); g.fill();
    }
    g.translate(bx, by + fall); g.scale(1 + 0.14 * sq, 1 - 0.2 * sq); g.translate(-bx, -by);
    def.draw(g, st, p);
    g.restore();
  }

  /* ---------- sprinkled over ---------- */

  var SPRINKLE = {};
  SPRINKLE.coconut = function (g, st, p, a) {
    var R = st.R * (p.sc || 1), r = rnd(p.seed), bend = (r() - 0.5) * 0.03, len = 0.028 + r() * 0.03;
    var t = c01(a / 0.7), fall = st.icon ? 0 : -(1 - t * t) * st.R * 0.5;
    var q0 = L2S(st, p, -len, 0), q1 = L2S(st, p, 0, bend), q2 = L2S(st, p, len, 0);
    g.save(); g.globalAlpha *= Math.min(1, a * 4); g.translate(0, fall); g.lineCap = 'round';
    g.beginPath(); g.moveTo(q0[0], q0[1] + 1); g.quadraticCurveTo(q1[0], q1[1] + 1, q2[0], q2[1] + 1);
    g.strokeStyle = 'rgba(120,80,20,0.28)'; g.lineWidth = Math.max(1.4, R * 0.011); g.stroke();
    g.beginPath(); g.moveTo(q0[0], q0[1]); g.quadraticCurveTo(q1[0], q1[1], q2[0], q2[1]);
    g.strokeStyle = '#FFFEF6'; g.lineWidth = Math.max(1.2, R * 0.0095); g.stroke();
    g.restore();
  };
  SPRINKLE.chocolate_chips = function (g, st, p, a) {
    var R = st.R * (p.sc || 1), q = L2S(st, p, 0, 0), w = 0.027 * R, h = 0.034 * R * (st.up / 0.866);
    var t = c01(a / 0.7), fall = st.icon ? 0 : -(1 - t * t) * st.R * 0.5;
    g.save(); g.globalAlpha *= Math.min(1, a * 4);
    g.fillStyle = 'rgba(50,25,5,0.22)'; ell(g, q[0] + w * 0.2, q[1] + w * 0.15, w * 1.15, w * 1.15 * st.k); g.fill();
    g.translate(0, fall);
    g.beginPath(); g.moveTo(q[0] - w, q[1]); g.ellipse(q[0], q[1], w, w * st.k, 0, Math.PI, 0, true);
    g.quadraticCurveTo(q[0] + w * 0.75, q[1] - h * 0.55, q[0] + w * 0.1, q[1] - h);
    g.quadraticCurveTo(q[0] - w * 0.8, q[1] - h * 0.5, q[0] - w, q[1]); g.closePath();
    g.fillStyle = '#4C2B1B'; g.fill(); g.strokeStyle = '#2E170D'; g.lineWidth = Math.max(0.6, R * 0.004); g.stroke();
    g.fillStyle = 'rgba(170,115,80,0.9)'; ell(g, q[0] - w * 0.3, q[1] - h * 0.4, w * 0.22, h * 0.2, 0.6); g.fill();
    g.restore();
  };

  /* ---------- poured over: syrups and honey ---------- */

  function zig(passes, angle, ext, ph) {
    var out = [], N = passes * 18, i, s, y, xm, x, c = Math.cos(angle), n = Math.sin(angle);
    for (i = 0; i <= N; i++) {
      s = i / N; y = -ext + 2 * ext * s; xm = Math.sqrt(Math.max(0.02, 0.86 * 0.86 - y * y)) * 0.93;
      x = xm * Math.sin(s * passes * Math.PI + ph) + 0.012 * Math.sin(s * 61 + ph);
      out.push([x * c - y * n, x * n + y * c]);
    }
    return out;
  }
  function spiral() {
    var out = [], N = 230, i, s, r, th;
    for (i = 0; i <= N; i++) { s = i / N; r = 0.05 + 0.75 * s + 0.012 * Math.sin(s * 40); th = s * 3.5 * TAU + 0.8; out.push([Math.cos(th) * r, Math.sin(th) * r]); }
    return out;
  }
  function scribble() {
    var out = [], N = 260, i, t;
    for (i = 0; i <= N; i++) { t = i / N * TAU; out.push([0.6 * Math.sin(2.3 * t + 0.5) + 0.03 * Math.sin(19 * t), 0.58 * Math.sin(3.1 * t + 0.2) + 0.03 * Math.cos(17 * t)]); }
    return out;
  }
  var DRIZ = {
    chocolate_syrup: { c: '#4A2818', hi: '#93603E', w: 0.023, path: zig(8, -0.45, 0.8, 0.4) },
    strawberry_syrup: { c: '#D8253E', hi: '#F9909E', w: 0.021, path: zig(7, 0.7, 0.78, 2.2) },
    caramel_syrup: { c: '#C3741B', hi: '#F2BC66', w: 0.022, path: spiral() },
    honey: { c: '#F0A81C', hi: '#FFE28A', w: 0.024, path: scribble() }
  };
  // a: how much of the line has been poured.
  function drawDrizzle(g, st, id, p, a) {
    var d = DRIZ[id], P = d.path, n = Math.max(2, Math.round(P.length * c01(a))), i, w = d.w * (p.sc || 1);
    function trace(dx, dy) { g.beginPath(); g.moveTo(P[0][0] + dx, P[0][1] + dy); for (i = 1; i < n; i++) g.lineTo(P[i][0] + dx, P[i][1] + dy); }
    g.save(); flatT(g, st); g.lineCap = 'round'; g.lineJoin = 'round';
    trace(0.004, 0.012); g.strokeStyle = 'rgba(70,35,5,0.2)'; g.lineWidth = w * 1.25; g.stroke();
    trace(0, 0); g.strokeStyle = d.c; g.lineWidth = w; g.stroke();
    trace(-0.003, -0.006); g.strokeStyle = rgba(d.hi, 0.85); g.lineWidth = w * 0.28; g.stroke();
    g.restore();
  }

  /* ---------- spread on, and melted over: one soft shape made of many round blobs ---------- */

  function ringCircles(seed, spec, gx, gy) {
    var r = rnd(seed), out = [], i, j, s, a0, a, d;
    for (i = 0; i < spec.length; i++) {
      s = spec[i]; a0 = r() * TAU;
      for (j = 0; j < s[0]; j++) {
        a = a0 + j / s[0] * TAU + (r() - 0.5) * 0.3; d = s[1] + (r() - 0.5) * 2 * s[2];
        out.push([(gx || 0) + Math.cos(a) * d, (gy || 0) + Math.sin(a) * d, s[3] + r() * (s[4] - s[3]), gx || 0, gy || 0]);
      }
    }
    return out;
  }
  function pools(seed, n, dist, a0, spec, centre) {
    var out = [], i, a;
    for (i = 0; i < n; i++) { a = a0 + i / n * TAU; out = out.concat(ringCircles(seed + i * 13, spec, Math.cos(a) * dist, Math.sin(a) * dist)); }
    if (centre) out = out.concat(ringCircles(seed + 999, spec, 0.02, 0.01));
    return out;
  }
  function brieSlices(pool) {
    var out = [], r = rnd(57), i, j, a, cx, cy, tx, ty;
    for (i = 0; i < 5; i++) {
      a = 0.9 + i / 5 * TAU; cx = Math.cos(a) * 0.46; cy = Math.sin(a) * 0.46; tx = -Math.sin(a + 0.4); ty = Math.cos(a + 0.4);
      if (pool) for (j = -1; j <= 1; j++) out.push([cx + tx * j * 0.1 - ty * (r() - 0.5) * 0.09, cy + ty * j * 0.1 + tx * (r() - 0.5) * 0.09, 0.085 + r() * 0.04, cx, cy]);
      else for (j = -3; j <= 3; j++) out.push([cx + tx * j * 0.043, cy + ty * j * 0.043, 0.05 - Math.abs(j) * 0.003, cx, cy]);
    }
    return out;
  }
  function spots(seed, n, rmax, smin, smax) {
    var r = rnd(seed), out = [], i, a, d;
    for (i = 0; i < n; i++) { a = r() * TAU; d = Math.sqrt(r()) * rmax; out.push([Math.cos(a) * d, Math.sin(a) * d, smin + r() * (smax - smin)]); }
    return out;
  }

  var BLOB = {
    gouda: {
      alpha: 0.88, passes: [[0.014, '#D48E1B'], [0, '#F7BE38']],
      circles: ringCircles(11, [[1, 0, 0, 0.3, 0.3], [7, 0.35, 0.04, 0.2, 0.26], [12, 0.6, 0.05, 0.12, 0.2]]),
      holes: [[0.33, -0.2, 0.06], [-0.3, 0.32, 0.07], [-0.42, -0.24, 0.05], [0.12, 0.42, 0.045], [0.5, 0.26, 0.05], [-0.05, -0.47, 0.04]], holeEdge: '#D48E1B',
      hi: spots(31, 9, 0.6, 0.05, 0.1), hiColor: 'rgba(253,226,140,0.75)',
      dots: spots(32, 12, 0.62, 0.012, 0.024), dotColor: 'rgba(214,132,30,0.75)'
    },
    mozzarella: {
      alpha: 0.9, passes: [[0.011, '#DCCB9F'], [0, '#FFFAEC']],
      circles: pools(21, 6, 0.5, 0.3, [[1, 0, 0, 0.085, 0.11], [3, 0.075, 0.035, 0.045, 0.09], [2, 0.12, 0.03, 0.03, 0.05]], true),
      hi: spots(33, 0, 0, 0, 0), hiColor: '#FFFFFF',
      dots: [[0.45, 0.2, 0.02], [-0.2, 0.45, 0.018], [-0.48, -0.1, 0.02], [0.12, -0.5, 0.017], [0.0, 0.03, 0.02], [0.4, -0.34, 0.016], [-0.33, -0.4, 0.016]], dotColor: 'rgba(226,170,84,0.7)'
    },
    brie: {
      alpha: 0.97, passes: [[0.017, '#D2C093'], [0.011, '#FFFDF5'], [-0.013, '#F9EBBB']],
      circles: brieSlices(false), pool: brieSlices(true), poolPasses: [[0.011, '#DDBE72'], [0, '#F6E2A0']],
      hi: spots(34, 0, 0, 0, 0), hiColor: '#FFF',
      dots: [], dotColor: '#000'
    },
    nutella: {
      alpha: 0.97, passes: [[0.012, '#3A2013'], [0, '#5E3622']],
      circles: ringCircles(41, [[1, 0, 0, 0.27, 0.27], [6, 0.27, 0.03, 0.18, 0.22], [9, 0.45, 0.04, 0.1, 0.15]]),
      swirl: '#86553B', gloss: 'rgba(255,235,215,0.4)', dots: [], hi: []
    },
    peanut_butter: {
      alpha: 0.97, passes: [[0.012, '#A56F30'], [0, '#CB9654']],
      circles: ringCircles(43, [[1, 0, 0, 0.27, 0.27], [6, 0.27, 0.03, 0.18, 0.22], [9, 0.45, 0.04, 0.1, 0.15]]),
      swirl: '#E2B678', gloss: 'rgba(255,245,220,0.45)', dots: spots(44, 9, 0.42, 0.012, 0.02), dotColor: 'rgba(160,104,44,0.8)', hi: []
    }
  };

  function circlesPath(s, list, grow) {
    var i, c, r;
    s.beginPath();
    for (i = 0; i < list.length; i++) { c = list[i]; r = c[2] + grow; if (r > 0.002) { s.moveTo(c[0] + r, c[1]); s.arc(c[0], c[1], r, 0, TAU); } }
  }
  // The shared spare canvas the soft shapes are painted on, so they can be laid over the pancake slightly see-through.
  function blobLayer(g, alpha, paint) {
    var cv = g.canvas, sc = PK._scratch || (PK._scratch = document.createElement('canvas')), s;
    if (sc.width !== cv.width || sc.height !== cv.height) { sc.width = cv.width; sc.height = cv.height; }
    s = sc.getContext('2d'); s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, sc.width, sc.height);
    s.setTransform(g.getTransform());
    paint(s);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = alpha; g.drawImage(sc, 0, 0); g.restore();
  }
  // a: 0 = nothing, 1 = fully melted (or spread). It starts in the middle of each pool and runs outwards.
  function drawBlob(g, st, id, p, a, under) {
    var b = BLOB[id], list, plist, i, c, late = c01((a - 0.55) / 0.45), ou = p.u || 0, ov = p.v || 0;
    function grown(src, lag) {
      var out = [], k, q, d, gi, f;
      for (k = 0; k < src.length; k++) {
        q = src[k]; d = Math.sqrt(q[3] * q[3] + q[4] * q[4]) * 0.5 + Math.sqrt((q[0] - q[3]) * (q[0] - q[3]) + (q[1] - q[4]) * (q[1] - q[4]));
        gi = outCubic((a - lag - 0.42 * Math.min(1, d / 0.8)) / (0.58 - lag)); f = 0.5 + 0.5 * gi;
        if (gi > 0) out.push([q[3] + (q[0] - q[3]) * f, q[4] + (q[1] - q[4]) * f, q[2] * gi]);
      }
      return out;
    }
    list = grown(b.circles, 0); plist = b.pool ? grown(b.pool, 0.18) : [];
    if (!list.length) return;
    blobLayer(g, b.alpha * Math.min(1, a * 3), function (s) {
      s.save(); flatT(s, st); s.translate(ou, ov);
      if (plist.length) for (i = 0; i < b.poolPasses.length; i++) { circlesPath(s, plist, b.poolPasses[i][0]); s.fillStyle = b.poolPasses[i][1]; s.fill(); }
      for (i = 0; i < b.passes.length; i++) { circlesPath(s, list, b.passes[i][0]); s.fillStyle = b.passes[i][1]; s.fill(); }
      if (under && under.length) {    // what is cooked in shows as shapes under the cheese
        s.restore(); s.globalCompositeOperation = 'source-atop';
        for (i = 0; i < under.length; i++) A.cookedRelief(s, st, under[i].id, under[i], Math.min(1, a * 1.4) * under[i].a);
        s.globalCompositeOperation = 'source-over';
        s.save(); flatT(s, st); s.translate(ou, ov);
      }
      if (late > 0) {
        s.globalAlpha = late;
        if (b.hi && b.hi.length) {
          s.save(); circlesPath(s, list, -0.02); s.clip(); s.fillStyle = b.hiColor;
          for (i = 0; i < b.hi.length; i++) { c = b.hi[i]; s.beginPath(); s.ellipse(c[0] - 0.01, c[1] - 0.02, c[2] * 1.3, c[2] * 0.55, -0.4, 0, TAU); s.fill(); }
          s.restore();
        }
        if (b.swirl) {                // the marks of the knife
          s.save(); circlesPath(s, list, -0.03); s.clip(); s.lineCap = 'round';
          s.strokeStyle = b.swirl; s.lineWidth = 0.03;
          s.beginPath(); s.arc(0.02, 0.0, 0.14, 0.6, 4.6); s.stroke();
          s.beginPath(); s.arc(-0.02, 0.02, 0.3, 3.4, 6.6); s.stroke();
          s.beginPath(); s.arc(0.0, -0.02, 0.43, 0.4, 2.7); s.stroke();
          s.strokeStyle = b.gloss; s.lineWidth = 0.012;
          s.beginPath(); s.arc(-0.02, 0.0, 0.2, 3.5, 4.5); s.stroke();
          s.beginPath(); s.arc(0.0, 0.0, 0.36, 3.6, 4.2); s.stroke();
          s.restore();
        }
        if (b.dots && b.dots.length) {
          s.save(); circlesPath(s, list, -0.012); s.clip(); s.fillStyle = b.dotColor;
          for (i = 0; i < b.dots.length; i++) { c = b.dots[i]; s.beginPath(); s.arc(c[0], c[1], c[2], 0, TAU); s.fill(); }
          s.restore();
        }
        if (b.holes) {                // gaps in the melted cheese, where the pancake shows
          s.globalAlpha = 1;
          s.strokeStyle = b.holeEdge; s.lineWidth = 0.016;
          for (i = 0; i < b.holes.length; i++) { c = b.holes[i]; s.beginPath(); s.arc(c[0], c[1], c[2] * late + 0.004, 0, TAU); s.stroke(); }
          s.globalCompositeOperation = 'destination-out';
          for (i = 0; i < b.holes.length; i++) { c = b.holes[i]; s.beginPath(); s.arc(c[0], c[1], c[2] * late, 0, TAU); s.fill(); }
          s.globalCompositeOperation = 'source-over';
        }
      }
      s.restore();
    });
  }

  /* ---------- the little cups ---------- */

  var ICE = {
    ice_vanilla: { c: '#FAF0CC', bits: '#C9AA6A', n: 9, bs: 0.035 },
    ice_chocolate: { c: '#7D4B2D', bits: '#4C2916', n: 7, bs: 0.055 },
    ice_strawberry: { c: '#F6A8BA', bits: '#E05676', n: 8, bs: 0.055 },
    ice_oreo: { c: '#F1ECE4', bits: '#33282A', n: 10, bs: 0.085 },
    ice_hazelnut: { c: '#D0A16E', bits: '#8B5B30', n: 8, bs: 0.065 },
    ice_pistachio: { c: '#BEDA92', bits: '#789F49', n: 8, bs: 0.06 }
  };

  // p.rc is the radius of the cup's rim. a: first the cup pops up, then the scoop plops in (or the cream is piped).
  function drawCup(g, st, id, p, a) {
    var icon = !!st.icon, R = st.R, k = st.k, rc = (p.rc || 0.17) * R, x0 = X(st, p.u), y0 = Y(st, p.v);
    var rb = rc * 0.76, H = rc * 1.2 * st.up, yT = y0 - H, i, lg, pop, fill, th, t, dy, sq, rs, cyS, r, f, ang, d, tiers, rj, cyj, pts, m, sj;
    pop = icon ? 1 : outBack(a / 0.42); fill = icon ? 1 : c01((a - 0.3) / 0.7);
    function wallBand(h1, h2) {
      var r1 = rb + (rc - rb) * h1, r2 = rb + (rc - rb) * h2, y1 = y0 - H * h1, y2 = y0 - H * h2;
      g.beginPath(); g.moveTo(x0 - r1, y1); g.ellipse(x0, y1, r1, r1 * k, 0, Math.PI, 0, true);
      g.lineTo(x0 + r2, y2); g.ellipse(x0, y2, r2, r2 * k, 0, 0, Math.PI, false); g.closePath();
    }
    g.save();
    if (!icon) {
      g.globalAlpha *= Math.min(1, a * 5);
      g.fillStyle = 'rgba(70,40,5,0.24)'; ell(g, x0 + rc * 0.14, y0 + rc * 0.06, rb * 1.3 * pop, rb * 1.3 * k * pop); g.fill();
    }
    g.translate(x0, y0); g.scale(pop, pop); g.translate(-x0, -y0);

    g.fillStyle = '#D9C59C'; ell(g, x0, yT, rc, rc * k); g.fill();   // the inside

    if (id !== 'whipped_cream' && fill > 0) {
      // one scoop
      f = ICE[id]; t = c01(fill / 0.6); dy = -(1 - inQuad(t)) * rc * 2.4; sq = Math.sin(c01((fill - 0.6) / 0.4) * Math.PI);
      rs = rc * 0.97; cyS = yT - rc * 0.4;
      g.save(); g.globalAlpha *= Math.min(1, fill * 6);
      g.translate(x0, yT + dy); g.scale(1 + 0.1 * sq, 1 - 0.14 * sq); g.translate(-x0, -yT);
      g.fillStyle = f.c;
      for (i = 0; i < 6; i++) {       // the ruffle where the scoop was pressed off
        th = (0.08 + i * 0.168) * Math.PI;
        g.beginPath(); g.arc(x0 + Math.cos(th) * rc * 0.88, yT + Math.sin(th) * rc * k * 0.7 - rc * 0.06, rc * 0.24, 0, TAU); g.fill();
      }
      g.beginPath(); g.arc(x0, cyS, rs, 0, TAU); g.fill();
      g.save(); g.clip();
      g.fillStyle = mix(f.c, '#8A5A20', 0.2); ell(g, x0 + rs * 0.42, cyS + rs * 0.78, rs * 1.0, rs * 0.5, -0.35); g.fill();
      g.fillStyle = mix(f.c, '#FFFFFF', 0.55); ell(g, x0 - rs * 0.36, cyS - rs * 0.45, rs * 0.36, rs * 0.2, -0.6); g.fill();
      r = rnd(p.seed || 5);
      g.fillStyle = f.bits;
      for (i = 0; i < f.n; i++) { ang = r() * TAU; d = Math.sqrt(r()) * rs * 0.78; ell(g, x0 + Math.cos(ang) * d, cyS + Math.sin(ang) * d, rs * f.bs * (0.7 + r() * 0.7), rs * f.bs * (0.5 + r() * 0.5), r() * 3); g.fill(); }
      g.restore();
      g.beginPath(); g.arc(x0, cyS, rs, Math.PI * 1.02, Math.PI * 1.98); g.strokeStyle = mix(f.c, '#3A2A10', 0.3); g.lineWidth = Math.max(0.8, rc * 0.035); g.stroke();
      g.restore();
    }

    // the front of the cup, with its green band
    wallBand(0, 1);
    lg = g.createLinearGradient(x0 - rc, 0, x0 + rc, 0); lg.addColorStop(0, '#FCF5E4'); lg.addColorStop(0.55, '#F3E6C9'); lg.addColorStop(1, '#D9C59D');
    g.fillStyle = lg; g.fill(); g.strokeStyle = '#B49C72'; g.lineWidth = Math.max(0.8, rc * 0.035); g.lineJoin = 'round'; g.stroke();
    wallBand(0.3, 0.47); g.fillStyle = '#95C456'; g.fill();
    g.beginPath(); g.ellipse(x0, yT, rc, rc * k, 0, 0, Math.PI, false); g.strokeStyle = '#FFFCF1'; g.lineWidth = Math.max(1, rc * 0.07); g.stroke();

    if (id === 'whipped_cream') {
      // piped up in a swirl, a little over the rim, like the real one
      tiers = [1.1, 0.92, 0.7, 0.46, 0.24];
      for (i = 0; i < tiers.length; i++) {
        sj = icon ? 1 : outBack((fill - i * 0.16) / 0.3); if (sj <= 0) continue;
        rj = rc * tiers[i] * sj; cyj = yT - rc * (0.04 + 0.33 * i) * (st.up / 0.866);
        pts = [];
        for (m = 0; m < 14; m++) { ang = m / 14 * TAU + i * 0.5; d = (m % 2 ? 1.07 : 0.9); pts.push([x0 + Math.cos(ang) * rj * d, cyj + Math.sin(ang) * rj * d * 0.5]); }
        blob(g, pts);
        lg = g.createLinearGradient(0, cyj - rj * 0.5, 0, cyj + rj * 0.55); lg.addColorStop(0, '#FFFFFF'); lg.addColorStop(0.55, '#FBFCFE'); lg.addColorStop(1, '#D5DCE8');
        g.fillStyle = lg; g.fill(); g.strokeStyle = '#C3CCDA'; g.lineWidth = Math.max(0.7, rc * 0.03); g.stroke();
      }
      sj = icon ? 1 : outBack((fill - 0.8) / 0.2);
      if (sj > 0) {                   // the curl on top
        cyj = yT - rc * (0.04 + 0.33 * 4.45) * (st.up / 0.866);
        g.beginPath(); g.moveTo(x0 - rc * 0.2, cyj + rc * 0.1); g.quadraticCurveTo(x0 - rc * 0.1, cyj - rc * 0.28 * sj, x0 + rc * 0.16 * sj, cyj - rc * 0.3 * sj);
        g.quadraticCurveTo(x0 + rc * 0.12, cyj - rc * 0.05, x0 + rc * 0.2, cyj + rc * 0.1); g.closePath();
        g.fillStyle = '#FFFFFF'; g.fill(); g.strokeStyle = '#C3CCDA'; g.stroke();
      }
    } else if (fill > 0.75) {
      // two small drips over the rim
      f = ICE[id]; g.fillStyle = f.c; g.globalAlpha *= c01((fill - 0.75) / 0.25);
      ell(g, x0 - rc * 0.45, yT + rc * k * 0.92, rc * 0.17, rc * 0.2); g.fill();
      ell(g, x0 + rc * 0.3, yT + rc * k * 0.98, rc * 0.13, rc * 0.15); g.fill();
    }
    g.restore();
  }

  /* ---------- the shot glasses next to the plate ---------- */

  var SHOT = { banana_liqueur: '#F5D63C', rum: '#D38B28', coconut_rum: '#F3F8F6', amaretto: '#8E3C1B', grand_marnier: '#F28C1C' };

  // p.x, p.y: where the glass stands, measured from the middle of the plate in pancake radii (on the screen).
  function drawShot(g, st, id, p, a) {
    var icon = !!st.icon, R = st.R * (p.sc || 1), k = st.k * 0.85, x0 = st.cx + p.x * st.R, y0 = st.cy + p.y * st.R;
    var rt = 0.098 * R, rb = rt * 0.72, H = 0.29 * R * st.up, yT = y0 - H, pop = icon ? 1 : outBack(a / 0.5), lvl = icon ? 1 : outCubic((a - 0.35) / 0.65);
    var col = SHOT[id], hb = 0.16, hl = hb + 0.6 * lvl;
    function band(h1, h2) {
      var r1 = rb + (rt - rb) * h1, r2 = rb + (rt - rb) * h2, y1 = y0 - H * h1, y2 = y0 - H * h2;
      g.beginPath(); g.moveTo(x0 - r1, y1); g.ellipse(x0, y1, r1, r1 * k, 0, Math.PI, 0, true);
      g.lineTo(x0 + r2, y2); g.ellipse(x0, y2, r2, r2 * k, 0, 0, Math.PI, false); g.closePath();
    }
    g.save();
    if (!icon) {
      g.globalAlpha *= Math.min(1, a * 5);
      g.fillStyle = 'rgba(0,50,110,0.2)'; ell(g, x0 + rt * 0.25, y0 + rt * 0.1, rb * 1.35 * pop, rb * 1.35 * k * pop); g.fill();
    }
    g.translate(x0, y0); g.scale(pop, pop); g.translate(-x0, -y0);
    // the glass
    band(0, 1); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; ell(g, x0, yT, rt, rt * k); g.fill();
    // the drink
    if (lvl > 0.02) {
      band(hb, hl); g.fillStyle = rgba(col, 0.92); g.fill();
      ell(g, x0, y0 - H * hl, rb + (rt - rb) * hl, (rb + (rt - rb) * hl) * k); g.fillStyle = mix(col, '#FFFFFF', 0.4); g.fill();
      g.strokeStyle = mix(col, '#5A3A10', 0.25); g.lineWidth = Math.max(0.6, rt * 0.04); g.stroke();
    }
    // the thick bottom
    band(0, hb); g.fillStyle = 'rgba(214,232,247,0.9)'; g.fill();
    band(0, 1); g.strokeStyle = 'rgba(0,78,173,0.6)'; g.lineWidth = Math.max(0.8, rt * 0.055); g.lineJoin = 'round'; g.stroke();
    ell(g, x0, yT, rt, rt * k); g.stroke();
    // Linda's blue swirl on the front, like on the real shot glasses
    g.fillStyle = '#27AAE1'; ell(g, x0 + rt * 0.02, y0 - H * 0.46, rt * 0.36, rt * 0.36); g.fill();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(0.6, rt * 0.05); ell(g, x0 + rt * 0.02, y0 - H * 0.46, rt * 0.22, rt * 0.22); g.stroke();
    // a shine down the side
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = Math.max(0.8, rt * 0.1); g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0 - rt * 0.68, yT + H * 0.2); g.lineTo(x0 - rb * 0.74, y0 - H * 0.24); g.stroke();
    g.restore();
  }

  /* ---------- the icons on the buttons ---------- */

  function icoSt(s, m, k, up) { return { cx: s / 2, cy: s / 2, R: s * m, k: k == null ? 0.82 : k, up: up == null ? 0.7 : up, icon: true }; }
  function squiggle(g, s, col, hi) {
    var i, t;
    function tr(dx, dy) { g.beginPath(); for (i = 0; i <= 40; i++) { t = i / 40; var x = s * (0.16 + 0.68 * t) + dx, y = s * (0.5 + 0.2 * Math.sin(t * TAU * 1.75)) + dy; if (i) g.lineTo(x, y); else g.moveTo(x, y); } }
    g.lineCap = 'round'; g.lineJoin = 'round';
    tr(0, 0); g.strokeStyle = col; g.lineWidth = s * 0.13; g.stroke();
    tr(-s * 0.012, -s * 0.03); g.strokeStyle = hi; g.lineWidth = s * 0.035; g.stroke();
  }
  function wedge(g, s, face, rind, top, holes) {
    // a wedge of cheese seen from the side
    g.lineJoin = 'round';
    g.beginPath(); g.moveTo(s * 0.12, s * 0.62); g.lineTo(s * 0.86, s * 0.34); g.lineTo(s * 0.88, s * 0.6); g.lineTo(s * 0.14, s * 0.84); g.closePath();
    g.fillStyle = face; g.fill();
    g.beginPath(); g.moveTo(s * 0.12, s * 0.62); g.lineTo(s * 0.56, s * 0.24); g.lineTo(s * 0.86, s * 0.34); g.closePath();
    g.fillStyle = top; g.fill();
    g.strokeStyle = rind; g.lineWidth = s * 0.055;
    g.beginPath(); g.moveTo(s * 0.56, s * 0.24); g.lineTo(s * 0.86, s * 0.34); g.lineTo(s * 0.88, s * 0.6); g.stroke();
    if (holes) { g.fillStyle = holes; ell(g, s * 0.4, s * 0.66, s * 0.05, s * 0.04); g.fill(); ell(g, s * 0.64, s * 0.56, s * 0.04, s * 0.033); g.fill(); }
  }
  function dollop(g, s, col, edge, swirl) {
    var pts = [], i, a, d;
    for (i = 0; i < 12; i++) { a = i / 12 * TAU; d = s * (0.33 + 0.035 * Math.sin(3 * a + 1)); pts.push([s / 2 + Math.cos(a) * d * 1.08, s * 0.52 + Math.sin(a) * d * 0.8]); }
    blob(g, pts); g.fillStyle = col; g.fill(); g.strokeStyle = edge; g.lineWidth = s * 0.03; g.stroke();
    g.strokeStyle = swirl; g.lineWidth = s * 0.06; g.lineCap = 'round';
    g.beginPath(); g.ellipse(s * 0.5, s * 0.52, s * 0.17, s * 0.11, 0, 0.5, 4.6); g.stroke();
    g.beginPath(); g.ellipse(s * 0.5, s * 0.52, s * 0.05, s * 0.03, 0, 2.5, 6.0); g.stroke();
  }

  function icon(g, id, s) {
    var st, i, P, r;
    function cooked(m, ps) { st = icoSt(s, m, 1); for (i = 0; i < ps.length; i++) A.drawCooked(g, st, id, { u: ps[i][0], v: ps[i][1], rot: ps[i][2] || 0, seed: 7 + i * 31, sc: 1 }, 1); }
    function top(m, ps, k) { st = icoSt(s, m, k == null ? 0.8 : k, 0.75); for (i = 0; i < ps.length; i++) drawTop(g, st, id, { u: ps[i][0], v: ps[i][1], rot: ps[i][2] || 0, seed: 11 + i * 17, sc: 1 }, 1); }
    g.save();
    switch (id) {
      case 'bacon': cooked(1.55, [[-0.02, -0.11, -0.25], [0.02, 0.1, -0.12]]); break;
      case 'apple': cooked(2.35, [[0, 0, 0]]); break;
      case 'raisins': cooked(6.2, [[-0.03, 0.012, 0.3], [0.03, 0.018, -0.4], [0.002, -0.028, 1.2]]); break;
      case 'ham': cooked(4.4, [[-0.045, 0.02, 0.3], [0.045, 0.03, -0.2], [0.005, -0.045, 0.7]]); break;
      case 'mushroom': cooked(4.6, [[0, -0.012, 0]]); break;
      case 'green_pepper': cooked(4.4, [[0, 0, 0.3]]); break;
      case 'onion': cooked(4.4, [[0, 0, 0]]); break;
      case 'tomato': cooked(4.2, [[0, 0, 0.4]]); break;
      case 'tuna': cooked(5.6, [[0, 0, 0]]); break;
      case 'walnuts': cooked(5.2, [[-0.035, -0.02, 0.3], [0.035, 0.028, 2.2]]); break;
      case 'almonds': cooked(5.6, [[-0.03, -0.03, 0.5], [0.032, 0.0, -0.6], [-0.02, 0.036, 2.6]]); break;
      case 'banana': top(2.9, [[-0.04, -0.05, 0.5], [0.045, 0.06, -0.3]], 0.8); break;
      case 'strawberries': top(3.9, [[-0.035, -0.03, 2.6], [0.04, 0.04, 0.5]], 1); break;
      case 'blueberries': top(6.2, [[0, 0.03, 0]], 0.8); break;
      case 'mango': top(3.0, [[0, -0.02, 0.35], [0.0, 0.085, 0.2]], 0.8); break;
      case 'papaya': top(4.2, [[-0.04, -0.01, 0.4], [0.045, 0.06, -0.3]], 0.8); break;
      case 'pineapple': top(3.4, [[0, -0.03, 0.5], [0.0, 0.07, -0.25]], 0.8); break;
      case 'rum_raisins': top(4.6, [[0, 0.02, 0]], 0.8); break;
      case 'coconut':
        st = icoSt(s, 5.4, 0.85); r = rnd(3);
        for (i = 0; i < 12; i++) SPRINKLE.coconut(g, st, { u: (r() - 0.5) * 0.12, v: (r() - 0.5) * 0.11, rot: r() * TAU, seed: i * 9 + 1, sc: 1.25 }, 1);
        break;
      case 'chocolate_chips':
        st = icoSt(s, 7.5, 0.6, 0.9); P = [[-0.03, -0.012], [0.032, -0.004], [0.0, 0.04]];
        for (i = 0; i < 3; i++) SPRINKLE.chocolate_chips(g, st, { u: P[i][0], v: P[i][1], rot: 0, seed: i, sc: 1.1 }, 1);
        break;
      case 'chocolate_syrup': case 'strawberry_syrup': case 'caramel_syrup': case 'honey': squiggle(g, s, DRIZ[id].c, DRIZ[id].hi); break;
      case 'nutella': dollop(g, s, '#5E3622', '#3A2013', '#86553B'); break;
      case 'peanut_butter': dollop(g, s, '#CB9654', '#A56F30', '#E2B678'); break;
      case 'gouda': wedge(g, s, '#F6C445', '#D8362B', '#FBD76A', '#E1A52B'); break;
      case 'brie': wedge(g, s, '#F6E6B0', '#FFFDF3', '#FFFBEA', null); g.strokeStyle = '#CDB98A'; g.lineWidth = s * 0.02; g.beginPath(); g.moveTo(s * 0.12, s * 0.62); g.lineTo(s * 0.56, s * 0.24); g.lineTo(s * 0.89, s * 0.33); g.lineTo(s * 0.91, s * 0.61); g.lineTo(s * 0.14, s * 0.84); g.closePath(); g.stroke(); break;
      case 'mozzarella':
        g.fillStyle = 'rgba(0,60,120,0.12)'; ell(g, s * 0.5, s * 0.78, s * 0.3, s * 0.07); g.fill();
        g.fillStyle = '#FFFBF0'; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.3, 0, TAU); g.fill(); g.strokeStyle = '#D9C9A0'; g.lineWidth = s * 0.035; g.stroke();
        g.strokeStyle = '#E9DDBB'; g.lineWidth = s * 0.03; g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.2, 0.3, 1.5); g.stroke();
        g.fillStyle = '#FFFFFF'; ell(g, s * 0.4, s * 0.38, s * 0.09, s * 0.05, -0.6); g.fill();
        break;
      case 'whipped_cream': st = icoSt(s, 2.0, 0.42, 0.8); st.cy = s * 0.9; drawCup(g, st, id, { u: 0, v: 0, rc: 0.15, seed: 3 }, 1); break;
      case 'banana_liqueur': case 'rum': case 'coconut_rum': case 'amaretto': case 'grand_marnier':
        st = icoSt(s, 2.6, 0.42, 0.9); st.cy = s * 0.86; drawShot(g, st, id, { x: 0, y: 0, sc: 1 }, 1); break;
      default:
        if (ICE[id]) { st = icoSt(s, 2.0, 0.42, 0.8); st.cy = s * 0.93; drawCup(g, st, id, { u: 0, v: 0, rc: 0.165, seed: 3 }, 1); }
    }
    g.restore();
  }

  A.TOP = TOP; A.drawTop = drawTop; A.SPRINKLE = SPRINKLE; A.DRIZ = DRIZ; A.drawDrizzle = drawDrizzle;
  A.BLOB = BLOB; A.drawBlob = drawBlob; A.ICE = ICE; A.drawCup = drawCup; A.SHOT = SHOT; A.drawShot = drawShot; A.icon = icon;
})();
