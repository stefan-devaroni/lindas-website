/*
 * Small QR code generator for the Linda's vote page.
 * Written for this page from the public QR Code standard (ISO/IEC 18004); no third-party code.
 * Byte mode only (plain UTF-8 text such as a web link), versions 1 to 40, error correction L/M/Q/H.
 *
 *   var qr = LindasQR.make('https://example.com', 'M');   // { size, version, mask, get(x, y) }
 *   var svg = LindasQR.svg('https://example.com', { level: 'M', margin: 4, dark: '#282204' });
 *
 * Checked module-for-module against the "qrcode" npm package (see work-vote/verify-qr.js,
 * which lives outside the website).
 */
(function (root) {
  'use strict';

  // Error-correction codewords per block, and number of blocks, by level then version (index 0 unused).
  var ECC_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  };
  var NUM_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  };
  var FORMAT_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  function utf8(text) {
    var out = [], i, c;
    for (i = 0; i < text.length; i++) {
      c = text.codePointAt(i);
      if (c > 0xFFFF) i++;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  // Modules left for data and error correction once the fixed patterns are taken out.
  function rawModules(ver) {
    var n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var align = Math.floor(ver / 7) + 2;
      n -= (25 * align - 10) * align - 55;
      if (ver >= 7) n -= 36;
    }
    return n;
  }
  function dataCodewords(ver, level) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[level][ver] * NUM_BLOCKS[level][ver];
  }

  // Reed-Solomon over GF(256), polynomial 0x11D.
  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(degree) {
    var poly = [], root = 1, i, j;
    for (i = 0; i < degree - 1; i++) poly.push(0);
    poly.push(1);
    for (i = 0; i < degree; i++) {
      for (j = 0; j < poly.length; j++) {
        poly[j] = gfMul(poly[j], root);
        if (j + 1 < poly.length) poly[j] ^= poly[j + 1];
      }
      root = gfMul(root, 2);
    }
    return poly;
  }
  function rsRemainder(data, divisor) {
    var rem = divisor.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ rem.shift();
      rem.push(0);
      divisor.forEach(function (coef, i) { rem[i] ^= gfMul(coef, factor); });
    });
    return rem;
  }

  function alignmentCentres(ver) {
    if (ver === 1) return [];
    var size = ver * 4 + 17;
    var count = Math.floor(ver / 7) + 2;
    var step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (count * 2 - 2)) * 2;
    var out = [6];
    for (var pos = size - 7; out.length < count; pos -= step) out.splice(1, 0, pos);
    return out;
  }

  function maskBit(mask, x, y) {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return (x * y) % 2 + (x * y) % 3 === 0;
      case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
      default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    }
  }

  function make(text, level, opts) {
    level = level || 'M';
    opts = opts || {};
    if (!ECC_PER_BLOCK[level]) throw new Error('QR: unknown error correction level ' + level);
    var bytes = utf8(String(text));

    // 1. Smallest version that fits.
    var ver, capacity;
    for (ver = opts.minVersion || 1; ; ver++) {
      if (ver > 40) throw new Error('QR: text too long');
      capacity = dataCodewords(ver, level) * 8;
      if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= capacity) break;
    }
    var size = ver * 4 + 17;

    // 2. Bit stream: mode, length, data, terminator, padding.
    var bits = [];
    function push(value, len) { for (var i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1); }
    push(4, 4);
    push(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { push(b, 8); });
    push(0, Math.min(4, capacity - bits.length));
    push(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < capacity; pad ^= 0xEC ^ 0x11) push(pad, 8);
    var data = [];
    for (var b = 0; b < bits.length; b += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[b + k];
      data.push(v);
    }

    // 3. Split into blocks, add error correction, interleave.
    var numBlocks = NUM_BLOCKS[level][ver];
    var eccLen = ECC_PER_BLOCK[level][ver];
    var rawCodewords = Math.floor(rawModules(ver) / 8);
    var numShort = numBlocks - rawCodewords % numBlocks;
    var shortLen = Math.floor(rawCodewords / numBlocks);
    var divisor = rsDivisor(eccLen);
    var blocks = [], offset = 0, i, j;
    for (i = 0; i < numBlocks; i++) {
      var dat = data.slice(offset, offset + shortLen - eccLen + (i < numShort ? 0 : 1));
      offset += dat.length;
      var ecc = rsRemainder(dat, divisor);
      if (i < numShort) dat.push(0); // placeholder, skipped below
      blocks.push(dat.concat(ecc));
    }
    var codewords = [];
    for (i = 0; i < blocks[0].length; i++) {
      for (j = 0; j < blocks.length; j++) {
        if (i !== shortLen - eccLen || j >= numShort) codewords.push(blocks[j][i]);
      }
    }

    // 4. Fixed patterns.
    var mod = [], fixed = [], x, y;
    for (y = 0; y < size; y++) { mod.push(new Array(size).fill(false)); fixed.push(new Array(size).fill(false)); }
    function set(px, py, dark) { mod[py][px] = !!dark; fixed[py][px] = true; }

    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }

    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) {
        for (var dx = -4; dx <= 4; dx++) {
          var d = Math.max(Math.abs(dx), Math.abs(dy));
          var px = cx + dx, py = cy + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) set(px, py, d !== 2 && d !== 4);
        }
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var centres = alignmentCentres(ver), n = centres.length;
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        for (var ay = -2; ay <= 2; ay++) {
          for (var ax = -2; ax <= 2; ax++) set(centres[i] + ax, centres[j] + ay, Math.max(Math.abs(ax), Math.abs(ay)) !== 1);
        }
      }
    }

    function drawFormat(mask) {
      var d = (FORMAT_BITS[level] << 3) | mask, rem = d, q;
      for (q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var f = ((d << 10) | rem) ^ 0x5412;
      function bit(p) { return ((f >>> p) & 1) !== 0; }
      for (q = 0; q <= 5; q++) set(8, q, bit(q));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (q = 9; q < 15; q++) set(14 - q, 8, bit(q));
      for (q = 0; q < 8; q++) set(size - 1 - q, 8, bit(q));
      for (q = 8; q < 15; q++) set(8, size - 15 + q, bit(q));
      set(8, size - 8, true);
    }
    drawFormat(0); // reserves the cells; the real bits are drawn once the mask is chosen

    if (ver >= 7) {
      var vrem = ver;
      for (i = 0; i < 12; i++) vrem = (vrem << 1) ^ ((vrem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | vrem;
      for (i = 0; i < 18; i++) {
        var vb = ((vbits >>> i) & 1) !== 0, a = size - 11 + i % 3, c = Math.floor(i / 3);
        set(a, c, vb); set(c, a, vb);
      }
    }

    // 5. Data, in the two-column zigzag from the bottom right.
    var bitIndex = 0, total = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (j = 0; j < 2; j++) {
          x = right - j;
          var upward = ((right + 1) & 2) === 0;
          y = upward ? size - 1 - vert : vert;
          if (!fixed[y][x] && bitIndex < total) {
            mod[y][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            bitIndex++;
          }
        }
      }
    }

    // 6. Masking: try all eight, keep the one a scanner will like best.
    function applyMask(mask) {
      for (var my = 0; my < size; my++) {
        for (var mx = 0; mx < size; mx++) {
          if (!fixed[my][mx] && maskBit(mask, mx, my)) mod[my][mx] = !mod[my][mx];
        }
      }
    }
    function penalty() {
      var score = 0, dark = 0, px, py, run, last, windowBits;
      for (var pass = 0; pass < 2; pass++) {
        for (py = 0; py < size; py++) {
          run = 0; last = null; windowBits = 0;
          for (px = 0; px < size; px++) {
            var cell = pass === 0 ? mod[py][px] : mod[px][py];
            if (cell === last) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
            else { last = cell; run = 1; }
            windowBits = ((windowBits << 1) & 0x7FF) | (cell ? 1 : 0);
            if (px >= 10 && (windowBits === 0x5D0 || windowBits === 0x05D)) score += 40;
            if (pass === 0 && cell) dark++;
          }
        }
      }
      for (py = 0; py < size - 1; py++) {
        for (px = 0; px < size - 1; px++) {
          var c0 = mod[py][px];
          if (c0 === mod[py][px + 1] && c0 === mod[py + 1][px] && c0 === mod[py + 1][px + 1]) score += 3;
        }
      }
      score += Math.abs(Math.ceil(dark * 100 / (size * size) / 5) - 10) * 10;
      return score;
    }

    var best = opts.mask, bestScore = Infinity;
    if (best == null) {
      for (var m = 0; m < 8; m++) {
        applyMask(m); drawFormat(m);
        var s = penalty();
        if (s < bestScore) { bestScore = s; best = m; }
        applyMask(m); // XOR again to undo
      }
    }
    applyMask(best); drawFormat(best);

    return {
      size: size, version: ver, level: level, mask: best, modules: mod,
      get: function (gx, gy) { return gx >= 0 && gy >= 0 && gx < size && gy < size && mod[gy][gx]; }
    };
  }

  // SVG markup: one path, crisp edges, quiet zone included.
  function svg(text, opts) {
    opts = opts || {};
    var qr = make(text, opts.level || 'M');
    var margin = opts.margin == null ? 4 : opts.margin;
    var full = qr.size + margin * 2, d = '', x, y, start;
    for (y = 0; y < qr.size; y++) {
      for (x = 0; x < qr.size; x++) {
        if (!qr.modules[y][x]) continue;
        start = x;
        while (x + 1 < qr.size && qr.modules[y][x + 1]) x++;
        d += 'M' + (start + margin) + ' ' + (y + margin) + 'h' + (x - start + 1) + 'v1h-' + (x - start + 1) + 'z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + full + ' ' + full + '" shape-rendering="crispEdges"' +
      (opts.label ? ' role="img" aria-label="' + String(opts.label).replace(/[&<>"]/g, '') + '"' : ' aria-hidden="true"') + '>' +
      '<rect width="' + full + '" height="' + full + '" fill="' + (opts.light || '#ffffff') + '"/>' +
      '<path d="' + d + '" fill="' + (opts.dark || '#282204') + '"/></svg>';
  }

  var api = { make: make, svg: svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LindasQR = api;
})(typeof window !== 'undefined' ? window : this);
