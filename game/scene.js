/* Linda's Breakfast Rush: drawing, part 2.
   The entrance of Linda's (yellow building, white pergola, Delft-tile posts, giant tulips),
   the guests who wait there, and their order cards.
   Guests are made up from random parts. None of them is a real person. */
(function () {
  'use strict';
  var LBR = window.LBR = window.LBR || {};
  var A = LBR.Art, C = A.C, TAU = Math.PI * 2;
  var rr = A.rr, ell = A.ell, circ = A.circ, line = A.line, shadow = A.shadow;

  /* ---------- the real logo ---------- */

  var logo = null, logoWhite = null;
  function loadLogo(src, onready) {
    var img = new Image();
    img.onload = function () { logo = img; logoWhite = null; if (onready) onready(); };
    img.onerror = function () { logo = null; };
    img.src = src;
  }
  function getWhiteLogo() {
    if (logoWhite || !logo) return logoWhite;
    try {
      var cv = document.createElement('canvas'); cv.width = Math.round(logo.naturalWidth / 2); cv.height = Math.round(logo.naturalHeight / 2);
      var g = cv.getContext('2d');
      g.drawImage(logo, 0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, cv.width, cv.height);
      logoWhite = cv;
    } catch (e) { logoWhite = null; }
    return logoWhite;
  }
  function drawLogo(g, x, y, w, h, white) {
    var img = white ? getWhiteLogo() : logo;
    var iw = img ? (img.naturalWidth || img.width) : 0, ih = img ? (img.naturalHeight || img.height) : 0;
    if (img && iw) {
      var a = iw / ih, lw = Math.min(w, h * a), lh = lw / a;
      g.drawImage(img, x + (w - lw) / 2, y + (h - lh) / 2, lw, lh);
    } else {
      A.text(g, "Linda's", x + w / 2, y + h / 2, h * 0.7, white ? '#FFFFFF' : C.blue, A.FONT_SCRIPT);
    }
  }
  // The round emblem on its own (the left part of the logo file).
  function emblem(g, cx, cy, r) {
    if (logo && logo.naturalWidth) {
      var k = logo.naturalWidth / 1713;
      g.drawImage(logo, 120 * k, 68 * k, 455 * k, 455 * k, cx - r, cy - r, r * 2, r * 2);
    } else {
      g.fillStyle = C.blue; circ(g, cx, cy, r); g.fill();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(1, r * 0.07); circ(g, cx, cy, r * 0.74); g.stroke(); circ(g, cx, cy, r * 0.52); g.stroke();
    }
  }
  function logoSign(g, x, y, w, h) {
    g.fillStyle = 'rgba(40,34,4,0.22)'; rr(g, x + h * 0.03, y + h * 0.06, w, h, h * 0.05); g.fill();
    g.fillStyle = '#FFFFFF'; rr(g, x, y, w, h, h * 0.05); g.fill();
    g.strokeStyle = 'rgba(40,34,4,0.1)'; g.lineWidth = Math.max(1, h * 0.012); g.stroke();
    drawLogo(g, x + w * 0.04, y + h * 0.06, w * 0.92, h * 0.88, false);
  }

  /* ---------- the signature details ---------- */

  function tulip(g, x, baseY, h, col, colDark, sway) {
    var topX = x + (sway || 0), topY = baseY - h * 0.76;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.fillStyle = C.leaf;
    g.beginPath(); g.moveTo(x, baseY - h * 0.02); g.quadraticCurveTo(x - h * 0.24, baseY - h * 0.3, x - h * 0.15 + (sway || 0) * 0.5, baseY - h * 0.6); g.quadraticCurveTo(x - h * 0.03, baseY - h * 0.3, x, baseY - h * 0.02); g.fill();
    g.fillStyle = C.leafDark;
    g.beginPath(); g.moveTo(x, baseY - h * 0.02); g.quadraticCurveTo(x + h * 0.22, baseY - h * 0.26, x + h * 0.14 + (sway || 0) * 0.4, baseY - h * 0.5); g.quadraticCurveTo(x + h * 0.03, baseY - h * 0.26, x, baseY - h * 0.02); g.fill();
    g.strokeStyle = C.leafDark; g.lineWidth = Math.max(1, h * 0.04);
    g.beginPath(); g.moveTo(x, baseY); g.quadraticCurveTo(x + h * 0.03, baseY - h * 0.4, topX, topY); g.stroke();
    var bw = h * 0.21, bh = h * 0.25;
    g.fillStyle = col;
    g.beginPath(); g.moveTo(topX, topY + bh * 0.14);
    g.bezierCurveTo(topX - bw * 0.78, topY + bh * 0.06, topX - bw * 0.64, topY - bh * 0.6, topX - bw * 0.42, topY - bh * 0.94);
    g.lineTo(topX - bw * 0.2, topY - bh * 0.6); g.lineTo(topX, topY - bh); g.lineTo(topX + bw * 0.2, topY - bh * 0.6); g.lineTo(topX + bw * 0.42, topY - bh * 0.94);
    g.bezierCurveTo(topX + bw * 0.64, topY - bh * 0.6, topX + bw * 0.78, topY + bh * 0.06, topX, topY + bh * 0.14); g.fill();
    g.fillStyle = colDark;
    g.beginPath(); g.moveTo(topX, topY + bh * 0.1); g.bezierCurveTo(topX - bw * 0.3, topY - bh * 0.1, topX - bw * 0.26, topY - bh * 0.7, topX, topY - bh * 0.96); g.bezierCurveTo(topX + bw * 0.26, topY - bh * 0.7, topX + bw * 0.3, topY - bh * 0.1, topX, topY + bh * 0.1); g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1;
  }
  var RED = ['#DD3B30', '#A9241D'], PURPLE = ['#8C4BC0', '#5E2C86'];

  // A square post wrapped in Delft-blue and white tiles.
  function delftPost(g, x, y, w, h) {
    g.fillStyle = '#FBFAF4'; g.fillRect(x, y, w, h);
    var n = w >= 20 ? 2 : 1, ts = w / n, rows = Math.ceil(h / ts);
    g.strokeStyle = 'rgba(29,95,191,0.6)'; g.lineWidth = Math.max(0.6, ts * 0.06); g.fillStyle = C.delft;
    for (var r = 0; r < rows; r++) for (var c = 0; c < n; c++) {
      var tx = x + c * ts, ty = y + r * ts, mx = tx + ts / 2, my = ty + ts / 2;
      if (my > y + h) continue;
      g.strokeRect(tx + ts * 0.07, ty + ts * 0.07, ts * 0.86, ts * 0.86);
      if ((r + c) % 2) { g.beginPath(); g.moveTo(mx, my - ts * 0.26); g.lineTo(mx + ts * 0.26, my); g.lineTo(mx, my + ts * 0.26); g.lineTo(mx - ts * 0.26, my); g.closePath(); g.fill(); }
      else { for (var k = 0; k < 4; k++) { circ(g, mx + Math.cos(k * TAU / 4) * ts * 0.18, my + Math.sin(k * TAU / 4) * ts * 0.18, ts * 0.1); g.fill(); } }
    }
    g.fillStyle = 'rgba(40,34,4,0.1)'; g.fillRect(x + w * 0.82, y, w * 0.18, h);
    g.fillStyle = '#FFFFFF'; g.fillRect(x - w * 0.08, y, w * 1.16, Math.max(2, w * 0.14));
    g.fillStyle = '#EDEAE0'; g.fillRect(x - w * 0.1, y + h - Math.max(2, w * 0.16), w * 1.2, Math.max(2, w * 0.16));
  }

  // The white beam of the pergola, with the beam ends that stick out.
  function pergolaBeam(g, x, y, w, bh, endsUp) {
    var ew = bh * 0.55, eh = bh * 0.85, n = Math.max(2, Math.round(w / (bh * 2.2)));
    for (var i = 0; i <= n; i++) {
      var ex = x + bh * 0.4 + (w - bh * 0.8 - ew) * i / n, ey = endsUp ? y - eh : y + bh;
      g.fillStyle = '#FFFFFF'; g.fillRect(ex, ey, ew, eh);
      g.fillStyle = '#D9D6CC'; if (endsUp) g.fillRect(ex + ew * 0.72, ey, ew * 0.28, eh); else g.fillRect(ex, ey + eh * 0.7, ew, eh * 0.3);
    }
    g.fillStyle = '#FFFFFF'; g.fillRect(x, y, w, bh);
    g.fillStyle = '#E4E1D7'; g.fillRect(x, y + bh * 0.78, w, bh * 0.22);
  }

  /* ---------- people ---------- */

  var SHIRTS = ['#F26B5E', '#27AAE1', '#EFBD40', '#FFFFFF', '#F28CB1', '#56C2A6', '#EB8917', '#8E6BBF', '#3F7FD9', '#F4F0DC'];
  var HAIRS = ['#2B1B10', '#4A2F1B', '#7A4A22', '#C58B3B', '#E3C27A', '#B9B9B4', '#A8402A', '#1C1410'];
  var STYLES = ['short', 'long', 'bun', 'curly', 'short', 'long', 'bald'];
  function makeLook(seed) {
    var r = A.rnd(seed);
    function pick(a) { return a[Math.floor(r() * a.length)]; }
    var hatRoll = r();
    return {
      skin: pick(C.skin), hair: pick(HAIRS), style: pick(STYLES),
      hat: hatRoll < 0.22 ? 'straw' : hatRoll < 0.36 ? 'cap' : null, hatCol: pick(SHIRTS),
      glasses: r() < 0.28, shirt: pick(SHIRTS), pattern: pick(['plain', 'stripe', 'dots', 'plain']), shorts: pick(['#3F7FD9', '#F4F0DC', '#56C2A6', '#EB8917', '#5A4632'])
    };
  }

  /* mood: 0 content, 1 waiting, 2 annoyed, 3 angry, 4 delighted */
  function head(g, cx, cy, r, look, mood, t) {
    if (look.style === 'long') { g.fillStyle = look.hair; rr(g, cx - r * 1.1, cy - r * 0.6, r * 2.2, r * 2.05, r * 0.7); g.fill(); }
    if (look.style === 'curly') { g.fillStyle = look.hair; circ(g, cx, cy - r * 0.22, r * 1.3); g.fill(); }
    g.fillStyle = look.skin; circ(g, cx - r * 0.97, cy + r * 0.08, r * 0.17); g.fill(); circ(g, cx + r * 0.97, cy + r * 0.08, r * 0.17); g.fill();
    circ(g, cx, cy, r); g.fill();
    if (mood === 3) { g.fillStyle = 'rgba(226,85,46,0.28)'; circ(g, cx, cy, r); g.fill(); }
    if (look.style !== 'bald') {
      g.fillStyle = look.hair;
      g.beginPath(); g.arc(cx, cy, r * 1.03, Math.PI * 1.03, Math.PI * 1.97);
      g.quadraticCurveTo(cx + r * 0.5, cy - r * 0.4, cx + r * 0.05, cy - r * 0.52); g.quadraticCurveTo(cx - r * 0.6, cy - r * 0.44, cx - r * 1.03, cy - r * 0.1); g.fill();
      if (look.style === 'bun') { circ(g, cx, cy - r * 1.14, r * 0.36); g.fill(); }
    }
    if (look.hat === 'straw') {
      g.fillStyle = '#E3CB8C'; ell(g, cx, cy - r * 0.56, r * 1.55, r * 0.32); g.fill();
      g.fillStyle = '#F0DDA8'; rr(g, cx - r * 0.82, cy - r * 1.4, r * 1.64, r * 0.9, r * 0.42); g.fill();
      g.fillStyle = look.hatCol; g.fillRect(cx - r * 0.82, cy - r * 0.82, r * 1.64, r * 0.2);
    } else if (look.hat === 'cap') {
      g.fillStyle = look.hatCol; g.beginPath(); g.arc(cx, cy - r * 0.3, r * 1.04, Math.PI, 0); g.closePath(); g.fill();
      ell(g, cx + r * 0.55, cy - r * 0.32, r * 0.8, r * 0.16); g.fill();
    }
    // face
    var ey = cy + r * 0.06;
    if (look.glasses) {
      g.fillStyle = '#1F1A12'; rr(g, cx - r * 0.66, ey - r * 0.2, r * 0.56, r * 0.4, r * 0.14); g.fill(); rr(g, cx + r * 0.1, ey - r * 0.2, r * 0.56, r * 0.4, r * 0.14); g.fill();
      g.fillRect(cx - r * 0.12, ey - r * 0.08, r * 0.26, r * 0.08);
    } else {
      g.fillStyle = C.ink;
      if ((t + r) % 4.1 > 3.95) { g.fillRect(cx - r * 0.46, ey - r * 0.03, r * 0.24, r * 0.07); g.fillRect(cx + r * 0.22, ey - r * 0.03, r * 0.24, r * 0.07); }
      else { circ(g, cx - r * 0.34, ey, r * 0.11); g.fill(); circ(g, cx + r * 0.34, ey, r * 0.11); g.fill(); }
      if (mood >= 2) { g.strokeStyle = C.ink; g.lineWidth = Math.max(1, r * 0.1); g.lineCap = 'round'; line(g, cx - r * 0.52, ey - r * 0.34, cx - r * 0.18, ey - r * 0.22); line(g, cx + r * 0.52, ey - r * 0.34, cx + r * 0.18, ey - r * 0.22); }
    }
    g.fillStyle = 'rgba(226,85,46,0.25)'; circ(g, cx - r * 0.58, cy + r * 0.4, r * 0.16); g.fill(); circ(g, cx + r * 0.58, cy + r * 0.4, r * 0.16); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = Math.max(1, r * 0.1); g.lineCap = 'round';
    var my = cy + r * 0.48;
    g.beginPath();
    if (mood === 4) { g.fillStyle = '#7A2E22'; g.arc(cx, my - r * 0.1, r * 0.32, 0, Math.PI); g.closePath(); g.fill(); }
    else if (mood === 0) { g.arc(cx, my - r * 0.18, r * 0.32, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    else if (mood === 1) { g.moveTo(cx - r * 0.2, my); g.lineTo(cx + r * 0.2, my); g.stroke(); }
    else { g.arc(cx, my + r * 0.26, r * 0.3, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
  }

  function shirt(g, x, y, w, h, look, rad) {
    g.fillStyle = look.shirt; rr(g, x, y, w, h, rad); g.fill();
    if (look.pattern === 'stripe') { g.save(); rr(g, x, y, w, h, rad); g.clip(); g.fillStyle = 'rgba(40,34,4,0.16)'; for (var i = 0; i < 6; i++) g.fillRect(x, y + h * (0.12 + i * 0.2), w, h * 0.08); g.restore(); }
    else if (look.pattern === 'dots') { g.save(); rr(g, x, y, w, h, rad); g.clip(); g.fillStyle = 'rgba(255,255,255,0.6)'; for (var j = 0; j < 12; j++) { circ(g, x + w * (0.15 + (j % 4) * 0.24), y + h * (0.2 + Math.floor(j / 4) * 0.3) + (j % 2) * h * 0.1, w * 0.045); g.fill(); } g.restore(); }
  }

  /* A whole person for the entrance scene. (x, y) is the seat for 'sit', the feet for 'stand'. s is the standing height. */
  function person(g, x, y, s, look, pose, mood, t) {
    var hr = s * 0.17, bob = Math.sin(t * 1.7 + x * 0.05) * s * 0.008;
    if (pose === 'sit') {
      g.fillStyle = look.skin; rr(g, x - s * 0.12, y - s * 0.02, s * 0.09, s * 0.22, s * 0.03); g.fill(); rr(g, x + s * 0.03, y - s * 0.02, s * 0.09, s * 0.22, s * 0.03); g.fill();
      g.fillStyle = '#5A4632'; ell(g, x - s * 0.075, y + s * 0.2, s * 0.065, s * 0.03); g.fill(); ell(g, x + s * 0.075, y + s * 0.2, s * 0.065, s * 0.03); g.fill();
      g.fillStyle = look.shorts; rr(g, x - s * 0.15, y - s * 0.09, s * 0.3, s * 0.13, s * 0.04); g.fill();
      shirt(g, x - s * 0.15, y - s * 0.36 + bob, s * 0.3, s * 0.3, look, s * 0.08);
      g.fillStyle = look.skin; circ(g, x - s * 0.16, y - s * 0.1 + bob, s * 0.04); g.fill(); circ(g, x + s * 0.16, y - s * 0.1 + bob, s * 0.04); g.fill();
      head(g, x, y - s * 0.5 + bob, hr, look, mood, t);
    } else {
      shadow(g, x, y, s * 0.18, s * 0.04, 0.18);
      g.fillStyle = look.skin; rr(g, x - s * 0.1, y - s * 0.3, s * 0.085, s * 0.29, s * 0.03); g.fill(); rr(g, x + s * 0.015, y - s * 0.3, s * 0.085, s * 0.29, s * 0.03); g.fill();
      g.fillStyle = '#5A4632'; ell(g, x - s * 0.06, y - s * 0.01, s * 0.065, s * 0.03); g.fill(); ell(g, x + s * 0.06, y - s * 0.01, s * 0.065, s * 0.03); g.fill();
      g.fillStyle = look.shorts; rr(g, x - s * 0.14, y - s * 0.42, s * 0.28, s * 0.17, s * 0.04); g.fill();
      shirt(g, x - s * 0.15, y - s * 0.68 + bob, s * 0.3, s * 0.32, look, s * 0.08);
      g.fillStyle = look.skin; circ(g, x - s * 0.17, y - s * 0.4 + bob, s * 0.04); g.fill(); circ(g, x + s * 0.17, y - s * 0.4 + bob, s * 0.04); g.fill();
      head(g, x, y - s * 0.82 + bob, hr, look, mood, t);
    }
  }

  /* ---------- a waiting guest who holds up an order card ----------
     Slot rectangle (x, y, w, h): head at the top, card in front of the body, feet below.
     o: {look, dish, frac (patience left 0..1), mood, t, state: 'open'|'served'|'left', anim 0..1, urgent} */
  function guestCard(g, x, y, w, h, o) {
    var cx = x + w / 2, hr = Math.min(h * 0.125, w * 0.2), headY = y + h * 0.2;
    var cardH = h * 0.5, cardW = Math.min(w - 4, cardH * 1.32), cardX = cx - cardW / 2, cardY = y + h * 0.35;
    var served = o.state === 'served', left = o.state === 'left';
    g.save();
    if (o.shake) g.translate(Math.sin(o.t * 38) * o.shake, 0);
    // legs under the card
    g.fillStyle = o.look.skin; rr(g, cx - hr * 0.8, cardY + cardH - 2, hr * 0.55, h * 0.1, hr * 0.2); g.fill(); rr(g, cx + hr * 0.25, cardY + cardH - 2, hr * 0.55, h * 0.1, hr * 0.2); g.fill();
    g.fillStyle = '#5A4632'; ell(g, cx - hr * 0.5, cardY + cardH + h * 0.095, hr * 0.42, hr * 0.2); g.fill(); ell(g, cx + hr * 0.52, cardY + cardH + h * 0.095, hr * 0.42, hr * 0.2); g.fill();
    // shoulders
    shirt(g, cx - hr * 1.5, headY + hr * 0.8, hr * 3, cardH * 0.9, o.look, hr * 0.7);
    head(g, cx, headY, hr, o.look, o.mood, o.t);
    if (served) {
      // holds the plate instead of the card
      A.dish(g, cx, cardY + cardH * 0.5, Math.min(cardW * 0.42, cardH * 0.46), A.dishOf(o.dish), 0.9);
      g.fillStyle = o.look.skin; circ(g, cx - cardW * 0.4, cardY + cardH * 0.52, hr * 0.26); g.fill(); circ(g, cx + cardW * 0.4, cardY + cardH * 0.52, hr * 0.26); g.fill();
      g.restore(); return;
    }
    // the card
    g.save();
    if (left) { g.translate(cx, cardY + cardH / 2); g.rotate(0.25 * o.anim); g.translate(-cx, -(cardY + cardH / 2) + o.anim * h * 0.2); g.globalAlpha = Math.max(0, 1 - o.anim * 1.2); }
    g.fillStyle = 'rgba(40,34,4,0.2)'; rr(g, cardX + 1.5, cardY + 2.5, cardW, cardH, cardW * 0.08); g.fill();
    g.fillStyle = left ? '#F3D5CC' : '#FFFDF6'; rr(g, cardX, cardY, cardW, cardH, cardW * 0.08); g.fill();
    if (o.urgent && !left) { g.strokeStyle = C.bad; g.lineWidth = Math.max(1.5, cardW * 0.035); rr(g, cardX, cardY, cardW, cardH, cardW * 0.08); g.stroke(); }
    var labelPx = Math.max(7, cardH * 0.15), showLabel = cardW >= 64;
    var dr = Math.min(cardW * 0.4, cardH * (showLabel ? 0.3 : 0.36));
    A.dish(g, cx, cardY + cardH * (showLabel ? 0.36 : 0.42), dr, A.dishOf(o.dish), 0.86);
    if (showLabel) {
      var px = A.fitText(g, o.label, cardW * 0.9, labelPx, A.FONT_LABEL);
      A.text(g, o.label, cx, cardY + cardH * 0.745, px, C.ink, A.FONT_LABEL);
    }
    // patience bar
    var bx = cardX + cardW * 0.09, bw = cardW * 0.82, bh = Math.max(4, cardH * 0.09), by = cardY + cardH - bh - cardH * 0.05;
    g.fillStyle = 'rgba(40,34,4,0.16)'; rr(g, bx, by, bw, bh, bh / 2); g.fill();
    var f = Math.max(0, Math.min(1, o.frac));
    if (f > 0.01) { g.fillStyle = f > 0.5 ? C.good : f > 0.25 ? C.warn : C.bad; rr(g, bx, by, Math.max(bh, bw * f), bh, bh / 2); g.fill(); }
    g.restore();
    // hands on the top corners of the card
    if (!left) { g.fillStyle = o.look.skin; circ(g, cardX + cardW * 0.1, cardY + 1, hr * 0.26); g.fill(); circ(g, cardX + cardW * 0.9, cardY + 1, hr * 0.26); g.fill(); }
    g.restore();
  }

  /* ---------- the strip of entrance above the kitchen, where guests wait ----------
     o: {u, slotsX, slotsW, right: {x, w} | null} */
  function entranceBand(g, x, y, w, h, o) {
    var wallGrad = g.createLinearGradient(0, y, 0, y + h);
    wallGrad.addColorStop(0, '#E3A92F'); wallGrad.addColorStop(0.25, C.ochre); wallGrad.addColorStop(1, '#F2C456');
    g.fillStyle = wallGrad; g.fillRect(x, y, w, h);
    // brick terrace floor
    var fy = y + h * 0.9, fh = h * 0.1;
    g.fillStyle = C.brick; g.fillRect(x, fy, w, fh);
    g.strokeStyle = 'rgba(40,34,4,0.22)'; g.lineWidth = 1;
    line(g, x, fy + fh / 2, x + w, fy + fh / 2);
    var bw = fh * 1.6; for (var bx = x; bx < x + w; bx += bw) { line(g, bx, fy, bx, fy + fh / 2); line(g, bx + bw / 2, fy + fh / 2, bx + bw / 2, fy + fh); }
    g.fillStyle = 'rgba(40,34,4,0.2)'; g.fillRect(x, fy, w, Math.max(1, fh * 0.12));
    // what is to the right of the bench on a wide screen: the sign, the host stand, the menu board
    if (o.right && o.right.w > h * 1.4) {
      var rx = o.right.x, rw = o.right.w;
      var sh = Math.min(h * 0.5, rw * 0.3), sw = Math.min(rw * 0.86, sh * 3.05); sh = sw / 3.05;
      var sx = rx + (rw - sw) / 2;
      logoSign(g, sx, y + h * 0.2, sw, sh);
      if (rw > sw + h * 1.1) {
        hostStand(g, sx - h * 0.3, fy, h * 0.42);
        aFrame(g, sx + sw + h * 0.3, fy, h * 0.4);
      }
    }
    // wooden bench under the guests
    var b0 = o.slotsX - h * 0.02, b1 = o.slotsX + o.slotsW + h * 0.02, seatY = y + h * 0.84;
    g.fillStyle = C.woodDark; g.fillRect(b0 + h * 0.06, seatY, h * 0.05, fy - seatY + fh * 0.4); g.fillRect(b1 - h * 0.11, seatY, h * 0.05, fy - seatY + fh * 0.4);
    g.fillStyle = C.wood; rr(g, b0, y + h * 0.56, b1 - b0, h * 0.07, h * 0.02); g.fill(); rr(g, b0, y + h * 0.68, b1 - b0, h * 0.07, h * 0.02); g.fill();
    g.fillStyle = C.woodLight; rr(g, b0, seatY - h * 0.02, b1 - b0, h * 0.06, h * 0.02); g.fill();
    // shade under the pergola
    var sg = g.createLinearGradient(0, y, 0, y + h * 0.4);
    sg.addColorStop(0, 'rgba(40,34,4,0.26)'); sg.addColorStop(1, 'rgba(40,34,4,0)');
    g.fillStyle = sg; g.fillRect(x, y, w, h * 0.4);
    pergolaBeam(g, x, y, w, h * 0.08, false);
  }
  // Posts and tulips go on top of the guests' strip, so they are drawn after the wall.
  function entrancePosts(g, y, h, posts, t) {
    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      delftPost(g, p.x, y + h * 0.08, p.w, h * 0.92);
      var col = p.purple ? PURPLE : RED;
      tulip(g, p.x + p.w / 2, y + h * 0.99, h * 0.84, col[0], col[1], Math.sin(t * 1.3 + i * 2) * h * 0.012);
    }
  }

  function hostStand(g, cx, baseY, s) {
    shadow(g, cx, baseY, s * 0.3, s * 0.05, 0.18);
    g.fillStyle = '#FFFFFF'; rr(g, cx - s * 0.24, baseY - s, s * 0.48, s, s * 0.04); g.fill();
    g.fillStyle = '#E4E1D7'; g.fillRect(cx + s * 0.14, baseY - s, s * 0.1, s);
    g.fillStyle = '#F4F2EA'; rr(g, cx - s * 0.3, baseY - s * 1.06, s * 0.6, s * 0.1, s * 0.03); g.fill();
    emblem(g, cx - s * 0.03, baseY - s * 0.58, s * 0.17);
  }
  function aFrame(g, cx, baseY, s) {
    shadow(g, cx, baseY, s * 0.36, s * 0.05, 0.18);
    g.fillStyle = C.woodDark; g.beginPath(); g.moveTo(cx + s * 0.1, baseY - s); g.lineTo(cx + s * 0.42, baseY); g.lineTo(cx + s * 0.34, baseY); g.lineTo(cx + s * 0.06, baseY - s * 0.9); g.closePath(); g.fill();
    g.fillStyle = C.wood; g.beginPath(); g.moveTo(cx - s * 0.2, baseY - s); g.lineTo(cx + s * 0.2, baseY - s); g.lineTo(cx + s * 0.3, baseY); g.lineTo(cx - s * 0.3, baseY); g.closePath(); g.fill();
    var cols = ['#F26B5E', C.yellow, C.blue, '#56C2A6', '#FFFFFF', C.orange];
    for (var i = 0; i < 6; i++) {
      var c = i % 2, r = Math.floor(i / 2), px = cx - s * 0.17 + c * s * 0.18 - r * s * 0.012, py = baseY - s * 0.9 + r * s * 0.27;
      g.fillStyle = cols[i]; g.fillRect(px, py, s * 0.16 + r * s * 0.012, s * 0.22);
      g.fillStyle = 'rgba(40,34,4,0.35)'; g.fillRect(px + s * 0.025, py + s * 0.04, s * 0.09, s * 0.02); g.fillRect(px + s * 0.025, py + s * 0.09, s * 0.07, s * 0.02);
    }
  }
  function bench(g, x, seatY, w, s) {
    g.fillStyle = C.woodDark; g.fillRect(x + w * 0.08, seatY, s * 0.05, s * 0.3); g.fillRect(x + w * 0.92 - s * 0.05, seatY, s * 0.05, s * 0.3);
    g.fillStyle = C.wood; rr(g, x, seatY - s * 0.36, w, s * 0.08, s * 0.02); g.fill(); rr(g, x, seatY - s * 0.22, w, s * 0.08, s * 0.02); g.fill();
    g.fillRect(x + w * 0.06, seatY - s * 0.36, s * 0.04, s * 0.36); g.fillRect(x + w * 0.94 - s * 0.04, seatY - s * 0.36, s * 0.04, s * 0.36);
    g.fillStyle = C.woodLight; rr(g, x - s * 0.02, seatY - s * 0.03, w + s * 0.04, s * 0.08, s * 0.02); g.fill();
  }
  function fan(g, cx, cy, s, t) {
    g.strokeStyle = '#3A2C1C'; g.lineWidth = s * 0.05; line(g, cx, cy - s * 0.5, cx, cy);
    for (var i = 0; i < 4; i++) {
      var a = t * 6 + i * Math.PI / 2, c = Math.cos(a);
      g.fillStyle = Math.sin(a) > 0 ? '#5A4632' : '#6E583F';
      g.beginPath(); g.ellipse(cx + c * s * 0.5, cy + Math.sin(a) * s * 0.06, Math.abs(c) * s * 0.5 + s * 0.05, s * 0.09, 0, 0, TAU); g.fill();
    }
    g.fillStyle = '#3A2C1C'; circ(g, cx, cy, s * 0.11); g.fill();
    g.fillStyle = '#FFF3C4'; circ(g, cx, cy + s * 0.14, s * 0.07); g.fill();
  }
  function palmCrown(g, x, y, s, t) {
    g.strokeStyle = '#8B6A43'; g.lineWidth = s * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + s * 0.12, y + s * 1.6); g.quadraticCurveTo(x + s * 0.2, y + s * 0.7, x, y); g.stroke();
    var ends = [[-1.1, 0.25], [-0.85, -0.5], [-0.2, -0.85], [0.55, -0.7], [1.05, -0.1], [0.8, 0.5], [-0.6, 0.6]];
    for (var i = 0; i < ends.length; i++) {
      var sw = Math.sin(t * 1.1 + i) * s * 0.04, ex = x + ends[i][0] * s, ey = y + ends[i][1] * s + sw;
      g.fillStyle = i % 2 ? '#3E8E46' : '#4FA552';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + ends[i][0] * s * 0.55, y + ends[i][1] * s * 0.5 - s * 0.38, ex, ey); g.quadraticCurveTo(x + ends[i][0] * s * 0.5, y + ends[i][1] * s * 0.5 - s * 0.02, x, y); g.fill();
    }
  }

  /* ---------- the entrance of Linda's, for the title screen ----------
     Drawn in its own units and then fitted into the free part of the screen (hero). */
  var facadePeople = null;
  function facade(g, W, H, hero, t) {
    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#125FC4'); sky.addColorStop(0.55, '#3FA2E8'); sky.addColorStop(1, '#8CCBF2');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    var k = Math.min(hero.w / 800, hero.h / 665);
    var ox = hero.x + hero.w / 2, oy = hero.y + hero.h - 70 * k;
    // sun and two small clouds
    var sunX = hero.x + hero.w * 0.14, sunY = Math.max(hero.y + 46 * k, oy - 640 * k);
    var glow = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120 * k);
    glow.addColorStop(0, 'rgba(255,240,170,0.9)'); glow.addColorStop(0.25, 'rgba(255,236,150,0.5)'); glow.addColorStop(1, 'rgba(255,236,150,0)');
    g.fillStyle = glow; circ(g, sunX, sunY, 120 * k); g.fill();
    g.fillStyle = '#FFE98A'; circ(g, sunX, sunY, 30 * k); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    for (var c = 0; c < 2; c++) {
      var cxp = hero.x + ((hero.w * (0.45 + c * 0.38) + t * (6 + c * 3) * k) % (hero.w + 200 * k)) - 60 * k, cyp = Math.max(hero.y + (30 + c * 26) * k, oy - (650 - c * 40) * k);
      ell(g, cxp, cyp, 46 * k, 13 * k); g.fill(); ell(g, cxp - 22 * k, cyp - 9 * k, 22 * k, 12 * k); g.fill(); ell(g, cxp + 14 * k, cyp - 12 * k, 26 * k, 15 * k); g.fill();
    }
    g.save(); g.translate(ox, oy); g.scale(k, k);
    var L = -ox / k - 4, R = (W - ox) / k + 4, B = (H - oy) / k + 4;

    palmCrown(g, -455, -640, 78, t); palmCrown(g, 480, -625, 70, t + 2);

    // the building: warm yellow, sandy cornice
    var wallG = g.createLinearGradient(0, -570, 0, 0);
    wallG.addColorStop(0, '#F0BE45'); wallG.addColorStop(1, '#E4A930');
    g.fillStyle = wallG; g.fillRect(-640, -570, 1280, 570);
    g.fillStyle = C.sand; g.fillRect(-660, -600, 1320, 34);
    g.fillStyle = '#D9C795'; g.fillRect(-660, -572, 1320, 8);
    g.fillStyle = 'rgba(40,34,4,0.16)'; g.fillRect(-640, -564, 1280, 10);
    // upper floor windows, small and dark-brown framed
    var wx = [-470, -300, 300, 470];
    for (var i = 0; i < wx.length; i++) {
      g.fillStyle = '#5A3E28'; rr(g, wx[i] - 38, -508, 76, 96, 4); g.fill();
      g.fillStyle = '#2E2A2A'; g.fillRect(wx[i] - 30, -500, 60, 80);
      g.fillStyle = 'rgba(140,200,240,0.28)'; g.beginPath(); g.moveTo(wx[i] - 30, -500); g.lineTo(wx[i] + 10, -500); g.lineTo(wx[i] - 30, -440); g.closePath(); g.fill();
      g.fillStyle = '#5A3E28'; g.fillRect(wx[i] - 3, -500, 6, 80); g.fillRect(wx[i] - 30, -463, 60, 6);
      g.fillStyle = '#4A321F'; g.fillRect(wx[i] - 42, -414, 84, 8);
    }

    // the open dining room behind the pergola
    var inG = g.createLinearGradient(0, -306, 0, -84);
    inG.addColorStop(0, '#5E4526'); inG.addColorStop(1, '#B98C42');
    g.fillStyle = inG; g.fillRect(-428, -306, 856, 226);
    // back wall: two doorways with their small black signs
    var doors = [[-150, 'RESTROOM'], [112, 'GIFT SHOP']];
    for (var d = 0; d < doors.length; d++) {
      g.fillStyle = '#3B2A18'; rr(g, doors[d][0] - 40, -212, 80, 132, 3); g.fill();
      g.fillStyle = '#17140F'; rr(g, doors[d][0] - 50, -246, 100, 24, 2); g.fill();
      A.text(g, doors[d][1], doors[d][0], -233.5, A.fitText(g, doors[d][1], 88, 13, A.FONT_LABEL), '#FFFFFF', A.FONT_LABEL);
    }
    // a few tables and blue chairs
    var tables = [-330, -30, 300];
    for (var tb = 0; tb < tables.length; tb++) {
      g.fillStyle = C.blue; rr(g, tables[tb] - 54, -132, 20, 50, 4); g.fill(); rr(g, tables[tb] + 34, -132, 20, 50, 4); g.fill();
      g.fillStyle = '#3B2A18'; g.fillRect(tables[tb] - 4, -112, 8, 30);
      g.fillStyle = C.creamLight; ell(g, tables[tb], -114, 46, 10); g.fill();
    }
    fan(g, -270, -262, 62, t); fan(g, 0, -262, 62, t + 0.7); fan(g, 270, -262, 62, t + 1.4);

    // terrace floor: reddish-brown brick
    g.fillStyle = C.brick; g.fillRect(-428, -84, 856, 36);
    g.strokeStyle = 'rgba(40,34,4,0.22)'; g.lineWidth = 1.2;
    for (var by = -84; by < -48; by += 12) line(g, -428, by, 428, by);
    for (var bx2 = -428; bx2 < 428; bx2 += 34) { line(g, bx2, -84, bx2, -72); line(g, bx2 + 17, -72, bx2 + 17, -60); line(g, bx2, -60, bx2, -48); }

    // host stand and menu board at the top of the steps
    hostStand(g, -128, -52, 74);
    aFrame(g, 132, -52, 70);

    // low walls with white railings left and right of the steps; the black banner hangs on the left one
    for (var sd = -1; sd <= 1; sd += 2) {
      var x0 = sd < 0 ? -428 : 262, ww = 166;
      g.fillStyle = '#E4A930'; g.fillRect(x0, -48, ww, 48);
      g.fillStyle = C.sand; g.fillRect(x0, -54, ww, 8);
      g.fillStyle = '#FFFFFF'; g.fillRect(x0, -112, ww, 7);
      for (var rp = 0; rp <= 8; rp++) g.fillRect(x0 + rp * (ww - 5) / 8, -112, 5, 60);
    }
    g.fillStyle = '#17140F'; g.fillRect(-412, -106, 134, 50);
    drawLogo(g, -404, -100, 118, 38, true);

    // three wide steps
    for (var st = 0; st < 3; st++) {
      var sy = -16 * (st + 1), half = 232 - st * 8;
      g.fillStyle = '#D5C8AE'; g.fillRect(-half, sy, half * 2, 16);
      g.fillStyle = '#F1E9D5'; g.fillRect(-half, sy, half * 2, 5);
    }

    // the big white sign with the real logo
    logoSign(g, -196, -532, 392, 136);

    // the white pergola in front
    g.fillStyle = 'rgba(40,34,4,0.25)'; g.fillRect(-470, -306, 940, 16);
    pergolaBeam(g, -486, -340, 972, 34, true);
    var postsX = [-262, 218];
    for (var p = 0; p < 2; p++) {
      shadow(g, postsX[p] + 22, 2, 40, 7, 0.2);
      delftPost(g, postsX[p], -306, 44, 306);
      var col = p ? PURPLE : RED;
      tulip(g, postsX[p] + 22, -2, 292, col[0], col[1], Math.sin(t * 1.2 + p * 2) * 5);
    }
    delftPost(g, -486, -306, 30, 306); delftPost(g, 456, -306, 30, 306);

    // pavement
    g.fillStyle = '#E7DDC6'; g.fillRect(L, 0, R - L, B);
    g.fillStyle = 'rgba(40,34,4,0.1)'; g.fillRect(L, 0, R - L, 6);
    g.strokeStyle = 'rgba(40,34,4,0.08)'; g.lineWidth = 2;
    for (var pv = -900; pv < 900; pv += 110) line(g, pv, 6, pv - 40, B);
    line(g, L, 62, R, 62);

    // benches left and right of the steps, with people waiting
    if (!facadePeople) { facadePeople = []; for (var q = 0; q < 8; q++) facadePeople.push(makeLook(101 + q * 37)); }
    bench(g, -420, -36, 150, 100); bench(g, 270, -36, 150, 100);
    g.fillStyle = 'rgba(40,34,4,0.14)'; ell(g, -345, -4, 84, 8); g.fill(); ell(g, 345, -4, 84, 8); g.fill();
    person(g, -382, -36, 112, facadePeople[0], 'sit', 0, t);
    person(g, -312, -36, 112, facadePeople[1], 'sit', 1, t + 1);
    person(g, 308, -36, 112, facadePeople[2], 'sit', 0, t + 2);
    person(g, 380, -36, 112, facadePeople[3], 'sit', 0, t + 3);
    person(g, -196, 40, 150, facadePeople[4], 'stand', 0, t + 4);
    person(g, 186, 46, 150, facadePeople[5], 'stand', 0, t + 5);
    // the iguana keeps an eye on the queue
    A.iguana(g, 40, 22, 110, t, null);
    g.restore();
  }

  A.loadLogo = loadLogo; A.drawLogo = drawLogo; A.emblem = emblem; A.logoSign = logoSign;
  A.tulip = tulip; A.delftPost = delftPost; A.pergolaBeam = pergolaBeam;
  A.makeLook = makeLook; A.head = head; A.person = person; A.guestCard = guestCard;
  A.entranceBand = entranceBand; A.entrancePosts = entrancePosts; A.facade = facade;
  A.hostStand = hostStand; A.aFrame = aFrame;
})();
