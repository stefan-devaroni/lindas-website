/* Linda's Dutch Pancakes: "Stories" — every drawing on the page, made in code.

   Each drawing is a 400 x 400 "Delft tile": a white tile with a blue edge, corner flowers and a
   pale blue disc with the picture on it. Nothing here is copied from another website and there
   are no photos, logos or labels of any brand.

   A story panel picks a drawing by name:  art: "windmill"  (see stories-data.js).
   To add one, write a function below that returns the inside of the tile and list it in `ART`. */

(function () {
  'use strict';

  var B = '#004EAD';   // dark Delft blue (lines)
  var S = '#27AAE1';   // signature blue
  var P = '#BDDFFF';   // pale blue
  var W = '#FDFEFF';   // tile white
  var D = '#E4F2FF';   // disc behind the picture
  var Y = '#EFBD40';   // yellow
  var O = '#EB8917';   // orange
  var K = '#3B3A36';   // unfired paint (soft black, never pure black)
  var BODY = "'Open Sauce One','Segoe UI',system-ui,sans-serif";
  var SCRIPT = "Olivier,'Segoe Script','Brush Script MT',cursive";

  /* ── small helpers ── */
  function line(w, c) {
    return ' fill="none" stroke="' + (c || B) + '" stroke-width="' + (w || 5) + '" stroke-linecap="round" stroke-linejoin="round"';
  }
  function shape(fill, w, c) {
    return ' fill="' + fill + '" stroke="' + (c || B) + '" stroke-width="' + (w == null ? 5 : w) + '" stroke-linecap="round" stroke-linejoin="round"';
  }
  function g(transform, inner) { return '<g transform="' + transform + '">' + inner + '</g>'; }
  function text(x, y, str, size, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || 'middle') + '" font-family="' + (o.script ? SCRIPT : BODY) +
      '" font-size="' + size + '" font-weight="' + (o.script ? 400 : 700) + '" fill="' + (o.fill || B) + '">' + str + '</text>';
  }

  var CORNER =
    '<path d="M18 18Q48 20 60 46Q32 42 18 18Z" fill="' + S + '" opacity=".5"/>' +
    '<path d="M18 18Q20 48 46 60Q42 32 18 18Z" fill="' + S + '" opacity=".5"/>' +
    '<path d="M20 20L50 50"' + line(3) + '/>' +
    '<circle cx="21" cy="21" r="6.5" fill="' + B + '"/>' +
    '<circle cx="66" cy="22" r="3.2" fill="' + B + '"/><circle cx="22" cy="66" r="3.2" fill="' + B + '"/>';
  var CORNERS = CORNER + g('translate(400 0) scale(-1 1)', CORNER) + g('translate(0 400) scale(1 -1)', CORNER) + g('translate(400 400) scale(-1 -1)', CORNER);

  function tile(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" aria-hidden="true" focusable="false">' +
      '<rect x="3" y="3" width="394" height="394" rx="16" fill="' + W + '" stroke="' + B + '" stroke-width="6"/>' +
      '<rect x="14" y="14" width="372" height="372" rx="9" fill="none" stroke="' + P + '" stroke-width="3"/>' +
      CORNERS +
      '<circle cx="200" cy="200" r="156" fill="' + D + '"/>' +
      '<circle cx="200" cy="200" r="163" fill="none" stroke="' + S + '" stroke-width="2.5" stroke-dasharray="1 9" stroke-linecap="round"/>' +
      inner + '</svg>';
  }

  /* ── reusable bits ── */
  function ground(y, x1, x2) { return '<path d="M' + (x1 || 70) + ' ' + y + 'H' + (x2 || 330) + '"' + line(4) + '/>'; }
  function waves(y, x1, x2, c) {
    var d = '', x;
    for (x = x1; x < x2 - 20; x += 44) d += 'M' + x + ' ' + y + 'q11 -9 22 0t22 0';
    return '<path d="' + d + '"' + line(3, c || S) + '/>';
  }
  function cloud(x, y, s) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M0 20Q-16 20 -14 8Q-12 -4 2 0Q8 -14 24 -8Q38 -12 42 2Q56 2 54 12Q54 20 42 20Z"' + shape(W, 3) + '/>');
  }
  function bird(x, y) { return '<path d="M' + x + ' ' + y + 'q7 -8 13 0q6 -8 13 0"' + line(3) + '/>'; }
  function heart(x, y, s, fill) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M0 14C-16 2 -20 -10 -10 -16C-4 -19 0 -13 0 -9C0 -13 4 -19 10 -16C20 -10 16 2 0 14Z"' + shape(fill || O, 3) + '/>');
  }
  function tulip(x, y, fill) {
    return '<path d="M' + x + ' ' + y + 'v-34"' + line(3) + '/>' +
      '<path d="M' + x + ' ' + (y - 12) + 'q-12 -4 -12 -16q10 2 12 16zM' + x + ' ' + (y - 16) + 'q12 -4 12 -16q-10 2 -12 16z" fill="' + S + '" opacity=".7"/>' +
      '<path d="M' + (x - 9) + ' ' + (y - 48) + 'q0 16 9 16q9 0 9 -16l-5 6l-4 -8l-4 8z"' + shape(fill || O, 3) + '/>';
  }
  function sun(x, y, r) {
    var rays = '', a, i;
    for (i = 0; i < 10; i++) {
      a = i * Math.PI / 5;
      rays += 'M' + (x + Math.cos(a) * (r + 8)).toFixed(1) + ' ' + (y + Math.sin(a) * (r + 8)).toFixed(1) +
              'L' + (x + Math.cos(a) * (r + 20)).toFixed(1) + ' ' + (y + Math.sin(a) * (r + 20)).toFixed(1);
    }
    return '<path d="' + rays + '"' + line(4, O) + '/><circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + shape(Y, 4) + '/>';
  }
  function flame(x, y, s, fill) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M0 0C-12 -6 -11 -20 -3 -30C-2 -22 4 -22 3 -34C13 -24 16 -10 8 -3C6 -1 3 0 0 0Z"' + shape(fill || O, 2.5) + '/>');
  }

  /* The kissing couple, drawn on a 400 x 400 field with their feet at y = 320. */
  function couplePair() {
    var girl =
      '<path d="M140 320Q138 306 156 306L174 309Q186 312 188 320Z"' + shape(Y, 4) + '/>' +
      '<path d="M98 304Q96 240 130 206L170 208Q192 250 190 304Z"' + shape(P) + '/>' +
      '<path d="M112 296Q112 250 136 214M130 300Q134 252 148 214"' + line(3, S) + '/>' +
      '<path d="M152 212L170 210Q190 252 188 304L164 304Q168 256 152 212Z"' + shape(W, 4) + '/>' +
      '<path d="M112 320Q110 304 130 304L150 308Q162 311 164 320Z"' + shape(Y, 4) + '/>' +
      '<path d="M130 208Q132 176 152 160L176 164Q182 186 170 210Z"' + shape(B, 4) + '/>' +
      '<path d="M142 174Q116 188 124 210"' + line(11) + '/>' +
      '<circle cx="124" cy="214" r="6.5"' + shape(W, 3) + '/>' +
      '<circle cx="176" cy="138" r="23"' + shape(W, 4) + '/>' +
      '<path d="M194 124Q186 100 164 97L156 82Q149 100 150 112Q143 134 150 150L132 166Q150 168 163 154Q160 136 172 124Q182 118 194 124Z"' + shape(W, 4) + '/>' +
      '<path d="M166 128Q158 140 159 154"' + line(2.5, S) + '/>' +
      '<path d="M181 137q4 3.5 9 0"' + line(3) + '/>' +
      '<circle cx="181" cy="149" r="5.5" fill="' + O + '" opacity=".5"/>';
    var boy =
      '<path d="M260 320Q262 306 244 306L226 309Q214 312 212 320Z"' + shape(Y, 4) + '/>' +
      '<path d="M226 210L272 210Q294 250 288 304L260 304L253 262L246 304L216 304Q210 250 226 210Z"' + shape(S) + '/>' +
      '<path d="M288 320Q290 304 270 304L250 308Q238 311 236 320Z"' + shape(Y, 4) + '/>' +
      '<path d="M270 212Q268 178 248 160L224 164Q218 186 230 212Z"' + shape(B, 4) + '/>' +
      '<path d="M258 174Q284 188 276 210"' + line(11) + '/>' +
      '<circle cx="276" cy="214" r="6.5"' + shape(W, 3) + '/>' +
      '<path d="M226 160L246 163L238 180Z"' + shape(O, 3) + '/>' +
      '<circle cx="224" cy="138" r="23"' + shape(W, 4) + '/>' +
      '<path d="M203 126Q204 98 228 96Q250 96 250 124Q228 114 203 126Z"' + shape(B, 4) + '/>' +
      '<path d="M206 123L191 130Q197 117 209 118Z"' + shape(B, 4) + '/>' +
      '<path d="M210 137q5 3.5 9 0"' + line(3) + '/>' +
      '<circle cx="219" cy="149" r="5.5" fill="' + O + '" opacity=".5"/>';
    return girl + boy;
  }

  /* A lantern-shaped hot pepper (the Madame Jeanette / habanero family), tip down. */
  function pepperShape(fill) {
    return '<path d="M198 150C194 128 202 108 224 98"' + line(12) + '/>' +
      '<path d="M196 152C160 134 126 158 128 206C130 250 162 276 184 300C192 310 196 320 204 322C212 320 212 308 220 296C240 268 272 250 272 204C272 160 236 136 196 152Z"' + shape(fill || Y) + '/>' +
      '<path d="M192 160C178 204 184 262 202 314M234 160C250 200 240 250 216 292"' + line(3, O) + '/>' +
      '<path d="M166 152Q180 134 198 142Q216 132 232 150Q216 158 204 152Q198 166 190 154Q178 160 166 152Z"' + shape(S, 4) + '/>' +
      '<path d="M148 184Q144 208 154 230"' + line(7, W) + '/>';
  }
  /* A wooden shoe seen from the side, toe to the right. (x, y) is the bottom of the heel. */
  function clog(x, y, s) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M4 -8Q-2 -44 28 -50L62 -46Q88 -56 108 -42Q126 -30 150 -40Q150 -12 120 -2L16 0Q6 0 4 -8Z"' + shape(Y) + '/>' +
      '<path d="M20 -47Q42 -30 64 -46Q42 -56 20 -47Z"' + shape(B, 3) + '/>' +
      '<path d="M84 -24l8 -10l8 10l-8 8z" fill="' + B + '"/><circle cx="68" cy="-22" r="3" fill="' + B + '"/><circle cx="116" cy="-24" r="3" fill="' + B + '"/>');
  }

  /* One canal house. x = left edge, w = width, h = wall height, gy = ground line. */
  function house(x, w, h, type, o) {
    o = o || {};
    var gy = o.gy || 300, top = gy - h, m = x + w / 2, s = '', d, i, r, c;
    var gh = o.gh || 46;
    if (type === 'step') {
      var a = w / 8, st = gh / 4;
      d = 'M' + x + ' ' + top;
      for (i = 0; i < 4; i++) d += 'V' + (top - st * (i + 1)) + 'H' + (x + a * (i + 1));
      d += 'H' + (x + a * 5);
      for (i = 3; i >= 0; i--) d += 'V' + (top - st * i) + 'H' + (x + a * (8 - i));
      d += 'Z';
    } else if (type === 'bell') {
      d = 'M' + x + ' ' + top + 'Q' + x + ' ' + (top - gh * 0.45) + ' ' + (x + w * 0.24) + ' ' + (top - gh * 0.5) +
          'Q' + (x + w * 0.26) + ' ' + (top - gh) + ' ' + m + ' ' + (top - gh) +
          'Q' + (x + w * 0.74) + ' ' + (top - gh) + ' ' + (x + w * 0.76) + ' ' + (top - gh * 0.5) +
          'Q' + (x + w) + ' ' + (top - gh * 0.45) + ' ' + (x + w) + ' ' + top + 'Z';
    } else if (type === 'neck') {
      d = 'M' + x + ' ' + top + 'V' + (top - 8) + 'Q' + (x + w * 0.26) + ' ' + (top - 8) + ' ' + (x + w * 0.28) + ' ' + (top - gh * 0.5) +
          'V' + (top - gh + 10) + 'L' + m + ' ' + (top - gh - 4) + 'L' + (x + w * 0.72) + ' ' + (top - gh + 10) +
          'V' + (top - gh * 0.5) + 'Q' + (x + w * 0.74) + ' ' + (top - 8) + ' ' + (x + w) + ' ' + (top - 8) + 'V' + top + 'Z';
    } else {
      d = 'M' + x + ' ' + top + 'L' + (m - 7) + ' ' + (top - gh + 8) + 'V' + (top - gh) + 'H' + (m + 7) + 'V' + (top - gh + 8) + 'L' + (x + w) + ' ' + top + 'Z';
    }
    var lw = o.lw || 4;
    s += '<path d="' + d + '"' + shape(o.fill || W, lw) + '/>';
    s += '<rect x="' + x + '" y="' + top + '" width="' + w + '" height="' + h + '"' + shape(o.fill || W, lw) + '/>';
    /* attic window */
    s += '<rect x="' + (m - 5) + '" y="' + (top - gh * 0.5 + 2) + '" width="10" height="13" rx="2"' + shape(S, 2.5) + '/>';
    /* windows */
    var cols = w >= 62 ? 3 : 2, ww = o.ww || 11, wh = o.wh || 19, doorH = o.doorH || 30;
    var rows = Math.max(1, Math.floor((h - doorH - 14) / (wh + 13)));
    var gap = (w - cols * ww) / (cols + 1);
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      s += '<rect x="' + (x + gap + c * (ww + gap)).toFixed(1) + '" y="' + (top + 12 + r * (wh + 13)) + '" width="' + ww + '" height="' + wh + '" rx="1.5"' + shape(S, 2.5) + '/>';
    }
    /* ground floor: door and one window */
    s += '<rect x="' + (x + gap) + '" y="' + (gy - doorH) + '" width="' + (ww + 3) + '" height="' + doorH + '" rx="2" fill="' + B + '"/>';
    if (cols > 1) s += '<rect x="' + (x + w - gap - (cols > 2 ? ww * 2 + gap : ww)).toFixed(1) + '" y="' + (gy - doorH + 4) + '" width="' + (cols > 2 ? ww * 2 + gap : ww).toFixed(1) + '" height="' + (doorH - 12) + '" rx="1.5"' + shape(S, 2.5) + '/>';
    return s;
  }
  function houseRow(gy, big) {
    return house(74, 46, big ? 104 : 96, 'bell', { gy: gy, gh: 40 }) +
      house(120, 52, big ? 132 : 120, 'step', { gy: gy, gh: 44 }) +
      house(172, 50, big ? 112 : 104, 'neck', { gy: gy, gh: 46 }) +
      house(222, 54, big ? 138 : 126, 'step', { gy: gy, gh: 44 }) +
      house(276, 48, big ? 108 : 98, 'spout', { gy: gy, gh: 40 });
  }
  function plane(x, y, s) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M8 -4L-10 -40H12L36 -10Z"' + shape(S, 4) + '/>' +
      '<path d="M0 0Q40 -18 150 -14Q196 -12 208 2Q196 14 150 14H36Q8 14 0 0Z"' + shape(W, 4) + '/>' +
      '<path d="M92 8L62 46H90L132 10Z"' + shape(S, 4) + '/>' +
      '<path d="M176 -4q10 1 16 6"' + line(3) + '/>' +
      '<path d="M60 -3h8M80 -4h8M100 -5h8M120 -5h8M140 -5h8"' + line(4, S) + '/>');
  }
  function vase(x, y, s) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M-10 0Q-26 -24 -9 -44V-56H9V-44Q26 -24 10 0Z"' + shape(W, 4) + '/>' +
      '<path d="M-17 -22Q0 -30 17 -22"' + line(3, S) + '/><circle cx="0" cy="-12" r="4" fill="' + B + '"/><path d="M-10 -58H10"' + line(4) + '/>');
  }
  function plate(x, y, r, c) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + shape(W, 4) + '/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.74).toFixed(1) + '"' + line(3, c) + '/>' +
      g('translate(' + x + ' ' + y + ') scale(' + (r / 64).toFixed(2) + ')',
        '<path d="M0 30V-2"' + line(4, c) + '/>' +
        '<path d="M-11 -30q0 20 11 20q11 0 11 -20l-6 8l-5 -10l-5 10z" fill="' + c + '"/>' +
        '<path d="M0 18q-14 -4 -16 -18q13 2 16 18zM0 12q14 -4 16 -18q-13 2 -16 18z" fill="' + c + '" opacity=".75"/>') +
      dots(x, y, r * 0.87, 12, c);
  }
  function dots(x, y, r, n, c) {
    var s = '', i, a;
    for (i = 0; i < n; i++) { a = i * 2 * Math.PI / n; s += '<circle cx="' + (x + Math.cos(a) * r).toFixed(1) + '" cy="' + (y + Math.sin(a) * r).toFixed(1) + '" r="2.6" fill="' + c + '"/>'; }
    return s;
  }
  function brush(x, y, angle, s) {
    return g('translate(' + x + ' ' + y + ') rotate(' + angle + ') scale(' + (s || 1) + ')',
      '<path d="M0 0Q-9 -16 -5 -30H5Q9 -16 0 0Z"' + shape(B, 3) + '/>' +
      '<rect x="-7" y="-46" width="14" height="18" rx="2"' + shape(S, 3) + '/>' +
      '<path d="M-6 -46L-4 -132Q0 -138 4 -132L6 -46Z"' + shape(Y, 3) + '/>');
  }
  function bottle(x, fill, flames) {
    var s =
      '<rect x="' + (x - 15) + '" y="92" width="30" height="24" rx="5"' + shape(B, 4) + '/>' +
      '<path d="M' + (x - 11) + ' 116V160Q' + (x - 42) + ' 182 ' + (x - 42) + ' 214V298Q' + (x - 42) + ' 312 ' + (x - 28) + ' 312H' + (x + 28) + 'Q' + (x + 42) + ' 312 ' + (x + 42) + ' 298V214Q' + (x + 42) + ' 182 ' + (x + 11) + ' 160V116Z"' + shape(fill) + '/>' +
      '<rect x="' + (x - 42) + '" y="226" width="84" height="56"' + shape(W, 4) + '/>' +
      '<path d="M' + (x - 28) + ' 176Q' + (x - 32) + ' 196 ' + (x - 31) + ' 214"' + line(6, W) + '/>';
    var i, n = flames, start = x - (n - 1) * 11;
    for (i = 0; i < n; i++) s += flame(start + i * 22, 270, 0.95);
    return s;
  }

  /* ── the drawings ── */
  var ART = {

    couple: function () {
      return ground(322) + tulip(86, 322, O) + tulip(314, 322, Y) + couplePair() + heart(200, 76, 1.25);
    },

    costume: function () {
      return '' +
        /* the pointed cap ("hul"), seen from the front */
        '<path d="M200 76Q238 118 242 178L282 204Q250 220 228 200L172 200Q150 220 118 204L158 178Q162 118 200 76Z"' + shape(W) + '/>' +
        '<path d="M166 176Q200 162 234 176"' + line(3, S) + '/>' +
        '<path d="M176 150Q200 140 224 150M186 124Q200 118 214 124"' + line(2.5, S) + '/>' +
        '<circle cx="200" cy="188" r="4" fill="' + B + '"/><circle cx="182" cy="190" r="3" fill="' + B + '"/><circle cx="218" cy="190" r="3" fill="' + B + '"/>' +
        /* a pair of wooden shoes */
        clog(84, 300, 0.92) + clog(176, 322, 0.92);
    },

    postcard: function () {
      return g('rotate(-6 200 200)',
        '<rect x="84" y="118" width="232" height="164" rx="6"' + shape(W) + '/>' +
        '<rect x="270" y="130" width="34" height="42" rx="2"' + shape(S, 3) + '/>' +
        '<path d="M214 196H304M214 216H304M214 236H282"' + line(3, S) + '/>' +
        '<path d="M202 132V268"' + line(2.5, P) + '/>' +
        g('translate(62 142) scale(.42)', couplePair() + heart(200, 76, 1.4)));
    },

    mystery: function () {
      return g('rotate(-9 130 150)',
          '<rect x="70" y="100" width="128" height="92" rx="5"' + shape(W, 4) + '/>' +
          '<rect x="170" y="108" width="20" height="24" rx="2"' + shape(S, 2.5) + '/>' +
          g('translate(66 96) scale(.27)', couplePair())) +
        '<path d="M188 214Q214 252 252 250"' + line(5) + ' stroke-dasharray="2 12"/>' +
        '<path d="M244 238l16 12l-18 9"' + line(5) + '/>' +
        '<rect x="196" y="304" width="150" height="20" rx="4"' + shape(W, 4) + '/>' +
        g('translate(185 164) scale(.43)', couplePair()) +
        text(292, 150, '?', 104, { script: true, fill: O });
    },

    zoen: function () {
      return '' +
        '<rect x="98" y="112" width="204" height="176"' + shape(W) + '/>' +
        '<rect x="84" y="98" width="232" height="26" rx="13"' + shape(P) + '/>' +
        '<rect x="84" y="276" width="232" height="26" rx="13"' + shape(P) + '/>' +
        text(200, 214, 'zoen', 92, { script: true }) +
        '<path d="M134 240Q168 226 200 240T266 240"' + line(3, S) + '/>' +
        '<path d="M266 296l-12 44l16 -10l10 16l6 -46z"' + shape(O, 3) + '/>' +
        '<circle cx="276" cy="290" r="27"' + shape(O, 4) + '/>' +
        heart(276, 290, 0.85, W);
    },

    giant: function () {
      return ground(330, 60, 340) +
        g('translate(62 30) scale(.94)', couplePair() + heart(200, 76, 1.2)) +
        /* how tall: a measuring arrow and a person on a bicycle for scale */
        '<path d="M78 112V326M68 124l10 -14l10 14M68 314l10 14l10 -14"' + line(4, O) + '/>' +
        text(80, 96, '10 m', 24, { fill: B }) +
        '<circle cx="118" cy="318" r="10"' + line(3) + '/><circle cx="150" cy="318" r="10"' + line(3) + '/>' +
        '<path d="M118 318l12 -16h14l6 16M130 302l-3 -8M144 302l-8 16"' + line(3) + '/>' +
        '<path d="M133 292v-12"' + line(6) + '/><circle cx="133" cy="273" r="5" fill="' + B + '"/>';
    },

    pepper: function () {
      return pepperShape(Y) + flame(292, 150, 1.2) + flame(318, 186, 0.8, Y) + flame(104, 150, 0.9, Y);
    },

    papaya: function () {
      var seeds = '', pts = [[188,196],[204,188],[214,204],[196,212],[184,226],[206,226],[216,240],[194,244],[204,258],[188,258],[210,212]], i;
      for (i = 0; i < pts.length; i++) seeds += '<ellipse cx="' + pts[i][0] + '" cy="' + pts[i][1] + '" rx="5" ry="6.5" fill="' + B + '"/>';
      return g('rotate(24 200 200)',
        '<path d="M200 84C150 84 116 144 116 214C116 276 154 318 200 318C246 318 284 276 284 214C284 144 250 84 200 84Z"' + shape(O) + '/>' +
        '<path d="M200 102C160 102 134 152 134 214C134 266 164 300 200 300C236 300 266 266 266 214C266 152 240 102 200 102Z" fill="' + Y + '"/>' +
        '<path d="M200 160C178 160 164 190 164 222C164 254 180 278 200 278C220 278 236 254 236 222C236 190 222 160 200 160Z"' + shape(W, 3, O) + '/>' +
        seeds +
        '<path d="M200 84Q196 66 206 56"' + line(8) + '/>');
    },

    jar: function () {
      return '' +
        '<rect x="132" y="150" width="136" height="164" rx="26"' + shape(W) + '/>' +
        '<path d="M137 214H263V288Q263 309 242 309H158Q137 309 137 288Z" fill="' + O + '"/>' +
        '<path d="M137 214q16 -10 32 0t32 0t32 0t30 0"' + line(3, Y) + '/>' +
        '<rect x="132" y="150" width="136" height="164" rx="26"' + line(5) + '/>' +
        '<rect x="126" y="118" width="148" height="36" rx="8"' + shape(S) + '/>' +
        '<path d="M150 124V148M176 124V148M202 124V148M228 124V148M252 124V148"' + line(3) + '/>' +
        '<path d="M152 176V282"' + line(7, W) + '/>' +
        g('translate(246 204) scale(.3)', pepperShape(Y)) +
        g('translate(20 222) scale(.27)', pepperShape(Y));
    },

    bottles: function () {
      return ground(314, 76, 324) + bottle(146, Y, 1) + bottle(254, O, 3);
    },

    'three-peppers': function () {
      return ground(316, 76, 324) +
        g('translate(-12 120) scale(.6)', pepperShape(Y)) +
        g('translate(58 82) scale(.72)', pepperShape(O)) +
        g('translate(160 136) scale(.55)', pepperShape(Y)) +
        heart(202, 112, 1);
    },

    windmill: function () {
      var blade = '<path d="M200 164V70"' + line(5) + '/><rect x="200" y="72" width="26" height="68"' + shape(W, 3) + '/>' +
                  '<path d="M213 72V140M200 95H226M200 118H226"' + line(2, S) + '/>';
      return '' +
        cloud(86, 110, 0.8) + cloud(278, 92, 0.7) + bird(258, 150) + bird(110, 172) +
        '<path d="M78 316Q200 286 322 316"' + line(4) + '/>' +
        '<path d="M166 306L184 170H216L234 306Z"' + shape(W) + '/>' +
        '<path d="M176 240H224"' + line(3, S) + '/>' +
        '<rect x="193" y="198" width="14" height="20" rx="2"' + shape(S, 3) + '/>' +
        '<path d="M190 306V280Q200 268 210 280V306Z"' + shape(B, 3) + '/>' +
        '<path d="M178 172Q200 140 222 172Z"' + shape(B, 4) + '/>' +
        g('rotate(24 200 164)', blade + g('rotate(90 200 164)', blade) + g('rotate(180 200 164)', blade) + g('rotate(270 200 164)', blade)) +
        '<circle cx="200" cy="164" r="7"' + shape(Y, 3) + '/>' +
        tulip(108, 314, O) + tulip(292, 314, Y) + tulip(130, 318, Y);
    },

    stall: function () {
      var stripes = '', i, x;
      for (i = 0; i < 4; i++) { x = 104 + i * 52; stripes += '<path d="M' + x + ' 124H' + (x + 26) + 'L' + (x + 27 + (i - 1.5) * 4) + ' 170H' + (x - 1 + (i - 1.5) * 4 - 4) + 'Z" fill="' + S + '"/>'; }
      var scallops = 'M86 170';
      for (i = 0; i < 6; i++) scallops += 'q19 22 38 0';
      return '' +
        '<path d="M104 170V318M296 170V318"' + line(6) + '/>' +
        '<path d="M100 124H300L314 170H86Z"' + shape(W) + '/>' + stripes +
        '<path d="M100 124H300L314 170H86Z"' + line(5) + '/>' +
        '<path d="' + scallops + '"' + shape(W, 4) + '/>' +
        '<rect x="88" y="262" width="224" height="18" rx="4"' + shape(P) + '/>' +
        '<path d="M100 280V318M300 280V318"' + line(5) + '/>' +
        vase(138, 262, 1) + vase(196, 262, 1.2) + vase(254, 262, 0.9) +
        '<circle cx="290" cy="244" r="17"' + shape(W, 3) + '/><circle cx="290" cy="244" r="8"' + line(2.5, S) + '/>' +
        ground(320, 70, 330);
    },

    painting: function () {
      return plate(182, 214, 96, B) + brush(214, 196, 52, 1.05) + brush(296, 300, 20, 0.62) +
        '<circle cx="104" cy="112" r="6" fill="' + S + '"/><circle cx="122" cy="96" r="4" fill="' + B + '"/>';
    },

    shop: function () {
      var gy = 292;
      return '' +
        house(84, 46, 96, 'bell', { gy: gy, gh: 38, fill: D }) +
        house(264, 52, 104, 'spout', { gy: gy, gh: 40, fill: D }) +
        /* the shop: a tall step-gabled house with an awning and a big window */
        (function () {
          var x = 136, w = 122, h = 150, top = gy - h, s = '', a = w / 8, st = 11, d = 'M' + x + ' ' + top, i, r, c;
          for (i = 0; i < 4; i++) d += 'V' + (top - st * (i + 1)) + 'H' + (x + a * (i + 1));
          d += 'H' + (x + a * 5);
          for (i = 3; i >= 0; i--) d += 'V' + (top - st * i) + 'H' + (x + a * (8 - i));
          s += '<path d="' + d + 'Z"' + shape(W) + '/><rect x="' + x + '" y="' + top + '" width="' + w + '" height="' + h + '"' + shape(W) + '/>';
          s += '<rect x="' + (x + w / 2 - 8) + '" y="' + (top - 30) + '" width="16" height="20" rx="2"' + shape(S, 3) + '/>';
          for (r = 0; r < 2; r++) for (c = 0; c < 3; c++) s += '<rect x="' + (x + 16 + c * 36) + '" y="' + (top + 12 + r * 36) + '" width="18" height="24" rx="2"' + shape(S, 3) + '/>';
          s += '<rect x="' + (x + 14) + '" y="' + (gy - 50) + '" width="58" height="36" rx="2"' + shape(P, 3) + '/>';
          s += vase(x + 30, gy - 16, 0.42) + vase(x + 54, gy - 16, 0.5);
          s += '<rect x="' + (x + 84) + '" y="' + (gy - 52) + '" width="24" height="52" rx="2" fill="' + B + '"/><circle cx="' + (x + 89) + '" cy="' + (gy - 26) + '" r="2.5" fill="' + Y + '"/>';
          s += '<path d="M' + (x - 6) + ' ' + (gy - 58) + 'H' + (x + w + 6) + 'L' + (x + w + 14) + ' ' + (gy - 74) + 'H' + (x - 14) + 'Z"' + shape(Y, 4) + '/>';
          return s;
        })() +
        ground(gy, 64, 336) + waves(312, 84, 320) + waves(330, 106, 300, P);
    },

    kiln: function () {
      return plate(116, 172, 58, K) + plate(284, 172, 58, B) +
        '<path d="M184 172H220M208 160l14 12l-14 12"' + line(5) + '/>' +
        /* the oven */
        '<path d="M120 320V282Q120 256 146 256H254Q280 256 280 282V320Z"' + shape(W) + '/>' +
        '<path d="M150 320V298Q150 280 168 280H232Q250 280 250 298V320Z"' + shape(K, 4) + '/>' +
        flame(184, 318, 1.1) + flame(202, 320, 1.5, Y) + flame(222, 318, 1.05) +
        ground(322, 84, 316);
    },

    fish: function () {
      return '' +
        '<circle cx="186" cy="190" r="106"' + shape(W) + '/>' +
        '<circle cx="186" cy="190" r="92"' + line(2.5, P) + '/>' +
        '<path d="M126 174Q166 140 214 174Q166 208 126 174Z"' + shape(S, 4) + '/>' +
        '<path d="M214 174L240 154V194Z"' + shape(S, 4) + '/>' +
        '<circle cx="146" cy="170" r="4" fill="' + B + '"/>' +
        '<path d="M164 162Q172 174 164 186M182 160Q190 174 182 188"' + line(2.5) + '/>' +
        '<path d="M124 236q8 -22 18 -2q6 12 14 -6q8 -16 16 4q6 12 16 -6q6 -12 14 2q8 12 30 2"' + line(4) + '/>' +
        '<path d="M262 266L318 322"' + line(16) + '/>' +
        '<path d="M262 266L318 322"' + line(7, Y) + '/>';
    },

    houses: function () {
      return houseRow(292, true) + ground(292, 62, 338) + waves(312, 84, 320) + waves(330, 106, 300, P);
    },

    'houses-plane': function () {
      return cloud(84, 150, 0.7) + cloud(292, 164, 0.6) +
        '<path d="M70 132Q110 118 128 104"' + line(3, S) + ' stroke-dasharray="2 10"/>' +
        plane(132, 108, 0.82) +
        houseRow(308, false) + ground(308, 62, 338) + waves(326, 96, 310);
    },

    'houses-numbered': function () {
      var gy = 276;
      return house(72, 44, 78, 'bell', { gy: gy, gh: 34, fill: D }) +
        house(116, 74, 132, 'step', { gy: gy, gh: 50, ww: 13, wh: 22 }) +
        house(190, 78, 118, 'neck', { gy: gy, gh: 56, ww: 13, wh: 22 }) +
        house(268, 44, 84, 'spout', { gy: gy, gh: 34, fill: D }) +
        ground(gy, 62, 338) +
        '<rect x="126" y="288" width="54" height="36" rx="8"' + shape(B, 0) + '/>' + text(153, 315, '47', 26, { fill: '#fff' }) +
        '<rect x="202" y="288" width="54" height="36" rx="8"' + shape(B, 0) + '/>' + text(229, 315, '48', 26, { fill: '#fff' });
    },

    'house-aruba': function () {
      var gy = 300;
      return sun(286, 112, 24) +
        /* a wind-bent tree and a cactus */
        '<path d="M116 300Q112 250 132 214"' + line(8) + '/>' +
        '<path d="M130 216Q88 182 62 204Q92 192 122 222ZM132 212Q104 160 72 166Q106 172 124 214Z"' + shape(S, 3) + '/>' +
        '<path d="M318 300V236M318 268H302V250M318 258H332V244"' + line(9) + '/>' +
        '<path d="M318 300V236M318 268H302V250M318 258H332V244"' + line(4, S) + '/>' +
        house(150, 132, 104, 'bell', { gy: gy, gh: 50, ww: 18, wh: 26, doorH: 40 }) +
        ground(gy, 56, 344) +
        '<rect x="170" y="312" width="92" height="36" rx="8" fill="' + B + '"/>' + text(216, 339, 'No. 103', 22, { fill: '#fff' });
    },

    'house-birthday': function () {
      var gy = 306, flags = '', cols = [O, Y, S, O, Y, S, O], i, x;
      for (i = 0; i < 7; i++) { x = 86 + i * 34; flags += '<path d="M' + x + ' ' + (92 + Math.abs(3 - i) * -4 + 12) + 'l24 2l-14 26z"' + shape(cols[i], 3) + '/>'; }
      return '<path d="M74 96Q200 126 326 96"' + line(3) + '/>' + flags +
        house(96, 96, 124, 'step', { gy: gy, gh: 46, ww: 15, wh: 22 }) +
        /* a calendar page */
        '<rect x="216" y="142" width="106" height="100" rx="10"' + shape(W) + '/>' +
        '<path d="M216 172H322V152Q322 142 312 142H226Q216 142 216 152Z" fill="' + B + '"/>' +
        text(269, 165, 'OCT', 19, { fill: '#fff' }) + text(269, 226, '7', 54) +
        /* a small cake with one candle */
        '<rect x="236" y="284" width="68" height="22" rx="6"' + shape(Y, 4) + '/>' +
        '<path d="M236 293q8.500 7 17 0t17 0t17 0t17 0"' + line(2.5, O) + '/>' +
        '<path d="M270 284V268"' + line(5, S) + '/>' + flame(270, 266, 0.55) +
        ground(gy, 62, 338);
    },

    'house-bottle': function () {
      var gy = 306;
      return house(120, 116, 150, 'step', { gy: gy, gh: 52, ww: 17, wh: 26, doorH: 40, lw: 5 }) +
        /* the cork on top */
        '<rect x="165" y="76" width="26" height="30" rx="5"' + shape(Y, 4) + '/>' +
        '<path d="M170 86h16M170 95h16"' + line(2.5, O) + '/>' +
        /* a juniper twig with berries */
        '<path d="M262 300Q282 250 322 222"' + line(5) + '/>' +
        '<path d="M270 280l-16 -10M270 280l18 4M282 258l-16 -12M282 258l18 2M298 240l-12 -14M298 240l18 0M312 228l-6 -16"' + line(3.5, S) + '/>' +
        '<circle cx="266" cy="296" r="8"' + shape(B, 0) + '/><circle cx="290" cy="270" r="7"' + shape(B, 0) + '/><circle cx="306" cy="250" r="7"' + shape(B, 0) + '/>' +
        ground(gy, 62, 338);
    },

    'house-glass': function () {
      var gy = 304;
      return '' +
        /* a glass ... */
        '<path d="M84 200H152L144 300H92Z"' + shape(W) + '/>' +
        '<path d="M88 240H148L144 296H92Z" fill="' + P + '"/>' +
        '<path d="M84 200H152L144 300H92Z"' + line(5) + '/>' +
        text(118, 176, '?', 76, { script: true, fill: O }) +
        /* ... or a house */
        '<path d="M170 250H206M194 238l14 12l-14 12"' + line(5) + '/>' +
        house(226, 92, 130, 'neck', { gy: gy, gh: 56, ww: 14, wh: 22 }) +
        '<rect x="263" y="94" width="18" height="22" rx="4"' + shape(Y, 4) + '/>' +
        ground(gy, 62, 338);
    },

    bag: function () {
      return '' +
        '<path d="M150 150Q150 92 200 92Q250 92 250 150"' + line(9) + '/>' +
        '<path d="M110 150H290L304 316H96Z"' + shape(S) + '/>' +
        '<path d="M110 150H290L293 186H107Z" fill="' + B + '" opacity=".25"/>' +
        '<circle cx="150" cy="168" r="7" fill="' + W + '"/><circle cx="250" cy="168" r="7" fill="' + W + '"/>' +
        heart(200, 248, 2.6, W);
    },

    facts: function () {
      return '' +
        '<path d="M200 60V84M118 94l16 18M282 94l-16 18M84 176h24M316 176h-24"' + line(6, O) + '/>' +
        '<path d="M200 106C156 106 126 138 126 178C126 208 144 226 158 242Q166 252 166 266H234Q234 252 242 242C256 226 274 208 274 178C274 138 244 106 200 106Z"' + shape(Y) + '/>' +
        '<path d="M182 262Q176 214 166 196M218 262Q224 214 234 196M176 204h48"' + line(3.5, O) + '/>' +
        '<rect x="166" y="266" width="68" height="34" rx="6"' + shape(S) + '/>' +
        '<path d="M168 283H232"' + line(3) + '/>' +
        '<path d="M180 300Q200 322 220 300Z"' + shape(B, 4) + '/>';
    },

    quiz: function () {
      return '' +
        '<path d="M92 100H308Q328 100 328 120V240Q328 260 308 260H222L176 312L182 260H92Q72 260 72 240V120Q72 100 92 100Z"' + shape(W) + '/>' +
        text(200, 232, '?', 150, { script: true, fill: B }) +
        '<circle cx="120" cy="136" r="7" fill="' + O + '"/><circle cx="286" cy="226" r="7" fill="' + Y + '"/><circle cx="290" cy="134" r="5" fill="' + S + '"/>';
    }
  };

  function make(name) {
    var fn = ART[name] || ART.couple;
    return tile(fn());
  }

  window.LINDAS_STORY_ART = { make: make, names: Object.keys(ART) };
})();
