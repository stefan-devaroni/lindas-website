/* Linda's Breakfast Rush: drawing, part 1.
   The kitchen, the food, the stations, the cook and the iguana.
   Everything is drawn in code on a Canvas 2D context. There are no image files
   except the real Linda's logo, which scene.js puts on the entrance sign. */
(function () {
  'use strict';
  var LBR = window.LBR = window.LBR || {};
  var TAU = Math.PI * 2;

  var C = {
    blue: '#27AAE1', navy: '#004EAD', pale: '#BDDFFF', yellow: '#EFBD40', orange: '#EB8917',
    cream: '#F1EAD1', creamLight: '#FAF6ED', ink: '#282204', white: '#FFFFFF',
    delft: '#1D5FBF', tile: '#F8F5EC',
    wood: '#C08A4E', woodDark: '#96652F', woodLight: '#DDB074',
    brick: '#A9583C', brickDark: '#8E4630',
    ochre: '#EDB73C', ochreDark: '#D59B28', sand: '#EBDDB5',
    steel: '#A9B4BF', steelDark: '#5C6875', iron: '#30363D',
    batter: '#F6E4B0', golden: '#E9B455', goldenDark: '#BF7B28', burnt: '#3A291B',
    bacon: '#A9412F', baconRaw: '#E38C7C', baconFat: '#F6D5C8',
    apple: '#F7EBC0', appleEdge: '#E3C067', appleSkin: '#D8463A',
    banana: '#F6D752', bananaFlesh: '#FBF1C7', leaf: '#55A64E', leafDark: '#357A38',
    good: '#58B04F', warn: '#EFBD40', bad: '#E2552E',
    skin: ['#F4CDA5', '#E3AC7C', '#C98A58', '#9E663B', '#74482A']
  };
  var FONT_SCRIPT = "'Olivier', 'Segoe Script', 'Brush Script MT', cursive";
  var FONT_LABEL = "'Telegrafico', 'Arial Narrow', 'Segoe UI', sans-serif";
  var FONT_BODY = "'Open Sauce One', 'Segoe UI', system-ui, sans-serif";

  /* ---------- helpers ---------- */

  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function ell(g, cx, cy, rx, ry) { g.beginPath(); g.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); }
  function circ(g, cx, cy, r) { g.beginPath(); g.arc(cx, cy, Math.max(0.01, r), 0, TAU); }
  function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function shadow(g, cx, cy, rx, ry, a) { g.fillStyle = 'rgba(40,34,4,' + (a == null ? 0.16 : a) + ')'; ell(g, cx, cy, rx, ry); g.fill(); }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b); t = Math.max(0, Math.min(1, t));
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function text(g, str, x, y, px, color, font, align, weight) {
    g.font = (weight ? weight + ' ' : '') + Math.max(6, px).toFixed(1) + 'px ' + (font || FONT_BODY);
    g.fillStyle = color || C.ink; g.textAlign = align || 'center'; g.textBaseline = 'middle';
    g.fillText(str, x, y);
  }
  // Largest font size (up to px) at which str fits in maxW.
  function fitText(g, str, maxW, px, font, weight) {
    g.font = (weight ? weight + ' ' : '') + px.toFixed(1) + 'px ' + font;
    var w = g.measureText(str).width;
    return w > maxW ? px * maxW / w : px;
  }

  /* ---------- Delft tiles ---------- */

  function mWindmill(g) {
    g.beginPath(); g.moveTo(-0.3, 0.88); g.lineTo(-0.17, -0.05); g.lineTo(0.17, -0.05); g.lineTo(0.3, 0.88); g.closePath();
    g.globalAlpha = 0.22; g.fill(); g.globalAlpha = 1; g.stroke();
    g.beginPath(); g.moveTo(-0.22, -0.05); g.quadraticCurveTo(0, -0.46, 0.22, -0.05); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-0.09, 0.88); g.lineTo(-0.09, 0.6); g.quadraticCurveTo(0, 0.48, 0.09, 0.6); g.lineTo(0.09, 0.88); g.stroke();
    for (var k = 0; k < 4; k++) {
      var a = Math.PI / 4 + k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
      g.beginPath(); g.moveTo(0, -0.22); g.lineTo(ca * 0.86, -0.22 + sa * 0.86); g.stroke();
      g.beginPath();
      g.moveTo(ca * 0.3, -0.22 + sa * 0.3); g.lineTo(ca * 0.86, -0.22 + sa * 0.86);
      g.lineTo(ca * 0.86 + px * 0.2, -0.22 + sa * 0.86 + py * 0.2); g.lineTo(ca * 0.3 + px * 0.2, -0.22 + sa * 0.3 + py * 0.2); g.closePath();
      g.globalAlpha = 0.3; g.fill(); g.globalAlpha = 1; g.stroke();
    }
    g.beginPath(); g.moveTo(-0.85, 0.9); g.lineTo(0.85, 0.9); g.stroke();
  }
  function mTulip(g) {
    g.beginPath(); g.moveTo(0, 0.92); g.quadraticCurveTo(0.08, 0.4, 0, -0.08); g.stroke();
    g.globalAlpha = 0.75;
    g.beginPath(); g.moveTo(0, 0.82); g.quadraticCurveTo(-0.62, 0.5, -0.46, -0.02); g.quadraticCurveTo(-0.18, 0.46, 0, 0.82); g.fill();
    g.beginPath(); g.moveTo(0, 0.82); g.quadraticCurveTo(0.62, 0.5, 0.46, 0.06); g.quadraticCurveTo(0.2, 0.5, 0, 0.82); g.fill();
    g.globalAlpha = 1;
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(-0.46, -0.04, -0.42, -0.56, -0.3, -0.84); g.lineTo(-0.14, -0.58); g.lineTo(0, -0.92); g.lineTo(0.14, -0.58); g.lineTo(0.3, -0.84);
    g.bezierCurveTo(0.42, -0.56, 0.46, -0.04, 0, 0); g.fill();
  }
  function mBoat(g) {
    g.beginPath(); g.moveTo(-0.72, 0.32); g.lineTo(0.72, 0.32); g.quadraticCurveTo(0.55, 0.74, 0.3, 0.74); g.lineTo(-0.36, 0.74); g.quadraticCurveTo(-0.62, 0.7, -0.72, 0.32); g.fill();
    g.beginPath(); g.moveTo(0, 0.32); g.lineTo(0, -0.88); g.stroke();
    g.beginPath(); g.moveTo(0.07, -0.82); g.lineTo(0.62, 0.18); g.lineTo(0.07, 0.18); g.closePath(); g.globalAlpha = 0.3; g.fill(); g.globalAlpha = 1; g.stroke();
    g.beginPath(); g.moveTo(-0.07, -0.55); g.lineTo(-0.52, 0.18); g.lineTo(-0.07, 0.18); g.closePath(); g.globalAlpha = 0.3; g.fill(); g.globalAlpha = 1; g.stroke();
    g.beginPath(); g.moveTo(-0.9, 0.92); g.quadraticCurveTo(-0.6, 0.8, -0.3, 0.92); g.quadraticCurveTo(0, 1.04, 0.3, 0.92); g.quadraticCurveTo(0.6, 0.8, 0.9, 0.92); g.stroke();
  }
  function mPalm(g) {
    var w = g.lineWidth;
    g.lineWidth = w * 1.6; g.beginPath(); g.moveTo(-0.12, 0.9); g.quadraticCurveTo(0.16, 0.2, -0.04, -0.32); g.stroke(); g.lineWidth = w;
    var ends = [[-0.86, -0.1], [-0.66, -0.72], [0, -0.94], [0.66, -0.7], [0.86, -0.06]];
    for (var i = 0; i < ends.length; i++) {
      var e = ends[i];
      g.beginPath(); g.moveTo(-0.04, -0.32); g.quadraticCurveTo(e[0] * 0.5, e[1] - 0.25, e[0], e[1]); g.quadraticCurveTo(e[0] * 0.45, e[1] * 0.5 - 0.1, -0.04, -0.32);
      g.globalAlpha = 0.7; g.fill(); g.globalAlpha = 1;
    }
    g.beginPath(); g.moveTo(-0.8, 0.92); g.quadraticCurveTo(0, 0.78, 0.8, 0.92); g.stroke();
  }
  function mRosette(g) {
    for (var k = 0; k < 8; k++) {
      g.save(); g.rotate(k * TAU / 8); g.beginPath(); g.ellipse(0, -0.5, 0.13, 0.3, 0, 0, TAU); g.globalAlpha = k % 2 ? 0.45 : 0.9; g.fill(); g.restore();
    }
    g.globalAlpha = 1; g.beginPath(); g.arc(0, 0, 0.16, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, 0, 0.9, 0, TAU); g.stroke();
  }
  function mDiamond(g) {
    g.beginPath(); g.moveTo(0, -0.5); g.lineTo(0.5, 0); g.lineTo(0, 0.5); g.lineTo(-0.5, 0); g.closePath(); g.stroke();
    g.beginPath(); g.arc(0, 0, 0.14, 0, TAU); g.fill();
    var p = [[0, -0.78], [0.78, 0], [0, 0.78], [-0.78, 0]];
    for (var i = 0; i < 4; i++) { g.beginPath(); g.arc(p[i][0], p[i][1], 0.07, 0, TAU); g.fill(); }
  }

  var tileCache = {};
  function tileSheet(size) {
    size = Math.max(10, Math.round(size));
    if (tileCache[size]) return tileCache[size];
    var motifs = [mWindmill, mDiamond, mTulip, mRosette, mDiamond, mBoat, mRosette, mPalm];
    var cv = document.createElement('canvas'); cv.width = size * 4; cv.height = size * 2;
    var g = cv.getContext('2d');
    for (var i = 0; i < 8; i++) {
      g.save(); g.translate((i % 4) * size, Math.floor(i / 4) * size);
      g.fillStyle = ['#F8F5EC', '#F3F0E4', '#FBF9F1'][i % 3]; g.fillRect(0, 0, size, size);
      g.fillStyle = C.delft; g.globalAlpha = 0.85;
      var cr = size * 0.15, corners = [[0, 0, 0], [size, 0, Math.PI / 2], [size, size, Math.PI], [0, size, Math.PI * 1.5]];
      for (var k = 0; k < 4; k++) { g.beginPath(); g.moveTo(corners[k][0], corners[k][1]); g.arc(corners[k][0], corners[k][1], cr, corners[k][2], corners[k][2] + Math.PI / 2); g.closePath(); g.fill(); }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(40,34,4,0.16)'; g.lineWidth = Math.max(1, size * 0.03); g.strokeRect(0, 0, size, size);
      g.translate(size / 2, size / 2); g.scale(size * 0.3, size * 0.3);
      g.lineWidth = 0.09; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.delft; g.fillStyle = C.delft;
      motifs[i](g);
      g.restore();
    }
    tileCache[size] = cv;
    return cv;
  }

  // A wall of Delft tiles. Tiles line up with the bottom edge of the rectangle.
  function wall(g, x, y, w, h, tile) {
    var sheet = tileSheet(tile);
    tile = sheet.height / 2;
    var pat = g.createPattern(sheet, 'repeat');
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.translate(x + (w % tile) / 2, y + h - Math.ceil(h / tile) * tile);
    g.fillStyle = pat; g.fillRect(-tile, 0, w + tile * 2, Math.ceil(h / tile) * tile);
    g.restore();
    var sh = g.createLinearGradient(0, y, 0, y + h);
    sh.addColorStop(0, 'rgba(40,34,4,0.16)'); sh.addColorStop(Math.min(0.5, 14 / Math.max(14, h)), 'rgba(40,34,4,0)');
    g.fillStyle = sh; g.fillRect(x, y, w, h);
  }

  function floor(g, x, y, w, h, tile) {
    g.fillStyle = '#F6F0DE'; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#D5E9F8';
    var cols = Math.ceil(w / tile) + 1, rows = Math.ceil(h / tile) + 1;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if ((r + c) % 2 === 0) g.fillRect(x + c * tile, y + r * tile, tile, tile);
    g.strokeStyle = 'rgba(40,34,4,0.06)'; g.lineWidth = 1;
    for (var c2 = 0; c2 <= cols; c2++) line(g, x + c2 * tile, y, x + c2 * tile, y + h);
    for (var r2 = 0; r2 <= rows; r2++) line(g, x, y + r2 * tile, x + w, y + r2 * tile);
    var sh = g.createLinearGradient(0, y, 0, y + tile * 0.7);
    sh.addColorStop(0, 'rgba(40,34,4,0.2)'); sh.addColorStop(1, 'rgba(40,34,4,0)');
    g.fillStyle = sh; g.fillRect(x, y, w, tile * 0.7);
    g.restore();
  }

  // One counter unit: cream top and, when it faces the floor or the room, a blue cabinet front.
  function counter(g, x, y, w, h, o) {
    var u = o.u, fh = o.front ? Math.round(u * 0.26) : 0, th = h - fh, px = Math.max(1, u * 0.012);
    g.fillStyle = o.dim ? '#F1ECDD' : C.creamLight; g.fillRect(x, y, w, th);
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(x, y, w, Math.max(1, u * 0.02));
    g.fillStyle = 'rgba(40,34,4,0.07)'; g.fillRect(x + w - px, y, px, th);
    if (!fh) { g.fillStyle = 'rgba(40,34,4,0.07)'; g.fillRect(x, y + th - px, w, px); }
    if (fh) {
      g.fillStyle = '#E4DAB9'; g.fillRect(x, y + th - u * 0.035, w, u * 0.035);
      g.fillStyle = C.blue; g.fillRect(x, y + th, w, fh);
      g.fillStyle = 'rgba(0,78,173,0.3)'; g.fillRect(x, y + th, w, fh * 0.13);
      g.strokeStyle = 'rgba(0,78,173,0.42)'; g.lineWidth = Math.max(1, u * 0.014);
      rr(g, x + w * 0.05, y + th + fh * 0.22, w * 0.9, fh * 0.6, u * 0.03); g.stroke();
      g.fillStyle = 'rgba(0,78,173,0.55)'; g.fillRect(x, y + h - fh * 0.1, w, fh * 0.1);
      g.fillStyle = 'rgba(0,78,173,0.3)'; g.fillRect(x + w - px, y + th, px, fh);
    }
    if (o.label) {
      if (fh) {
        var px1 = fitText(g, o.label, w * 0.8, fh * 0.44, FONT_LABEL);
        text(g, o.label, x + w / 2, y + th + fh * 0.54, px1, o.dim ? 'rgba(250,246,237,0.6)' : C.creamLight, FONT_LABEL);
      } else {
        var px2 = fitText(g, o.label, w * 0.8, u * 0.115, FONT_LABEL);
        text(g, o.label, x + w / 2, y + th - u * 0.1, px2, o.dim ? 'rgba(0,78,173,0.35)' : 'rgba(0,78,173,0.85)', FONT_LABEL);
      }
    }
  }

  /* ---------- food ---------- */

  function pancakePath(g, R, seed) {
    g.beginPath();
    for (var i = 0; i <= 40; i++) {
      var a = i / 40 * TAU, r = R * (1 + 0.022 * Math.sin(3 * a + seed) + 0.016 * Math.sin(5 * a + seed * 2.3));
      if (i) g.lineTo(Math.cos(a) * r, Math.sin(a) * r); else g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  }

  function bananaSlice(g, x, y, r) {
    g.fillStyle = C.bananaFlesh; circ(g, x, y, r); g.fill();
    g.strokeStyle = '#E6C961'; g.lineWidth = r * 0.2; circ(g, x, y, r * 0.88); g.stroke();
    g.fillStyle = '#A9803C';
    for (var k = 0; k < 3; k++) { circ(g, x + Math.cos(k * TAU / 3 + 0.5) * r * 0.2, y + Math.sin(k * TAU / 3 + 0.5) * r * 0.2, r * 0.08); g.fill(); }
  }
  // A thin apple ring: peeled, cored, a hole in the middle. No skin.
  function appleRing(g, x, y, r, cooked) {
    g.fillStyle = cooked ? '#F3D98F' : C.apple;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.arc(x, y, r * 0.3, 0, TAU, true); g.fill('evenodd');
    g.strokeStyle = cooked ? '#CC963B' : C.appleEdge; g.lineWidth = Math.max(0.6, r * 0.1);
    circ(g, x, y, r * 0.95); g.stroke(); circ(g, x, y, r * 0.32); g.stroke();
  }
  function baconStrip(g, x, y, len, wid, rot, cooked) {
    g.save(); g.translate(x, y); g.rotate(rot); g.lineCap = 'round'; g.lineJoin = 'round';
    function wave(off) {
      g.beginPath();
      for (var i = 0; i <= 12; i++) { var px = -len / 2 + len * i / 12, py = Math.sin(i / 12 * TAU * 1.5) * wid * 0.3 + off; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke();
    }
    g.strokeStyle = cooked ? C.bacon : C.baconRaw; g.lineWidth = wid; wave(0);
    g.strokeStyle = cooked ? '#DE9A80' : C.baconFat; g.lineWidth = wid * 0.2; wave(-wid * 0.22); wave(wid * 0.24);
    g.restore();
  }
  function bananaFruit(g, x, y, len, rot, col) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = col || C.banana;
    g.beginPath(); g.moveTo(-len / 2, -len * 0.08); g.quadraticCurveTo(0, len * 0.4, len / 2, -len * 0.08); g.quadraticCurveTo(0, len * 0.14, -len / 2, -len * 0.08); g.fill();
    g.fillStyle = '#6B4A22'; circ(g, -len / 2, -len * 0.08, len * 0.04); g.fill(); circ(g, len / 2, -len * 0.08, len * 0.03); g.fill();
    g.strokeStyle = 'rgba(160,120,30,0.5)'; g.lineWidth = Math.max(0.6, len * 0.02); g.beginPath(); g.moveTo(-len * 0.38, len * 0.03); g.quadraticCurveTo(0, len * 0.3, len * 0.38, len * 0.03); g.stroke();
    g.restore();
  }
  function appleFruit(g, x, y, r, col) {
    g.fillStyle = col || C.appleSkin;
    g.beginPath(); g.moveTo(x, y - r * 0.72);
    g.bezierCurveTo(x + r * 1.35, y - r * 1.3, x + r * 1.3, y + r * 0.95, x, y + r * 0.88);
    g.bezierCurveTo(x - r * 1.3, y + r * 0.95, x - r * 1.35, y - r * 1.3, x, y - r * 0.72); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - r * 0.42, y - r * 0.2, r * 0.18, r * 0.36, 0.3, 0, TAU); g.fill();
    g.strokeStyle = '#6B4A22'; g.lineWidth = Math.max(1, r * 0.12); g.lineCap = 'round'; line(g, x, y - r * 0.7, x + r * 0.12, y - r * 1.1);
    g.fillStyle = C.leaf; g.beginPath(); g.ellipse(x + r * 0.42, y - r * 1.02, r * 0.3, r * 0.14, -0.5, 0, TAU); g.fill();
  }

  function toppings(g, R, bacon, apple, cooked) {
    if (apple) { appleRing(g, -R * 0.34, -R * 0.42, R * 0.27, cooked); appleRing(g, R * 0.5, -R * 0.18, R * 0.27, cooked); appleRing(g, -R * 0.2, R * 0.48, R * 0.27, cooked); }
    if (bacon) { baconStrip(g, R * 0.12, -R * 0.56, R * 0.8, R * 0.17, 0.25, cooked); baconStrip(g, -R * 0.45, R * 0.06, R * 0.75, R * 0.17, 1.35, cooked); baconStrip(g, R * 0.36, R * 0.42, R * 0.8, R * 0.17, -0.5, cooked); }
  }

  /* One large, thin, flat pancake. o: {tilt, cook 0..1, burnt, top (bacon and apple baked in),
     showTop, sugar, banana, seed, raw (toppings still raw)} */
  function pancake(g, cx, cy, R, o) {
    o = o || {};
    var seed = o.seed || 7, cook = o.cook == null ? 1 : o.cook;
    g.save(); g.translate(cx, cy); g.scale(1, o.tilt || 1);
    g.fillStyle = 'rgba(40,34,4,0.2)'; g.translate(0, R * 0.05); pancakePath(g, R * 1.01, seed); g.fill(); g.translate(0, -R * 0.05);
    var base = o.burnt ? C.burnt : mix(C.batter, C.golden, cook);
    g.fillStyle = base; pancakePath(g, R, seed); g.fill();
    if (!o.burnt && cook > 0.45) {
      g.save(); pancakePath(g, R, seed); g.clip();
      var rand = rnd(seed * 97 + 3), a = Math.min(1, (cook - 0.45) * 2.2);
      g.fillStyle = 'rgba(176,104,34,' + (0.3 * a).toFixed(3) + ')';
      for (var i = 0; i < 16; i++) { var ang = rand() * TAU, d = Math.sqrt(rand()) * R * 0.9; ell(g, Math.cos(ang) * d, Math.sin(ang) * d, R * (0.06 + rand() * 0.12), R * (0.05 + rand() * 0.09)); g.fill(); }
      g.strokeStyle = 'rgba(176,104,34,' + (0.28 * a).toFixed(3) + ')'; g.lineWidth = R * 0.035;
      for (var k = 0; k < 5; k++) { var a2 = rand() * TAU, d2 = rand() * R * 0.6; g.beginPath(); g.arc(Math.cos(a2) * d2, Math.sin(a2) * d2, R * (0.12 + rand() * 0.2), rand() * TAU, rand() * TAU + 2.2); g.stroke(); }
      g.restore();
      g.strokeStyle = 'rgba(160,96,30,' + (0.55 * a).toFixed(3) + ')'; g.lineWidth = R * 0.05; pancakePath(g, R * 0.975, seed); g.stroke();
    } else if (!o.burnt) {
      g.fillStyle = 'rgba(255,255,255,0.35)'; ell(g, -R * 0.25, -R * 0.3, R * 0.4, R * 0.2); g.fill();
      if (cook > 0.1) { g.fillStyle = 'rgba(214,170,90,0.6)'; var rb = rnd(seed * 31 + Math.floor(cook * 6)); for (var b = 0; b < 9; b++) { var ab = rb() * TAU, db = Math.sqrt(rb()) * R * 0.8; circ(g, Math.cos(ab) * db, Math.sin(ab) * db, R * (0.03 + rb() * 0.04)); g.fill(); } }
    }
    if (o.burnt) {
      g.fillStyle = 'rgba(0,0,0,0.35)'; var rk = rnd(seed + 5);
      for (var j = 0; j < 8; j++) { var aj = rk() * TAU, dj = Math.sqrt(rk()) * R * 0.8; ell(g, Math.cos(aj) * dj, Math.sin(aj) * dj, R * 0.14, R * 0.1); g.fill(); }
    }
    if (o.top && o.showTop !== false && !o.burnt) toppings(g, R, true, true, !o.raw);
    if (o.banana) {
      var spots = [[0, -0.55], [0.5, -0.24], [0.48, 0.3], [0, 0.56], [-0.5, 0.28], [-0.5, -0.26], [0, 0]];
      for (var s = 0; s < spots.length; s++) bananaSlice(g, spots[s][0] * R, spots[s][1] * R, R * 0.2);
    }
    if (o.sugar) {
      // over banana slices the dusting is lighter, so the slices still read as banana
      g.fillStyle = 'rgba(255,255,255,' + (o.banana ? 0.14 : 0.3) + ')'; pancakePath(g, R * 0.9, seed); g.fill();
      g.fillStyle = '#FFFFFF'; var rs = rnd(seed * 13 + 1);
      for (var q = 0; q < (o.banana ? 34 : 46); q++) { var aq = rs() * TAU, dq = Math.sqrt(rs()) * R * 0.86; circ(g, Math.cos(aq) * dq, Math.sin(aq) * dq, R * (0.025 + rs() * 0.03)); g.fill(); }
    }
    g.restore();
  }

  function plate(g, cx, cy, r, tilt) {
    g.save(); g.translate(cx, cy); g.scale(1, tilt || 1);
    g.fillStyle = 'rgba(40,34,4,0.18)'; circ(g, 0, r * 0.07, r * 1.01); g.fill();
    g.fillStyle = '#FFFFFF'; circ(g, 0, 0, r); g.fill();
    g.strokeStyle = C.blue; g.lineWidth = Math.max(0.8, r * 0.05); circ(g, 0, 0, r * 0.93); g.stroke();
    g.restore();
  }

  // A plated pancake. p: {base:'plain'|'baconApple', sugar, banana, burnt}
  function dish(g, cx, cy, r, p, tilt) {
    plate(g, cx, cy, r, tilt);
    pancake(g, cx, cy, r * 0.9, { tilt: tilt, cook: 1, burnt: p.burnt, top: p.base === 'baconApple', sugar: p.sugar, banana: p.banana, seed: p.seed || 7 });
  }
  // How each finished pancake looks. Powdered sugar is on every pancake without a savory topping:
  // plain and banana get it, bacon apple does not.
  function dishOf(kind) {
    if (kind === 'plain') return { base: 'plain', sugar: true };
    if (kind === 'banana') return { base: 'plain', banana: true, sugar: true };
    return { base: 'baconApple' };
  }

  /* ---------- stations ---------- */

  function flour(g, cx, cy, s) {
    var w = s * 0.46, h = s * 0.52, x = cx - w / 2, y = cy - h * 0.52;
    shadow(g, cx, y + h, w * 0.62, s * 0.06);
    g.fillStyle = '#EBDCB4';
    g.beginPath(); g.moveTo(x + w * 0.08, y + h * 0.12); g.quadraticCurveTo(x - w * 0.07, y + h * 0.6, x + w * 0.03, y + h); g.lineTo(x + w * 0.97, y + h); g.quadraticCurveTo(x + w * 1.07, y + h * 0.6, x + w * 0.92, y + h * 0.12); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,34,4,0.08)';
    g.beginPath(); g.moveTo(x + w * 0.72, y + h * 0.12); g.lineTo(x + w * 0.92, y + h * 0.12); g.quadraticCurveTo(x + w * 1.07, y + h * 0.6, x + w * 0.97, y + h); g.lineTo(x + w * 0.76, y + h); g.closePath(); g.fill();
    g.fillStyle = '#D8C68F'; rr(g, x + w * 0.03, y, w * 0.94, h * 0.17, h * 0.08); g.fill();
    g.fillStyle = C.blue; rr(g, cx - w * 0.29, y + h * 0.36, w * 0.58, h * 0.42, s * 0.03); g.fill();
    g.strokeStyle = '#FFFFFF'; g.fillStyle = '#FFFFFF'; g.lineWidth = Math.max(1, s * 0.016); g.lineCap = 'round';
    line(g, cx, y + h * 0.72, cx, y + h * 0.46);
    for (var i = 0; i < 3; i++) { var gy = y + h * (0.5 + i * 0.07); g.beginPath(); g.ellipse(cx - w * 0.07, gy, w * 0.035, w * 0.07, -0.6, 0, TAU); g.fill(); g.beginPath(); g.ellipse(cx + w * 0.07, gy, w * 0.035, w * 0.07, 0.6, 0, TAU); g.fill(); }
    g.fillStyle = '#FFFFFF'; ell(g, x - w * 0.08, y + h * 0.98, w * 0.2, s * 0.03); g.fill();
  }

  function egg(g, x, y, r, col) {
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r * 0.8, r, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.35, r * 0.2, r * 0.3, -0.4, 0, TAU); g.fill();
  }
  function eggs(g, cx, cy, s) {
    var w = s * 0.62, h = s * 0.34, x = cx - w / 2, y = cy - h * 0.2;
    shadow(g, cx, y + h, w * 0.54, s * 0.05);
    g.fillStyle = '#C5B290'; rr(g, x + w * 0.02, y - h * 0.62, w * 0.96, h * 0.8, s * 0.04); g.fill();
    g.fillStyle = 'rgba(40,34,4,0.1)'; rr(g, x + w * 0.08, y - h * 0.5, w * 0.84, h * 0.5, s * 0.03); g.fill();
    g.fillStyle = '#DACAA9'; rr(g, x, y, w, h, s * 0.05); g.fill();
    g.fillStyle = '#C5B290'; rr(g, x, y + h * 0.66, w, h * 0.34, s * 0.04); g.fill();
    for (var r = 0; r < 2; r++) for (var c = 0; c < 3; c++) egg(g, x + w * (0.2 + c * 0.3), y + h * (0.16 + r * 0.36), s * 0.085, (r + c) % 2 ? '#E7C096' : '#FBF3E2');
  }

  function milk(g, cx, cy, s) {
    function bottle(bx, by, k) {
      var w = s * 0.25 * k, h = s * 0.6 * k, x = bx - w / 2, y = by - h;
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.moveTo(x + w * 0.3, y); g.lineTo(x + w * 0.7, y); g.lineTo(x + w * 0.7, y + h * 0.2);
      g.quadraticCurveTo(x + w, y + h * 0.3, x + w, y + h * 0.42); g.lineTo(x + w, y + h * 0.94); g.quadraticCurveTo(x + w, y + h, x + w * 0.85, y + h);
      g.lineTo(x + w * 0.15, y + h); g.quadraticCurveTo(x, y + h, x, y + h * 0.94); g.lineTo(x, y + h * 0.42); g.quadraticCurveTo(x, y + h * 0.3, x + w * 0.3, y + h * 0.2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,78,173,0.22)'; g.lineWidth = Math.max(1, s * 0.012); g.stroke();
      g.fillStyle = 'rgba(189,223,255,0.6)'; g.fillRect(x + w * 0.7, y + h * 0.42, w * 0.2, h * 0.5);
      g.fillStyle = C.blue; g.fillRect(x, y + h * 0.5, w, h * 0.26);
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(bx, y + h * 0.54); g.quadraticCurveTo(bx + w * 0.26, y + h * 0.68, bx, y + h * 0.72); g.quadraticCurveTo(bx - w * 0.26, y + h * 0.68, bx, y + h * 0.54); g.fill();
      g.fillStyle = C.navy; rr(g, x + w * 0.24, y - h * 0.05, w * 0.52, h * 0.09, s * 0.015); g.fill();
    }
    shadow(g, cx, cy + s * 0.27, s * 0.3, s * 0.055);
    bottle(cx + s * 0.13, cy + s * 0.2, 0.86);
    bottle(cx - s * 0.08, cy + s * 0.27, 1);
  }

  function sugar(g, cx, cy, s) {
    var w = s * 0.3, h = s * 0.52, x = cx - w / 2, y = cy - h * 0.52;
    shadow(g, cx, y + h, w * 0.75, s * 0.055);
    g.fillStyle = '#FFFFFF'; var rs = rnd(11);
    for (var i = 0; i < 14; i++) { circ(g, cx + (rs() - 0.5) * s * 0.7, y + h * 0.96 + (rs() - 0.5) * s * 0.1, s * 0.012); g.fill(); }
    var grad = g.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, '#BCC6D0'); grad.addColorStop(0.4, '#F4F7F9'); grad.addColorStop(1, '#A7B2BD');
    g.fillStyle = grad; rr(g, x, y + h * 0.24, w, h * 0.76, s * 0.04); g.fill();
    g.beginPath(); g.moveTo(x - w * 0.04, y + h * 0.27); g.quadraticCurveTo(cx, y - h * 0.14, x + w * 1.04, y + h * 0.27); g.closePath(); g.fill();
    g.fillStyle = C.steelDark;
    var holes = [[0, 0.1], [-0.18, 0.16], [0.18, 0.16], [-0.08, 0.2], [0.09, 0.21], [0, 0.03]];
    for (var k = 0; k < holes.length; k++) { circ(g, cx + holes[k][0] * w, y + holes[k][1] * h, s * 0.011); g.fill(); }
    g.fillStyle = C.blue; g.fillRect(x, y + h * 0.48, w, h * 0.28);
    g.fillStyle = '#FFFFFF';
    for (var d = 0; d < 5; d++) { circ(g, x + w * (0.16 + d * 0.17), y + h * (0.56 + (d % 2) * 0.1), s * 0.014); g.fill(); }
  }

  /* The mixing bowl. b: {flour, eggs, milk, whisk (0..1 while whisking, else -1), batter, portions} */
  function bowl(g, cx, cy, s, b, t) {
    var rx = s * 0.33, ry = s * 0.19, top = cy - s * 0.07, whisking = b.whisk >= 0;
    shadow(g, cx, top + s * 0.3, rx * 0.85, s * 0.06);
    g.fillStyle = C.pale;
    g.beginPath(); g.moveTo(cx - rx, top); g.quadraticCurveTo(cx - rx * 0.92, top + s * 0.31, cx - rx * 0.36, top + s * 0.31); g.lineTo(cx + rx * 0.36, top + s * 0.31); g.quadraticCurveTo(cx + rx * 0.92, top + s * 0.31, cx + rx, top); g.closePath(); g.fill();
    g.save(); g.clip();
    g.strokeStyle = C.delft; g.lineWidth = s * 0.02;
    g.beginPath(); g.ellipse(cx, top + s * 0.02, rx * 0.93, ry * 1.25, 0, 0.15, Math.PI - 0.15); g.stroke();
    g.fillStyle = C.delft;
    for (var i = 0; i < 7; i++) { var a = 0.35 + i * (Math.PI - 0.7) / 6; circ(g, cx + Math.cos(a) * rx * 0.86, top + s * 0.06 + Math.sin(a) * ry * 1.25, s * 0.016); g.fill(); }
    g.fillStyle = 'rgba(0,78,173,0.12)'; g.fillRect(cx + rx * 0.45, top, rx, s * 0.4);
    g.restore();
    g.fillStyle = '#E6F2FF'; ell(g, cx, top, rx, ry); g.fill();
    g.fillStyle = '#93C5EC'; ell(g, cx, top + ry * 0.1, rx * 0.88, ry * 0.82); g.fill();
    g.save(); ell(g, cx, top + ry * 0.1, rx * 0.88, ry * 0.82); g.clip();
    if (b.batter > 0 || whisking) {
      var lvl = whisking ? 0.86 : 0.5 + 0.38 * b.batter / (b.portions || 4);
      g.fillStyle = whisking ? mix('#FFFFFF', C.batter, b.whisk) : C.batter;
      ell(g, cx, top + ry * (0.1 + (1 - lvl) * 0.75), rx * 0.88 * (0.7 + lvl * 0.3), ry * 0.82 * (0.7 + lvl * 0.3)); g.fill();
      g.strokeStyle = 'rgba(200,150,60,0.5)'; g.lineWidth = s * 0.012;
      var rot = whisking ? t * 9 : 0.6;
      g.beginPath(); for (var k = 0; k < 30; k++) { var aa = rot + k * 0.5, rr2 = k / 30; var px = cx + Math.cos(aa) * rx * 0.6 * rr2, py = top + ry * 0.35 + Math.sin(aa) * ry * 0.5 * rr2; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
    } else {
      if (b.milk) { g.fillStyle = '#FFFFFF'; ell(g, cx + rx * 0.1, top + ry * 0.45, rx * 0.7, ry * 0.5); g.fill(); }
      if (b.flour) { g.fillStyle = '#FFFDF5'; ell(g, cx - rx * 0.3, top + ry * 0.3, rx * 0.42, ry * 0.42); g.fill(); g.fillStyle = 'rgba(40,34,4,0.07)'; ell(g, cx - rx * 0.24, top + ry * 0.4, rx * 0.3, ry * 0.26); g.fill(); }
      if (b.eggs) { g.fillStyle = 'rgba(255,255,255,0.9)'; ell(g, cx + rx * 0.3, top + ry * 0.25, rx * 0.3, ry * 0.3); g.fill(); g.fillStyle = C.yellow; circ(g, cx + rx * 0.24, top + ry * 0.22, s * 0.035); g.fill(); circ(g, cx + rx * 0.42, top + ry * 0.36, s * 0.035); g.fill(); }
    }
    g.restore();
    g.strokeStyle = 'rgba(0,78,173,0.25)'; g.lineWidth = Math.max(1, s * 0.012); ell(g, cx, top, rx, ry); g.stroke();
    // whisk while collecting or whisking, ladle once there is batter
    g.lineCap = 'round';
    if (b.batter > 0 && !whisking) {
      g.strokeStyle = C.steelDark; g.lineWidth = s * 0.035; line(g, cx + rx * 0.2, top + ry * 0.2, cx + rx * 0.85, top - s * 0.3);
      g.fillStyle = C.navy; circ(g, cx + rx * 0.85, top - s * 0.3, s * 0.03); g.fill();
    } else {
      var wx = whisking ? Math.cos(t * 13) * rx * 0.34 : -rx * 0.05, wy = whisking ? Math.sin(t * 13) * ry * 0.34 : 0;
      var tipX = cx + wx, tipY = top + ry * 0.3 + wy, hx = cx + rx * 0.72 + wx * 0.3, hy = top - s * 0.34;
      g.strokeStyle = C.steel; g.lineWidth = s * 0.014;
      for (var w2 = -1; w2 <= 1; w2++) { g.beginPath(); g.moveTo(tipX + (hx - tipX) * 0.45, tipY + (hy - tipY) * 0.45); g.quadraticCurveTo(tipX + w2 * s * 0.07, tipY + s * 0.02, tipX, tipY + s * 0.03); g.stroke(); }
      g.strokeStyle = C.navy; g.lineWidth = s * 0.04; line(g, tipX + (hx - tipX) * 0.45, tipY + (hy - tipY) * 0.45, hx, hy);
    }
  }

  // Small check pips. items: [{on, color}]
  function pips(g, cx, y, s, items) {
    var r = s * 0.045, gap = r * 2.7, x0 = cx - gap * (items.length - 1) / 2;
    for (var i = 0; i < items.length; i++) {
      var x = x0 + i * gap;
      g.fillStyle = 'rgba(40,34,4,0.55)'; circ(g, x, y, r * 1.28); g.fill();
      g.fillStyle = items[i].on ? items[i].color : 'rgba(250,246,237,0.25)'; circ(g, x, y, r); g.fill();
    }
  }

  function stove(g, cx, cy, s, on, t) {
    var w = s * 0.84, h = s * 0.6;
    g.fillStyle = '#4B535D'; rr(g, cx - w / 2, cy - h / 2, w, h, s * 0.06); g.fill();
    g.fillStyle = '#5B6470'; rr(g, cx - w / 2 + s * 0.02, cy - h / 2 + s * 0.02, w - s * 0.04, h - s * 0.06, s * 0.05); g.fill();
    if (on) {
      var fl = 0.75 + Math.sin(t * 17) * 0.12;
      g.fillStyle = 'rgba(235,137,23,' + (0.3 * fl).toFixed(3) + ')'; ell(g, cx, cy, s * 0.38, s * 0.25); g.fill();
    }
    g.strokeStyle = on ? 'rgba(239,160,50,0.95)' : '#2B3138'; g.lineWidth = s * 0.028;
    ell(g, cx, cy, s * 0.27, s * 0.17); g.stroke(); ell(g, cx, cy, s * 0.15, s * 0.095); g.stroke();
  }

  /* A frying pan and what is in it.
     p: {bacon, apple, raw (toppings raw), cook (0..1 colour of the visible side), batter (true once poured),
         top (toppings baked in), topUp (toppings on the visible side), burnt, flip (0..1 while flipping, else -1)} */
  function pan(g, cx, cy, s, p) {
    var rx = s * 0.31, ry = s * 0.2, R = rx * 0.82, tilt = ry / rx;
    g.save(); g.translate(cx + rx * 0.78, cy + ry * 0.72); g.rotate(0.62);
    g.fillStyle = '#1E2227'; rr(g, 0, -s * 0.036, s * 0.3, s * 0.072, s * 0.036); g.fill();
    g.fillStyle = '#4B535D'; circ(g, s * 0.25, 0, s * 0.014); g.fill();
    g.restore();
    g.fillStyle = '#1E2227'; ell(g, cx, cy + s * 0.03, rx, ry); g.fill();
    g.fillStyle = '#343B44'; ell(g, cx, cy, rx, ry); g.fill();
    g.fillStyle = '#48525D'; ell(g, cx, cy + s * 0.012, rx * 0.88, ry * 0.86); g.fill();
    if (!p) return;
    if (!p.batter) {
      if (p.bacon || p.apple) { g.save(); g.translate(cx, cy + s * 0.012); g.scale(1, tilt); toppings(g, R, p.bacon, p.apple, !p.raw); g.restore(); }
      return;
    }
    var lift = 0, squash = 1, showTop = p.topUp;
    if (p.flip >= 0) {
      lift = Math.sin(Math.PI * p.flip) * s * 0.42;
      squash = Math.abs(Math.cos(Math.PI * p.flip));
      if (lift > s * 0.05) shadow(g, cx, cy + s * 0.012, R * (1 - p.flip * 0.2), R * tilt * (1 - p.flip * 0.2), 0.2);
    }
    pancake(g, cx, cy + s * 0.012 - lift, R, { tilt: tilt * Math.max(0.06, squash), cook: p.cook, burnt: p.burnt, top: p.top, showTop: showTop, raw: false, seed: p.seed || 7 });
  }

  function bell(g, cx, cy, r, ring) {
    g.save(); g.translate(cx, cy); if (ring) g.rotate(Math.sin(ring * 40) * 0.12 * ring);
    g.fillStyle = '#9A7421'; ell(g, 0, r * 0.62, r * 1.05, r * 0.3); g.fill();
    g.fillStyle = C.yellow; g.beginPath(); g.moveTo(-r, r * 0.6); g.quadraticCurveTo(-r, -r * 0.75, 0, -r * 0.75); g.quadraticCurveTo(r, -r * 0.75, r, r * 0.6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.15, r * 0.16, r * 0.4, 0.4, 0, TAU); g.fill();
    g.fillStyle = '#9A7421'; circ(g, 0, -r * 0.86, r * 0.2); g.fill();
    g.restore();
  }

  function pass(g, cx, cy, s, ring) {
    shadow(g, cx - s * 0.06, cy + s * 0.07, s * 0.33, s * 0.2, 0.1);
    g.fillStyle = C.pale; ell(g, cx - s * 0.06, cy + s * 0.03, s * 0.33, s * 0.21); g.fill();
    g.strokeStyle = C.delft; g.lineWidth = s * 0.014; g.setLineDash([s * 0.03, s * 0.03]); ell(g, cx - s * 0.06, cy + s * 0.03, s * 0.28, s * 0.175); g.stroke(); g.setLineDash([]);
    bell(g, cx + s * 0.28, cy - s * 0.1, s * 0.11, ring);
  }

  function bin(g, cx, cy, s, open) {
    var w = s * 0.5, h = s * 0.6, x = cx - w / 2, y = cy - h * 0.45;
    shadow(g, cx, y + h, w * 0.62, s * 0.07, 0.2);
    g.fillStyle = '#7D8B98';
    g.beginPath(); g.moveTo(x, y + h * 0.14); g.lineTo(x + w, y + h * 0.14); g.lineTo(x + w * 0.9, y + h); g.lineTo(x + w * 0.1, y + h); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,34,4,0.14)';
    g.beginPath(); g.moveTo(x + w * 0.7, y + h * 0.14); g.lineTo(x + w, y + h * 0.14); g.lineTo(x + w * 0.9, y + h); g.lineTo(x + w * 0.68, y + h); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,34,4,0.18)'; g.lineWidth = Math.max(1, s * 0.012);
    for (var i = 1; i < 4; i++) line(g, x + w * (0.1 + i * 0.2), y + h * 0.24, x + w * (0.16 + i * 0.17), y + h * 0.94);
    g.fillStyle = '#23282E'; ell(g, cx, y + h * 0.14, w * 0.5, h * 0.09); g.fill();
    g.save(); g.translate(x, y + h * 0.12); g.rotate(-(open || 0) * 0.9 - 0.08);
    g.fillStyle = C.steelDark; rr(g, -w * 0.04, -h * 0.12, w * 1.08, h * 0.13, h * 0.06); g.fill();
    g.fillStyle = '#3F4852'; rr(g, w * 0.36, -h * 0.19, w * 0.28, h * 0.08, h * 0.04); g.fill();
    g.restore();
  }

  function crate(g, x, y, w, h, s) {
    g.fillStyle = C.wood; rr(g, x, y, w, h, s * 0.03); g.fill();
    g.fillStyle = C.woodDark; g.fillRect(x, y + h * 0.3, w, h * 0.09); g.fillRect(x, y + h * 0.68, w, h * 0.09);
    g.fillStyle = 'rgba(40,34,4,0.12)'; g.fillRect(x + w * 0.82, y, w * 0.18, h);
  }
  function bananas(g, cx, cy, s) {
    var w = s * 0.62, h = s * 0.24, x = cx - w / 2, y = cy + s * 0.02;
    shadow(g, cx, y + h, w * 0.55, s * 0.05);
    crate(g, x, y, w, h, s);
    bananaFruit(g, cx - s * 0.08, cy - s * 0.1, s * 0.46, -0.25, '#E9C63F');
    bananaFruit(g, cx + s * 0.06, cy - s * 0.06, s * 0.46, 0.12, C.banana);
    bananaFruit(g, cx - s * 0.02, cy - s * 0.01, s * 0.44, -0.05, '#F9E06A');
  }
  function apples(g, cx, cy, s) {
    var w = s * 0.62, h = s * 0.24, x = cx - w / 2, y = cy + s * 0.02;
    shadow(g, cx, y + h, w * 0.55, s * 0.05);
    appleFruit(g, cx - s * 0.16, cy - s * 0.06, s * 0.12, '#E0584A');
    appleFruit(g, cx + s * 0.15, cy - s * 0.07, s * 0.12, '#D8463A');
    crate(g, x, y, w, h, s);
    appleFruit(g, cx, cy - s * 0.02, s * 0.125, '#E46A4E');
  }
  function baconTray(g, cx, cy, s) {
    var w = s * 0.66, h = s * 0.4, x = cx - w / 2, y = cy - h * 0.42;
    shadow(g, cx, y + h, w * 0.52, s * 0.05);
    g.fillStyle = '#FFFFFF'; rr(g, x, y, w, h, s * 0.07); g.fill();
    g.strokeStyle = C.blue; g.lineWidth = Math.max(1, s * 0.014); rr(g, x + s * 0.025, y + s * 0.025, w - s * 0.05, h - s * 0.05, s * 0.05); g.stroke();
    for (var i = 0; i < 4; i++) baconStrip(g, cx, y + h * (0.22 + i * 0.19), w * 0.72, h * 0.14, 0, false);
  }

  function knife(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0);
    g.fillStyle = '#E3E8EC'; g.beginPath(); g.moveTo(0, -s * 0.035); g.lineTo(s * 0.24, -s * 0.035); g.quadraticCurveTo(s * 0.3, 0, s * 0.22, s * 0.03); g.lineTo(0, s * 0.03); g.closePath(); g.fill();
    g.fillStyle = C.navy; rr(g, -s * 0.16, -s * 0.03, s * 0.17, s * 0.055, s * 0.02); g.fill();
    g.restore();
  }

  /* The cutting board. b: {item: null|'banana'|'apple'|'bananaSlices'|'appleRings', prog: 0..1 while working, else -1} */
  function board(g, cx, cy, s, b, t) {
    var w = s * 0.72, h = s * 0.44, x = cx - w / 2, y = cy - h / 2, working = b.prog >= 0;
    shadow(g, cx, y + h * 1.02, w * 0.52, s * 0.05);
    g.fillStyle = C.woodLight; rr(g, x, y, w, h, s * 0.06); g.fill();
    g.strokeStyle = 'rgba(150,101,47,0.35)'; g.lineWidth = Math.max(1, s * 0.012);
    for (var i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + w * 0.06, y + h * i / 4); g.quadraticCurveTo(cx, y + h * i / 4 + s * 0.02, x + w * 0.94, y + h * i / 4 - s * 0.01); g.stroke(); }
    g.fillStyle = C.woodDark; circ(g, x + w * 0.08, y + h * 0.5, s * 0.022); g.fill();
    var ix = cx - s * 0.06, iy = cy;
    if (b.item === 'banana') {
      var cut = working ? b.prog : 0;
      if (cut < 0.95) { g.save(); g.beginPath(); g.rect(ix - s * 0.3 + s * 0.5 * cut, y - s * 0.2, s, s); g.clip(); bananaFruit(g, ix, iy - s * 0.02, s * 0.46, 0, C.banana); g.restore(); }
      for (var k = 0; k < Math.floor(cut * 7); k++) bananaSlice(g, ix - s * 0.21 + k * s * 0.062, iy + s * 0.02 + (k % 2) * s * 0.03, s * 0.045);
    } else if (b.item === 'bananaSlices') {
      var bs = [[-0.16, -0.04], [-0.05, -0.07], [0.07, -0.04], [-0.11, 0.05], [0.01, 0.04], [0.13, 0.06], [-0.02, -0.01]];
      for (var m = 0; m < bs.length; m++) bananaSlice(g, ix + bs[m][0] * s, iy + bs[m][1] * s, s * 0.055);
    } else if (b.item === 'apple') {
      var pr = working ? b.prog : 0;
      if (pr < 0.4) { appleFruit(g, ix, iy, s * 0.13, pr > 0.15 ? mix(C.appleSkin, C.apple, (pr - 0.15) * 4) : C.appleSkin); }
      else { var n = Math.floor((pr - 0.4) / 0.6 * 4) + 1; for (var q = 0; q < Math.min(4, n); q++) appleRing(g, ix - s * 0.14 + q * s * 0.09, iy + (q % 2) * s * 0.02, s * 0.085, false); }
    } else if (b.item === 'appleRings') {
      for (var z = 0; z < 4; z++) appleRing(g, ix - s * 0.14 + z * s * 0.09, iy + (z % 2) * s * 0.02, s * 0.085, false);
    }
    if (working) knife(g, ix + s * 0.02 + (b.item === 'banana' ? (b.prog - 0.5) * s * 0.36 : 0), iy - s * 0.1 - Math.abs(Math.sin(t * 15)) * s * 0.09, s, 0.15);
    else knife(g, x + w * 0.7, y + h * 0.78, s * 0.9, -0.12);
  }

  /* ---------- things in the cook's hands ---------- */

  function held(g, cx, cy, s, hold, t) {
    var k = hold.type;
    if (k === 'plate') { dish(g, cx, cy, s * 0.5, hold, 0.62); return; }
    if (k === 'burnt') { dish(g, cx, cy, s * 0.5, { base: 'plain', burnt: true }, 0.62); return; }
    if (k === 'flour') {
      g.fillStyle = '#EBDCB4'; rr(g, cx - s * 0.2, cy - s * 0.24, s * 0.4, s * 0.48, s * 0.06); g.fill();
      g.fillStyle = '#D8C68F'; rr(g, cx - s * 0.2, cy - s * 0.3, s * 0.4, s * 0.12, s * 0.05); g.fill();
      g.fillStyle = C.blue; rr(g, cx - s * 0.12, cy - s * 0.08, s * 0.24, s * 0.2, s * 0.03); g.fill();
    } else if (k === 'eggs') {
      egg(g, cx - s * 0.13, cy, s * 0.17, '#FBF3E2'); egg(g, cx + s * 0.13, cy + s * 0.02, s * 0.17, '#E7C096');
    } else if (k === 'milk') {
      g.fillStyle = '#FFFFFF'; rr(g, cx - s * 0.13, cy - s * 0.16, s * 0.26, s * 0.44, s * 0.05); g.fill(); rr(g, cx - s * 0.06, cy - s * 0.32, s * 0.12, s * 0.2, s * 0.02); g.fill();
      g.fillStyle = C.blue; g.fillRect(cx - s * 0.13, cy - s * 0.02, s * 0.26, s * 0.14);
      g.fillStyle = C.navy; rr(g, cx - s * 0.075, cy - s * 0.36, s * 0.15, s * 0.07, s * 0.02); g.fill();
    } else if (k === 'ladle') {
      g.strokeStyle = C.steelDark; g.lineWidth = s * 0.07; g.lineCap = 'round'; line(g, cx + s * 0.05, cy, cx + s * 0.3, cy - s * 0.36);
      g.fillStyle = C.steel; ell(g, cx - s * 0.08, cy + s * 0.06, s * 0.25, s * 0.17); g.fill();
      g.fillStyle = C.batter; ell(g, cx - s * 0.08, cy + s * 0.04, s * 0.2, s * 0.12); g.fill();
    } else if (k === 'banana') {
      bananaFruit(g, cx, cy - s * 0.06, s * 0.7, 0.05, C.banana);
    } else if (k === 'apple') {
      appleFruit(g, cx, cy + s * 0.03, s * 0.21, C.appleSkin);
    } else if (k === 'bacon') {
      baconStrip(g, cx, cy - s * 0.08, s * 0.66, s * 0.13, 0.08, false); baconStrip(g, cx, cy + s * 0.1, s * 0.66, s * 0.13, -0.05, false);
    } else if (k === 'bananaSlices') {
      var bs = [[-0.2, -0.04], [0, -0.1], [0.2, -0.03], [-0.1, 0.12], [0.11, 0.12]];
      for (var i = 0; i < bs.length; i++) bananaSlice(g, cx + bs[i][0] * s, cy + bs[i][1] * s, s * 0.12);
    } else if (k === 'appleRings') {
      appleRing(g, cx - s * 0.17, cy - s * 0.04, s * 0.17, false); appleRing(g, cx + s * 0.16, cy - s * 0.06, s * 0.17, false); appleRing(g, cx, cy + s * 0.1, s * 0.17, false);
    }
  }

  /* ---------- the cook: a made-up friendly character in a Linda's-blue shirt and an apron ---------- */

  var COOK = { skin: '#D9A074', hair: '#4A2F1B' };

  /* (x, y) is the point between the feet. o: {dir, walk, moving, hold, work (0..1 phase or -1), t} */
  function cook(g, x, y, s, o) {
    var t = o.t || 0, dir = o.dir || 'down', back = dir === 'up', side = dir === 'left' || dir === 'right';
    var bob = o.moving ? Math.abs(Math.sin(o.walk)) * s * 0.03 : Math.sin(t * 2.4) * s * 0.008;
    var step = o.moving ? Math.sin(o.walk) * s * 0.04 : 0;
    var working = o.work >= 0, carrying = !!o.hold;
    shadow(g, x, y, s * 0.27, s * 0.075, 0.2);
    g.save(); g.translate(x, y - bob); if (dir === 'left') g.scale(-1, 1);
    g.lineCap = 'round';
    // legs and shoes
    g.fillStyle = C.navy;
    rr(g, -s * 0.15, -s * 0.22 + Math.max(0, step), s * 0.125, s * 0.2 - Math.max(0, step), s * 0.04); g.fill();
    rr(g, s * 0.025, -s * 0.22 + Math.max(0, -step), s * 0.125, s * 0.2 - Math.max(0, -step), s * 0.04); g.fill();
    g.fillStyle = '#3A2C1C';
    ell(g, -s * 0.09, -s * 0.02 + Math.min(0, step) * 0.6, s * 0.085, s * 0.04); g.fill();
    ell(g, s * 0.09, -s * 0.02 + Math.min(0, -step) * 0.6, s * 0.085, s * 0.04); g.fill();
    // arm positions
    var hands;
    if (working) { var wp = Math.sin(t * 16) * s * 0.035; hands = [[-s * 0.12, -s * 0.42 + wp], [s * 0.14, -s * 0.42 - wp]]; }
    else if (carrying && back) hands = [[-s * 0.24, -s * 0.28], [s * 0.3, -s * 0.44]];
    else if (carrying && side) hands = [[s * 0.02, -s * 0.3], [s * 0.28, -s * 0.3]];
    else if (carrying) hands = [[-s * 0.17, -s * 0.3], [s * 0.17, -s * 0.3]];
    else hands = [[-s * 0.25, -s * 0.27 - step * 0.5], [s * 0.25, -s * 0.27 + step * 0.5]];
    function arm(i) {
      var sx = (i ? 1 : -1) * s * 0.19, sy = -s * 0.47;
      g.strokeStyle = C.blue; g.lineWidth = s * 0.1; line(g, sx, sy, hands[i][0], hands[i][1]);
    }
    function hand(i) { g.fillStyle = COOK.skin; circ(g, hands[i][0], hands[i][1], s * 0.052); g.fill(); }
    if (back && (working || carrying)) { arm(0); arm(1); hand(0); hand(1); }
    // body
    g.fillStyle = C.blue; rr(g, -s * 0.21, -s * 0.54, s * 0.42, s * 0.37, s * 0.14); g.fill();
    if (back) {
      g.strokeStyle = C.creamLight; g.lineWidth = s * 0.035;
      line(g, -s * 0.12, -s * 0.5, s * 0.1, -s * 0.26); line(g, s * 0.12, -s * 0.5, -s * 0.1, -s * 0.26);
      g.fillStyle = C.creamLight; ell(g, -s * 0.06, -s * 0.24, s * 0.06, s * 0.035); g.fill(); ell(g, s * 0.06, -s * 0.24, s * 0.06, s * 0.035); g.fill();
    } else {
      g.strokeStyle = C.creamLight; g.lineWidth = s * 0.03; line(g, -s * 0.1, -s * 0.43, -s * 0.07, -s * 0.53); line(g, s * 0.1, -s * 0.43, s * 0.07, -s * 0.53);
      g.fillStyle = C.creamLight; rr(g, -s * 0.14, -s * 0.45, s * 0.28, s * 0.31, s * 0.05); g.fill();
      g.strokeStyle = 'rgba(40,34,4,0.14)'; g.lineWidth = Math.max(1, s * 0.012); rr(g, -s * 0.08, -s * 0.28, s * 0.16, s * 0.09, s * 0.02); g.stroke();
      g.fillStyle = C.yellow; circ(g, 0, -s * 0.37, s * 0.035); g.fill();
    }
    if (!back) { arm(0); arm(1); }
    // what is being carried
    if (carrying) {
      var hx = back ? s * 0.34 : side ? s * 0.16 : 0, hy = back ? -s * 0.5 : -s * 0.36;
      if (dir === 'left') { g.save(); g.translate(hx, hy); g.scale(-1, 1); held(g, 0, 0, s * 0.56, o.hold, t); g.restore(); }
      else held(g, hx, hy, s * 0.56, o.hold, t);
    }
    if (!back) { hand(0); hand(1); }
    else if (!working && !carrying) { arm(0); arm(1); hand(0); hand(1); }
    // head
    var hy2 = -s * 0.7, hr = s * 0.2, look = side ? s * 0.035 : 0;
    g.fillStyle = COOK.skin; circ(g, -hr * 0.96, hy2 + hr * 0.08, hr * 0.17); g.fill(); circ(g, hr * 0.96, hy2 + hr * 0.08, hr * 0.17); g.fill();
    if (back) { g.fillStyle = COOK.hair; circ(g, 0, hy2, hr * 1.03); g.fill(); circ(g, 0, hy2 + hr * 0.75, hr * 0.32); g.fill(); }
    else {
      g.fillStyle = COOK.skin; circ(g, 0, hy2, hr); g.fill();
      g.fillStyle = COOK.hair;
      g.beginPath(); g.arc(0, hy2, hr * 1.03, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(hr * 0.5, hy2 - hr * 0.42, 0, hy2 - hr * 0.5); g.quadraticCurveTo(-hr * 0.6, hy2 - hr * 0.42, -hr * 1.03, hy2 - hr * 0.06); g.fill();
      var blink = (t % 3.6) > 3.45;
      g.fillStyle = C.ink;
      if (blink) { g.fillRect(-hr * 0.42 + look, hy2 + hr * 0.02, hr * 0.2, hr * 0.05); g.fillRect(hr * 0.22 + look, hy2 + hr * 0.02, hr * 0.2, hr * 0.05); }
      else { circ(g, -hr * 0.34 + look, hy2 + hr * 0.04, hr * 0.105); g.fill(); circ(g, hr * 0.34 + look, hy2 + hr * 0.04, hr * 0.105); g.fill(); }
      g.fillStyle = 'rgba(226,85,46,0.3)'; circ(g, -hr * 0.6 + look * 0.5, hy2 + hr * 0.36, hr * 0.17); g.fill(); circ(g, hr * 0.6 + look * 0.5, hy2 + hr * 0.36, hr * 0.17); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = Math.max(1, hr * 0.09);
      g.beginPath(); g.arc(look, hy2 + hr * 0.26, hr * 0.3, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }
    // hat: a short chef's toque
    g.fillStyle = '#FFFFFF';
    circ(g, -hr * 0.5, hy2 - hr * 1.2, hr * 0.46); g.fill(); circ(g, hr * 0.5, hy2 - hr * 1.2, hr * 0.46); g.fill(); circ(g, 0, hy2 - hr * 1.36, hr * 0.56); g.fill();
    g.fillStyle = C.creamLight; rr(g, -hr * 0.8, hy2 - hr * 1.12, hr * 1.6, hr * 0.46, hr * 0.1); g.fill();
    g.fillStyle = 'rgba(40,34,4,0.08)'; g.fillRect(-hr * 0.8, hy2 - hr * 0.76, hr * 1.6, hr * 0.1);
    g.restore();
  }

  /* ---------- the iguana: sits on the counter and supervises ---------- */

  function iguana(g, cx, cy, s, t, mood) {
    var hop = mood === 'happy' ? Math.abs(Math.sin(t * 9)) * s * 0.05 : 0;
    var sway = Math.sin(t * 1.6) * s * 0.02;
    var green = '#5EAF52', dark = '#3F8A3C', light = '#B9DE8E';
    shadow(g, cx + s * 0.03, cy + s * 0.22, s * 0.34, s * 0.06);
    g.save(); g.translate(0, -hop); g.lineCap = 'round'; g.lineJoin = 'round';
    // tail
    g.strokeStyle = green; g.lineWidth = s * 0.07;
    g.beginPath(); g.moveTo(cx + s * 0.14, cy + s * 0.13); g.quadraticCurveTo(cx + s * 0.46, cy + s * 0.22 + sway, cx + s * 0.38, cy - s * 0.02 + sway); g.stroke();
    g.strokeStyle = dark; g.lineWidth = s * 0.07; g.setLineDash([s * 0.025, s * 0.06]);
    g.beginPath(); g.moveTo(cx + s * 0.26, cy + s * 0.17 + sway * 0.4); g.quadraticCurveTo(cx + s * 0.46, cy + s * 0.22 + sway, cx + s * 0.38, cy - s * 0.02 + sway); g.stroke(); g.setLineDash([]);
    // back spines
    g.fillStyle = dark;
    for (var i = 0; i < 6; i++) { var sx = cx - s * 0.1 + i * s * 0.055, sy = cy - s * 0.03 + Math.abs(i - 2) * s * 0.008; g.beginPath(); g.moveTo(sx - s * 0.025, sy + s * 0.02); g.lineTo(sx, sy - s * 0.045); g.lineTo(sx + s * 0.025, sy + s * 0.02); g.fill(); }
    // hind leg, body, front leg
    g.fillStyle = dark; ell(g, cx + s * 0.13, cy + s * 0.17, s * 0.08, s * 0.045); g.fill();
    g.fillStyle = green; ell(g, cx + s * 0.02, cy + s * 0.08, s * 0.22, s * 0.125); g.fill();
    g.fillStyle = light; ell(g, cx - s * 0.02, cy + s * 0.14, s * 0.15, s * 0.055); g.fill();
    g.fillStyle = dark; ell(g, cx - s * 0.1, cy + s * 0.19, s * 0.075, s * 0.035); g.fill();
    // neck and head
    g.fillStyle = green;
    g.beginPath(); g.moveTo(cx - s * 0.06, cy + s * 0.02); g.quadraticCurveTo(cx - s * 0.16, cy - s * 0.02, cx - s * 0.16, cy - s * 0.12); g.lineTo(cx - s * 0.04, cy - s * 0.1); g.closePath(); g.fill();
    g.fillStyle = '#E2D45C'; g.beginPath(); g.moveTo(cx - s * 0.2, cy - s * 0.05); g.quadraticCurveTo(cx - s * 0.2, cy + s * 0.06, cx - s * 0.1, cy + s * 0.03); g.closePath(); g.fill();
    var hx = cx - s * 0.2, hy = cy - s * 0.13;
    g.fillStyle = green; ell(g, hx, hy, s * 0.13, s * 0.09); g.fill();
    g.beginPath(); g.ellipse(hx - s * 0.1, hy + s * 0.02, s * 0.07, s * 0.055, 0, 0, TAU); g.fill();
    g.fillStyle = '#FFFFFF'; circ(g, hx - s * 0.02, hy - s * 0.02, s * 0.034); g.fill();
    g.fillStyle = C.ink;
    if ((t % 4.3) > 4.15) g.fillRect(hx - s * 0.05, hy - s * 0.025, s * 0.06, s * 0.012); else { circ(g, hx - s * 0.028, hy - s * 0.02, s * 0.018); g.fill(); }
    g.strokeStyle = C.ink; g.lineWidth = Math.max(1, s * 0.012);
    g.beginPath();
    if (mood === 'sad') { g.moveTo(hx - s * 0.15, hy + s * 0.055); g.quadraticCurveTo(hx - s * 0.1, hy + s * 0.03, hx - s * 0.04, hy + s * 0.05); }
    else { g.moveTo(hx - s * 0.15, hy + s * 0.035); g.quadraticCurveTo(hx - s * 0.1, hy + s * 0.07, hx - s * 0.04, hy + s * 0.045); }
    g.stroke();
    g.fillStyle = C.ink; circ(g, hx - s * 0.15, hy, s * 0.007); g.fill();
    // a small chef's hat
    g.fillStyle = '#FFFFFF'; circ(g, hx - s * 0.03, hy - s * 0.15, s * 0.045); g.fill(); circ(g, hx + s * 0.05, hy - s * 0.15, s * 0.045); g.fill(); circ(g, hx + s * 0.01, hy - s * 0.175, s * 0.05); g.fill();
    g.fillStyle = C.creamLight; rr(g, hx - s * 0.07, hy - s * 0.135, s * 0.16, s * 0.055, s * 0.012); g.fill();
    g.restore();
  }

  /* ---------- small interface pieces drawn on the canvas ---------- */

  function ring(g, cx, cy, rx, ry, frac, color, lw) {
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(40,34,4,0.35)'; g.lineWidth = lw; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.stroke();
    if (frac > 0.001) { g.strokeStyle = color; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, frac)); g.stroke(); }
  }

  function star(g, cx, cy, r, color) {
    g.fillStyle = color; g.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.46 : r; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
    g.closePath(); g.fill();
  }

  // A pill with letters only (Telegrafico has capitals and nothing else).
  function tag(g, str, cx, cy, px, bg, fg) {
    g.font = px.toFixed(1) + 'px ' + FONT_LABEL;
    var w = g.measureText(str).width + px * 1.1, h = px * 1.7;
    g.fillStyle = 'rgba(40,34,4,0.25)'; rr(g, cx - w / 2, cy - h / 2 + px * 0.14, w, h, h / 2); g.fill();
    g.fillStyle = bg; rr(g, cx - w / 2, cy - h / 2, w, h, h / 2); g.fill();
    text(g, str, cx, cy + px * 0.04, px, fg, FONT_LABEL);
  }

  // A speech bubble whose tail points down at (x, y). Stays inside [minX, maxX].
  function bubble(g, str, x, y, px, minX, maxX) {
    g.font = '600 ' + px.toFixed(1) + 'px ' + FONT_BODY;
    var maxW = Math.max(60, Math.min(maxX - minX - px, px * 15)), words = str.split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var tryLine = cur ? cur + ' ' + words[i] : words[i];
      if (g.measureText(tryLine).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = tryLine;
    }
    if (cur) lines.push(cur);
    var w = 0; for (var k = 0; k < lines.length; k++) w = Math.max(w, g.measureText(lines[k]).width);
    w += px * 1.3; var lh = px * 1.28, h = lines.length * lh + px * 0.8;
    var bx = Math.max(minX, Math.min(maxX - w, x - w / 2)), by = y - h - px * 0.7;
    g.fillStyle = 'rgba(40,34,4,0.22)'; rr(g, bx + px * 0.1, by + px * 0.16, w, h, px * 0.6); g.fill();
    g.fillStyle = '#FFFFFF'; rr(g, bx, by, w, h, px * 0.6); g.fill();
    var tx = Math.max(bx + px, Math.min(bx + w - px, x));
    g.beginPath(); g.moveTo(tx - px * 0.45, by + h - 1); g.lineTo(tx, by + h + px * 0.6); g.lineTo(tx + px * 0.45, by + h - 1); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (var j = 0; j < lines.length; j++) g.fillText(lines[j], bx + px * 0.65, by + px * 0.4 + lh * (j + 0.5));
  }

  // The bouncing arrow that points at the next station in the guided level.
  function arrow(g, cx, cy, s, t) {
    var dy = Math.abs(Math.sin(t * 4.5)) * s * 0.1;
    g.save(); g.translate(cx, cy - dy);
    g.fillStyle = 'rgba(40,34,4,0.3)'; g.beginPath(); g.moveTo(-s * 0.12, -s * 0.2); g.lineTo(s * 0.12, -s * 0.2); g.lineTo(s * 0.12, -s * 0.05); g.lineTo(s * 0.21, -s * 0.05); g.lineTo(0, s * 0.14); g.lineTo(-s * 0.21, -s * 0.05); g.lineTo(-s * 0.12, -s * 0.05); g.closePath(); g.fill();
    g.translate(0, -s * 0.03);
    g.fillStyle = C.yellow; g.strokeStyle = C.ink; g.lineWidth = Math.max(1.5, s * 0.022); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(-s * 0.1, -s * 0.2); g.lineTo(s * 0.1, -s * 0.2); g.lineTo(s * 0.1, -s * 0.05); g.lineTo(s * 0.19, -s * 0.05); g.lineTo(0, s * 0.12); g.lineTo(-s * 0.19, -s * 0.05); g.lineTo(-s * 0.1, -s * 0.05); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  LBR.Art = {
    C: C, FONT_SCRIPT: FONT_SCRIPT, FONT_LABEL: FONT_LABEL, FONT_BODY: FONT_BODY,
    rr: rr, ell: ell, circ: circ, line: line, shadow: shadow, mix: mix, rnd: rnd, text: text, fitText: fitText,
    wall: wall, floor: floor, counter: counter, tileSheet: tileSheet,
    pancake: pancake, plate: plate, dish: dish, dishOf: dishOf, bananaSlice: bananaSlice, appleRing: appleRing, baconStrip: baconStrip,
    bananaFruit: bananaFruit, appleFruit: appleFruit,
    flour: flour, eggs: eggs, milk: milk, sugar: sugar, bowl: bowl, pips: pips, stove: stove, pan: pan, pass: pass, bell: bell, bin: bin,
    bananas: bananas, apples: apples, baconTray: baconTray, board: board,
    held: held, cook: cook, iguana: iguana,
    ring: ring, star: star, tag: tag, bubble: bubble, arrow: arrow
  };
})();
