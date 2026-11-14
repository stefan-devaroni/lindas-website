/*
 * A T-shirt drawn in code: flat colour, a little shading, the design printed on the chest.
 *
 *   Tee.svg({ shirt: 'navy', file: 'designs/19-four-tiles.webp', label: 'Four Delft Tiles' })  -> SVG markup
 *   Tee.mug({ shirt: 'white', file: 'designs/x.webp' })  -> SVG markup for a mug (file is optional)
 *   Tee.fit(svgElement, 'auto' | 'full' | 'chest' | 'close', aspect, animate, reserve)
 *                                                  -> frames the drawing; 'auto' shows the whole shirt when
 *                                                     the print stays readable, otherwise crops in on the chest
 */
(function () {
  'use strict';

  // Shirt colours a design can be shown on. Never pure white or pure black: both look flat on screen.
  var SHIRTS = {
    white: '#FCFCF8',
    cream: '#EDE2C4',
    blue: '#27AAE1',
    navy: '#1D2B4F',
    black: '#282624'
  };

  // Where the print sits on the chest, in the drawing's own units (the shirt is 600 wide).
  var PRINT = { x: 186, y: 126, w: 228, h: 336 };

  var BODY = 'M226 44C252 100 348 100 374 44L455 72C500 96 548 140 580 192L516 262C500 244 478 226 456 214' +
    'C452 330 454 480 458 612C360 624 240 624 142 612C146 480 148 330 144 214C122 226 100 244 84 262' +
    'L20 192C52 140 100 96 145 72Z';
  var NECK_HOLE = 'M226 44C262 30 338 30 374 44C348 100 252 100 226 44Z';

  var count = 0;

  function rgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return '#' + [0, 1, 2].map(function (i) {
      return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2);
    }).join('');
  }
  function brightness(hex) {
    var c = rgb(hex);
    return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  }
  function isDark(hex) { return brightness(hex) < 0.4; }
  function colour(shirt) {
    if (SHIRTS[shirt]) return SHIRTS[shirt];
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(shirt || '') ? shirt : SHIRTS.white;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  function svg(opts) {
    opts = opts || {};
    var fill = colour(opts.shirt);
    var dark = isDark(fill);
    var id = 'tee' + (++count);
    var line = dark ? mix(fill, '#ffffff', 0.2) : mix(fill, '#282204', 0.26);       // seams and outline
    var inside = dark ? mix(fill, '#000000', 0.42) : mix(fill, '#282204', 0.3);     // inside of the back
    var rib = dark ? mix(fill, '#ffffff', 0.07) : mix(fill, '#282204', 0.05);       // collar
    var shade = dark ? 0.3 : brightness(fill) > 0.8 ? 0.05 : 0.1;                   // darker towards the sides
    var fold = dark ? 'rgba(255,255,255,0.045)' : 'rgba(40,34,4,0.04)';

    var out = '<svg class="tee" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 660" preserveAspectRatio="xMidYMid meet"' +
      (opts.label ? ' role="img" aria-label="' + esc(opts.label) + '"' : ' aria-hidden="true"') + '>' +
      '<defs>' +
        '<linearGradient id="' + id + 'g" x1="0" x2="1" y1="0" y2="0">' +
          '<stop offset="0" stop-color="#1c1603" stop-opacity="' + (shade * 1.25).toFixed(3) + '"/>' +
          '<stop offset="0.25" stop-color="#1c1603" stop-opacity="' + shade + '"/>' +
          '<stop offset="0.4" stop-color="#1c1603" stop-opacity="0"/>' +
          '<stop offset="0.6" stop-color="#1c1603" stop-opacity="0"/>' +
          '<stop offset="0.75" stop-color="#1c1603" stop-opacity="' + shade + '"/>' +
          '<stop offset="1" stop-color="#1c1603" stop-opacity="' + (shade * 1.25).toFixed(3) + '"/>' +
        '</linearGradient>' +
        '<linearGradient id="' + id + 'h" x1="0" x2="0" y1="0" y2="1">' +
          '<stop offset="0" stop-color="#1c1603" stop-opacity="0"/>' +
          '<stop offset="0.7" stop-color="#1c1603" stop-opacity="0"/>' +
          '<stop offset="1" stop-color="#1c1603" stop-opacity="' + (shade * 0.7).toFixed(3) + '"/>' +
        '</linearGradient>' +
        '<clipPath id="' + id + 'c"><path d="' + BODY + '"/></clipPath>' +
      '</defs>' +
      // soft flat shadow on the wall
      '<path d="' + BODY + '" transform="translate(7 10)" fill="#282204" opacity="0.13"/>' +
      // inside of the back, back of the collar, neck label
      '<path d="' + NECK_HOLE + '" fill="' + inside + '"/>' +
      '<path d="M229 47C263 34 337 34 371 47" fill="none" stroke="' + rib + '" stroke-width="10"/>' +
      '<path d="M229 47C263 34 337 34 371 47" fill="none" stroke="' + line + '" stroke-width="1.2" opacity="0.5" transform="translate(0 5)"/>' +
      '<rect x="289" y="45" width="22" height="13" rx="1.5" fill="#ffffff" opacity="' + (dark ? 0.82 : 0.9) + '"/>' +
      // the shirt itself
      '<path d="' + BODY + '" fill="' + fill + '"/>' +
      '<path d="' + BODY + '" fill="url(#' + id + 'g)"/>' +
      '<path d="' + BODY + '" fill="url(#' + id + 'h)"/>' +
      '<g clip-path="url(#' + id + 'c)" fill="none" stroke-linecap="round">' +
        // soft folds from the armpits
        '<path d="M148 222C176 252 204 266 236 270" stroke="' + fold + '" stroke-width="13"/>' +
        '<path d="M452 222C424 252 396 266 364 270" stroke="' + fold + '" stroke-width="13"/>' +
        // seams and stitching
        '<g stroke="' + line + '" stroke-width="1.5" opacity="0.55">' +
          '<path d="M455 72C436 118 436 172 456 214"/><path d="M145 72C164 118 164 172 144 214"/>' +
        '</g>' +
        '<g stroke="' + line + '" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.6">' +
          '<path d="M573 186L509 256"/><path d="M27 186L91 256"/>' +
          '<path d="M142 598C240 610 360 610 458 598"/>' +
        '</g>' +
      '</g>' +
      '<path d="' + BODY + '" fill="none" stroke="' + line + '" stroke-width="2" stroke-linejoin="round"/>' +
      // front of the collar
      '<path d="M229 45C254 91 346 91 371 45" fill="none" stroke="' + line + '" stroke-width="15"/>' +
      '<path d="M229 45C254 91 346 91 371 45" fill="none" stroke="' + rib + '" stroke-width="12"/>';

    if (opts.file) {
      out += '<image href="' + esc(opts.file) + '" x="' + PRINT.x + '" y="' + PRINT.y + '" width="' + PRINT.w + '" height="' + PRINT.h +
        '" preserveAspectRatio="xMidYMin meet"/>';
    }
    return out + '</svg>';
  }

  // A plain mug, for shop items that are not shirts.
  function mug(opts) {
    opts = opts || {};
    var fill = colour(opts.shirt);
    var dark = isDark(fill);
    var line = dark ? mix(fill, '#ffffff', 0.25) : mix(fill, '#282204', 0.3);
    var inside = dark ? mix(fill, '#000000', 0.4) : mix(fill, '#282204', 0.16);
    return '<svg class="mug" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" aria-hidden="true">' +
      '<path d="M84 44h9a17 17 0 0 1 0 34h-9" fill="none" stroke="' + line + '" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M84 44h9a17 17 0 0 1 0 34h-9" fill="none" stroke="' + fill + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M24 28h62v58a10 10 0 0 1-10 10H34a10 10 0 0 1-10-10z" fill="' + fill + '" stroke="' + line + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M70 30h14v56a8 8 0 0 1-8 8h-6z" fill="#1c1603" opacity="' + (dark ? 0.25 : 0.06) + '"/>' +
      // the design on the side of the mug, when we have the artwork
      (opts.file ? '<image href="' + esc(opts.file) + '" x="28" y="39" width="46" height="50" preserveAspectRatio="xMidYMid meet"/>' : '') +
      '<ellipse cx="55" cy="28" rx="31" ry="7" fill="' + inside + '" stroke="' + line + '" stroke-width="2.4"/>' +
      '</svg>';
  }

  // aspect = picture width / height. Tall pictures are limited by the height of the print area.
  function printBox(aspect) {
    aspect = aspect > 0 ? aspect : 1;
    var w = PRINT.w, h = w / aspect;
    if (h > PRINT.h) { h = PRINT.h; w = h * aspect; }
    return { x: 300 - w / 2, y: PRINT.y, w: w, h: h };
  }

  // The part of the drawing to show, as a viewBox.
  //   full   the whole shirt
  //   chest  collar to just under the print, sleeves cropped
  //   close  the print only
  // For the close view, width and height are the space on screen in pixels, and reserve is a strip
  // along the bottom that the page covers with its "Whole shirt" button: the print stays above it.
  function frame(kind, aspect, width, height, reserve) {
    if (kind === 'chest') return [96, 18, 408, 462];
    if (kind !== 'close') return [0, 0, 600, 660];
    var b = printBox(aspect), pad = 16;
    reserve = Math.max(0, reserve || 0);
    if (!(width > 0) || !(height > reserve + 40)) return [b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2];
    var scale = Math.min(width / (b.w + pad * 2), (height - reserve) / (b.h + pad * 2));
    var vw = width / scale, vh = height / scale;
    var spare = (height - reserve) / scale - (b.h + pad * 2);      // centre the print in the free part
    return [300 - vw / 2, b.y - pad - spare / 2, vw, vh];
  }

  // Pick the framing for the space the shirt gets: the whole shirt when there is room for the print
  // to stay readable, otherwise crop in on the chest.
  function pick(width, height, aspect) {
    var scale = Math.min(width / 600, height / 660);
    return printBox(aspect).w * scale >= 200 ? 'full' : 'chest';
  }

  function fit(el, mode, aspect, animate, reserve) {
    if (!el) return;
    var kind = mode;
    var r = el.getBoundingClientRect();
    if (mode !== 'close' && mode !== 'full' && mode !== 'chest') {
      kind = r.width && r.height ? pick(r.width, r.height, aspect) : 'full';
    }
    var to = frame(kind, aspect, r.width, r.height, reserve);
    var from = (el.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    el.setAttribute('data-frame', kind);
    if (el._teeAnim) { cancelAnimationFrame(el._teeAnim); el._teeAnim = 0; }
    if (!animate || from.length !== 4 || from.some(isNaN)) { el.setAttribute('viewBox', to.join(' ')); return; }
    var start = null, dur = 320;
    function step(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
      el.setAttribute('viewBox', to.map(function (v, i) { return (from[i] + (v - from[i]) * e).toFixed(2); }).join(' '));
      el._teeAnim = t < 1 ? requestAnimationFrame(step) : 0;
    }
    el._teeAnim = requestAnimationFrame(step);
  }

  window.Tee = { SHIRTS: SHIRTS, svg: svg, mug: mug, frame: frame, fit: fit, colour: colour, isDark: isDark };
})();
