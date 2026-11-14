/* Linda's Dutch Pancakes — Aruba photo postcard.
   Everything runs in the guest's browser. The photo is never uploaded: it is
   read into a canvas on the phone, framed there, and saved or shared from there.

   Screens: start -> camera -> decorate -> done.  ?kiosk=1 shows the big-screen
   display (examples + QR code) instead; that mode never touches a camera.

   Testing hooks: window.__postcard (see the end of this file). */
(function () {
  'use strict';

  var LANG = 'en';
  var S = window.POSTCARD_STRINGS[LANG];
  var Frames = window.PostcardFrames;
  var Sample = window.PostcardSample;
  var QR = window.PostcardQR;

  var SITE_URL = 'https://lindas-aruba.com/postcard/';   // what the kiosk QR code opens
  var SIZES = { post: { w: 1080, h: 1350 }, story: { w: 1080, h: 1920 } };
  var MAX_EDGE = 2400;      // long edge of the working copy; a 12 MP photo is scaled down to this
  var JPEG_QUALITY = 0.92;
  var ZOOM_MAX = 4;
  var BLEED = 2;            // the photo runs this far under the frame, so no hairline shows
  var COUNT_MS = 850;       // one beat of the 3-2-1
  var CREAM = '#F1EAD1';
  // 2x1 pixel JPEG tagged "rotate 90 degrees": tells us whether this browser turns photos upright by itself.
  var EXIF_PROBE = 'data:image/jpeg;base64,/9j/4QC8RXhpZgAASUkqAAgAAAAGABIBAwABAAAABgAAABoBBQABAAAAVgAAABsBBQABAAAAXgAAACgBAwABAAAAAgAAABMCAwABAAAAAQAAAGmHBAABAAAAZgAAAAAAAAA4YwAA6AMAADhjAADoAwAABgAAkAcABAAAADAyMTABkQcABAAAAAECAwAAoAcABAAAADAxMDABoAMAAQAAAP//AAACoAQAAQAAAAIAAAADoAQAAQAAAAEAAAAAAAAA/9sAQwAQCwwODAoQDg0OEhEQExgoGhgWFhgxIyUdKDozPTw5Mzg3QEhcTkBEV0U3OFBtUVdfYmdoZz5NcXlwZHhcZWdj/9sAQwEREhIYFRgvGhovY0I4QmNjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2Nj/8AAEQgAAQACAwEiAAIRAQMRAf/EABQAAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AAAP/9k=';

  var query = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (p) {
    var kv = p.split('='); if (kv[0]) query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
  });

  var state = {
    lang: LANG,
    ready: false,
    kiosk: query.kiosk === '1',
    screen: 'start',
    frame: Frames.list[0].id,
    size: 'post',
    photo: null,                                   // { w, h, source, ... } once there is a picture
    view: { zoom: 1, dx: 0, dy: 0, flip: false },  // how the photo sits in the frame
    camera: { status: 'off', facing: 'user', mirrored: true, canSwitch: false, error: null, countdown: 0 },
    output: null,                                  // { width, height, bytes, type, name } of the finished picture
    canShareFiles: false,
    exifAutoRotate: null,
    fonts: { olivier: false, telegrafico: false },
    lastError: null
  };

  var assets = { logoBlue: null, logoWhite: null, stickers: {} };
  var photo = null;      // { canvas, w, h, small: { canvas, w, h } }
  var output = null;     // { blob, url, file, name }
  var stream = null, camToken = 0, countTimer = null, resumeCamera = false;
  var readyPromise;

  function $(id) { return document.getElementById(id); }
  function noop() {}
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wait(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function release(c) { if (c) { c.width = 0; c.height = 0; } }
  function frameIndex() { for (var i = 0; i < Frames.list.length; i++) if (Frames.list[i].id === state.frame) return i; return 0; }
  function reducedMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function isIOS() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }

  /* ---------- text ---------- */

  function applyStrings() {
    document.documentElement.lang = LANG;
    document.title = S.pageTitle;
    var i, list = document.querySelectorAll('[data-t]');
    for (i = 0; i < list.length; i++) list[i].textContent = S[list[i].getAttribute('data-t')] || '';
    list = document.querySelectorAll('[data-t-aria]');
    for (i = 0; i < list.length; i++) list[i].setAttribute('aria-label', S[list[i].getAttribute('data-t-aria')] || '');
    list = document.querySelectorAll('[data-t-alt]');
    for (i = 0; i < list.length; i++) list[i].setAttribute('alt', S[list[i].getAttribute('data-t-alt')] || '');
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4200);
  }
  function busy(on, msg) {
    var el = $('busy');
    el.hidden = !on;
    if (on) $('busyText').textContent = msg || '';
  }

  /* ---------- fonts and pictures the frames need ---------- */

  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var jobs = [
      document.fonts.load('48px "Olivier"', 'Greetings from Aruba 2001'),
      document.fonts.load('32px "Telegrafico"', 'PALM BEACH ARUBA')
    ];
    return Promise.race([Promise.all(jobs).catch(noop), wait(6000)]).then(function () {
      try {
        state.fonts.olivier = document.fonts.check('48px "Olivier"');
        state.fonts.telegrafico = document.fonts.check('32px "Telegrafico"');
      } catch (e) { /* older browser: leave as false */ }
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  // The logo file has empty space around the artwork; find the artwork so it can be placed by eye.
  function prepLogo(img, tint) {
    if (!img) return null;
    var w = img.naturalWidth, h = img.naturalHeight, box = { x: 0, y: 0, w: w, h: h };
    try {
      var sc = 0.25, sw = Math.round(w * sc), sh = Math.round(h * sc), cv = makeCanvas(sw, sh), c = cv.getContext('2d');
      c.drawImage(img, 0, 0, sw, sh);
      var d = c.getImageData(0, 0, sw, sh).data, x0 = sw, y0 = sh, x1 = -1, y1 = -1, x, y;
      for (y = 0; y < sh; y++) for (x = 0; x < sw; x++) {
        if (d[(y * sw + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 >= x0 && y1 >= y0) box = { x: x0 / sc, y: y0 / sc, w: (x1 - x0 + 1) / sc, h: (y1 - y0 + 1) / sc };
      release(cv);
    } catch (e) { /* keep the full box */ }
    var out = img;
    if (tint) {
      out = makeCanvas(w, h);
      var t = out.getContext('2d');
      t.drawImage(img, 0, 0);
      t.globalCompositeOperation = 'source-in';
      t.fillStyle = tint; t.fillRect(0, 0, w, h);
    }
    return { img: out, w: w, h: h, box: box };
  }

  function loadAssets() {
    var names = ['greetings', 'badge', 'iguana', 'powered'];
    var jobs = [loadImage('../assets/logos/logo-blue.png').then(function (img) {
      assets.logoBlue = prepLogo(img, null);
      assets.logoWhite = prepLogo(img, '#FFFFFF');
    })];
    names.forEach(function (n) {
      jobs.push(loadImage('stickers/' + n + '.webp').then(function (img) { assets.stickers[n] = img; }));
    });
    return Promise.all(jobs);
  }

  function arubaDate() {
    var d = new Date(Date.now() - 4 * 3600 * 1000); // Aruba is UTC-4 all year
    return { day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
  }
  function env(k) { return { s: S, assets: assets, date: arubaDate(), k: k || 1 }; }

  var sampleCache = {};
  function sample(variant) {
    variant = variant || 'day';
    if (!sampleCache[variant]) {
      var cv = makeCanvas(900, 1200);
      Sample.draw(cv.getContext('2d'), 900, 1200, variant);
      sampleCache[variant] = { canvas: cv, w: 900, h: 1200 };
    }
    return sampleCache[variant];
  }

  /* ---------- drawing the postcard ---------- */

  function placement(win, src, view) {
    var bw = win.w + BLEED * 2, bh = win.h + BLEED * 2;
    var sc = Math.max(bw / src.w, bh / src.h) * view.zoom;
    var dw = src.w * sc, dh = src.h * sc;
    var maxX = Math.max(0, (dw - bw) / 2), maxY = Math.max(0, (dh - bh) / 2);
    var ox = clamp(view.dx * win.w, -maxX, maxX), oy = clamp(view.dy * win.h, -maxY, maxY);
    return { cx: win.x + win.w / 2 + ox, cy: win.y + win.h / 2 + oy, dw: dw, dh: dh, maxX: maxX, maxY: maxY, ox: ox, oy: oy };
  }

  function drawPhoto(ctx, W, H, frame, src, view) {
    var win = frame.window(W, H);
    ctx.save();
    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);
    if (src) {
      ctx.beginPath(); ctx.rect(win.x - BLEED, win.y - BLEED, win.w + BLEED * 2, win.h + BLEED * 2); ctx.clip();
      var p = placement(win, src, view);
      ctx.imageSmoothingEnabled = true;
      try { ctx.imageSmoothingQuality = 'high'; } catch (e) { /* not everywhere */ }
      ctx.translate(p.cx, p.cy);
      if (view.flip) ctx.scale(-1, 1);
      ctx.drawImage(src.canvas, -p.dw / 2, -p.dh / 2, p.dw, p.dh);
    }
    ctx.restore();
  }

  // opts: { frame, src, view, k }.  ctx is already scaled so that the picture is W x H units.
  function composite(ctx, W, H, opts) {
    var frame = Frames.byId[opts.frame] || Frames.list[0];
    drawPhoto(ctx, W, H, frame, opts.src, opts.view || { zoom: 1, dx: 0, dy: 0, flip: false });
    ctx.save();
    frame.draw(ctx, W, H, env(opts.k || 1));
    ctx.restore();
  }

  function paintFrameOnly(canvas, frameId, sizeKey) {
    var sz = SIZES[sizeKey];
    if (canvas.width !== sz.w || canvas.height !== sz.h) { canvas.width = sz.w; canvas.height = sz.h; }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, sz.w, sz.h);
    ctx.save();
    Frames.byId[frameId].draw(ctx, sz.w, sz.h, env(1));
    ctx.restore();
  }

  function clampView() {
    if (!photo) return;
    var sz = SIZES[state.size], win = Frames.byId[state.frame].window(sz.w, sz.h);
    state.view.zoom = clamp(state.view.zoom, 1, ZOOM_MAX);
    var p = placement(win, photo, state.view);
    state.view.dx = p.ox / win.w; state.view.dy = p.oy / win.h;
    return p;
  }

  /* ---------- the photo ---------- */

  function setPhoto(canvas, meta) {
    if (photo && photo.canvas !== canvas) { release(photo.canvas); release(photo.small.canvas); }
    var sc = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
    var sm = makeCanvas(Math.max(1, Math.round(canvas.width * sc)), Math.max(1, Math.round(canvas.height * sc)));
    var c = sm.getContext('2d');
    try { c.imageSmoothingQuality = 'high'; } catch (e) { /* fine */ }
    c.drawImage(canvas, 0, 0, sm.width, sm.height);
    photo = { canvas: canvas, w: canvas.width, h: canvas.height, small: { canvas: sm, w: sm.width, h: sm.height } };
    state.photo = { w: canvas.width, h: canvas.height };
    for (var k in meta) if (Object.prototype.hasOwnProperty.call(meta, k)) state.photo[k] = meta[k];
    state.view = { zoom: 1, dx: 0, dy: 0, flip: false };
    dropOutput();
  }

  function dropOutput() {
    if (output && output.url) URL.revokeObjectURL(output.url);
    output = null; state.output = null;
  }

  var exifProbe = null;
  function exifAutoRotates() {
    if (!exifProbe) {
      exifProbe = loadImage(EXIF_PROBE).then(function (img) {
        // The probe is stored 2 wide, 1 tall. A browser that honours the tag reports 1 wide, 2 tall.
        state.exifAutoRotate = !!(img && img.naturalWidth === 1 && img.naturalHeight === 2);
        return state.exifAutoRotate;
      });
    }
    return exifProbe;
  }

  // Finds the EXIF "orientation" entry of a JPEG: { value, offset, little }, or null if there is none.
  function findOrientation(buf) {
    try {
      var v = new DataView(buf), p = 2, n, i, e;
      if (v.byteLength < 4 || v.getUint16(0) !== 0xFFD8) return null;
      while (p + 4 <= v.byteLength) {
        if (v.getUint8(p) !== 0xFF) return null;
        var marker = v.getUint8(p + 1);
        if (marker === 0xDA || marker === 0xD9) return null;
        var len = v.getUint16(p + 2);
        if (marker === 0xE1 && p + 18 <= v.byteLength && v.getUint32(p + 4) === 0x45786966 && v.getUint16(p + 8) === 0) {
          var t = p + 10, bo = v.getUint16(t), little = bo === 0x4949;
          if (!little && bo !== 0x4D4D) return null;
          var ifd = t + v.getUint32(t + 4, little);
          if (ifd + 2 > v.byteLength) return null;
          n = v.getUint16(ifd, little);
          for (i = 0; i < n; i++) {
            e = ifd + 2 + i * 12;
            if (e + 12 > v.byteLength) return null;
            if (v.getUint16(e, little) === 0x0112) {
              var o = v.getUint16(e + 8, little);
              return { value: o >= 1 && o <= 8 ? o : 1, offset: e + 8, little: little };
            }
          }
          return null;
        }
        p += 2 + len;
      }
    } catch (err) { /* treat as upright */ }
    return null;
  }
  function parseOrientation(buf) {
    var f = findOrientation(buf);
    return f ? f.value : 1;
  }

  function readBytes(file, count) {
    return new Promise(function (resolve) {
      try {
        var fr = new FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { resolve(null); };
        fr.readAsArrayBuffer(file.slice(0, count));
      } catch (e) { resolve(null); }
    });
  }
  function readOrientation(file) {
    return readBytes(file, 262144).then(function (buf) { return buf ? parseOrientation(buf) : 1; });
  }
  // Testing only: a copy of the file whose tag says "upright", so the browser leaves the pixels
  // alone and the page's own rotation (for browsers that do not rotate photos) can be checked.
  function withoutOrientation(file) {
    return readBytes(file, file.size).then(function (buf) {
      var f = buf && findOrientation(buf);
      if (!f) return file;
      new DataView(buf).setUint16(f.offset, 1, f.little);
      return new Blob([buf], { type: file.type });
    });
  }

  // Canvas transform that turns a stored photo upright. cw x ch is the upright size.
  function applyOrientation(ctx, o, cw, ch) {
    switch (o) {
      case 2: ctx.transform(-1, 0, 0, 1, cw, 0); break;
      case 3: ctx.transform(-1, 0, 0, -1, cw, ch); break;
      case 4: ctx.transform(1, 0, 0, -1, 0, ch); break;
      case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
      case 6: ctx.transform(0, 1, -1, 0, cw, 0); break;
      case 7: ctx.transform(0, -1, -1, 0, cw, ch); break;
      case 8: ctx.transform(0, -1, 1, 0, 0, ch); break;
      default: break;
    }
  }

  // Decodes a picture file into a canvas no larger than MAX_EDGE, upright.
  // manualOrientation is 1 when the browser has already turned the photo upright.
  function decodeToCanvas(file, manualOrientation) {
    var url = URL.createObjectURL(file), img = new Image();
    function cleanup() { img.onload = img.onerror = null; URL.revokeObjectURL(url); img.removeAttribute('src'); }
    return new Promise(function (resolve, reject) {
      img.onload = resolve;
      img.onerror = function () { reject(new Error('This file is not a picture the browser can open.')); };
      img.src = url;
    }).then(function () {
      return img.decode ? img.decode().catch(noop) : null;
    }).then(function () {
      var sw = img.naturalWidth, sh = img.naturalHeight;
      if (!sw || !sh) throw new Error('The picture is empty.');
      var swap = manualOrientation >= 5;
      var ow = swap ? sh : sw, oh = swap ? sw : sh;
      var sc = Math.min(1, MAX_EDGE / Math.max(ow, oh));
      var cw = Math.max(1, Math.round(ow * sc)), ch = Math.max(1, Math.round(oh * sc));
      var cv = makeCanvas(cw, ch), ctx = cv.getContext('2d');
      if (!ctx) throw new Error('No canvas available.');
      try { ctx.imageSmoothingQuality = 'high'; } catch (e) { /* fine */ }
      applyOrientation(ctx, manualOrientation, cw, ch);
      ctx.drawImage(img, 0, 0, swap ? ch : cw, swap ? cw : ch);
      var info = { canvas: cv, originalW: ow, originalH: oh };
      cleanup();
      return info;
    }, function (err) { cleanup(); throw err; });
  }

  // opts.forceManual (testing only) runs the path for browsers that do not turn photos upright themselves.
  function loadFile(file, opts) {
    opts = opts || {};
    if (!file) return Promise.reject(new Error('No file.'));
    busy(true, S.loadingPhoto);
    state.lastError = null;
    return Promise.all([readOrientation(file), exifAutoRotates()]).then(function (r) {
      var orientation = r[0], auto = r[1] && !opts.forceManual;
      var source = opts.forceManual ? withoutOrientation(file) : Promise.resolve(file);
      return source.then(function (f) { return decodeToCanvas(f, auto ? 1 : orientation); }).then(function (info) {
        setPhoto(info.canvas, {
          source: 'file', exifOrientation: orientation, rotatedBy: auto ? 'browser' : 'page',
          originalW: info.originalW, originalH: info.originalH, fileType: file.type || '', fileBytes: file.size || 0
        });
        busy(false);
        if (!opts.stay) go('decorate');
        return state.photo;
      });
    }).catch(function (err) {
      busy(false);
      state.lastError = String((err && err.message) || err);
      toast(S.photoError);
      throw err;
    });
  }

  function onFileInput(ev) {
    var input = ev.target, file = input.files && input.files[0];
    if (file) loadFile(file).catch(noop);
    input.value = ''; // so the same picture can be picked again
  }

  /* ---------- screens ---------- */

  var screens = {};
  function go(screen, opts) {
    opts = opts || {};
    if (state.kiosk) return;
    if ((screen === 'decorate' || screen === 'done') && !photo) screen = 'start';
    var prev = state.screen;
    if (prev === 'camera' && screen !== 'camera') stopCamera();
    if (prev === 'start' && screen !== 'start') stopExamples();
    state.screen = screen;
    document.body.setAttribute('data-screen', screen);
    for (var name in screens) screens[name].hidden = name !== screen;
    if (!opts.fromHistory && prev !== screen) {
      try { history.pushState({ screen: screen }, ''); } catch (e) { /* e.g. file: pages */ }
    }
    window.scrollTo(0, 0);
    if (screen === 'start') startExamples();
    if (screen === 'camera') enterCamera();
    if (screen === 'decorate') enterDecorate();
    if (screen === 'done') enterDone();
    var h = screens[screen].querySelector('[data-focus]');
    if (h && prev !== screen) { try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
  }

  function setAppHeight() {
    document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
  }

  // Makes a box as large as its wrapper allows while keeping the picture's shape.
  function fitBox(wrap, box, ratio, share) {
    var cs = window.getComputedStyle(wrap);
    var aw = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var ah = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(aw > 0) || !(ah > 0)) return;
    var w = Math.floor(Math.min(aw * (share || 1), ah * ratio));
    box.style.width = w + 'px';
    box.style.height = Math.floor(w / ratio) + 'px';
  }
  function fitStages() {
    var sz = SIZES[state.size], ratio = sz.w / sz.h;
    if (state.screen === 'start') fitBox($('exampleWrap'), $('exampleCard'), 0.8, 0.84);
    if (state.screen === 'camera') fitBox($('camWrap'), $('camStage'), ratio);
    if (state.screen === 'decorate') fitBox($('editWrap'), $('editStage'), ratio);
  }

  /* ---------- start screen ---------- */

  var exTimer = null, exIndex = 0, exFront = 0;
  function paintExample(canvas, frameId, variant, pxW) {
    var W = 1080, H = 1350, k = pxW / W;
    canvas.width = pxW; canvas.height = Math.round(H * k);
    var ctx = canvas.getContext('2d');
    ctx.save(); ctx.scale(k, k);
    composite(ctx, W, H, { frame: frameId, src: sample(variant), k: k });
    ctx.restore();
  }
  function startExamples() {
    var a = $('exampleA'), b = $('exampleB');
    stopExamples();
    fitStages();
    exIndex = 0; exFront = 0;
    paintExample(a, Frames.list[0].id, 'day', 648);
    a.classList.add('show'); b.classList.remove('show');
    if (reducedMotion()) return;
    exTimer = setInterval(function () {
      if (document.hidden) return;
      exIndex = (exIndex + 1) % Frames.list.length;
      var back = exFront ? a : b, front = exFront ? b : a;
      paintExample(back, Frames.list[exIndex].id, 'day', 648);
      back.classList.add('show'); front.classList.remove('show');
      exFront = exFront ? 0 : 1;
    }, 3400);
  }
  function stopExamples() { if (exTimer) { clearInterval(exTimer); exTimer = null; } }

  /* ---------- camera ---------- */

  function cameraSupported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }

  function stopTracks(st) {
    if (!st) return;
    try { st.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* already gone */ }
  }
  function stopCamera() {
    camToken++;
    cancelCountdown();
    stopTracks(stream); stream = null;
    var v = $('video');
    try { v.pause(); } catch (e) { /* fine */ }
    v.srcObject = null;
    state.camera.status = 'off';
    updateCameraUI();
  }

  function cameraFailed(reason) {
    stopTracks(stream); stream = null;
    state.camera.status = 'failed'; state.camera.error = reason;
    updateCameraUI();
  }

  function startCamera(facing) {
    stopCamera();
    state.camera.status = 'starting'; state.camera.error = null;
    updateCameraUI();
    if (!cameraSupported()) { cameraFailed('unsupported'); return Promise.resolve(false); }
    var token = ++camToken;
    var wanted = { audio: false, video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } } };
    return navigator.mediaDevices.getUserMedia(wanted).then(function (st) {
      if (token !== camToken || state.screen !== 'camera') { stopTracks(st); return false; }
      stream = st;
      var track = st.getVideoTracks()[0], set = (track && track.getSettings) ? track.getSettings() : {};
      // Laptop webcams report no direction: treat them like a selfie camera.
      state.camera.facing = (set.facingMode || facing) === 'environment' ? 'environment' : 'user';
      state.camera.mirrored = state.camera.facing !== 'environment';
      if (track) track.onended = function () { if (stream === st) cameraFailed('unavailable'); };
      var v = $('video');
      v.srcObject = st;
      v.classList.toggle('mirrored', state.camera.mirrored);
      return Promise.resolve(v.play()).catch(noop).then(function () {
        if (token !== camToken) return false;
        state.camera.status = 'live';
        updateCameraUI();
        countCameras();
        return true;
      });
    }).catch(function (err) {
      if (token !== camToken) return false;
      var name = err && err.name;
      cameraFailed(name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError' ? 'denied' : 'unavailable');
      return false;
    });
  }

  function countCameras() {
    if (!navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function (list) {
      var n = list.filter(function (d) { return d.kind === 'videoinput'; }).length;
      state.camera.canSwitch = n > 1;
      updateCameraUI();
    }).catch(noop);
  }

  function updateCameraUI() {
    var c = state.camera, scr = screens.camera;
    if (!scr) return;
    scr.setAttribute('data-cam', c.status);
    $('camFallback').hidden = c.status !== 'failed';
    $('camStatus').hidden = c.status !== 'starting';
    $('btnShutter').disabled = c.status !== 'live';
    $('btnSwitch').hidden = !(c.status === 'live' && c.canSwitch);
    if (c.status === 'failed') {
      $('camFallbackText').textContent = c.error === 'denied' ? S.noCameraDenied : S.noCameraMissing;
    }
    $('btnShutter').setAttribute('aria-label', countTimer ? S.cancelCountdown : S.shutter);
  }

  function layoutVideo() {
    var sz = SIZES[state.size], win = Frames.byId[state.frame].window(sz.w, sz.h), v = $('video');
    v.style.left = (win.x / sz.w * 100) + '%';
    v.style.top = (win.y / sz.h * 100) + '%';
    v.style.width = (win.w / sz.w * 100) + '%';
    v.style.height = (win.h / sz.h * 100) + '%';
  }

  function paintCameraFrame() {
    paintFrameOnly($('camFrame'), state.frame, state.size);
    layoutVideo();
    $('camFrameName').textContent = S['frame_' + state.frame] || '';
  }

  function enterCamera() {
    fitStages();
    paintCameraFrame();
    startCamera(state.camera.facing === 'environment' ? 'environment' : 'user');
  }

  function cancelCountdown() {
    if (countTimer) { clearInterval(countTimer); countTimer = null; }
    state.camera.countdown = 0;
    var el = $('countdown');
    if (el) { el.textContent = ''; el.classList.remove('show'); }
    if (screens.camera) screens.camera.classList.remove('counting');
  }

  function shutter() {
    if (state.camera.status !== 'live') return;
    if (countTimer) { cancelCountdown(); updateCameraUI(); return; }
    var n = 3, el = $('countdown');
    function show() {
      state.camera.countdown = n;
      el.textContent = String(n);
      el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    }
    screens.camera.classList.add('counting');
    show();
    countTimer = setInterval(function () {
      n--;
      if (n > 0) { show(); return; }
      cancelCountdown();
      capture();
    }, COUNT_MS);
    updateCameraUI();
  }

  function capture() {
    var v = $('video'), vw = v.videoWidth, vh = v.videoHeight;
    if (state.camera.status !== 'live' || !vw || !vh) return false;
    var sc = Math.min(1, MAX_EDGE / Math.max(vw, vh));
    var cv = makeCanvas(Math.round(vw * sc), Math.round(vh * sc)), ctx = cv.getContext('2d');
    // Keep the picture the way the guest saw it: a selfie stays mirrored. "Mirror" in the editor turns it back.
    if (state.camera.mirrored) { ctx.translate(cv.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, cv.width, cv.height);
    var fl = $('flash');
    fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { /* no buzz, no problem */ }
    state.camera.status = 'captured'; // the shutter is done for this visit
    updateCameraUI();
    setPhoto(cv, { source: 'camera', facing: state.camera.facing, mirrored: state.camera.mirrored });
    // let the white flash show for a moment, then move on (this also stops the camera)
    setTimeout(function () { if (state.screen === 'camera') go('decorate'); }, reducedMotion() ? 0 : 200);
    return true;
  }

  function switchCamera() {
    if (state.camera.status !== 'live') return;
    startCamera(state.camera.facing === 'user' ? 'environment' : 'user');
  }

  /* ---------- decorate ---------- */

  var thumbTimer = null, photoPaintQueued = false;

  function paintEditorPhoto() {
    if (photoPaintQueued) return;
    photoPaintQueued = true;
    requestAnimationFrame(function () {
      photoPaintQueued = false;
      if (!photo || state.screen !== 'decorate') return;
      var sz = SIZES[state.size], cv = $('editPhoto');
      if (cv.width !== sz.w || cv.height !== sz.h) { cv.width = sz.w; cv.height = sz.h; }
      drawPhoto(cv.getContext('2d'), sz.w, sz.h, Frames.byId[state.frame], photo, state.view);
    });
  }
  function paintEditorFrame() { paintFrameOnly($('editFrame'), state.frame, state.size); }

  function buildThumbs() {
    var box = $('thumbs');
    box.innerHTML = '';
    Frames.list.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'thumb'; b.setAttribute('data-frame', f.id);
      var c = makeCanvas(132, 165); c.setAttribute('aria-hidden', 'true');
      var name = document.createElement('span'); name.textContent = S['frame_' + f.id] || f.id;
      b.appendChild(c); b.appendChild(name);
      b.addEventListener('click', function () { setFrame(f.id); });
      box.appendChild(b);
    });
  }
  function paintThumbs() {
    if (!photo) return;
    var nodes = $('thumbs').querySelectorAll('.thumb'), W = 1080, H = 1350, i;
    for (i = 0; i < nodes.length; i++) {
      var cv = nodes[i].querySelector('canvas'), k = cv.width / W, ctx = cv.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.scale(k, k);
      composite(ctx, W, H, { frame: nodes[i].getAttribute('data-frame'), src: photo.small, view: state.view, k: k });
      ctx.restore();
    }
  }
  function paintThumbsSoon() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(paintThumbs, 280);
  }

  function updateDecorateUI() {
    var nodes = $('thumbs').querySelectorAll('.thumb'), i, on;
    for (i = 0; i < nodes.length; i++) {
      on = nodes[i].getAttribute('data-frame') === state.frame;
      nodes[i].classList.toggle('on', on);
      nodes[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on && state.screen === 'decorate' && nodes[i].scrollIntoView) {
        try { nodes[i].scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* older browsers */ }
      }
    }
    $('sizePost').setAttribute('aria-pressed', state.size === 'post' ? 'true' : 'false');
    $('sizeStory').setAttribute('aria-pressed', state.size === 'story' ? 'true' : 'false');
    $('btnFlip').setAttribute('aria-pressed', state.view.flip ? 'true' : 'false');
    var p = clampView();
    if (!p) return;
    var e = 0.5;
    $('btnZoomOut').disabled = state.view.zoom <= 1.001;
    $('btnZoomIn').disabled = state.view.zoom >= ZOOM_MAX - 0.001;
    $('btnLeft').disabled = p.ox <= -p.maxX + e;
    $('btnRight').disabled = p.ox >= p.maxX - e;
    $('btnUp').disabled = p.oy <= -p.maxY + e;
    $('btnDown').disabled = p.oy >= p.maxY - e;
  }

  function enterDecorate() {
    fitStages();
    clampView();
    paintEditorFrame();
    paintEditorPhoto();
    paintThumbs();
    updateDecorateUI();
  }

  function setFrame(id) {
    if (!Frames.byId[id]) return;
    state.frame = id;
    dropOutput();
    if (state.screen === 'camera') paintCameraFrame();
    if (state.screen === 'decorate') { clampView(); paintEditorFrame(); paintEditorPhoto(); updateDecorateUI(); }
  }
  function stepFrame(dir) {
    var n = Frames.list.length;
    setFrame(Frames.list[(frameIndex() + dir + n) % n].id);
  }
  function setSize(key) {
    if (!SIZES[key]) return;
    state.size = key;
    dropOutput();
    document.body.setAttribute('data-size', key);
    fitStages();
    if (state.screen === 'camera') paintCameraFrame();
    if (state.screen === 'decorate') { clampView(); paintEditorFrame(); paintEditorPhoto(); updateDecorateUI(); }
  }

  function viewChanged() {
    dropOutput();
    clampView();
    paintEditorPhoto();
    updateDecorateUI();
    paintThumbsSoon();
  }
  function nudge(x, y) { state.view.dx += x * 0.05; state.view.dy += y * 0.05; viewChanged(); }
  function zoomBy(f) { state.view.zoom = clamp(state.view.zoom * f, 1, ZOOM_MAX); viewChanged(); }
  function flip() { state.view.flip = !state.view.flip; state.view.dx = -state.view.dx; viewChanged(); }

  // One finger: swipe sideways for the next frame. Two fingers: pinch to zoom, drag to move.
  function attachGestures(stage, allowPinch) {
    var pts = {}, count = 0, g = null;
    function mid() {
      var ids = Object.keys(pts), a = pts[ids[0]], b = pts[ids[1]];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)) };
    }
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('button, label, a')) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }; count = Object.keys(pts).length;
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      if (count === 1) g = { type: 'swipe', x: e.clientX, y: e.clientY, t: Date.now() };
      else if (count === 2 && allowPinch && photo) {
        var m = mid();
        g = { type: 'pinch', m: m, zoom: state.view.zoom, dx: state.view.dx, dy: state.view.dy };
      } else g = { type: 'none' };
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (g && g.type === 'pinch' && count === 2) {
        var m = mid(), sz = SIZES[state.size], win = Frames.byId[state.frame].window(sz.w, sz.h);
        var unit = sz.w / Math.max(1, stage.getBoundingClientRect().width);
        state.view.zoom = clamp(g.zoom * m.d / g.m.d, 1, ZOOM_MAX);
        state.view.dx = g.dx + (m.x - g.m.x) * unit / win.w;
        state.view.dy = g.dy + (m.y - g.m.y) * unit / win.h;
        clampView(); paintEditorPhoto();
      }
    });
    function end(e) {
      if (!pts[e.pointerId]) return;
      var was = g;
      delete pts[e.pointerId]; count = Object.keys(pts).length;
      if (was && was.type === 'swipe' && count === 0 && e.type === 'pointerup') {
        var dx = e.clientX - was.x, dy = e.clientY - was.y;
        if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - was.t < 900) stepFrame(dx < 0 ? 1 : -1);
      }
      if (was && was.type === 'pinch') { g = { type: 'none' }; viewChanged(); }
      if (count === 0) g = null;
    }
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    if (allowPinch) {
      stage.addEventListener('wheel', function (e) {
        if (!photo) return;
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08);
      }, { passive: false });
    }
  }

  /* ---------- finished picture ---------- */

  function fileName() {
    var d = arubaDate(), mm = ('0' + (d.month + 1)).slice(-2), dd = ('0' + d.day).slice(-2);
    return 'lindas-aruba-postcard-' + d.year + '-' + mm + '-' + dd + (state.size === 'story' ? '-story' : '') + '.jpg';
  }

  function renderFinal(frameId, sizeKey) {
    var sz = SIZES[sizeKey || state.size], cv = makeCanvas(sz.w, sz.h);
    composite(cv.getContext('2d'), sz.w, sz.h, { frame: frameId || state.frame, src: photo, view: state.view, k: 1 });
    return cv;
  }

  function canvasToBlob(cv) {
    return new Promise(function (resolve, reject) {
      if (cv.toBlob) {
        cv.toBlob(function (b) { if (b) resolve(b); else reject(new Error('The picture could not be made.')); }, 'image/jpeg', JPEG_QUALITY);
        return;
      }
      try {
        var bin = atob(cv.toDataURL('image/jpeg', JPEG_QUALITY).split(',')[1]), arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: 'image/jpeg' }));
      } catch (e) { reject(e); }
    });
  }

  function makeOutput() {
    if (!photo) return Promise.reject(new Error('No photo yet.'));
    if (output) return Promise.resolve(output);
    var cv = renderFinal(), w = cv.width, h = cv.height, name = fileName();
    return canvasToBlob(cv).then(function (blob) {
      release(cv);
      var file = null;
      try { file = new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }); } catch (e) { file = null; }
      output = { blob: blob, url: URL.createObjectURL(blob), file: file, name: name };
      state.output = { width: w, height: h, bytes: blob.size, type: blob.type, name: name };
      var can = false;
      try { can = !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { can = false; }
      state.canShareFiles = can;
      return output;
    });
  }

  function enterDone() {
    var img = $('finalImg');
    $('btnShare').disabled = true; $('btnSave').disabled = true;
    screens.done.setAttribute('data-size', state.size);
    makeOutput().then(function (out) {
      if (state.screen !== 'done') return;
      img.src = out.url;
      $('btnShare').hidden = !state.canShareFiles;
      $('btnShare').disabled = false; $('btnSave').disabled = false;
      $('btnSave').className = state.canShareFiles ? 'btn btn-secondary' : 'btn btn-primary';
      $('saveHint').textContent = isIOS() ? S.saveHintIos : S.saveHintOther;
    }).catch(function (err) {
      state.lastError = String((err && err.message) || err);
      toast(S.photoError);
      go('decorate');
    });
  }

  function share() {
    if (!output || !output.file || !state.canShareFiles) return;
    // Only the picture is shared: some apps drop the image when text comes along with it.
    navigator.share({ files: [output.file] }).catch(function (err) {
      if (err && err.name === 'AbortError') return; // the guest closed the share sheet
      toast(S.shareError);
    });
  }

  function save() {
    if (!output) return;
    var a = document.createElement('a');
    a.href = output.url; a.download = output.name; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); }, 0);
  }

  function copyCaption() {
    var text = S.caption, btn = $('btnCopy');
    function done() {
      btn.textContent = S.copied; btn.classList.add('ok');
      setTimeout(function () { btn.textContent = S.copyCaption; btn.classList.remove('ok'); }, 2200);
    }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.top = '0';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) done(); else toast(S.copyError);
      } catch (e) { toast(S.copyError); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* ---------- kiosk: the big screen at the entrance ---------- */

  var kioskTimer = null, kioskAt = 0, wakeLock = null;

  function paintQr() {
    var qr = QR.make(SITE_URL, { ec: 'M' }), cv = $('kioskQr');
    var dpr = window.devicePixelRatio || 1;
    var target = Math.min(window.innerHeight * 0.40, window.innerWidth * 0.26);
    var scale = Math.max(4, Math.floor(target * dpr / (qr.size + 8)));
    QR.draw(cv, qr, { scale: scale, quiet: 4, dark: '#282204', light: '#FFFFFF' });
    cv.style.width = (cv.width / dpr) + 'px'; cv.style.height = (cv.height / dpr) + 'px';
    state.kioskQr = { text: qr.text, version: qr.version, modules: qr.size, mask: qr.mask, scale: scale, quiet: 4 };
  }

  function arrangeDeck() {
    var cards = $('kioskDeck').children, n = cards.length, i;
    for (i = 0; i < n; i++) {
      var rel = (i - kioskAt + n) % n;
      cards[i].className = 'card ' + (rel === 0 ? 'is-front' : rel === 1 ? 'is-next' : rel === n - 1 ? 'is-prev' : rel === 2 ? 'is-far-next' : 'is-away');
    }
  }

  function startKiosk() {
    var deck = $('kioskDeck');
    document.documentElement.classList.add('kiosk');
    document.body.setAttribute('data-screen', 'kiosk');
    for (var name in screens) screens[name].hidden = name !== 'kiosk';
    state.screen = 'kiosk';
    var vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');

    deck.innerHTML = '';
    Frames.list.forEach(function (f, i) {
      var cv = makeCanvas(1, 1);
      paintExample(cv, f.id, i % 3 === 1 ? 'sunset' : 'day', 864);
      cv.className = 'card is-away';
      cv.setAttribute('aria-hidden', 'true');
      deck.appendChild(cv);
    });
    kioskAt = 0; arrangeDeck();
    kioskTimer = setInterval(function () {
      kioskAt = (kioskAt + 1) % Frames.list.length;
      arrangeDeck();
    }, 5200);

    paintQr();
    window.addEventListener('resize', paintQr);

    // A public touchscreen: nothing to select, no menus, no zooming, nowhere to go.
    var stop = function (e) { e.preventDefault(); };
    ['contextmenu', 'selectstart', 'dragstart', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach(function (t) {
      document.addEventListener(t, stop, { passive: false });
    });
    document.addEventListener('touchmove', stop, { passive: false });
    document.addEventListener('touchstart', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('wheel', stop, { passive: false });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && /^[=+\-0]$/.test(e.key)) e.preventDefault();
    });

    // Keep the screen awake where the browser allows it.
    var keepAwake = function () {
      if (!navigator.wakeLock || document.hidden) return;
      navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(noop);
    };
    keepAwake();
    document.addEventListener('visibilitychange', keepAwake);

    // The postmark carries today's date: repaint the cards when the day changes in Aruba.
    var day = arubaDate().day;
    setInterval(function () {
      var now = arubaDate().day;
      if (now === day) return;
      day = now;
      var cards = deck.children;
      Frames.list.forEach(function (f, i) { paintExample(cards[i], f.id, i % 3 === 1 ? 'sunset' : 'day', 864); });
    }, 10 * 60 * 1000);
  }

  /* ---------- wiring ---------- */

  function labelAsButton(label) {
    label.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var input = $(label.getAttribute('for'));
        if (input) input.click();
      }
    });
  }

  function wire() {
    var list = document.querySelectorAll('[data-screen-name]'), i;
    for (i = 0; i < list.length; i++) screens[list[i].getAttribute('data-screen-name')] = list[i];

    $('btnTake').addEventListener('click', function () { go('camera'); });
    $('fileCamera').addEventListener('change', onFileInput);
    $('fileLibrary').addEventListener('change', onFileInput);
    list = document.querySelectorAll('label[role="button"]');
    for (i = 0; i < list.length; i++) labelAsButton(list[i]);

    $('btnCamBack').addEventListener('click', function () { go(photo ? 'decorate' : 'start'); });
    $('btnShutter').addEventListener('click', shutter);
    $('btnSwitch').addEventListener('click', switchCamera);
    $('camPrev').addEventListener('click', function () { stepFrame(-1); });
    $('camNext').addEventListener('click', function () { stepFrame(1); });

    $('btnRetake').addEventListener('click', function () { go('camera'); });
    $('sizePost').addEventListener('click', function () { setSize('post'); });
    $('sizeStory').addEventListener('click', function () { setSize('story'); });
    $('btnZoomIn').addEventListener('click', function () { zoomBy(1.15); });
    $('btnZoomOut').addEventListener('click', function () { zoomBy(1 / 1.15); });
    $('btnLeft').addEventListener('click', function () { nudge(-1, 0); });
    $('btnRight').addEventListener('click', function () { nudge(1, 0); });
    $('btnUp').addEventListener('click', function () { nudge(0, -1); });
    $('btnDown').addEventListener('click', function () { nudge(0, 1); });
    $('btnFlip').addEventListener('click', flip);
    $('editPrev').addEventListener('click', function () { stepFrame(-1); });
    $('editNext').addEventListener('click', function () { stepFrame(1); });
    $('btnFinish').addEventListener('click', function () { go('done'); });

    $('btnShare').addEventListener('click', share);
    $('btnSave').addEventListener('click', save);
    $('btnCopy').addEventListener('click', copyCaption);
    $('btnChange').addEventListener('click', function () { go('decorate'); });
    $('btnAgain').addEventListener('click', function () { go('start'); });
    $('captionText').textContent = S.caption;

    buildThumbs();
    attachGestures($('editStage'), true);
    attachGestures($('camStage'), false);

    window.addEventListener('resize', function () { setAppHeight(); fitStages(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { setAppHeight(); fitStages(); }, 250); });
    window.addEventListener('popstate', function (e) {
      var target = (e.state && e.state.screen) || 'start';
      go(target, { fromHistory: true });
    });
    // Never keep the camera running in the background.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (state.screen === 'camera' && (state.camera.status === 'live' || state.camera.status === 'starting')) { resumeCamera = true; stopCamera(); }
      } else if (resumeCamera) {
        resumeCamera = false;
        if (state.screen === 'camera') startCamera(state.camera.facing);
      }
    });
    window.addEventListener('pagehide', function () { stopTracks(stream); stream = null; });
    if (document.fonts && document.fonts.addEventListener) {
      // If a font arrives late, redraw whatever is showing so the lettering is right.
      document.fonts.addEventListener('loadingdone', function () {
        if (!state.ready || state.kiosk) return;
        if (state.screen === 'camera') paintCameraFrame();
        if (state.screen === 'decorate') { paintEditorFrame(); paintThumbsSoon(); }
      });
    }
  }

  function boot() {
    applyStrings();
    setAppHeight();
    wire();
    if (state.kiosk) document.documentElement.classList.add('kiosk');
    try { history.replaceState({ screen: 'start' }, ''); } catch (e) { /* fine */ }
    readyPromise = Promise.all([loadFonts(), loadAssets(), exifAutoRotates()]).then(function () {
      state.ready = true;
      document.documentElement.classList.add('ready');
      if (state.kiosk) startKiosk(); else { screens.kiosk.hidden = true; startExamples(); }
      return true;
    });
  }

  /* ---------- testing hooks ---------- */

  window.__postcard = {
    state: state,
    frames: Frames.list.map(function (f) { return f.id; }),
    sizes: SIZES,
    get ready() { return readyPromise; },
    // Loads a drawn picture (no real person) as if it had just been taken.
    // variant: 'day' | 'sunset' | 'bright' | 'dark';  opts.landscape for a wide picture.
    useTestImage: function (variant, opts) {
      opts = opts || {};
      return readyPromise.then(function () {
        var w = opts.landscape ? 2000 : 1500, h = opts.landscape ? 1500 : 2000, cv = makeCanvas(w, h);
        Sample.draw(cv.getContext('2d'), w, h, variant || 'day');
        setPhoto(cv, { source: 'test', variant: variant || 'day' });
        if (!state.kiosk) go('decorate');
        return state.photo;
      });
    },
    // The finished picture as a JPEG data URL. opts: { frame, size } override what is on screen.
    export: function (opts) {
      opts = opts || {};
      if (!photo) throw new Error('No photo yet: call useTestImage() or load a file first.');
      var cv = renderFinal(opts.frame, opts.size), url = cv.toDataURL('image/jpeg', JPEG_QUALITY);
      release(cv);
      return url;
    },
    loadFile: loadFile,
    setFrame: setFrame,
    setSize: setSize,
    go: go,
    zoomBy: zoomBy,
    nudge: nudge,
    flip: flip,
    makeOutput: function () { return makeOutput().then(function () { return state.output; }); },
    parseOrientation: parseOrientation
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
