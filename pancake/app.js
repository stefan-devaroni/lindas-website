/* Create your own Dutch pancake: the page itself.
   Builds the list of toppings, keeps track of what is on the pancake, the name, "Start over",
   "Save picture", and the waiting-area mode (?kiosk=1). */
(function () {
  'use strict';
  var PK = window.PK, A = PK.art, scene = PK.scene, D = window.PK_DATA;
  var qs = new URLSearchParams(location.search);
  var KIOSK = qs.get('kiosk') === '1';
  var LANG = window.PK_STRINGS[qs.get('lang')] ? qs.get('lang') : 'en';
  var T = window.PK_STRINGS[LANG];
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var COARSE = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  var byId = {}, order = [], on = {}, btn = {}, nameIdea = 0;
  D.toppings.forEach(function (t) { byId[t.id] = t; order.push(t.id); });

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function onList() { return order.filter(function (id) { return on[id]; }); }
  function label(id) { return T.toppings[id][0]; }
  function inSentence(id) { return T.toppings[id][1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var elCanvas = $('pk-canvas'), elList = $('pk-list'), elSummary = $('pk-summary'), elCapName = $('pk-cap-name'),
    elName = $('pk-name'), elToast = $('pk-toast'), elTotal = $('pk-total'), elLogoImg = document.querySelector('#pk-logo img');

  /* ---------- the words ---------- */

  // "Bacon, apple and Gouda". max: after that many, the rest becomes "and 7 more".
  function listText(ids, max) {
    var names = ids.map(inSentence), rest;
    if (!names.length) return '';
    if (max && names.length > max) { rest = names.length - (max - 1); names = names.slice(0, max - 1); names.push(T.more.replace('{n}', rest)); }
    if (names.length === 1) return cap(names[0]);
    return cap(names.slice(0, -1).join(', ') + ' ' + T.and + ' ' + names[names.length - 1]);
  }
  function summaryText(max) {
    var ids = onList();
    if (!ids.length) return T.summaryPlain;
    if (ids.length === order.length) return T.summaryAll;
    return listText(ids, max) + '.' + (ids.length >= 10 ? ' ' + T.summaryMany : '');
  }
  function money(n) { return D.config.currency + n.toFixed(2); }

  function refreshText() {
    var ids = onList(), nm = elName.value.trim(), total, i, ok;
    elSummary.textContent = summaryText(8);
    elCapName.textContent = nm; elCapName.hidden = !nm;
    elCanvas.setAttribute('aria-label', ids.length ? T.canvasLabel.replace('{list}', listText(ids)) : T.canvasLabelPlain);
    if (D.config.showPrices && D.config.basePrice != null) {
      total = D.config.basePrice; ok = true;
      for (i = 0; i < ids.length; i++) { if (byId[ids[i]].price == null) ok = false; else total += byId[ids[i]].price; }
      elTotal.hidden = !ok; elTotal.textContent = T.total + ': ' + money(total);
    } else elTotal.hidden = true;
  }

  /* ---------- what is on the pancake ---------- */

  function apply(instant) {
    order.forEach(function (id) { btn[id].setAttribute('aria-pressed', on[id] ? 'true' : 'false'); });
    scene.sync(on, instant || REDUCED);
    refreshText();
  }
  function toggle(id) { if (!byId[id]) return; on[id] = !on[id]; apply(false); }
  function startOver(instant) {
    on = {}; elName.value = ''; nameIdea = 0;
    apply(instant);
    try { elList.scrollTop = 0; if (window.scrollY > 0) window.scrollTo(0, 0); } catch (e) { /* nothing to scroll */ }
  }

  /* ---------- building the page ---------- */

  var ICON = { reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.6 10A7 7 0 1 1 5 14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dice: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 5.2L20 9l-4.2 3.9 1.2 5.8L12 15.9 7 18.7l1.2-5.8L4 9l5.8-.8z" fill="currentColor"/></svg>' };

  function build() {
    var icons = [], dpr = Math.min(window.devicePixelRatio || 1, 3), S = 48;
    document.documentElement.lang = LANG;
    document.title = T.pageTitle;
    $('pk-title').textContent = T.title;
    $('pk-intro').textContent = T.intro;
    elLogoImg.alt = T.logoAlt;
    $('pk-reset').innerHTML = ICON.reset; $('pk-reset').appendChild(el('span', '', T.startOver));
    $('pk-save').innerHTML = ICON.save; $('pk-save').appendChild(el('span', '', T.savePicture));
    $('pk-suggest').innerHTML = ICON.dice; $('pk-suggest').appendChild(el('span', '', T.suggestName));
    $('pk-name-label').textContent = T.nameLabel;
    elName.placeholder = T.namePlaceholder;

    D.groups.forEach(function (gid) {
      var sec = el('section', 'group group-' + gid), grid = el('div', 'grid');
      sec.appendChild(el('h2', '', T.groups[gid]));
      if (T.groupNotes[gid]) sec.appendChild(el('p', 'note', T.groupNotes[gid]));
      D.toppings.forEach(function (t) {
        var b, ic, cv, tx;
        if (t.group !== gid) return;
        b = el('button', 'top-btn'); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.setAttribute('data-id', t.id);
        ic = el('span', 'ic'); cv = document.createElement('canvas'); cv.width = cv.height = Math.round(S * dpr);
        ic.appendChild(cv); ic.appendChild(el('span', 'tick'));
        tx = el('span', 'tx'); tx.appendChild(el('span', 'nm', label(t.id)));
        if (D.config.showPrices && t.price != null) tx.appendChild(el('span', 'pr', '+ ' + money(t.price)));
        b.appendChild(ic); b.appendChild(tx);
        grid.appendChild(b); btn[t.id] = b; icons.push([cv, t.id]);
      });
      sec.appendChild(grid); elList.appendChild(sec);
    });
    elList.appendChild(el('p', 'foot', T.footer));

    icons.forEach(function (it) {
      var g = it[0].getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      try { A.icon(g, it[1], S); } catch (e) { if (window.console) console.error('icon', it[1], e); }
    });
  }

  /* ---------- naming it ---------- */

  function titleCase(s) { return s.split(' ').map(cap).join(' '); }
  function suggestName() {
    var ids = onList(), pool, s;
    pool = !ids.length ? T.nameIdeasPlain : ids.length === 1 ? T.nameIdeasOne : T.nameIdeasOne.concat(T.nameIdeasTwo);
    s = pool[nameIdea % pool.length]; nameIdea++;
    s = s.replace('{a}', ids.length ? titleCase(inSentence(ids[0])) : '').replace('{b}', ids.length > 1 ? titleCase(inSentence(ids[1])) : '');
    elName.value = s.slice(0, elName.maxLength > 0 ? elName.maxLength : 40);
    refreshText();
  }

  /* ---------- the saved picture ---------- */

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fitFont(g, text, px, family, maxW) {
    g.font = px + 'px ' + family;
    var w = g.measureText(text).width;
    if (w > maxW) { px = Math.floor(px * maxW / w); g.font = px + 'px ' + family; }
    return px;
  }
  function wrap(g, text, maxW, maxLines) {
    var words = text.split(' '), lines = [], line = '', i, test;
    for (i = 0; i < words.length; i++) {
      test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; } else line = test;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) return null;
    return lines;
  }
  var F_SCRIPT = "'Olivier', 'Segoe Script', 'Brush Script MT', cursive", F_LABEL = "'Telegrafico', 'Arial Narrow', 'Segoe UI', sans-serif",
    F_BODY = "'Open Sauce One', 'Segoe UI', system-ui, sans-serif";

  // A 1080 x 1350 picture: logo, the pancake's name, the pancake, and what is on it.
  function makePicture(withLogo) {
    var W = 1080, H = 1350, cv = document.createElement('canvas'), g, st, name, ids = onList(), lines, max, text, i, lw, lh, y;
    cv.width = W; cv.height = H; g = cv.getContext('2d');
    g.fillStyle = '#F1EAD1'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#004EAD'; g.lineWidth = 5; rr(g, 26, 26, W - 52, H - 52, 34); g.stroke();
    g.lineWidth = 1.5; rr(g, 40, 40, W - 80, H - 80, 24); g.stroke();
    g.fillStyle = '#BDDFFF'; rr(g, 70, 372, W - 140, 640, 48); g.fill();

    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    if (withLogo) { lh = 150; lw = lh * elLogoImg.naturalWidth / elLogoImg.naturalHeight; g.drawImage(elLogoImg, (W - lw) / 2, 66, lw, lh); }
    else {
      g.fillStyle = '#27AAE1'; g.font = '118px ' + F_SCRIPT; g.fillText("Linda's", W / 2, 162);
      g.fillStyle = '#27AAE1'; g.font = '30px ' + F_LABEL; try { g.letterSpacing = '6px'; } catch (e) { /* older browsers */ }
      g.fillText('DUTCH PANCAKES', W / 2, 210); try { g.letterSpacing = '0px'; } catch (e2) { /* older browsers */ }
    }
    name = elName.value.trim() || T.defaultName;
    g.fillStyle = '#282204'; fitFont(g, name, 96, F_SCRIPT, W - 200); g.fillText(name, W / 2, 330);

    st = { cx: W / 2, cy: 372 + 24 + 0.66 * 385, R: 385, k: 0.5, up: 0.866 };
    scene.drawStill(g, st);

    g.fillStyle = '#282204'; g.font = '600 32px ' + F_BODY;
    if (!ids.length) lines = wrap(g, T.summaryPlain, W - 200, 3);
    else {
      for (max = ids.length; max >= 2; max--) {       // shorten the list until it fits on three lines
        text = listText(ids, max === ids.length ? 0 : max) + '.';
        lines = wrap(g, text, W - 200, 3);
        if (lines) break;
      }
    }
    lines = lines || [listText(ids, 2) + '.'];
    y = 1076 + (3 - lines.length) * 22;
    for (i = 0; i < lines.length; i++) g.fillText(lines[i], W / 2, y + i * 44);

    g.fillStyle = '#004EAD'; g.font = '24px ' + F_LABEL; try { g.letterSpacing = '5px'; } catch (e3) { /* older browsers */ }
    g.fillText(T.picPlace, W / 2, 1248); try { g.letterSpacing = '0px'; } catch (e4) { /* older browsers */ }
    g.fillStyle = '#27AAE1'; g.font = '44px ' + F_SCRIPT; g.fillText(T.picSince, W / 2, 1292);
    return cv;
  }
  function logoUsable() { return location.protocol !== 'file:' && elLogoImg && elLogoImg.complete && elLogoImg.naturalWidth > 0; }
  // Gives the finished picture as a PNG data address. From a file on disk the logo image may not be
  // copied into a picture, so the logo is then written out in the brand's own font instead.
  function pictureUrl(drawnLogo) {
    scene.settle();
    try { if (!drawnLogo && logoUsable()) return makePicture(true).toDataURL('image/png'); } catch (e) { /* fall through to the drawn logo */ }
    return makePicture(false).toDataURL('image/png');
  }
  function toBlob(url) {
    var bin = atob(url.split(',')[1]), n = bin.length, arr = new Uint8Array(n), i;
    for (i = 0; i < n; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: 'image/png' });
  }
  function download(blob, fname) {
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    toast(T.saved, 2600);
  }
  function savePicture() {
    var blob, file = null, fname;
    try { blob = toBlob(pictureUrl()); } catch (e) { toast(T.saveFailed, 3500); return; }
    fname = (elName.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || T.picFile) + '.png';
    try { file = new File([blob], fname, { type: 'image/png' }); } catch (e2) { file = null; }
    // On a phone the share sheet is the way to put a picture in the photo roll.
    if (file && COARSE && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(function (err) { if (!err || err.name !== 'AbortError') download(blob, fname); });
    } else download(blob, fname);
  }

  var toastTimer = 0;
  function toast(text, ms) {
    elToast.textContent = text; elToast.hidden = false;
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(function () { elToast.hidden = true; }, ms);
  }

  /* ---------- the waiting-area screen (?kiosk=1) ---------- */

  function kiosk() {
    var idleMs = (parseFloat(qs.get('idle')) || D.config.kioskIdleSeconds) * 1000, lastInput = Date.now(), warned = false, logo = $('pk-logo'), span, vp;
    document.documentElement.classList.add('kiosk');
    // no way off the page
    span = el('span', 'logo'); span.id = 'pk-logo'; span.appendChild(elLogoImg); logo.parentNode.replaceChild(span, logo);
    $('pk-save').hidden = true;
    vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

    function stop(e) { e.preventDefault(); }
    document.addEventListener('contextmenu', stop);
    document.addEventListener('dragstart', stop);
    document.addEventListener('selectstart', function (e) { if (e.target !== elName) e.preventDefault(); });
    document.addEventListener('gesturestart', stop); document.addEventListener('gesturechange', stop);
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && /^[-+=0]$/.test(e.key)) e.preventDefault(); });
    document.addEventListener('dblclick', stop);

    function touched() { lastInput = Date.now(); if (warned) { warned = false; elToast.hidden = true; } }
    ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'input'].forEach(function (ev) { document.addEventListener(ev, touched, { passive: true, capture: true }); });
    document.addEventListener('scroll', touched, { passive: true, capture: true });

    setInterval(function () {
      var left = idleMs - (Date.now() - lastInput), dirty = onList().length > 0 || elName.value !== '' || elList.scrollTop > 0 || window.scrollY > 0;
      if (!dirty) { lastInput = Date.now(); return; }
      if (left <= 0) {
        warned = false; elToast.hidden = true; if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        startOver(false); lastInput = Date.now();
      } else if (left <= 10000 && idleMs >= 20000) { warned = true; toast(T.idleWarn.replace('{n}', Math.ceil(left / 1000)), 0); }
    }, 500);
  }

  /* ---------- start ---------- */

  build();
  var noSugar = {};
  D.toppings.forEach(function (t) { if (t.group === 'savory') noSugar[t.id] = true; });   // the owner's rule: anything savory, no powdered sugar
  scene.init(elCanvas, { noSugar: noSugar });
  apply(true);

  elList.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.top-btn') : null;
    if (b) toggle(b.getAttribute('data-id'));
  });
  $('pk-reset').addEventListener('click', function () { startOver(false); });
  $('pk-save').addEventListener('click', savePicture);
  $('pk-suggest').addEventListener('click', suggestName);
  elName.addEventListener('input', refreshText);
  elName.addEventListener('keydown', function (e) { if (e.key === 'Enter') elName.blur(); });
  if (KIOSK) kiosk();
  // The fonts arrive a moment after the page: nothing on the canvas needs them, but the saved picture does.
  if (document.fonts && document.fonts.load) { document.fonts.load("40px 'Olivier'"); document.fonts.load("20px 'Telegrafico'"); }

  /* ---------- for testing ---------- */

  function resolve(x) {
    var k = String(x).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''), i, n;
    if (byId[k]) return k;
    for (i = 0; i < order.length; i++) {
      n = label(order[i]).toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (n === k || n === k + '_cheese' || n === k + '_ice_cream' || inSentence(order[i]).toLowerCase().replace(/[^a-z0-9]+/g, '_') === k) return order[i];
    }
    return null;
  }
  window.__pancake = {
    get state() {
      // sugar: is the powdered sugar meant to be there; sugarShown: how much of it is drawn right now (0 to 1)
      return { on: onList(), name: elName.value, summary: elSummary.textContent, sugar: scene.sugarOn(), sugarShown: scene.sugarShown(), kiosk: KIOSK, lang: LANG,
        animating: scene.animating(), pieces: scene.counts(), showPrices: D.config.showPrices };
    },
    ids: order.slice(),
    // set(['bacon', 'apple']): show exactly these, at once. Pass true as the second argument to see them animate in.
    set: function (ids, animate) {
      on = {};
      (ids || []).forEach(function (x) { var id = resolve(x); if (id) on[id] = true; else if (window.console) console.warn('pancake: no topping called', x); });
      apply(!animate); return onList();
    },
    all: function (animate) { on = {}; order.forEach(function (id) { on[id] = true; }); apply(!animate); return onList(); },
    clear: function (animate) { on = {}; apply(!animate); return []; },
    toggle: function (x) { var id = resolve(x); if (id) toggle(id); return onList(); },
    step: function (ms) { scene.step(ms || 100); },          // move the animation on by hand
    // the saved picture, as a PNG data address. picture(true): with the logo written out, as it is when the page is opened from disk
    picture: function (drawnLogo) { return pictureUrl(drawnLogo); },
    layout: function () { return scene.layout(); },            // where every piece is, as text (to compare two ways of getting there)
    layerOf: function (x) { var id = resolve(x); return id ? byId[id].layer : null; }
  };
})();
