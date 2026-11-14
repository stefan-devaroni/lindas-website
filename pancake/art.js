/* Create your own Dutch pancake: drawing, part 1.
   The plate, the pancake, the powdered sugar and everything that is cooked into the batter.
   All of it is drawn in code on a Canvas 2D context. There are no image files.

   How positions work: the pancake is a flat disc seen from 30 degrees above the table.
   A spot on it is (u, v), with (0, 0) the middle and 1 the edge; v runs from the far side (-1)
   to the near side (+1). On screen that disc becomes a wide ellipse: st.k is how much it is
   squashed (sin 30 = 0.5) and st.up how much heights are shortened (cos 30 = 0.87). */
(function () {
  'use strict';
  var PK = window.PK = window.PK || {};
  var TAU = Math.PI * 2;

  var C = {
    blue: '#27AAE1', navy: '#004EAD', pale: '#BDDFFF', yellow: '#EFBD40', orange: '#EB8917',
    cream: '#F1EAD1', creamLight: '#FAF6ED', ink: '#282204',
    delft: '#1B54B4',
    batter: '#F1C96F', batterDeep: '#E5AE52', crust: '#A4611F'
  };
  var PLATE = 1.17;   // plate radius, with the pancake as 1

  /* ---------- helpers ---------- */

  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // '#RRGGBB' or 'rgb(r,g,b)' to [r, g, b]
  function hexRgb(h) {
    var n, m;
    if (h.charAt(0) === '#') { n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  function mix(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b); t = t < 0 ? 0 : t > 1 ? 1 : t;
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function rgba(h, a) { var A = hexRgb(h); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a.toFixed(3) + ')'; }
  function c01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { x = c01((x - a) / (b - a)); return x * x * (3 - 2 * x); }
  function outCubic(t) { t = c01(t); return 1 - Math.pow(1 - t, 3); }
  function outBack(t) { t = c01(t); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function inQuad(t) { t = c01(t); return t * t; }

  function X(st, u) { return st.cx + u * st.R; }
  function Y(st, v) { return st.cy + v * st.R * st.k; }
  // A point of a piece (x, y measured from the piece's own middle, lying flat) to the screen.
  function L2S(st, p, x, y) {
    var s = p.sc || 1, c = Math.cos(p.rot || 0), n = Math.sin(p.rot || 0);
    return [st.cx + (p.u + (x * c - y * n) * s) * st.R, st.cy + (p.v + (x * n + y * c) * s) * st.R * st.k];
  }
  function S(st, p, pts) { var out = [], i; for (i = 0; i < pts.length; i++) out.push(L2S(st, p, pts[i][0], pts[i][1])); return out; }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function addPoly(g, P) { var i; g.moveTo(P[0][0], P[0][1]); for (i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
  // A smooth closed curve through the middles of the sides.
  function addBlob(g, P) {
    var n = P.length, i, a = P[n - 1], b = P[0];
    g.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    for (i = 0; i < n; i++) { a = P[i]; b = P[(i + 1) % n]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    g.closePath();
  }
  function poly(g, P) { g.beginPath(); addPoly(g, P); }
  function blob(g, P) { g.beginPath(); addBlob(g, P); }
  // A lumpy closed outline around (0, 0).
  function wob(n, r0, amp, seed, fx, fy) {
    var r = rnd(seed), ph = r() * TAU, ph2 = r() * TAU, out = [], i, a, q;
    for (i = 0; i < n; i++) {
      a = i / n * TAU;
      q = r0 * (1 + amp * Math.sin(2 * a + ph) + amp * 0.7 * Math.sin(3 * a + ph2) + amp * 0.6 * (r() - 0.5));
      out.push([Math.cos(a) * q * (fx || 1), Math.sin(a) * q * (fy || 1)]);
    }
    return out;
  }
  function scalePts(pts, f) { var out = [], i; for (i = 0; i < pts.length; i++) out.push([pts[i][0] * f, pts[i][1] * f]); return out; }
  function flatT(g, st) { g.translate(st.cx, st.cy); g.scale(st.R, st.R * st.k); }
  // The colour of the pancake at a given distance from the middle.
  function batterAt(r) { return mix(C.batter, C.batterDeep, smooth(0.5, 0.97, r)); }

  /* ---------- the plate ---------- */

  function drawPlate(g, st) {
    var R = st.R, k = st.k, cx = st.cx, cy = st.cy, i, N = 26;
    g.fillStyle = 'rgba(0,60,120,0.15)';
    ell(g, cx, cy + R * 0.09, R * PLATE * 1.005, R * PLATE * k * 1.03); g.fill();
    g.fillStyle = '#BFCBDA'; ell(g, cx, cy + R * 0.036, R * PLATE, R * PLATE * k); g.fill();
    g.fillStyle = '#FFFEFA'; ell(g, cx, cy, R * PLATE, R * PLATE * k); g.fill();
    g.strokeStyle = '#A9BBD0'; g.lineWidth = Math.max(1, R * 0.006); g.stroke();

    // Delft-blue rim
    g.save(); flatT(g, st);
    g.strokeStyle = C.delft; g.fillStyle = C.delft; g.lineCap = 'round';
    g.lineWidth = 0.013; g.beginPath(); g.arc(0, 0, PLATE - 0.032, 0, TAU); g.stroke();
    g.lineWidth = 0.005; g.beginPath(); g.arc(0, 0, PLATE - 0.054, 0, TAU); g.stroke();
    for (i = 0; i < N; i++) {
      g.save(); g.rotate(i / N * TAU); g.translate(0, -1.066);
      if (i % 2) {
        // a small tulip, pointing outwards
        g.beginPath(); g.moveTo(0, 0.03);
        g.quadraticCurveTo(-0.034, 0.012, -0.018, -0.03); g.quadraticCurveTo(-0.007, -0.012, 0, -0.034);
        g.quadraticCurveTo(0.007, -0.012, 0.018, -0.03); g.quadraticCurveTo(0.034, 0.012, 0, 0.03);
        g.fill();
        g.lineWidth = 0.007;
        g.beginPath(); g.moveTo(-0.012, 0.036); g.quadraticCurveTo(-0.05, 0.03, -0.062, 0.0); g.stroke();
        g.beginPath(); g.moveTo(0.012, 0.036); g.quadraticCurveTo(0.05, 0.03, 0.062, 0.0); g.stroke();
      } else {
        // four dots in a diamond
        g.beginPath(); g.arc(0, -0.02, 0.0085, 0, TAU); g.arc(0, 0.02, 0.0085, 0, TAU); g.fill();
        g.beginPath(); g.arc(-0.02, 0, 0.0085, 0, TAU); g.arc(0.02, 0, 0.0085, 0, TAU); g.fill();
        g.fillStyle = C.blue; g.beginPath(); g.arc(0, 0, 0.007, 0, TAU); g.fill(); g.fillStyle = C.delft;
      }
      g.restore();
    }
    g.restore();
  }

  /* ---------- the pancake ---------- */

  // Not a perfect circle: a real one has a slightly wavy, lacy edge.
  function panR(th) {
    return 1 + 0.011 * Math.sin(3 * th + 0.7) + 0.008 * Math.sin(5 * th + 2.1) + 0.005 * Math.sin(11 * th + 4.0) +
      0.004 * Math.sin(23 * th + 1.3) + 0.0025 * Math.sin(47 * th + 2.6);
  }
  function pancakePath(g, st, dy, grow) {
    var N = 180, i, th, r;
    grow = grow || 1; dy = dy || 0;
    g.beginPath();
    for (i = 0; i < N; i++) {
      th = i / N * TAU; r = panR(th) * grow;
      if (i) g.lineTo(st.cx + Math.cos(th) * r * st.R, st.cy + Math.sin(th) * r * st.R * st.k + dy);
      else g.moveTo(st.cx + Math.cos(th) * r * st.R, st.cy + Math.sin(th) * r * st.R * st.k + dy);
    }
    g.closePath();
  }

  function drawPancake(g, st) {
    var R = st.R, t = R * 0.03, r = rnd(20010), i, j, n, th, rr, x, y, s, pts, a, q, gr;
    // its shadow on the plate, then the thin edge, then the top
    g.fillStyle = 'rgba(60,40,10,0.16)'; pancakePath(g, st, t + R * 0.022, 1.008); g.fill();
    g.fillStyle = '#9A591B'; pancakePath(g, st, t); g.fill();
    g.fillStyle = '#C17B2F'; pancakePath(g, st, t * 0.5); g.fill();

    pancakePath(g, st, 0);
    g.save(); g.clip(); flatT(g, st);
    gr = g.createRadialGradient(-0.08, -0.1, 0.05, 0, 0, 1.03);
    gr.addColorStop(0, '#F8DD94'); gr.addColorStop(0.5, '#F2CC74'); gr.addColorStop(0.82, '#E9B659');
    gr.addColorStop(0.93, '#D7983F'); gr.addColorStop(1, '#B8732A');
    g.fillStyle = gr; g.fillRect(-1.1, -1.1, 2.2, 2.2);

    // browned patches, the way the pan leaves them
    for (i = 0; i < 38; i++) {
      rr = Math.sqrt(r()) * 0.86; th = r() * TAU; s = 0.045 + r() * 0.1; x = Math.cos(th) * rr; y = Math.sin(th) * rr;
      pts = []; n = 8;
      for (j = 0; j < n; j++) { a = j / n * TAU; q = s * (0.55 + r() * 0.8); pts.push([x + Math.cos(a) * q * 1.3, y + Math.sin(a) * q]); }
      g.fillStyle = 'rgba(198,128,48,' + (0.11 + r() * 0.15).toFixed(3) + ')'; blob(g, pts); g.fill();
    }
    for (i = 0; i < 90; i++) {
      rr = Math.sqrt(r()) * 0.93; th = r() * TAU; s = 0.012 + r() * 0.03; x = Math.cos(th) * rr; y = Math.sin(th) * rr;
      g.fillStyle = 'rgba(186,112,38,' + (0.16 + r() * 0.2).toFixed(3) + ')';
      g.beginPath(); g.ellipse(x, y, s * (1 + r()), s, r() * 3, 0, TAU); g.fill();
    }
    // small pale bubbles
    for (i = 0; i < 110; i++) {
      rr = Math.sqrt(r()) * 0.9; th = r() * TAU; s = 0.005 + r() * 0.011;
      g.fillStyle = 'rgba(252,236,180,' + (0.35 + r() * 0.35).toFixed(3) + ')';
      g.beginPath(); g.arc(Math.cos(th) * rr, Math.sin(th) * rr, s, 0, TAU); g.fill();
    }
    // the crisp, lacy edge
    for (i = 0; i < 170; i++) {
      th = r() * TAU; rr = panR(th) * (0.905 + r() * 0.09); s = 0.006 + r() * 0.012;
      g.fillStyle = 'rgba(150,84,24,' + (0.22 + r() * 0.3).toFixed(3) + ')';
      g.beginPath(); g.ellipse(Math.cos(th) * rr, Math.sin(th) * rr, s * 1.8, s, th + Math.PI / 2, 0, TAU); g.fill();
    }
    for (i = 0; i < 60; i++) {
      th = r() * TAU; rr = panR(th) * (0.93 + r() * 0.055); s = 0.004 + r() * 0.007;
      g.fillStyle = 'rgba(250,226,160,' + (0.4 + r() * 0.3).toFixed(3) + ')';
      g.beginPath(); g.arc(Math.cos(th) * rr, Math.sin(th) * rr, s, 0, TAU); g.fill();
    }
    g.restore();

    pancakePath(g, st, 0);
    g.strokeStyle = C.crust; g.lineWidth = Math.max(1, R * 0.007); g.lineJoin = 'round'; g.stroke();
  }

  /* ---------- powdered sugar ---------- */

  // The dusting the plain pancake is served with. It is drawn last (under the cups), so it also lies on the fruit.
  function drawSugar(g, st) {
    var r = rnd(4711), i, j, rr, th, s, n = 620, x, y, m, base = g.globalAlpha;
    g.save(); pancakePath(g, st, 0, 0.985); g.clip(); flatT(g, st);
    // a soft white veil where most of it landed
    for (i = 0; i < 46; i++) {
      rr = Math.sqrt(r()) * 0.74; th = r() * TAU; s = 0.07 + r() * 0.1;
      g.fillStyle = 'rgba(255,255,255,' + (0.035 + r() * 0.04).toFixed(3) + ')';
      g.beginPath(); g.arc(Math.cos(th) * rr, Math.sin(th) * rr, s, 0, TAU); g.fill();
    }
    g.fillStyle = '#FFFFFF';
    // loose grains, and little clumps of them
    for (i = 0; i < n; i++) {
      rr = Math.pow(r(), 0.58) * 0.91; th = r() * TAU; x = Math.cos(th) * rr; y = Math.sin(th) * rr; m = r() < 0.45 ? 1 + Math.floor(r() * 4) : 1;
      for (j = 0; j < m; j++) {
        s = 0.003 + r() * r() * 0.008;
        g.globalAlpha = base * (0.6 + r() * 0.4);
        g.beginPath(); g.arc(x + (j ? (r() - 0.5) * 0.035 : 0), y + (j ? (r() - 0.5) * 0.035 : 0), s, 0, TAU); g.fill();
      }
    }
    g.restore();
  }

  /* ---------- cooked into the batter ----------
     Each kind gives its outline (geo) and how to colour it (paint). drawCooked adds what makes
     it look baked in: no shadow, a browned line around it, and batter creeping over its edges. */

  var COOKED = {};

  COOKED.bacon = {
    tint: '#A8341F', rad: 0.05, n: 5, halo: 0.015, bite: { d: 0.034, f: [4, 7] },
    geo: function (p) {
      var L = 0.56, W = 0.118, n = 30, r = rnd(p.seed), ph1 = r() * TAU, ph2 = r() * TAU, bend = (r() - 0.5) * 0.13;
      var top = [], bot = [], mid = [], w = [], i, t, x, c, hw, end;
      for (i = 0; i <= n; i++) {
        t = i / n; x = (t - 0.5) * L;
        c = bend * Math.sin(t * Math.PI) + 0.013 * Math.sin(t * 11 + ph1);
        end = Math.sin(Math.min(1, Math.min(t, 1 - t) * 9) * Math.PI / 2);
        hw = W * 0.5 * (0.92 + 0.11 * Math.sin(t * 17 + ph2)) * (0.7 + 0.3 * end);
        top.push([x, c - hw]); bot.push([x, c + hw]); mid.push([x, c]); w.push(hw);
      }
      return { loops: [top.concat(bot.reverse())], mid: mid, w: w, off: [-0.6, 0.0, 0.58], wd: [0.015, 0.008, 0.012], ph: ph1 };
    },
    paint: function (g, st, p, c, geo, L) {
      var sn = Math.sin(p.rot || 0), cs = Math.cos(p.rot || 0);
      var R = st.R * Math.sqrt(sn * sn + st.k * st.k * cs * cs), sc = p.sc || 1, s, i, q;   // a strip lying across looks narrower
      poly(g, L[0]); g.fillStyle = mix('#E58C7B', '#B5422D', c); g.fill();
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (s = 0; s < 3; s++) {       // the streaks of fat
        g.beginPath();
        for (i = 1; i < geo.mid.length - 1; i++) {
          q = L2S(st, p, geo.mid[i][0], geo.mid[i][1] + geo.off[s] * geo.w[i] + 0.004 * Math.sin(i * 1.7 + geo.ph + s));
          if (i > 1) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]);
        }
        g.strokeStyle = mix('#FCEFE9', '#F4CFAE', c); g.lineWidth = R * sc * geo.wd[s]; g.stroke();
      }
      poly(g, L[0]); g.strokeStyle = mix('#C56556', '#7B2919', c); g.lineWidth = Math.max(0.8, st.R * 0.006); g.stroke();
    }
  };

  COOKED.apple = {
    tint: '#FFF6CF', rad: 0.172, n: 7, halo: 0.015, smooth: true, bite: { d: 0.04, f: [2, 4] },
    geo: function (p) {
      var r = rnd(p.seed);
      return { loops: [wob(30, 0.172, 0.022, p.seed), wob(12, 0.052, 0.07, p.seed + 5)], arcs: [r() * TAU, r() * TAU, r() * TAU] };
    },
    paint: function (g, st, p, c, geo, L, shape) {
      var R = st.R, sc = p.sc || 1, gr, i;
      // a peeled, cored ring: pale flesh, golden where it caught the pan
      shape();
      g.save(); g.translate(X(st, p.u), Y(st, p.v)); g.scale(R * sc, R * st.k * sc);
      gr = g.createRadialGradient(0, 0, 0.045, 0, 0, 0.178);
      gr.addColorStop(0, mix('#FBF5D6', '#E8C576', c)); gr.addColorStop(0.28, mix('#FCF6DA', '#F9EEC0', c)); gr.addColorStop(0.62, mix('#FCF6DA', '#FAF0C6', c));
      gr.addColorStop(0.86, mix('#F8EFC6', '#EFD083', c)); gr.addColorStop(1, mix('#F0E3A8', '#D9A650', c));
      g.fillStyle = gr; g.fill('evenodd');
      g.strokeStyle = 'rgba(206,160,76,' + (0.22 + 0.3 * c).toFixed(3) + ')'; g.lineWidth = 0.006; g.lineCap = 'round';
      for (i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 0.086 + i * 0.03, geo.arcs[i], geo.arcs[i] + 1.6 + i * 0.5); g.stroke(); }
      g.restore();
      if (c > 0) {                    // batter fills the hole where the core was
        g.save(); g.globalAlpha *= c;
        blob(g, L[1]); g.fillStyle = mix('#FBE9B4', batterAt(Math.sqrt(p.u * p.u + p.v * p.v)), 0.3); g.fill();
        g.restore();
      }
      blob(g, L[1]); g.strokeStyle = mix('#E3CF8D', '#C58B3A', c); g.lineWidth = Math.max(0.8, R * 0.007); g.stroke();
      blob(g, L[0]); g.strokeStyle = mix('#E0CC88', '#CB9645', c); g.lineWidth = Math.max(0.8, R * 0.005); g.stroke();
    }
  };

  COOKED.raisins = {
    tint: '#3E2217', rad: 0.031, n: 24, halo: 0.011, smooth: true, bite: { d: 0.006, f: [1, 2] },
    geo: function (p) { return { loops: [wob(9, 0.03, 0.14, p.seed, 1.25, 0.9)] }; },
    paint: function (g, st, p, c, geo, L) {
      var q = L2S(st, p, -0.006, -0.006), R = st.R * (p.sc || 1);
      blob(g, L[0]); g.fillStyle = mix('#5A3324', '#3E2217', c); g.fill();
      g.strokeStyle = '#2A150D'; g.lineWidth = Math.max(0.6, R * 0.004); g.stroke();
      g.fillStyle = 'rgba(190,130,100,0.75)'; ell(g, q[0], q[1], R * 0.008, R * 0.004, -0.5); g.fill();
    }
  };

  COOKED.ham = {
    tint: '#E88A93', rad: 0.047, n: 14, halo: 0.012, bite: { d: 0.008, f: [1, 1] },
    geo: function (p) {
      var r = rnd(p.seed), s = 0.04, j = function () { return (r() - 0.5) * 0.014; };
      return { loops: [[[-s + j(), -s + j()], [s + j(), -s + j()], [s + j(), s + j()], [-s + j(), s + j()]]] };
    },
    paint: function (g, st, p, c, geo, L) {
      var P = L[0];
      g.lineJoin = 'round';
      poly(g, P); g.fillStyle = mix('#F2A3AC', '#E88F97', c); g.fill();
      g.beginPath(); g.moveTo(P[0][0], P[0][1]); g.lineTo(P[1][0], P[1][1]); g.lineTo(P[3][0], P[3][1]); g.closePath();
      g.fillStyle = 'rgba(255,214,216,0.55)'; g.fill();
      poly(g, P); g.strokeStyle = mix('#D17C86', '#B9605F', c); g.lineWidth = Math.max(0.8, st.R * 0.006); g.stroke();
    }
  };

  COOKED.mushroom = {
    tint: '#CDB48C', rad: 0.085, n: 8, halo: 0.013, bite: { d: 0.014, f: [1, 2] },
    geo: function (p) {
      // a slice through a mushroom: the round cap on top, the stem under it
      var pts = [], cap = [], i, a, y0 = -0.03;
      for (i = 0; i <= 14; i++) { a = Math.PI + i / 14 * Math.PI; cap.push([Math.cos(a) * 0.1, y0 + 0.012 + Math.sin(a) * 0.082]); }
      pts = cap.concat([[0.092, y0 + 0.032], [0.034, y0 + 0.03], [0.031, y0 + 0.085], [0.018, y0 + 0.104], [-0.018, y0 + 0.104], [-0.031, y0 + 0.085], [-0.034, y0 + 0.03], [-0.092, y0 + 0.032]]);
      return { loops: [pts], cap: cap, gill: [[-0.092, y0 + 0.032], [-0.075, y0 + 0.006], [0.075, y0 + 0.006], [0.092, y0 + 0.032]] };
    },
    paint: function (g, st, p, c, geo, L) {
      var R = st.R * (p.sc || 1), C2 = S(st, p, geo.cap), i;
      g.lineJoin = 'round'; g.lineCap = 'round';
      poly(g, L[0]); g.fillStyle = mix('#F6ECD8', '#EBDBB9', c); g.fill();
      poly(g, S(st, p, geo.gill)); g.fillStyle = mix('#B79A76', '#A5855F', c); g.fill();      // the gills under the cap
      g.beginPath(); g.moveTo(C2[1][0], C2[1][1]); for (i = 2; i < C2.length - 1; i++) g.lineTo(C2[i][0], C2[i][1]);
      g.strokeStyle = mix('#C7A982', '#B08C5E', c); g.lineWidth = Math.max(1, R * 0.016); g.stroke();   // the skin of the cap
      poly(g, L[0]); g.strokeStyle = mix('#9A7B55', '#86633E', c); g.lineWidth = Math.max(0.8, R * 0.007); g.stroke();
    }
  };

  COOKED.green_pepper = {
    tint: '#4F9A3A', rad: 0.085, n: 6, halo: 0.012, smooth: true, bite: { d: 0.022, f: [2, 3] },
    geo: function (p) {
      var r = rnd(p.seed), ph = r() * TAU, o = [], inn = [], i, a, f;
      for (i = 0; i < 24; i++) {
        a = i / 24 * TAU; f = 1 + 0.11 * Math.cos(3 * a + ph) + 0.03 * Math.sin(7 * a);
        o.push([Math.cos(a) * 0.088 * f, Math.sin(a) * 0.088 * f]); inn.push([Math.cos(a) * 0.062 * f, Math.sin(a) * 0.062 * f]);
      }
      return { loops: [o, inn] };
    },
    paint: function (g, st, p, c, geo, L, shape) {
      var R = st.R * (p.sc || 1);
      shape(); g.fillStyle = mix('#6DBE55', '#62A848', c); g.fill('evenodd');
      blob(g, S(st, p, scalePts(geo.loops[0], 0.86))); g.strokeStyle = 'rgba(178,226,140,0.9)'; g.lineWidth = Math.max(0.7, R * 0.006); g.stroke();
      shape(); g.strokeStyle = mix('#3F8E36', '#3A7A2F', c); g.lineWidth = Math.max(0.8, R * 0.006); g.stroke();
    }
  };

  COOKED.onion = {
    tint: '#FFF8E8', rad: 0.088, n: 6, halo: 0.011, smooth: true, bite: { d: 0.017, f: [2, 3] },
    geo: function (p) {
      return { loops: [wob(22, 0.092, 0.03, p.seed), wob(22, 0.074, 0.03, p.seed), wob(16, 0.055, 0.04, p.seed + 3), wob(16, 0.04, 0.04, p.seed + 3)] };
    },
    paint: function (g, st, p, c, geo, L, shape) {
      shape(); g.fillStyle = mix('#FFFBF2', '#FBF0D8', c); g.fill('evenodd');
      g.strokeStyle = mix('#B77FB4', '#A9719F', c); g.lineWidth = Math.max(0.8, st.R * (p.sc || 1) * 0.006); g.stroke();
    }
  };

  COOKED.tomato = {
    tint: '#D8432F', rad: 0.097, n: 6, halo: 0.015, smooth: true, bite: { d: 0.028, f: [2, 3] },
    geo: function (p) { var r = rnd(p.seed); return { loops: [wob(22, 0.097, 0.02, p.seed)], ph: r() * TAU }; },
    paint: function (g, st, p, c, geo, L) {
      var R = st.R * (p.sc || 1), i, a, q, k = st.k;
      blob(g, L[0]); g.fillStyle = mix('#E8553C', '#D94A33', c); g.fill();
      blob(g, S(st, p, scalePts(geo.loops[0], 0.82))); g.fillStyle = mix('#F6876A', '#EE7A5C', c); g.fill();
      for (i = 0; i < 4; i++) {       // the four seed pockets
        a = geo.ph + i * TAU / 4; q = L2S(st, p, Math.cos(a) * 0.043, Math.sin(a) * 0.043);
        g.fillStyle = '#F9B45E'; ell(g, q[0], q[1], R * 0.024, R * 0.024 * k); g.fill();
        g.fillStyle = '#FDE6A6'; ell(g, q[0] - R * 0.006, q[1], R * 0.006, R * 0.006 * k); g.fill(); ell(g, q[0] + R * 0.008, q[1] + R * 0.003, R * 0.005, R * 0.005 * k); g.fill();
      }
      blob(g, L[0]); g.strokeStyle = mix('#C23B28', '#AC3321', c); g.lineWidth = Math.max(0.8, R * 0.007); g.stroke();
    }
  };

  COOKED.tuna = {
    tint: '#C9A088', rad: 0.07, n: 7, halo: 0.012, smooth: true, bite: { d: 0.02, f: [1, 3] },
    geo: function (p) {
      var r = rnd(p.seed), fl = [], i;
      for (i = 0; i < 4; i++) fl.push({ x: (r() - 0.5) * 0.07, y: (r() - 0.5) * 0.06, pts: wob(8, 0.03 + r() * 0.012, 0.16, p.seed + i * 7, 1.3, 0.85), rot: r() * 3 });
      return { loops: [wob(14, 0.068, 0.1, p.seed)], flakes: fl };
    },
    paint: function (g, st, p, c, geo, L) {
      var R = st.R * (p.sc || 1), cols = ['#E6CBB4', '#D4AE95', '#EAD3BF', '#CDA48B'], i, f, pts, j, cs, sn, a, b;
      blob(g, L[0]); g.fillStyle = mix('#DDBDA4', '#D3AF95', c); g.fill();
      for (i = 0; i < geo.flakes.length; i++) {
        f = geo.flakes[i]; cs = Math.cos(f.rot); sn = Math.sin(f.rot); pts = [];
        for (j = 0; j < f.pts.length; j++) pts.push(L2S(st, p, f.x + f.pts[j][0] * cs - f.pts[j][1] * sn, f.y + f.pts[j][0] * sn + f.pts[j][1] * cs));
        blob(g, pts); g.fillStyle = cols[i % 4]; g.fill();
        a = L2S(st, p, f.x - 0.02 * cs, f.y - 0.02 * sn); b = L2S(st, p, f.x + 0.02 * cs, f.y + 0.02 * sn);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.strokeStyle = 'rgba(160,118,96,0.7)'; g.lineWidth = Math.max(0.6, R * 0.004); g.stroke();
      }
      blob(g, L[0]); g.strokeStyle = mix('#B48E76', '#A47C64', c); g.lineWidth = Math.max(0.8, R * 0.005); g.stroke();
    }
  };

  COOKED.walnuts = {
    tint: '#9A6B3A', rad: 0.052, n: 9, halo: 0.012, smooth: true, bite: { d: 0.008, f: [1, 2] },
    geo: function (p) { return { loops: [wob(12, 0.052, 0.2, p.seed, 1.15, 0.9)] }; },
    paint: function (g, st, p, c, geo, L) {
      var R = st.R * (p.sc || 1), a, b, m, i;
      blob(g, L[0]); g.fillStyle = mix('#C8935A', '#B9834C', c); g.fill();
      g.strokeStyle = '#7A502C'; g.lineWidth = Math.max(0.7, R * 0.005); g.lineCap = 'round';
      a = L2S(st, p, -0.032, 0.002); b = L2S(st, p, 0.032, -0.002);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      for (i = -1; i <= 1; i += 2) {  // the curly ridges on each half
        a = L2S(st, p, -0.02, i * 0.012); m = L2S(st, p, 0, i * 0.036); b = L2S(st, p, 0.02, i * 0.012);
        g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(m[0], m[1], b[0], b[1]); g.stroke();
      }
      blob(g, L[0]); g.strokeStyle = '#8A5C33'; g.lineWidth = Math.max(0.8, R * 0.006); g.stroke();
    }
  };

  COOKED.almonds = {
    tint: '#F5E6C4', rad: 0.036, n: 12, halo: 0.01, smooth: true, bite: { d: 0.006, f: [1, 2] },
    geo: function (p) {
      var pts = [], i, a, w;
      for (i = 0; i < 12; i++) { a = i / 12 * TAU; w = 0.022 * (1 - 0.32 * Math.cos(a)); pts.push([Math.cos(a) * 0.042, Math.sin(a) * w]); }
      return { loops: [pts] };
    },
    paint: function (g, st, p, c, geo, L) {
      var R = st.R * (p.sc || 1), a = L2S(st, p, -0.026, 0), b = L2S(st, p, 0.02, 0);
      blob(g, L[0]); g.fillStyle = mix('#FAEFD6', '#F3E0BC', c); g.fill();
      g.strokeStyle = mix('#B98550', '#A6703A', c); g.lineWidth = Math.max(0.8, R * 0.0065); g.stroke();
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.strokeStyle = 'rgba(190,150,96,0.6)'; g.lineWidth = Math.max(0.5, R * 0.003); g.stroke();
    }
  };

  // Where the batter creeps over the edge of a piece.
  // The piece is only drawn inside a "window" that follows its outline, but dips into the piece here and there.
  // Where it dips, the pancake itself shows: batter lying over the edge.
  function densify(pts, min) {
    var out = [], n = pts.length, k = Math.max(1, Math.ceil(min / n)), i, j, a, b;
    for (i = 0; i < n; i++) { a = pts[i]; b = pts[(i + 1) % n]; for (j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    return out;
  }
  // For every point of the outline: [x, y, inward x, inward y, how far the batter comes over it (0 to 1)]
  function makeBite(p, geo, def) {
    var pts = densify(geo.loops[0], 24), n = pts.length, r = rnd(p.seed + 77), f1 = def.bite.f[0] + Math.floor(r() * 2), f2 = def.bite.f[1] + Math.floor(r() * 2);
    var ph1 = r() * TAU, ph2 = r() * TAU, area = 0, out = [], j, a, b, tx, ty, len, sg, s;
    for (j = 0; j < n; j++) { a = pts[j]; b = pts[(j + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
    sg = area > 0 ? 1 : -1;
    for (j = 0; j < n; j++) {
      a = pts[(j + n - 1) % n]; b = pts[(j + 1) % n]; tx = b[0] - a[0]; ty = b[1] - a[1]; len = Math.sqrt(tx * tx + ty * ty) || 1; tx /= len; ty /= len;
      s = j / n;
      out.push([pts[j][0], pts[j][1], -sg * ty, sg * tx, smooth(0.5, 0.86, 0.5 + 0.5 * Math.sin(f1 * TAU * s + ph1) * Math.sin(f2 * TAU * s + ph2))]);
    }
    return out;
  }
  function biteLoop(st, p, bite, depth, margin, c) {
    var out = [], i, b, d;
    for (i = 0; i < bite.length; i++) { b = bite[i]; d = -margin * (1 - b[4]) + depth * c * b[4]; out.push(L2S(st, p, b[0] + b[2] * d, b[1] + b[3] * d)); }
    return out;
  }

  // a: 0 = not there, 1 = baked in. First it drops onto the batter, then it sinks in and the batter closes round it.
  function drawCooked(g, st, id, p, a) {
    var def = COOKED[id], geo = p.geo || (p.geo = def.geo(p)), icon = !!st.icon;
    var fall = icon ? 1 : c01(a / 0.42), c = icon ? 1 : outCubic((a - 0.42) / 0.58);
    var R = st.R, sc = p.sc || 1, L = [], i, dy, bat, win = null;
    for (i = 0; i < geo.loops.length; i++) L.push(S(st, p, geo.loops[i]));
    function shape() { var j; g.beginPath(); for (j = 0; j < L.length; j++) { if (def.smooth) addBlob(g, L[j]); else addPoly(g, L[j]); } }

    g.save();
    if (fall < 1) {
      g.globalAlpha *= Math.min(1, fall * 2.5);
      dy = -(1 - outCubic(fall)) * R * 0.3;
      g.fillStyle = 'rgba(70,40,5,' + (0.16 * fall).toFixed(3) + ')';
      ell(g, X(st, p.u), Y(st, p.v), def.rad * R * sc * 1.1, def.rad * R * sc * st.k * 1.1); g.fill();
      g.translate(0, dy);
    }
    if (c > 0 && !icon) {
      win = biteLoop(st, p, p.bite || (p.bite = makeBite(p, geo, def)), def.bite.d, def.halo * 2.6, c);
      g.save(); blob(g, win); g.clip();
      // batter browns a little where it meets the topping
      shape(); g.strokeStyle = 'rgba(176,106,34,' + (0.4 * c).toFixed(3) + ')'; g.lineWidth = R * sc * def.halo * 2 * c; g.lineJoin = 'round'; g.stroke();
    }
    def.paint(g, st, p, c, geo, L, shape);
    if (win) {
      bat = batterAt(Math.sqrt(p.u * p.u + p.v * p.v));
      // it lies in the batter, not on it: a thin film over the whole piece, thicker along its edge
      g.save(); shape(); g.clip('evenodd');
      g.fillStyle = rgba(bat, 0.1 * c); g.fill('evenodd');
      g.strokeStyle = rgba(bat, 0.45 * c); g.lineWidth = R * sc * def.halo * 2; g.lineJoin = 'round'; g.stroke();
      g.restore();
      g.restore();
      // the rim of the batter where it lies over the piece
      g.save(); shape(); g.clip('evenodd');
      blob(g, win); g.strokeStyle = 'rgba(170,102,32,' + (0.6 * c).toFixed(3) + ')'; g.lineWidth = Math.max(0.9, R * 0.006); g.stroke();
      g.restore();
    }
    g.restore();
  }

  // What a cooked-in piece looks like under melted cheese: its shape pressed up into the cheese,
  // with a little of its own colour showing through.
  function cookedRelief(g, st, id, p, alpha) {
    var def = COOKED[id], geo = p.geo || (p.geo = def.geo(p)), L = [], i, o = Math.max(1, st.R * 0.006);
    for (i = 0; i < geo.loops.length; i++) L.push(S(st, p, geo.loops[i]));
    function shape(dx, dy) {
      var j, k, P;
      g.beginPath();
      for (j = 0; j < L.length; j++) {
        P = L[j]; if (dx || dy) { P = []; for (k = 0; k < L[j].length; k++) P.push([L[j][k][0] + dx, L[j][k][1] + dy]); }
        if (def.smooth) addBlob(g, P); else addPoly(g, P);
      }
    }
    g.lineJoin = 'round';
    shape(0, 0); g.fillStyle = rgba(def.tint, 0.34 * alpha); g.fill('evenodd');
    shape(o * 0.8, o * 0.9); g.strokeStyle = 'rgba(150,84,10,' + (0.42 * alpha).toFixed(3) + ')'; g.lineWidth = o * 1.3; g.stroke();
    shape(-o * 0.5, -o * 0.6); g.strokeStyle = 'rgba(255,240,176,' + (0.6 * alpha).toFixed(3) + ')'; g.lineWidth = o; g.stroke();
  }

  PK.art = {
    cookedRelief: cookedRelief,
    C: C, PLATE: PLATE, TAU: TAU,
    rnd: rnd, mix: mix, rgba: rgba, c01: c01, smooth: smooth, outCubic: outCubic, outBack: outBack, inQuad: inQuad,
    X: X, Y: Y, L2S: L2S, S: S, ell: ell, poly: poly, blob: blob, addPoly: addPoly, addBlob: addBlob, wob: wob, scalePts: scalePts,
    flatT: flatT, batterAt: batterAt, panR: panR, pancakePath: pancakePath,
    drawPlate: drawPlate, drawPancake: drawPancake, drawSugar: drawSugar,
    COOKED: COOKED, drawCooked: drawCooked
  };
})();
