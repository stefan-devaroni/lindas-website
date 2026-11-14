/* Linda's Dutch Pancakes: every drawing on the home screen, made in code.

   Each tile picture is a 400 x 400 "Delft tile": a white tile with a blue edge, corner flowers
   and a pale blue disc with the picture on it (the same kind of tile as on the Stories page).
   A tile in tiles.js picks one by name:  picture: 'pan'.
   To add a picture, write a function below that returns the inside of the tile and list it in PICTURES.

   The giant tulips next to the tiles are also drawn here. No photos, no libraries. */

(function () {
  'use strict';

  var B = '#004EAD';   // dark Delft blue (lines)
  var S = '#27AAE1';   // signature blue
  var P = '#BDDFFF';   // pale blue
  var W = '#FDFEFF';   // tile white
  var D = '#E4F2FF';   // disc behind the picture
  var Y = '#EFBD40';   // yellow
  var O = '#EB8917';   // orange
  var R = '#D9372C';   // tulip red
  var G = '#3FA353';   // leaf green
  var G2 = '#2F8A45';  // darker leaf

  function line(w, c) {
    return ' fill="none" stroke="' + (c || B) + '" stroke-width="' + (w || 5) + '" stroke-linecap="round" stroke-linejoin="round"';
  }
  function shape(fill, w, c) {
    return ' fill="' + fill + '" stroke="' + (c || B) + '" stroke-width="' + (w == null ? 5 : w) + '" stroke-linecap="round" stroke-linejoin="round"';
  }
  function g(transform, inner) { return '<g transform="' + transform + '">' + inner + '</g>'; }

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

  /* ── small reusable bits ── */
  function heart(x, y, s, fill) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M0 14C-16 2 -20 -10 -10 -16C-4 -19 0 -13 0 -9C0 -13 4 -19 10 -16C20 -10 16 2 0 14Z"' + shape(fill || O, 3) + '/>');
  }
  function smallTulip(x, y, s, fill) {
    return g('translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')',
      '<path d="M0 0v-34"' + line(3, G2) + '/>' +
      '<path d="M0 -10q-13 -4 -13 -18q11 3 13 18zM0 -14q13 -4 13 -18q-11 3 -13 18z" fill="' + G + '"/>' +
      '<path d="M-10 -52q0 20 10 20q10 0 10 -20l-6 7l-4 -10l-4 10z"' + shape(fill || R, 3) + '/>');
  }
  function strawberry(x, y, r) {
    return g('translate(' + x + ' ' + y + ') rotate(' + (r || 0) + ')',
      '<path d="M0 22C-20 6 -20 -14 -8 -15C-3 -15 0 -12 0 -12C0 -12 3 -15 8 -15C20 -14 20 6 0 22Z"' + shape(R, 3) + '/>' +
      '<path d="M-9 -15L0 -9L9 -15L0 -20Z"' + shape(G, 2.5) + '/>' +
      '<circle cx="-6" cy="-1" r="1.6" fill="' + W + '"/><circle cx="6" cy="0" r="1.6" fill="' + W + '"/><circle cx="0" cy="9" r="1.6" fill="' + W + '"/>');
  }
  function banana(x, y) {
    return '<circle cx="' + x + '" cy="' + y + '" r="16"' + shape('#FFF3C2', 3) + '/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="3.2" fill="' + O + '"/>';
  }
  function berry(x, y) {
    return '<circle cx="' + x + '" cy="' + y + '" r="10.5" fill="' + B + '"/>' +
      '<circle cx="' + (x - 3) + '" cy="' + (y - 3.5) + '" r="3" fill="' + S + '"/>';
  }

  /* ── the tile pictures ── */

  // Linda's Breakfast Rush: a pan, and a pancake halfway through its flip
  function pan() {
    return '' +
      '<path d="M92 214Q70 158 108 110"' + line(4, S) + ' stroke-dasharray="2 12"/>' +
      '<path d="M306 214Q328 158 290 110"' + line(4, S) + ' stroke-dasharray="2 12"/>' +
      g('rotate(-13 198 126)',
        '<ellipse cx="198" cy="137" rx="76" ry="25"' + shape(O) + '/>' +
        '<ellipse cx="198" cy="125" rx="76" ry="25"' + shape(Y) + '/>' +
        '<ellipse cx="172" cy="120" rx="15" ry="5.5" fill="' + O + '" opacity=".55"/>' +
        '<ellipse cx="222" cy="130" rx="19" ry="6.5" fill="' + O + '" opacity=".55"/>' +
        '<ellipse cx="208" cy="113" rx="9" ry="3.5" fill="' + O + '" opacity=".55"/>') +
      '<path d="M286 264L350 240" fill="none" stroke="' + B + '" stroke-width="24" stroke-linecap="round"/>' +
      '<path d="M298 260L348 241" fill="none" stroke="' + S + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M98 262C98 304 140 322 198 322C256 322 298 304 298 262Z"' + shape(B) + '/>' +
      '<ellipse cx="198" cy="262" rx="100" ry="34"' + shape(S) + '/>' +
      '<ellipse cx="198" cy="264" rx="80" ry="23"' + shape(P, 4) + '/>' +
      '<path d="M140 262Q160 250 186 250"' + line(4, W) + '/>';
  }

  // Where are you from?: a globe with a pin in it
  function pin() {
    return '' +
      '<circle cx="186" cy="228" r="98"' + shape(W) + '/>' +
      '<ellipse cx="186" cy="228" rx="44" ry="98"' + line(3, S) + '/>' +
      '<path d="M88 228H284M103 178Q186 206 269 178M103 278Q186 250 269 278"' + line(3, S) + '/>' +
      '<circle cx="186" cy="228" r="98"' + line(5) + '/>' +
      '<circle cx="140" cy="206" r="7"' + shape(S, 3) + '/>' +
      '<circle cx="168" cy="272" r="7"' + shape(S, 3) + '/>' +
      '<circle cx="246" cy="262" r="7"' + shape(S, 3) + '/>' +
      '<ellipse cx="234" cy="214" rx="17" ry="6" fill="' + B + '" opacity=".28"/>' +
      g('translate(234 212)',
        '<path d="M0 0C-8 -28 -40 -46 -40 -82A40 40 0 1 1 40 -82C40 -46 8 -28 0 0Z"' + shape(O) + '/>' +
        '<circle cx="0" cy="-82" r="15"' + shape(W, 4) + '/>');
  }

  // Vote for our next T-shirt: a shirt and a tick
  function tee() {
    return '' +
      '<path d="M152 104L104 122L62 176L100 208L128 186V306H272V186L300 208L338 176L296 122L248 104Q226 132 200 132Q174 132 152 104Z"' + shape(W) + '/>' +
      '<path d="M146 108Q170 146 200 146Q230 146 254 108"' + line(3, S) + '/>' +
      '<path d="M86 196L118 158M314 196L282 158"' + line(3, S) + '/>' +
      heart(200, 208, 2.3, O) +
      '<circle cx="288" cy="290" r="42"' + shape(Y) + '/>' +
      '<path d="M268 291L283 306L309 275"' + line(8) + '/>';
  }

  // Aruba photo postcard: two cards, the front one with sea, sun and a palm
  function postcard() {
    return '' +
      g('rotate(9 200 206)', '<rect x="92" y="128" width="216" height="158" rx="8"' + shape(Y) + '/>') +
      g('rotate(-7 200 206)',
        '<rect x="84" y="120" width="232" height="170" rx="8"' + shape(W) + '/>' +
        '<rect x="98" y="134" width="204" height="102" rx="3" fill="' + P + '"/>' +
        '<circle cx="262" cy="166" r="17"' + shape(Y, 3, O) + '/>' +
        '<path d="M98 208q12.75 -9 25.5 0t25.5 0t25.5 0t25.5 0t25.5 0t25.5 0t25.5 0t25.5 0V236H98Z" fill="' + S + '"/>' +
        '<path d="M144 236C141 208 147 190 158 172"' + line(5) + '/>' +
        '<path d="M158 172q-20 -17 -44 -2M158 172q-7 -25 -32 -26M158 172q10 -25 36 -20M158 172q25 -8 40 11"' + line(5) + '/>' +
        '<rect x="98" y="134" width="204" height="102" rx="3"' + line(3) + '/>' +
        '<path d="M102 256h88M102 273h58"' + line(4, S) + '/>' +
        '<rect x="266" y="248" width="32" height="32" rx="3"' + shape(O, 3) + '/>' +
        '<path d="M274 264q4 -8 8 0t8 0"' + line(2.5, W) + '/>');
  }

  // Create your own Dutch pancake: a pancake on a Delft plate, with toppings
  function pancake() {
    return '' +
      '<circle cx="200" cy="204" r="120"' + shape(W) + '/>' +
      '<circle cx="200" cy="204" r="108"' + line(3.5, S) + ' stroke-dasharray="1 11"/>' +
      '<circle cx="200" cy="204" r="92"' + shape(Y) + '/>' +
      '<ellipse cx="150" cy="168" rx="16" ry="9" fill="' + O + '" opacity=".4" transform="rotate(-30 150 168)"/>' +
      '<ellipse cx="252" cy="250" rx="18" ry="9" fill="' + O + '" opacity=".4" transform="rotate(-35 252 250)"/>' +
      '<ellipse cx="236" cy="150" rx="12" ry="6" fill="' + O + '" opacity=".4" transform="rotate(25 236 150)"/>' +
      '<ellipse cx="160" cy="258" rx="12" ry="6" fill="' + O + '" opacity=".4" transform="rotate(30 160 258)"/>' +
      banana(150, 214) + banana(254, 204) + banana(204, 262) +
      strawberry(172, 164, -18) + strawberry(232, 158, 14) + strawberry(238, 246, 24) +
      berry(196, 206) + berry(214, 218) + berry(206, 190) + berry(166, 250) + berry(276, 176) +
      '<circle cx="186" cy="232" r="3" fill="' + W + '"/><circle cx="226" cy="198" r="3" fill="' + W + '"/><circle cx="176" cy="196" r="3" fill="' + W + '"/>' +
      '<circle cx="262" cy="232" r="3" fill="' + W + '"/><circle cx="142" cy="186" r="3" fill="' + W + '"/><circle cx="206" cy="140" r="3" fill="' + W + '"/>';
  }

  // Stories from our gift shop: an open book
  function book() {
    return '' +
      '<path d="M82 152L200 172L318 152V296L200 316L82 296Z"' + shape(S) + '/>' +
      '<path d="M200 166Q150 136 96 144V278Q150 270 200 300Z"' + shape(W) + '/>' +
      '<path d="M200 166Q250 136 304 144V278Q250 270 200 300Z"' + shape(W) + '/>' +
      smallTulip(148, 262, 1.5, R) +
      '<path d="M222 184Q254 168 286 170M222 208Q254 192 286 194M222 232Q254 216 286 218M222 256Q244 245 264 244"' + line(4, S) + '/>' +
      '<path d="M252 270V322l12 -10l12 10V268"' + shape(O, 4) + '/>' +
      '<path d="M122 100l5 12l12 5l-12 5l-5 12l-5 -12l-12 -5l12 -5z"' + shape(Y, 3) + '/>' +
      '<path d="M278 84l4 9l9 4l-9 4l-4 9l-4 -9l-9 -4l9 -4z"' + shape(Y, 3) + '/>' +
      '<circle cx="200" cy="112" r="5" fill="' + S + '"/>';
  }

  // Our online shop: a shopping bag with a tulip on it
  function bag() {
    return '' +
      '<path d="M154 172V140Q154 94 200 94Q246 94 246 140V172"' + line(8) + '/>' +
      '<path d="M108 160H292L305 300Q306 318 290 318H110Q94 318 95 300Z"' + shape(S) + '/>' +
      '<path d="M107 184H293"' + line(3, W) + ' opacity=".7"/>' +
      '<circle cx="154" cy="172" r="6.5" fill="' + B + '"/><circle cx="246" cy="172" r="6.5" fill="' + B + '"/>' +
      '<circle cx="200" cy="252" r="48"' + shape(W, 4) + '/>' +
      smallTulip(200, 290, 1.45, R) +
      '<path d="M323 128Q298 134 291 162"' + line(3) + '/>' +
      g('rotate(16 322 132)', '<path d="M304 112h36v36l-18 14l-18 -14z"' + shape(Y, 4) + '/><circle cx="322" cy="126" r="4.5" fill="' + B + '"/>');
  }

  var PICTURES = { pan: pan, pin: pin, tee: tee, postcard: postcard, pancake: pancake, book: book, bag: bag };

  /* ── the giant tulips ── */
  function tulipHead(main, dark) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" aria-hidden="true" focusable="false">' +
      '<path d="M60 147C22 147 3 112 8 62C10 38 18 18 30 4C46 26 56 48 60 74Z" fill="' + main + '"/>' +
      '<path d="M60 147C98 147 117 112 112 62C110 38 102 18 90 4C74 26 64 48 60 74Z" fill="' + main + '"/>' +
      '<path d="M60 147C35 120 35 58 60 10C85 58 85 120 60 147Z" fill="' + dark + '"/></svg>';
  }
  function tulipLeaves() {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 420" aria-hidden="true" focusable="false">' +
      '<path d="M110 420C62 350 20 250 32 92C76 180 118 300 110 420Z" fill="' + G + '"/>' +
      '<path d="M110 420C162 344 198 250 186 132C144 206 104 310 110 420Z" fill="' + G2 + '"/></svg>';
  }
  var TULIPS = { red: ['#E03A2E', '#BF2A21'], purple: ['#8A4FC2', '#6C39A3'] };

  window.LindasKioskArt = {
    // the whole tile picture as SVG text, or a plain tile if the name is unknown
    picture: function (name) { return tile(PICTURES[name] ? PICTURES[name]() : ''); },
    has: function (name) { return !!PICTURES[name]; },
    // one giant tulip: a flower on a long stem with two leaves. colour: 'red' or 'purple'
    tulip: function (colour) {
      var c = TULIPS[colour] || TULIPS.red;
      return '<i class="stem"></i><span class="leaves">' + tulipLeaves() + '</span><span class="head">' + tulipHead(c[0], c[1]) + '</span>';
    },
    house: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.2 11.4L12 3.6l8.8 7.8M5.6 9.8V20h4.6v-5.4h3.6V20h4.6V9.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrowOut: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5H5v14h14v-4M13 4h7v7M20 4l-9 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
})();
