/* The postcard frames. Each one is drawn in code on a canvas, 1080 units wide
   and 1350 (post) or 1920 (story) units tall. A frame paints only its own
   decoration; the part where the photo shows stays transparent, so the same
   drawing is used over the live camera, in the editor and in the saved picture.

   frame.window(W, H)  -> the rectangle the photo should fill
   frame.draw(ctx, W, H, env)
     env.s       the strings table (current language)
     env.assets  { logoBlue, logoWhite, stickers: { greetings, badge, iguana, powered } }
     env.date    { day, month (0-11), year } in Aruba time
     env.k       canvas pixels per unit (1 at full size); keeps shadows in proportion

   Font rule: Telegrafico has capital letters only. Anything set in it goes through
   caps(), which removes digits and punctuation. Dates are set in the body font. */
(function (root) {
  'use strict';

  var C = {
    blue: '#27AAE1', dark: '#004EAD', pale: '#BDDFFF', yellow: '#EFBD40', orange: '#EB8917',
    cream: '#F1EAD1', card: '#F8F3E2', ink: '#282204', white: '#FFFFFF', tile: '#FCFBF6',
    green: '#3C9A4B', greenLight: '#74C26E', greenDark: '#2A7A3B'
  };
  var SCRIPT = '"Olivier", "Segoe Script", "Brush Script MT", cursive';
  var CAPS = '"Telegrafico", "Trebuchet MS", "Segoe UI", sans-serif';
  var BODY = '"Open Sauce One", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif';
  var TAU = Math.PI * 2;

  /* ---------- small helpers ---------- */

  function caps(str) {
    var s = String(str);
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.toUpperCase().replace(/[^A-Z ]+/g, ' ').replace(/ +/g, ' ').replace(/^ | $/g, '');
  }
  function isStory(H) { return H > 1500; }

  function shadow(ctx, env, color, blur, oy, ox) {
    var k = (env && env.k) || 1;
    ctx.shadowColor = color; ctx.shadowBlur = blur * k;
    ctx.shadowOffsetX = (ox || 0) * k; ctx.shadowOffsetY = (oy || 0) * k;
  }
  function noShadow(ctx) {
    ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  }

  // Adds a rounded rectangle to the current path.
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Sets the font, shrinking it if the text would be wider than maxW. Returns the size used.
  function fit(ctx, text, family, size, maxW, prefix) {
    prefix = prefix || '';
    ctx.font = prefix + size + 'px ' + family;
    var w = ctx.measureText(text).width;
    if (w > maxW) { size = Math.floor(size * maxW / w); ctx.font = prefix + size + 'px ' + family; }
    return size;
  }

  // Letter-spaced text, drawn one letter at a time (ctx.letterSpacing is not everywhere yet).
  function trackedWidth(ctx, text, tr) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text.charAt(i)).width + tr;
    return text.length ? w - tr : 0;
  }
  function tracked(ctx, text, x, y, tr, align) {
    var w = trackedWidth(ctx, text, tr);
    var cx = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
    var prev = ctx.textAlign; ctx.textAlign = 'left';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + tr;
    }
    ctx.textAlign = prev;
  }
  function fitTracked(ctx, text, family, size, tr, maxW) {
    ctx.font = size + 'px ' + family;
    var w = trackedWidth(ctx, text, tr);
    if (w > maxW) { size = Math.floor(size * maxW / w); tr = tr * maxW / w; ctx.font = size + 'px ' + family; }
    return { size: size, tr: tr };
  }

  // Text along a circle, centred on midAngle. flip = true for the bottom of a ring (reads left to right, upright).
  function arcText(ctx, text, cx, cy, r, midAngle, tr, flip) {
    var dir = flip ? -1 : 1, i, total = trackedWidth(ctx, text, tr);
    var ang = midAngle - dir * total / (2 * r);
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < text.length; i++) {
      var ch = text.charAt(i), half = ctx.measureText(ch).width / 2;
      ang += dir * half / r;
      ctx.save();
      ctx.translate(cx + r * Math.cos(ang), cy + r * Math.sin(ang));
      ctx.rotate(ang + dir * Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      ang += dir * (half + tr) / r;
    }
    ctx.restore();
  }

  // Draws the logo so its visible part is visW wide and centred on (cx, cy). Returns the visible height.
  function logo(ctx, lg, cx, cy, visW) {
    if (!lg || !lg.img) return 0;
    var b = lg.box, sc = visW / b.w;
    ctx.drawImage(lg.img, cx - (b.x + b.w / 2) * sc, cy - (b.y + b.h / 2) * sc, lg.w * sc, lg.h * sc);
    return b.h * sc;
  }

  // A die-cut sticker (white backing is baked into the file) with a soft shadow.
  function sticker(ctx, env, img, cx, cy, w, deg) {
    if (!img) return;
    var h = w * img.height / img.width;
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(deg * Math.PI / 180);
    shadow(ctx, env, 'rgba(40,34,4,0.42)', 22, 9);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Fills everything except a hole (hole(ctx) adds the hole's outline to the path).
  function fillAround(ctx, W, H, color, hole) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.rect(0, 0, W, H); hole(ctx);
    ctx.fill('evenodd');
  }

  function dateText(env, upper) {
    var d = env.date, m = (upper ? env.s.months : env.s.monthsShort)[d.month];
    return d.day + ' ' + m + ' ' + d.year;
  }

  /* ---------- Delft-blue tiles ---------- */

  var TILE_KINDS = ['tulip', 'windmill', 'rosette', 'palm'];

  function tileMotif(ctx, kind) {
    // drawn in a box from -50 to 50
    var i;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = C.dark; ctx.fillStyle = C.dark;
    if (kind === 'tulip') {
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(0, 36); ctx.quadraticCurveTo(-3, 16, 0, -2); ctx.stroke();
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(0, 35);
        ctx.bezierCurveTo(s * 22, 27, s * 25, 8, s * 18, -5);
        ctx.bezierCurveTo(s * 14, 10, s * 8, 23, 0, 35);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.bezierCurveTo(-19, -1, -21, -22, -15, -35);
      ctx.lineTo(-7, -24); ctx.lineTo(0, -38); ctx.lineTo(7, -24); ctx.lineTo(15, -35);
      ctx.bezierCurveTo(21, -22, 19, -1, 0, 1);
      ctx.fill();
      ctx.fillStyle = 'rgba(189,223,255,0.9)';
      ctx.beginPath(); ctx.ellipse(0, -14, 4.2, 10, 0, 0, TAU); ctx.fill();
    } else if (kind === 'windmill') {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-30, 36); ctx.lineTo(30, 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-11, 36); ctx.lineTo(11, 36); ctx.lineTo(6, -2); ctx.lineTo(-6, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -2); ctx.quadraticCurveTo(0, -15, 8, -2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.tile; ctx.fillRect(-3, 23, 6, 13);
      for (i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(0, -7); ctx.rotate(Math.PI / 4 + i * Math.PI / 2);
        ctx.strokeStyle = C.dark; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -35); ctx.stroke();
        ctx.fillStyle = 'rgba(39,170,225,0.38)';
        ctx.fillRect(0, -35, 9, 24);
        ctx.lineWidth = 1.8; ctx.strokeRect(0, -35, 9, 24);
        ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(9, -27); ctx.moveTo(0, -19); ctx.lineTo(9, -19); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(0, -7, 3.4, 0, TAU); ctx.fill();
    } else if (kind === 'palm') {
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(5, 36); ctx.quadraticCurveTo(-5, 12, 4, -10); ctx.stroke();
      var ends = [[-33, -6], [-26, -30], [3, -40], [30, -30], [36, -6]];
      ends.forEach(function (e, n) {
        var mx = (4 + e[0]) / 2, my = Math.min(-10, e[1]) - 14;
        ctx.fillStyle = n % 2 ? 'rgba(39,170,225,0.75)' : C.dark;
        ctx.beginPath();
        ctx.moveTo(4, -10);
        ctx.quadraticCurveTo(mx, my, e[0], e[1]);
        ctx.quadraticCurveTo(mx + 1, my + 13, 4, -10);
        ctx.fill();
      });
      ctx.lineWidth = 3; ctx.strokeStyle = C.dark;
      ctx.beginPath(); ctx.moveTo(-24, 37); ctx.quadraticCurveTo(4, 29, 30, 37); ctx.stroke();
    } else { // rosette
      for (i = 0; i < 8; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 4);
        ctx.fillStyle = i % 2 ? 'rgba(39,170,225,0.6)' : C.dark;
        ctx.beginPath(); ctx.ellipse(0, -21, 6.5, 15, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = C.tile; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = C.dark; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
      ctx.fillStyle = C.dark; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
    }
  }

  function tile(ctx, x, y, w, h, kind) {
    ctx.save();
    ctx.fillStyle = C.tile; ctx.fillRect(x, y, w, h);
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(w / 100, h / 100);
    // glaze edge and grout
    ctx.strokeStyle = 'rgba(0,78,173,0.20)'; ctx.lineWidth = 1.6; ctx.strokeRect(-49.2, -49.2, 98.4, 98.4);
    // corner ornaments, as on old Dutch tiles
    for (var i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2);
      ctx.fillStyle = C.dark;
      ctx.beginPath(); ctx.moveTo(-50, -50); ctx.arc(-50, -50, 11, 0, Math.PI / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(39,170,225,0.85)'; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(-50, -50, 17.5, 0.12, Math.PI / 2 - 0.12); ctx.stroke();
      ctx.restore();
    }
    tileMotif(ctx, kind);
    ctx.restore();
  }

  /* ---------- 1. Classic postcard ---------- */

  function classicLayout(W, H) {
    var story = isStory(H), m = 44, top = story ? 130 : 44, band = story ? 440 : 306;
    return { m: m, top: top, band: band, win: { x: m, y: top, w: W - m * 2, h: H - top - band } };
  }

  var stampCache = {};
  function stampCanvas(env) {
    var label = caps(env.s.f_stampCaps);
    if (stampCache[label]) return stampCache[label];
    var w = 184, h = 224, sc = 3, i;
    var cv = document.createElement('canvas'); cv.width = w * sc; cv.height = h * sc;
    var ctx = cv.getContext('2d'); ctx.scale(sc, sc);
    ctx.fillStyle = '#FBF8EC'; ctx.fillRect(0, 0, w, h);
    // picture: a Dutch pancake seen from above, one thin flat pancake on a plate
    ctx.fillStyle = C.pale; ctx.fillRect(18, 18, w - 36, 146);
    ctx.fillStyle = C.blue;
    ctx.beginPath(); ctx.moveTo(18, 164); ctx.lineTo(18, 118);
    ctx.bezierCurveTo(50, 104, 80, 132, 110, 118); ctx.bezierCurveTo(130, 108, 150, 112, 166, 120);
    ctx.lineTo(166, 164); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(92, 91, 60, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,78,173,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(92, 91, 59.2, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#F3C363'; ctx.beginPath(); ctx.arc(92, 91, 49, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#DE9A35'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(92, 91, 47.5, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(214,134,40,0.55)';
    [[70, 72, 9, 6, 0.4], [112, 78, 7, 5, -0.5], [78, 108, 6, 8, 0.2], [108, 110, 10, 6, 0.7], [92, 62, 6, 4, 0], [60, 94, 4, 6, 0.3], [122, 96, 4, 5, 0]].forEach(function (b) {
      ctx.beginPath(); ctx.ellipse(b[0], b[1], b[2], b[3], b[4], 0, TAU); ctx.fill();
    });
    ctx.save(); ctx.translate(93, 89); ctx.rotate(0.35);
    ctx.fillStyle = '#FFF4B8'; ctx.fillRect(-10, -9, 20, 18);
    ctx.strokeStyle = 'rgba(214,134,40,0.7)'; ctx.lineWidth = 1.4; ctx.strokeRect(-10, -9, 20, 18);
    ctx.restore();
    ctx.strokeStyle = C.dark; ctx.lineWidth = 2; ctx.strokeRect(18, 18, w - 36, 146);
    // country name
    ctx.fillStyle = C.dark; ctx.textBaseline = 'alphabetic';
    var f = fitTracked(ctx, label, CAPS, 30, 7, w - 44);
    tracked(ctx, label, w / 2, 199, f.tr, 'center');
    // perforations
    ctx.globalCompositeOperation = 'destination-out';
    for (i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.arc(12 + i * 20, 0, 6.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(12 + i * 20, h, 6.2, 0, TAU); ctx.fill();
    }
    for (i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.arc(0, 12 + i * 20, 6.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(w, 12 + i * 20, 6.2, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    stampCache[label] = { cv: cv, w: w, h: h };
    return stampCache[label];
  }

  function postmark(ctx, env, cx, cy, R, waveTo) {
    var s = env.s, ink = 'rgba(40,34,4,0.80)', i, x;
    ctx.save();
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = 'round';
    // cancellation waves, running over the stamp
    ctx.lineWidth = 3.6;
    for (i = 0; i < 4; i++) {
      var wy = cy - 39 + i * 26;
      ctx.beginPath();
      for (x = cx + R + 10; x <= waveTo; x += 4) {
        var yy = wy + Math.sin((x - cx) / 13) * 6;
        if (x === cx + R + 10) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.translate(cx, cy); ctx.rotate(-0.16);
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, R * 0.63, 0, TAU); ctx.stroke();
    var ringR = R * 0.815, size = Math.round(R * 0.25);
    ctx.font = size + 'px ' + CAPS;
    arcText(ctx, caps(s.f_postmarkTopCaps), 0, 0, ringR, -Math.PI / 2, size * 0.22, false);
    arcText(ctx, caps(s.f_postmarkBottomCaps), 0, 0, ringR, Math.PI / 2, size * 0.22, true);
    ctx.beginPath(); ctx.arc(-ringR, 0, 3.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ringR, 0, 3.6, 0, TAU); ctx.fill();
    // the date: digits, so the body font
    var d = env.date;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 ' + Math.round(R * 0.30) + 'px ' + BODY;
    ctx.fillText(d.day + ' ' + s.months[d.month], 0, -R * 0.02);
    ctx.font = '600 ' + Math.round(R * 0.27) + 'px ' + BODY;
    ctx.fillText(String(d.year), 0, R * 0.30);
    ctx.restore();
  }

  function drawClassic(ctx, W, H, env) {
    var L = classicLayout(W, H), win = L.win, by = win.y + win.h, s = env.s;
    ctx.save();
    fillAround(ctx, W, H, C.card, function (c) { c.rect(win.x, win.y, win.w, win.h); });
    ctx.strokeStyle = 'rgba(40,34,4,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(win.x, win.y, win.w, win.h);

    // logo on a paper tab in the top corner
    var tw = 322, th = 118, r = 32;
    ctx.fillStyle = C.card;
    ctx.beginPath();
    ctx.moveTo(win.x - 2, win.y - 2); ctx.lineTo(win.x + tw, win.y - 2);
    ctx.lineTo(win.x + tw, win.y + th - r); ctx.arcTo(win.x + tw, win.y + th, win.x + tw - r, win.y + th, r);
    ctx.lineTo(win.x - 2, win.y + th); ctx.closePath(); ctx.fill();
    logo(ctx, env.assets.logoBlue, win.x + tw / 2 - 6, win.y + th / 2 - 6, 262);

    // greeting
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.dark;
    fit(ctx, s.f_greetingsFrom, SCRIPT, 80, 540);
    ctx.fillText(s.f_greetingsFrom, 70, by + 100);
    ctx.fillStyle = C.blue;
    fit(ctx, s.f_aruba, SCRIPT, 178, 560);
    ctx.fillText(s.f_aruba, 64, by + 250);

    // stamp, then the postmark over it
    var st = stampCanvas(env), scx = W - L.m - 34 - st.w / 2, scy = by + 96;
    ctx.save();
    ctx.translate(scx, scy); ctx.rotate(0.07);
    shadow(ctx, env, 'rgba(40,34,4,0.35)', 12, 4);
    ctx.drawImage(st.cv, -st.w / 2, -st.h / 2, st.w, st.h);
    ctx.restore();
    postmark(ctx, env, scx - st.w / 2 - 72, by + 100, 88, W - L.m - 20);
    ctx.restore();
  }

  /* ---------- 2. The entrance ---------- */

  function entranceLayout(W, H) {
    var story = isStory(H), top0 = story ? 96 : 0;
    var fh = 236 + top0, beam = 34, bandH = story ? 236 : 114;
    return { story: story, top0: top0, fh: fh, beam: beam, bandH: bandH, by: H - bandH,
      win: { x: 0, y: fh + beam, w: W, h: H - bandH - fh - beam } };
  }

  function tulipHead(ctx, cx, cy, w, h, col, tilt) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    // calyx
    ctx.fillStyle = C.greenDark;
    ctx.beginPath(); ctx.moveTo(-w * 0.16, h * 0.44); ctx.quadraticCurveTo(0, h * 0.62, w * 0.16, h * 0.44); ctx.lineTo(0, h * 0.36); ctx.closePath(); ctx.fill();
    // two outer petals
    ctx.fillStyle = col.dark;
    [-1, 1].forEach(function (s) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);
      ctx.bezierCurveTo(s * w * 0.66, h * 0.44, s * w * 0.62, -h * 0.16, s * w * 0.40, -h * 0.50);
      ctx.bezierCurveTo(s * w * 0.22, -h * 0.30, s * w * 0.08, -h * 0.05, 0, h * 0.5);
      ctx.fill();
    });
    // centre petal
    ctx.fillStyle = col.base;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.bezierCurveTo(-w * 0.46, h * 0.30, -w * 0.32, -h * 0.28, 0, -h * 0.56);
    ctx.bezierCurveTo(w * 0.32, -h * 0.28, w * 0.46, h * 0.30, 0, h * 0.5);
    ctx.fill();
    // a soft highlight
    ctx.fillStyle = col.light;
    ctx.beginPath();
    ctx.moveTo(-w * 0.10, h * 0.30);
    ctx.bezierCurveTo(-w * 0.26, h * 0.10, -w * 0.20, -h * 0.22, -w * 0.04, -h * 0.40);
    ctx.bezierCurveTo(-w * 0.14, -h * 0.12, -w * 0.14, h * 0.10, -w * 0.10, h * 0.30);
    ctx.fill();
    ctx.restore();
  }

  function drawEntrance(ctx, W, H, env) {
    var L = entranceLayout(W, H), s = env.s, i;
    var postW = 66, postX = 22, postTop = L.fh + L.beam, tiles = L.story ? 6 : 4;
    var tileTop = L.by - tiles * postW;
    ctx.save();

    // soft shadow the roof throws on the picture
    var g = ctx.createLinearGradient(0, postTop, 0, postTop + 34);
    g.addColorStop(0, 'rgba(40,34,4,0.30)'); g.addColorStop(1, 'rgba(40,34,4,0)');
    ctx.fillStyle = g; ctx.fillRect(0, postTop, W, 34);

    [0, 1].forEach(function (side) {
      var x = side ? W - postX - postW : postX, dir = side ? -1 : 1, cx = x + postW / 2;
      // white post
      ctx.save();
      shadow(ctx, env, 'rgba(40,34,4,0.30)', 14, 0, dir * 4);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, postTop - 4, postW, L.by - postTop + 8);
      ctx.restore();
      ctx.fillStyle = 'rgba(40,34,4,0.09)';
      ctx.fillRect(side ? x : x + postW - 12, postTop, 12, L.by - postTop);
      // Delft tiles around the foot of the post
      for (i = 0; i < tiles; i++) tile(ctx, x, tileTop + i * postW, postW, postW, TILE_KINDS[(i * 2 + side) % 4 === 1 ? 2 : (i + side) % 2 ? 0 : 2]);
      ctx.fillStyle = C.dark; ctx.fillRect(x - 4, tileTop - 10, postW + 8, 10);
      ctx.strokeStyle = 'rgba(0,78,173,0.55)'; ctx.lineWidth = 2; ctx.strokeRect(x, tileTop, postW, tiles * postW);

      // the giant tulip: long stem, two leaves, big flower
      var headX = cx + dir * 30, headY = postTop + (L.story ? 250 : 196), headW = 158, headH = 196;
      ctx.lineCap = 'round';
      // leaves
      [[dir, 0.92, 330], [-dir, 0.55, 250]].forEach(function (lf, n) {
        var d = lf[0], bx = cx + d * 2, byy = tileTop - 8, len = lf[2];
        var tipX = bx + d * len * (n ? 0.10 : 0.30) * lf[1], tipY = byy - len;
        ctx.fillStyle = n ? C.greenDark : C.green;
        ctx.beginPath();
        ctx.moveTo(bx - d * 10, byy);
        ctx.bezierCurveTo(bx - d * 16, byy - len * 0.45, bx + d * len * 0.06, byy - len * 0.80, tipX, tipY);
        ctx.bezierCurveTo(bx + d * len * 0.26 * lf[1] + d * 26, byy - len * 0.62, bx + d * 44, byy - len * 0.25, bx + d * 14, byy);
        ctx.closePath(); ctx.fill();
      });
      // stem
      ctx.strokeStyle = C.green; ctx.lineWidth = 17;
      ctx.beginPath();
      ctx.moveTo(cx, tileTop - 6);
      ctx.bezierCurveTo(cx - dir * 20, tileTop - 190, headX + dir * 22, headY + 260, headX, headY + headH * 0.42);
      ctx.stroke();
      ctx.strokeStyle = C.greenLight; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - dir * 4, tileTop - 10);
      ctx.bezierCurveTo(cx - dir * 24, tileTop - 190, headX + dir * 18, headY + 260, headX - dir * 4, headY + headH * 0.44);
      ctx.stroke();
      ctx.save();
      shadow(ctx, env, 'rgba(40,34,4,0.35)', 16, 6);
      tulipHead(ctx, headX, headY, headW, headH,
        side ? { base: '#8E44AD', dark: '#6B2C8C', light: 'rgba(214,170,236,0.75)' }
             : { base: '#E5332D', dark: '#B81F24', light: 'rgba(255,170,150,0.75)' },
        dir * 0.10);
      ctx.restore();
    });

    // the yellow wall with the big white sign
    ctx.fillStyle = C.yellow; ctx.fillRect(0, 0, W, L.fh);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(0, 0, W, L.fh * 0.45);
    ctx.fillStyle = '#D9A32C'; ctx.fillRect(0, L.fh - 12, W, 12);
    var sw = 730, sh = 192, sx = (W - sw) / 2, sy = L.top0 + 20;
    ctx.save();
    shadow(ctx, env, 'rgba(40,34,4,0.36)', 18, 7);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); rr(ctx, sx, sy, sw, sh, 16); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,34,4,0.14)'; ctx.lineWidth = 2; ctx.beginPath(); rr(ctx, sx + 1, sy + 1, sw - 2, sh - 2, 15); ctx.stroke();
    logo(ctx, env.assets.logoBlue, W / 2, sy + sh / 2, 520);

    // white pergola: one long beam with the rafter ends showing
    ctx.save();
    shadow(ctx, env, 'rgba(40,34,4,0.30)', 12, 5);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-10, L.fh, W + 20, L.beam);
    ctx.restore();
    ctx.fillStyle = 'rgba(40,34,4,0.10)'; ctx.fillRect(0, L.fh + L.beam - 7, W, 7);
    for (i = 0; i < 12; i++) {
      var rx = 46 + i * ((W - 92 - 24) / 11);
      ctx.save();
      shadow(ctx, env, 'rgba(40,34,4,0.26)', 8, 3);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); rr(ctx, rx, L.fh - 9, 24, L.beam + 30, 4); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(40,34,4,0.10)'; ctx.fillRect(rx + 18, L.fh - 6, 6, L.beam + 24);
    }

    // low wall along the bottom, with the place name
    ctx.fillStyle = C.yellow; ctx.fillRect(0, L.by, W, L.bandH);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, L.by, W, 12);
    ctx.fillStyle = 'rgba(40,34,4,0.14)'; ctx.fillRect(0, L.by + 12, W, 5);
    var line = s.f_place + '  ·  ' + s.f_since;
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    fit(ctx, line, SCRIPT, 64, W - 120);
    ctx.fillText(line, W / 2, L.by + 84);
    ctx.restore();
  }

  /* ---------- 3. Delft tiles ---------- */

  function delftLayout(W, H) {
    var cols = 10, tw = W / cols, rows = Math.round(H / tw), th = H / rows;
    return { cols: cols, rows: rows, tw: tw, th: th, win: { x: tw, y: th, w: W - tw * 2, h: H - th * 2 } };
  }

  function plaque(ctx, env, cx, cy, w, h) {
    ctx.save();
    shadow(ctx, env, 'rgba(40,34,4,0.34)', 16, 6);
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); rr(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = C.dark; ctx.lineWidth = 5;
    ctx.beginPath(); rr(ctx, cx - w / 2 + 2.5, cy - h / 2 + 2.5, w - 5, h - 5, h / 2); ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    ctx.beginPath(); rr(ctx, cx - w / 2 + 11, cy - h / 2 + 11, w - 22, h - 22, h / 2); ctx.stroke();
  }

  function drawDelft(ctx, W, H, env) {
    var L = delftLayout(W, H), c, r, s = env.s, story = isStory(H), win = L.win;
    ctx.save();
    for (c = 0; c < L.cols; c++) {
      tile(ctx, c * L.tw, 0, L.tw, L.th, TILE_KINDS[c % 4]);
      tile(ctx, c * L.tw, H - L.th, L.tw, L.th, TILE_KINDS[(c + 2) % 4]);
    }
    for (r = 1; r < L.rows - 1; r++) {
      tile(ctx, 0, r * L.th, L.tw, L.th, TILE_KINDS[(r * 3) % 4]);
      tile(ctx, W - L.tw, r * L.th, L.tw, L.th, TILE_KINDS[(r * 3 + 1) % 4]);
    }
    // a blue line where the tiles meet the picture
    ctx.strokeStyle = C.dark; ctx.lineWidth = 6;
    ctx.strokeRect(win.x, win.y, win.w, win.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
    ctx.strokeRect(win.x + 5, win.y + 5, win.w - 10, win.h - 10);

    var topY = story ? L.th + 96 : L.th + 2, botY = story ? H - L.th - 104 : H - L.th - 4;
    plaque(ctx, env, W / 2, topY, 690, 124);
    ctx.fillStyle = C.dark; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var size = fit(ctx, s.f_greetingsLine, SCRIPT, 74, 600);
    ctx.fillText(s.f_greetingsLine, W / 2, topY + size * 0.30);
    plaque(ctx, env, W / 2, botY, 470, 140);
    logo(ctx, env.assets.logoBlue, W / 2, botY, 366);
    ctx.restore();
  }

  /* ---------- 4. Greetings sticker ---------- */

  function printLayout(W, H, b) {
    var sp = isStory(H) ? 112 : 0;
    return { b: b, sp: sp, win: { x: b, y: b + sp, w: W - b * 2, h: H - (b + sp) * 2 } };
  }

  function drawGreetings(ctx, W, H, env) {
    var L = printLayout(W, H, 26), win = L.win, st = env.assets.stickers;
    ctx.save();
    fillAround(ctx, W, H, '#FFFFFF', function (c) { rr(c, win.x, win.y, win.w, win.h, 34); });
    ctx.strokeStyle = 'rgba(40,34,4,0.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); rr(ctx, win.x, win.y, win.w, win.h, 34); ctx.stroke();
    sticker(ctx, env, st.iguana, W - 172, win.y + 208, 252, 8);
    sticker(ctx, env, st.greetings, win.x + 262, win.y + win.h - 184, 480, -4);
    ctx.restore();
  }

  /* ---------- 5. I waited ---------- */

  function waitedLayout(W, H) {
    var bandH = isStory(H) ? 540 : 392;
    return { bandH: bandH, y0: H - bandH, win: { x: 0, y: 0, w: W, h: H - bandH + 70 } };
  }

  function wave(ctx, W, H, y, amp, len, phase, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, y);
    for (var x = 0; x <= W; x += 6) ctx.lineTo(x, y + Math.sin(x / len * TAU + phase) * amp);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  function drawWaited(ctx, W, H, env) {
    var L = waitedLayout(W, H), y0 = L.y0, s = env.s;
    ctx.save();
    wave(ctx, W, H, y0 + 14, 14, 270, 0.4, C.pale);
    wave(ctx, W, H, y0 + 32, 14, 230, 2.2, C.blue);
    wave(ctx, W, H, y0 + 52, 12, 250, 4.1, C.dark);

    var t1 = caps(s.f_waitedCaps);
    ctx.fillStyle = C.yellow; ctx.textBaseline = 'alphabetic';
    var f = fitTracked(ctx, t1, CAPS, 44, 5, W - 150);
    tracked(ctx, t1, W / 2, y0 + 118, f.tr, 'center');

    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
    fit(ctx, s.f_waitedScript, SCRIPT, 100, W - 120);
    ctx.fillText(s.f_waitedScript, W / 2, y0 + 206);

    ctx.fillStyle = C.pale;
    fit(ctx, s.f_waitedSmall, BODY, 30, W - 160, 'italic 500 ');
    ctx.fillText(s.f_waitedSmall, W / 2, y0 + 277);

    logo(ctx, env.assets.logoWhite, W / 2, y0 + 338, 240);
    ctx.restore();
  }

  /* ---------- 6. Bon dia badge ---------- */

  function drawBadge(ctx, W, H, env) {
    var sp = isStory(H) ? 150 : 0, s = env.s, gh = 500 + sp;
    ctx.save();
    var g = ctx.createLinearGradient(0, H - gh, 0, H);
    g.addColorStop(0, 'rgba(0,52,120,0)'); g.addColorStop(0.26, 'rgba(0,52,120,0.46)');
    g.addColorStop(0.58, 'rgba(0,48,112,0.78)'); g.addColorStop(1, 'rgba(0,40,98,0.93)');
    ctx.fillStyle = g; ctx.fillRect(0, H - gh, W, gh);

    ctx.save();
    shadow(ctx, env, 'rgba(0,30,80,0.55)', 10, 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.96)'; ctx.lineWidth = 5;
    ctx.beginPath(); rr(ctx, 30, 30, W - 60, H - 60, 36); ctx.stroke();
    ctx.restore();

    var baseY = H - sp;
    ctx.save();
    shadow(ctx, env, 'rgba(0,30,80,0.65)', 14, 3);
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    fit(ctx, s.f_bonDia, SCRIPT, 164, 560);
    ctx.fillText(s.f_bonDia, 74, baseY - 246);
    ctx.fillStyle = C.yellow;
    fit(ctx, s.f_fromAruba, SCRIPT, 86, 560);
    ctx.fillText(s.f_fromAruba, 80, baseY - 150);
    ctx.fillStyle = '#FFFFFF';
    var line = s.f_place + '  ·  ' + dateText(env, false);
    fit(ctx, line, BODY, 31, 560, '600 ');
    ctx.fillText(line, 82, baseY - 86);
    ctx.restore();

    sticker(ctx, env, env.assets.stickers.badge, W - 226, baseY - 250, 348, 8);
    ctx.restore();
  }

  /* ---------- 7. Powered by pancakes ---------- */

  function drawPowered(ctx, W, H, env) {
    var L = printLayout(W, H, 34), win = L.win;
    ctx.save();
    fillAround(ctx, W, H, C.yellow, function (c) { rr(c, win.x, win.y, win.w, win.h, 30); });
    ctx.strokeStyle = C.dark; ctx.lineWidth = 9;
    ctx.beginPath(); rr(ctx, win.x, win.y, win.w, win.h, 30); ctx.stroke();
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
    ctx.beginPath(); rr(ctx, win.x + 8, win.y + 8, win.w - 16, win.h - 16, 24); ctx.stroke();

    // logo on a white tab in the bottom corner
    var tw = 356, th = 124, x1 = win.x + win.w, y1 = win.y + win.h, r = 36;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x1 - tw, y1); ctx.lineTo(x1 - tw, y1 - th + r);
    ctx.arcTo(x1 - tw, y1 - th, x1 - tw + r, y1 - th, r);
    ctx.lineTo(x1, y1 - th); ctx.lineTo(x1, y1 - 30); ctx.arcTo(x1, y1, x1 - 30, y1, 30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.dark; ctx.lineWidth = 9; ctx.stroke();
    logo(ctx, env.assets.logoBlue, x1 - tw / 2 + 2, y1 - th / 2 + 1, 282);

    sticker(ctx, env, env.assets.stickers.powered, win.x + 212, y1 - 226, 384, -7);
    ctx.restore();
  }

  /* ---------- the list ---------- */

  var list = [
    { id: 'classic', window: function (W, H) { return classicLayout(W, H).win; }, draw: drawClassic },
    { id: 'entrance', window: function (W, H) { return entranceLayout(W, H).win; }, draw: drawEntrance },
    { id: 'delft', window: function (W, H) { return delftLayout(W, H).win; }, draw: drawDelft },
    { id: 'greetings', window: function (W, H) { return printLayout(W, H, 26).win; }, draw: drawGreetings },
    { id: 'waited', window: function (W, H) { return waitedLayout(W, H).win; }, draw: drawWaited },
    { id: 'badge', window: function (W, H) { return { x: 0, y: 0, w: W, h: H }; }, draw: drawBadge },
    { id: 'powered', window: function (W, H) { return printLayout(W, H, 34).win; }, draw: drawPowered }
  ];
  var byId = {};
  list.forEach(function (f) { byId[f.id] = f; });

  root.PostcardFrames = { list: list, byId: byId, caps: caps, fonts: { script: SCRIPT, caps: CAPS, body: BODY }, colors: C };
})(window);
