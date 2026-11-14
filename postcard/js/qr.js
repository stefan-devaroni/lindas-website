/* Small QR code generator for the postcard kiosk screen.
 *
 * Byte mode only, versions 1 to 10 (up to 213 characters at level M), error
 * correction L / M / Q / H. No dependencies, no network.
 *
 * Written for this page from the public QR code specification (ISO/IEC 18004).
 * The structure of the Reed-Solomon and format-bit routines follows the
 * well-known approach of Project Nayuki's "QR Code generator library":
 *
 *   Copyright (c) Project Nayuki. (MIT License)
 *   https://www.nayuki.io/page/qr-code-generator-library
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of
 *   this software and associated documentation files (the "Software"), to deal in
 *   the Software without restriction, including without limitation the rights to
 *   use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 *   the Software, and to permit persons to whom the Software is furnished to do so,
 *   subject to the following conditions:
 *   - The above copyright notice and this permission notice shall be included in
 *     all copies or substantial portions of the Software.
 *   - The Software is provided "as is", without warranty of any kind, express or
 *     implied, including but not limited to the warranties of merchantability,
 *     fitness for a particular purpose and noninfringement. In no event shall the
 *     authors or copyright holders be liable for any claim, damages or other
 *     liability, whether in an action of contract, tort or otherwise, arising from,
 *     out of or in connection with the Software or the use or other dealings in the
 *     Software.
 *
 * "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
 */
(function (root) {
  'use strict';

  var MAX_VERSION = 10;
  var EC_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
  var EC_FORMAT = { L: 1, M: 0, Q: 3, H: 2 };
  // Error-correction codewords per block, and number of blocks, for versions 1..10.
  var ECC_PER_BLOCK = [
    [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
    [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
    [17, 28, 22, 16, 22, 28, 26, 26, 24, 28]
  ];
  var NUM_BLOCKS = [
    [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
    [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
    [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
    [1, 1, 2, 4, 4, 4, 5, 6, 8, 8]
  ];

  // Number of modules left for data + error correction, after the fixed patterns.
  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var n = Math.floor(ver / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function rawCodewords(ver) { return Math.floor(rawModules(ver) / 8); }
  function dataCodewords(ver, ec) {
    return rawCodewords(ver) - ECC_PER_BLOCK[ec][ver - 1] * NUM_BLOCKS[ec][ver - 1];
  }

  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(String(str)));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  // Arithmetic in GF(256), reducing polynomial x^8 + x^4 + x^3 + x^2 + 1.
  var EXP = [], LOG = [];
  (function () {
    var x = 1, i;
    for (i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }

  function rsDivisor(degree) {
    var res = [], i, j, rootv = 1;
    for (i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    for (i = 0; i < degree; i++) {
      for (j = 0; j < degree; j++) {
        res[j] = mul(res[j], rootv);
        if (j + 1 < degree) res[j] ^= res[j + 1];
      }
      rootv = mul(rootv, 2);
    }
    return res;
  }
  function rsRemainder(data, divisor) {
    var res = [], i, k;
    for (i = 0; i < divisor.length; i++) res.push(0);
    for (k = 0; k < data.length; k++) {
      var factor = data[k] ^ res.shift();
      res.push(0);
      for (i = 0; i < divisor.length; i++) res[i] ^= mul(divisor[i], factor);
    }
    return res;
  }

  function alignPositions(ver) {
    if (ver === 1) return [];
    var n = Math.floor(ver / 7) + 2;
    var step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    var res = [6];
    for (var p = ver * 4 + 10; res.length < n; p -= step) res.splice(1, 0, p);
    return res;
  }

  var MASKS = [
    function (x, y) { return (x + y) % 2 === 0; },
    function (x, y) { return y % 2 === 0; },
    function (x, y) { return x % 3 === 0; },
    function (x, y) { return (x + y) % 3 === 0; },
    function (x, y) { return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
    function (x, y) { return (x * y) % 2 + (x * y) % 3 === 0; },
    function (x, y) { return ((x * y) % 2 + (x * y) % 3) % 2 === 0; },
    function (x, y) { return ((x + y) % 2 + (x * y) % 3) % 2 === 0; }
  ];

  function make(text, opts) {
    opts = opts || {};
    var ecName = opts.ec || 'M';
    var ec = EC_INDEX[ecName];
    if (ec === undefined) throw new Error('QR: unknown error correction level');
    var bytes = utf8(text);
    var ver, cap, i, j;

    for (ver = opts.minVersion || 1; ; ver++) {
      if (ver > MAX_VERSION) throw new Error('QR: text is too long for this small generator');
      cap = dataCodewords(ver, ec) * 8;
      if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= cap) break;
    }

    // --- data bit stream ---
    var bits = [];
    function put(val, len) { for (var k = len - 1; k >= 0; k--) bits.push((val >>> k) & 1); }
    put(4, 4);                                   // byte mode
    put(bytes.length, ver < 10 ? 8 : 16);
    for (i = 0; i < bytes.length; i++) put(bytes[i], 8);
    put(0, Math.min(4, cap - bits.length));      // terminator
    put(0, (8 - bits.length % 8) % 8);           // to a whole byte
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
      data.push(v);
    }

    // --- error correction, interleaved ---
    var nb = NUM_BLOCKS[ec][ver - 1], el = ECC_PER_BLOCK[ec][ver - 1];
    var raw = rawCodewords(ver);
    var numShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var blocks = [], divisor = rsDivisor(el), k = 0;
    for (i = 0; i < nb; i++) {
      var dl = shortLen - el + (i < numShort ? 0 : 1);
      var dat = data.slice(k, k + dl);
      k += dl;
      var ecc = rsRemainder(dat, divisor);
      if (i < numShort) dat.push(0);             // placeholder, skipped below
      blocks.push(dat.concat(ecc));
    }
    var codewords = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (j = 0; j < nb; j++) {
        if (i !== shortLen - el || j >= numShort) codewords.push(blocks[j][i]);
      }
    }

    // --- the grid ---
    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (i = 0; i < size; i++) {
      mod.push([]); fn.push([]);
      for (j = 0; j < size; j++) { mod[i].push(0); fn[i].push(0); }
    }
    function setF(x, y, dark) { mod[y][x] = dark ? 1 : 0; fn[y][x] = 1; }

    for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }

    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setF(x, y, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var ap = alignPositions(ver), n = ap.length;
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var ay = -2; ay <= 2; ay++) for (var ax = -2; ax <= 2; ax++) {
        setF(ap[i] + ax, ap[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
      }
    }

    function drawFormat(mask) {
      var d = (EC_FORMAT[ecName] << 3) | mask, rem = d, q;
      for (q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fb = ((d << 10) | rem) ^ 0x5412;
      function bit(b) { return (fb >>> b) & 1; }
      for (q = 0; q <= 5; q++) setF(8, q, bit(q));
      setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
      for (q = 9; q < 15; q++) setF(14 - q, 8, bit(q));
      for (q = 0; q < 8; q++) setF(size - 1 - q, 8, bit(q));
      for (q = 8; q < 15; q++) setF(8, size - 15 + q, bit(q));
      setF(8, size - 8, 1);
    }
    drawFormat(0); // reserves the format area; the real bits follow once the mask is chosen

    if (ver >= 7) {
      var vrem = ver;
      for (i = 0; i < 12; i++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | vrem;
      for (i = 0; i < 18; i++) {
        var vb = (vbits >>> i) & 1, a = size - 11 + i % 3, b = Math.floor(i / 3);
        setF(a, b, vb); setF(b, a, vb);
      }
    }

    // data modules, in the zigzag order
    var bi = 0, total = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (j = 0; j < 2; j++) {
          var x = right - j;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < total) {
            mod[y][x] = (codewords[bi >>> 3] >>> (7 - (bi & 7))) & 1;
            bi++;
          }
        }
      }
    }

    function applyMask(m) {
      for (var yy = 0; yy < size; yy++) for (var xx = 0; xx < size; xx++) {
        if (!fn[yy][xx] && MASKS[m](xx, yy)) mod[yy][xx] ^= 1;
      }
    }

    function penalty() {
      var result = 0, xx, yy, run, color, line, dark = 0;
      var P1 = '10111010000', P2 = '00001011101';
      for (var pass = 0; pass < 2; pass++) {
        for (yy = 0; yy < size; yy++) {
          line = ''; run = 0; color = -1;
          for (xx = 0; xx < size; xx++) {
            var c = pass === 0 ? mod[yy][xx] : mod[xx][yy];
            line += c;
            if (c === color) { run++; if (run === 5) result += 3; else if (run > 5) result++; }
            else { color = c; run = 1; }
          }
          for (var at = line.indexOf(P1); at !== -1; at = line.indexOf(P1, at + 1)) result += 40;
          for (at = line.indexOf(P2); at !== -1; at = line.indexOf(P2, at + 1)) result += 40;
        }
      }
      for (yy = 0; yy < size; yy++) for (xx = 0; xx < size; xx++) {
        var cc = mod[yy][xx];
        dark += cc;
        if (xx < size - 1 && yy < size - 1 && cc === mod[yy][xx + 1] && cc === mod[yy + 1][xx] && cc === mod[yy + 1][xx + 1]) result += 3;
      }
      var all = size * size;
      result += (Math.ceil(Math.abs(dark * 20 - all * 10) / all) - 1) * 10;
      return result;
    }

    var mask = opts.mask;
    if (mask === undefined || mask === null || mask < 0 || mask > 7) {
      var best = Infinity;
      for (i = 0; i < 8; i++) {
        applyMask(i); drawFormat(i);
        var p = penalty();
        if (p < best) { best = p; mask = i; }
        applyMask(i); // undo
      }
    }
    applyMask(mask);
    drawFormat(mask);

    return {
      text: String(text), version: ver, ec: ecName, mask: mask, size: size, modules: mod,
      isDark: function (qx, qy) { return qx >= 0 && qy >= 0 && qx < size && qy < size && mod[qy][qx] === 1; }
    };
  }

  // Draws the code on a canvas. `scale` is whole pixels per module, so edges stay sharp.
  function draw(canvas, qr, opts) {
    opts = opts || {};
    var scale = Math.max(1, Math.floor(opts.scale || 8));
    var quiet = opts.quiet === undefined ? 4 : opts.quiet;
    var px = (qr.size + quiet * 2) * scale;
    canvas.width = px; canvas.height = px;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = opts.light || '#FFFFFF';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = opts.dark || '#000000';
    for (var y = 0; y < qr.size; y++) for (var x = 0; x < qr.size; x++) {
      if (qr.modules[y][x]) ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    }
    return canvas;
  }

  root.PostcardQR = { make: make, draw: draw };
})(window);
