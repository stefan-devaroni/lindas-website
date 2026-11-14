/*
 * Linda's "vote for our next T-shirt" page: the screen logic.
 *
 * Reads:   VOTE_DESIGNS + VOTE_SETTINGS (designs.js), VOTE_PRODUCTS (products.js), VOTE_STRINGS (strings.js)
 * Uses:    Tee (tee.js) to draw shirts, LindasQR (qr.js) for the codes, VoteBackend (backend.js) for storage
 * Modes:   /vote/          guests' own phones and laptops
 *          /vote/?kiosk=1  the touchscreen in the shop
 * Testing: window.__vote   (state, reset(), endSession(), go(), ...)
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(window.location.search);
  var KIOSK = params.get('kiosk') === '1';
  var SOURCE = KIOSK ? 'kiosk' : 'web';
  var backend = window.VoteBackend;
  var Tee = window.Tee;

  var settings = { maxVotes: 3, idleSeconds: 45, shuffle: true };
  Object.keys(window.VOTE_SETTINGS || {}).forEach(function (k) { settings[k] = window.VOTE_SETTINGS[k]; });
  settings.maxVotes = Math.max(1, Math.floor(Number(settings.maxVotes) || 3));

  // ---------- Words ----------
  var TABLES = window.VOTE_STRINGS || {};
  var EN = TABLES.en || {};
  var lang = params.get('lang');
  if (!lang || !TABLES[lang]) lang = 'en';
  var STR = TABLES[lang];

  function t(key, vars) {
    var s = STR[key];
    if (s == null) s = EN[key];
    if (s == null) return key;
    return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  // Capital-letter label. The label font only has plain letters, so anything else gets the body font.
  function lbl(text) {
    var lettersOnly = /^[A-Za-z  ]+$/.test(text);
    return '<span class="lbl' + (lettersOnly ? '' : ' lbl-plain') + '">' + esc(text) + '</span>';
  }
  function designText(d, field) {
    var o = (STR.designs && STR.designs[d.id]) || null;
    return (o && o[field]) || d[field] || '';
  }
  function productText(p, field) {
    var o = (STR.products && STR.products[p.link]) || null;
    return (o && o[field]) || p[field] || '';
  }
  function shirtName(key) {
    var names = STR.shirts || EN.shirts || {};
    return names[key] || (EN.shirts && EN.shirts[key]) || '';
  }

  // ---------- Designs and products ----------
  var ALL = (window.VOTE_DESIGNS || []).filter(function (d) { return d && d.id != null && d.file; }).map(function (d) {
    var id = String(d.id);
    if (/^\d$/.test(id)) id = '0' + id;
    return { id: id, title: d.title || id, file: d.file, shirt: d.shirt || 'white', caption: d.caption || '' };
  });
  var BY_ID = {};
  ALL.forEach(function (d) { BY_ID[d.id] = d; });
  var PRODUCTS = (window.VOTE_PRODUCTS || []).filter(function (p) { return p && /^https?:\/\//i.test(p.link || ''); });

  // Picture shapes (width / height), learned as the pictures load. Used to frame the close-up.
  // They are fetched one at a time, the shirt on screen first, so a phone on roaming shows
  // something quickly and the rest arrives in the background.
  var aspects = {};
  var preloadQueue = [], preloading = false;
  function preload(ids) {
    ids.forEach(function (id) { if (BY_ID[id] && !aspects[id] && preloadQueue.indexOf(id) < 0) preloadQueue.push(id); });
    pumpPreload();
  }
  function pumpPreload() {
    if (preloading || !preloadQueue.length) return;
    preloading = true;
    var id = preloadQueue.shift(), img = new Image();
    img.onload = function () {
      aspects[id] = img.naturalWidth / img.naturalHeight;
      refit(false);
      preloading = false;
      pumpPreload();
    };
    img.onerror = function () { preloading = false; pumpPreload(); };
    img.src = BY_ID[id].file;
  }

  // ---------- This visitor ----------
  var K_ME = 'lindas-vote:me';
  function loadPicks() {
    try {
      var v = JSON.parse(window.localStorage.getItem(K_ME));
      return v && Array.isArray(v.picks) ? v.picks.map(String) : [];
    } catch (e) { return []; }
  }
  function savePicks() {
    try { window.localStorage.setItem(K_ME, JSON.stringify({ picks: state.picks, t: Date.now() })); } catch (e) { /* memory only */ }
  }

  var state = {
    kiosk: KIOSK,
    source: SOURCE,
    lang: lang,
    view: 'vote',          // 'vote' or 'results'
    mode: 'single',        // 'single' (one by one) or 'grid' (all designs)
    order: [],             // ids in the order shown, switched-off designs left out
    index: 0,
    zoom: false,
    picks: [],             // ids this visitor voted for
    maxVotes: settings.maxVotes,
    active: null,          // ids the database lists, or null while we do not know
    deviceOnly: false,
    lastReset: null
  };

  var lastSnap = backend.cached();
  var inflight = {};       // votes on their way to the database
  var stageShown = null;
  var autoTimer = null, pollTimer = null, idleTimer = null, nudgeTimer = null;
  var barNodes = {};

  // ---------- Which designs, in what order ----------
  function isActive(id) { return !state.active || state.active.indexOf(id) >= 0; }
  function shuffled(list) {
    var a = list.slice(), i, j, tmp;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
    return a;
  }
  function newOrder() {
    var ids = ALL.map(function (d) { return d.id; }).filter(isActive);
    state.order = settings.shuffle ? shuffled(ids) : ids;
    state.index = 0;
    preload(state.order);
  }
  // Keep the order steady when the database switches a design on or off.
  function syncOrder() {
    var current = state.order[state.index];
    var kept = state.order.filter(isActive);
    ALL.forEach(function (d) { if (isActive(d.id) && kept.indexOf(d.id) < 0) kept.push(d.id); });
    state.order = kept;
    preload(kept);
    var at = kept.indexOf(current);
    state.index = at >= 0 ? at : Math.min(state.index, Math.max(0, kept.length - 1));
  }
  function currentDesign() { return BY_ID[state.order[state.index]] || null; }
  function votesLeft() { return Math.max(0, state.maxVotes - state.picks.length); }
  function votesLeftText(n) {
    return n === 0 ? t('votesLeftNone') : n === 1 ? t('votesLeftOne') : t('votesLeftMany', { n: n });
  }

  function activeIds(rows) {
    return rows.map(function (r) { return r.design; }).filter(function (id) { return BY_ID[id]; });
  }

  function takeSnapshot(snap) {
    lastSnap = snap;
    if (snap.rows) {
      var ids = activeIds(snap.rows);
      var before = JSON.stringify(state.order);
      state.active = ids;
      syncOrder();
      if (JSON.stringify(state.order) !== before && state.view === 'vote') renderVote();
    }
    state.deviceOnly = backend.status().deviceOnly;
    renderNote();
  }

  // ---------- Standings ----------
  function standingRows() {
    var server = {}, rank = {};
    if (lastSnap.rows) lastSnap.rows.forEach(function (r, i) { server[r.design] = r.votes; rank[r.design] = i; });
    var unsent = lastSnap.unsent || {};
    var rows = ALL.filter(function (d) { return isActive(d.id); }).map(function (d, i) {
      return {
        design: d,
        votes: (server[d.id] || 0) + (unsent[d.id] || 0) + (inflight[d.id] || 0),
        rank: rank[d.id] != null ? rank[d.id] : 1000 + i
      };
    });
    rows.sort(function (a, b) { return b.votes - a.votes || a.rank - b.rank; });
    return rows;
  }

  function refreshStandings() {
    return backend.standings().then(function (snap) {
      takeSnapshot(snap);
      if (state.view === 'results') renderResults();
      return snap;
    });
  }

  function poll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(function () {
      if (document.hidden) { poll(); return; }
      refreshStandings().then(poll, poll);
    }, state.view === 'results' ? 10000 : 120000);
  }

  // ---------- Voting ----------
  function setStatus(text) { $('status').textContent = text || ''; }

  function nudgeStandings() {
    var chip = $('btnStandings');
    chip.classList.add('is-nudge');
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(function () { chip.classList.remove('is-nudge'); }, 2400);
  }

  function castVote(id) {
    id = String(id);
    if (!BY_ID[id] || !isActive(id)) return false;
    if (state.picks.indexOf(id) >= 0) return false;
    if (votesLeft() === 0) {
      setStatus(t('statusNoneLeft', { max: state.maxVotes }));
      nudgeStandings();
      return false;
    }
    state.picks.push(id);
    savePicks();
    inflight[id] = (inflight[id] || 0) + 1;
    var left = votesLeft();
    setStatus(left ? t('statusVoted', { left: votesLeftText(left) }) : t('statusLast'));
    renderVote({ newPick: id });

    backend.vote(id, SOURCE).then(function (r) {
      inflight[id] = Math.max(0, (inflight[id] || 0) - 1);
      if (r && !r.ok && r.error === 'unknown_design') {
        // Switched off while this guest was looking at it: hand the vote back.
        state.picks = state.picks.filter(function (p) { return p !== id; });
        savePicks();
        clearTimeout(autoTimer);
        setStatus(t('statusRemoved'));
        refreshStandings().then(function () { if (state.view === 'vote') renderVote(); });
        return;
      }
      takeSnapshot(backend.cached());
      if (state.view === 'results') renderResults();
      if (!lastSnap.rows) refreshStandings();
    });

    clearTimeout(autoTimer);
    if (left === 0) {
      autoTimer = setTimeout(function () { if (state.view === 'vote') go('results'); }, 1500);
    }
    return true;
  }

  function step(dir) {
    var n = state.order.length;
    if (!n) return;
    state.index = (state.index + dir + n) % n;
    setStatus('');
    renderSingle(dir);
  }
  function showDesign(id) {
    var at = state.order.indexOf(id);
    if (at < 0) return;
    var dir = at >= state.index ? 1 : -1;
    state.index = at;
    state.mode = 'single';
    setStatus('');
    renderVote({ dir: dir });
    window.scrollTo(0, 0);
  }
  function toggleZoom() {
    state.zoom = !state.zoom;
    renderSingle(0, true);
  }

  // ---------- Drawing the voting screen ----------
  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5.2 5.2L20 6.8"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>';
  var PANCAKE = '<svg class="token{used}" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18.5" fill="#EB8917"/>' +
    '<circle cx="20" cy="20" r="15" fill="#EFBD40"/>' +
    '<path d="M10.5 17.5c1.8-4 5.6-6.6 10-7" fill="none" stroke="#F9E3A4" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="25.5" cy="24.5" r="2.3" fill="#EB8917" opacity="0.55"/><circle cx="15" cy="26.5" r="1.6" fill="#EB8917" opacity="0.55"/>' +
    '<circle cx="27.5" cy="15" r="1.4" fill="#EB8917" opacity="0.55"/></svg>';

  function voteButtonState(btn, id) {
    var picked = state.picks.indexOf(id) >= 0;
    var off = !picked && votesLeft() === 0;
    btn.classList.toggle('is-voted', picked);
    btn.classList.toggle('is-off', off);
    btn.classList.toggle('btn-primary', !picked && !off);
    btn.setAttribute('aria-disabled', picked || off ? 'true' : 'false');
    btn.setAttribute('aria-label', t(picked ? 'votedFor' : 'voteFor', { title: designText(BY_ID[id], 'title') }));
    btn.innerHTML = picked ? ICON_CHECK + lbl(t('voted')) : lbl(t('vote'));
  }

  // In the close view the "Whole shirt" button lies over the bottom of the picture: keep the print above it.
  function stageReserve() {
    if (!state.zoom) return 0;
    var stage = $('stage'), look = $('btnLook');
    return stage.clientHeight ? Math.max(0, stage.clientHeight - look.offsetTop + 4) : 0;
  }

  function refit(animate) {
    var d = currentDesign();
    var svg = $('stageTee').querySelector('.tee');
    if (d && svg) Tee.fit(svg, state.zoom ? 'close' : 'auto', aspects[d.id] || 1, animate, stageReserve());
    var cards = $('cards').querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-id');
      Tee.fit(cards[i].querySelector('.tee'), 'auto', aspects[id] || 1, false);
    }
  }

  function renderSingle(dir, animateZoom) {
    var d = currentDesign();
    if (!d) return;
    var title = designText(d, 'title');
    var picked = state.picks.indexOf(d.id) >= 0;
    var stageTee = $('stageTee');

    if (stageShown !== d.id) {
      stageTee.innerHTML = Tee.svg({ shirt: d.shirt, file: d.file });
      stageShown = d.id;
      stageTee.classList.remove('from-next', 'from-prev');
      if (dir) { void stageTee.offsetWidth; stageTee.classList.add(dir > 0 ? 'from-next' : 'from-prev'); }
      animateZoom = false;
    }
    $('stage').classList.toggle('is-close', state.zoom);
    stageTee.setAttribute('aria-label', title + '. ' + t(state.zoom ? 'wholeShirt' : 'lookCloser'));
    $('lookLabel').textContent = t(state.zoom ? 'wholeShirt' : 'lookCloser');
    $('btnLook').setAttribute('aria-label', t(state.zoom ? 'wholeShirt' : 'lookCloser'));
    $('btnLook').querySelector('.look-plus').setAttribute('d', state.zoom ? 'M7.8 10.5h5.4' : 'M10.5 7.8v5.4M7.8 10.5h5.4');

    var badge = $('pickBadge');
    badge.hidden = !picked;
    badge.textContent = t('yourPick');

    $('position').textContent = t('position', { n: state.index + 1, count: state.order.length });
    $('designTitle').textContent = title;
    $('caption').textContent = designText(d, 'caption');
    var colour = shirtName(d.shirt);
    $('shown').textContent = colour ? t('shownOn', { colour: colour }) : '';
    voteButtonState($('btnVote'), d.id);

    $('dots').innerHTML = state.order.map(function (id, i) {
      return '<button type="button" class="dot' + (i === state.index ? ' is-current' : '') + (state.picks.indexOf(id) >= 0 ? ' is-voted' : '') +
        '" data-id="' + esc(id) + '" aria-label="' + esc(t('goTo', { title: designText(BY_ID[id], 'title') })) + '"' +
        (i === state.index ? ' aria-current="true"' : '') + '><i></i></button>';
    }).join('');
    renderAllowance();
    Tee.fit(stageTee.querySelector('.tee'), state.zoom ? 'close' : 'auto', aspects[d.id] || 1, !!animateZoom, stageReserve());
  }

  function renderAllowance() {
    var left = votesLeft(), html = '';
    for (var i = 0; i < state.maxVotes; i++) html += PANCAKE.replace('{used}', i < left ? '' : ' is-used');
    $('tokens').innerHTML = html;
    $('votesLeft').textContent = votesLeftText(left);
    $('gridTokens').innerHTML = html;
    $('gridVotesLeft').textContent = votesLeftText(left);
  }

  function gridStates() {
    var cards = $('cards').querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var id = cards[i].getAttribute('data-id');
      cards[i].classList.toggle('is-voted', state.picks.indexOf(id) >= 0);
      voteButtonState(cards[i].querySelector('[data-vote]'), id);
    }
  }

  function renderGrid() {
    var shown = Array.prototype.map.call($('cards').querySelectorAll('.card'), function (c) { return c.getAttribute('data-id'); });
    if (shown.length && shown.join() === state.order.join()) { gridStates(); return; }
    $('cards').innerHTML = state.order.map(function (id) {
      var d = BY_ID[id], title = designText(d, 'title');
      return '<article class="card' + (state.picks.indexOf(id) >= 0 ? ' is-voted' : '') + '" data-id="' + esc(id) + '">' +
        '<button type="button" class="card-tee" data-show="' + esc(id) + '" aria-label="' + esc(t('goTo', { title: title })) + '">' +
          Tee.svg({ shirt: d.shirt, file: d.file }) + '</button>' +
        '<h3>' + esc(title) + '</h3>' +
        '<button type="button" class="btn btn-small" data-vote="' + esc(id) + '"></button>' +
      '</article>';
    }).join('');
    $('cards').style.setProperty('--per-row', Math.max(1, Math.ceil(state.order.length / 2)));
    gridStates();
    refit(false);
  }

  function renderVote(opts) {
    opts = opts || {};
    var count = state.order.length;
    var closed = count === 0;
    var grid = state.mode === 'grid' && !closed;

    $('headline').textContent = t('headline');
    $('intro').textContent = closed ? '' : t(state.maxVotes === 1 ? 'introOne' : 'intro', { count: count, max: state.maxVotes });
    $('viewVote').classList.toggle('is-grid', grid);
    $('closed').hidden = !closed;
    $('closed').textContent = t('closed');
    $('stage').hidden = closed;
    $('panel').hidden = closed;
    $('cards').hidden = !grid;
    $('gridTally').hidden = !grid;
    $('btnMode').hidden = closed;
    $('btnMode').textContent = t(grid ? 'viewOne' : 'viewAll');
    $('btnNext').innerHTML = lbl(t('next')) + ICON_NEXT;
    $('btnNext').setAttribute('aria-label', t('next'));
    $('btnPrev').setAttribute('aria-label', t('prev'));
    $('btnNextArrow').setAttribute('aria-label', t('next'));
    if (closed) return;

    if (grid) {
      renderGrid();
      renderAllowance();
    } else {
      $('cards').innerHTML = '';
      renderSingle(opts.dir || 0);
      if (opts.newPick) {
        var badge = $('pickBadge');
        badge.classList.remove('is-new');
        void badge.offsetWidth;
        badge.classList.add('is-new');
      }
    }
  }

  // ---------- Drawing the standings and the shop ----------
  function renderResults() {
    var rows = standingRows();
    var top = rows.length ? rows[0].votes : 0;
    var total = rows.reduce(function (sum, r) { return sum + r.votes; }, 0);
    var leaders = rows.filter(function (r) { return top > 0 && r.votes === top; }).length;
    var voted = state.picks.length > 0;

    $('resultsTitle').textContent = t(voted ? 'thanksTitle' : 'standingsTitle');
    $('resultsSub').textContent = rows.length ? t(voted ? 'thanksSub' : 'standingsSub') : t('closed');
    // One leader gets a label on its row. A tie is said once, under the list, so the rows stay compact.
    var totalText = total === 1 ? t('totalOne') : t('totalMany', { n: total });
    $('total').textContent = !rows.length ? '' : total === 0 ? t('noVotesYet') :
      leaders > 1 ? t('totalTied', { total: totalText, n: leaders }) : totalText;
    $('pickNote').textContent = rows.length ? t('pickNote') : '';

    var list = $('bars'), seen = {}, fresh = [];
    rows.forEach(function (r) {
      var d = r.design, li = barNodes[d.id];
      if (!li) {
        li = document.createElement('li');
        li.className = 'bar';
        li.setAttribute('data-id', d.id);
        li.innerHTML = '<span class="bar-chip" style="background:' + Tee.colour(d.shirt) + '"><img src="' + esc(d.file) + '" alt=""></span>' +
          '<div class="bar-main"><div class="bar-head"><span class="bar-title"></span><span class="bar-tags"></span></div>' +
          '<div class="bar-track"><div class="bar-fill" style="width:0%"></div></div></div><span class="bar-count"></span>';
        barNodes[d.id] = li;
        fresh.push(li);
      }
      seen[d.id] = true;
      var lead = top > 0 && r.votes === top;
      li.classList.toggle('is-lead', lead);
      li.classList.toggle('is-solo', lead && leaders === 1);
      li.classList.toggle('is-zero', r.votes === 0);
      li.querySelector('.bar-title').textContent = designText(d, 'title');
      li.querySelector('.bar-tags').innerHTML =
        (lead && leaders === 1 ? '<span class="tag tag-lead">' + lbl(t('lead')) + '</span> ' : '') +
        (state.picks.indexOf(d.id) >= 0 ? '<span class="tag tag-mine">' + lbl(t('yourPick')) + '</span>' : '');
      var countEl = li.querySelector('.bar-count');
      countEl.textContent = r.votes;
      countEl.setAttribute('aria-label', r.votes === 1 ? t('countOne') : t('countMany', { n: r.votes }));
      li._width = top > 0 ? Math.round(r.votes / top * 1000) / 10 : 0;
    });
    Object.keys(barNodes).forEach(function (id) {
      if (!seen[id]) { if (barNodes[id].parentNode) barNodes[id].parentNode.removeChild(barNodes[id]); delete barNodes[id]; }
    });
    // Re-order only when the ranking really changed, so bars that stay put keep growing smoothly.
    var wanted = rows.map(function (r) { return r.design.id; });
    var have = Array.prototype.map.call(list.children, function (li) { return li.getAttribute('data-id'); });
    if (wanted.join() !== have.join()) wanted.forEach(function (id) { list.appendChild(barNodes[id]); });
    var grow = function () {
      wanted.forEach(function (id) { barNodes[id].querySelector('.bar-fill').style.width = barNodes[id]._width + '%'; });
    };
    if (fresh.length) requestAnimationFrame(function () { requestAnimationFrame(grow); }); else grow();

    var canVoteMore = votesLeft() > 0 && rows.length > 0;
    $('btnBack').innerHTML = lbl(t(voted && canVoteMore ? 'voteMore' : 'backToDesigns'));
    $('btnBackTop').textContent = t(voted && canVoteMore ? 'voteMore' : 'backToDesigns');
    $('btnDone').hidden = !KIOSK;
    $('btnDone').innerHTML = lbl(t('done'));
  }

  function renderProducts() {
    $('saleTitle').textContent = t('saleTitle');
    $('saleSub').textContent = t(KIOSK ? 'saleSubQr' : 'saleSubLink');
    $('sale').hidden = PRODUCTS.length === 0;
    $('products').innerHTML = PRODUCTS.map(function (p) {
      var title = productText(p, 'title'), note = productText(p, 'note');
      var price = '';
      if (p.price) {
        var num = '<span class="num">' + esc(p.price) + '</span>';
        price = p.from ? esc(t('priceFrom', { price: '\u0000' })).replace('\u0000', num) : num;
      }
      // A real product picture from the shop wins; without one we draw the shirt or mug.
      var thumb = p.photo ? '<img class="product-photo" src="' + esc(p.photo) + '" alt="" loading="lazy" decoding="async">'
        : p.kind === 'mug' ? Tee.mug({ shirt: p.shirt, file: p.file }) : Tee.svg({ shirt: p.shirt, file: p.file });
      return '<li class="product">' +
        '<div class="product-thumb' + (p.photo ? ' has-photo' : p.file ? ' has-art' : '') + '">' + thumb + '</div>' +
        '<div class="product-text"><h3>' + esc(title) + '</h3>' +
          (note ? '<p class="product-note">' + esc(note) + '</p>' : '') +
          '<p class="product-ships">' + esc(t('ships')) + '</p>' +
        '</div>' +
        (price ? '<p class="product-price">' + price + '</p>' : '') +
        // The white card around the code is part of its quiet zone, so the code itself can use the space.
        '<div class="product-qr">' + window.LindasQR.svg(p.link, { level: 'M', margin: 2, label: t('qrAlt', { title: title }) }) + '</div>' +
        (KIOSK ? '' : '<a class="btn btn-small product-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + lbl(t('openInShop')) + '</a>') +
      '</li>';
    }).join('');
    $('elsewhere').textContent = t('elsewhere');
    // Shirts with artwork crop in on the chest; plain ones show the whole shirt.
    var thumbs = $('products').querySelectorAll('.product-thumb .tee');
    for (var i = 0; i < thumbs.length; i++) {
      Tee.fit(thumbs[i], thumbs[i].parentNode.classList.contains('has-art') ? 'chest' : 'full', 0.8, false);
    }
  }

  function renderNote() {
    var note = $('deviceNote');
    note.textContent = t('localOnly');
    note.hidden = !state.deviceOnly;
  }

  // ---------- Moving between screens ----------
  function go(view, opts) {
    opts = opts || {};
    clearTimeout(autoTimer);
    state.view = view === 'results' ? 'results' : 'vote';
    var results = state.view === 'results';
    $('viewVote').hidden = results;
    $('viewResults').hidden = !results;
    $('btnMode').hidden = results || state.order.length === 0;
    $('btnStandings').hidden = results;
    $('btnStandings').classList.remove('is-nudge');
    $('btnBackTop').hidden = !results;
    if (results) {
      renderResults();
      refreshStandings();
    } else {
      renderVote();
    }
    poll();
    window.scrollTo(0, 0);
    if (results && !opts.quiet) { try { $('resultsTitle').focus({ preventScroll: true }); } catch (e) { /* older browsers */ } }
  }

  // "Done" on the touchscreen, or nobody touching it for a while: next guest starts fresh.
  function endSession(reason) {
    state.picks = [];
    savePicks();
    state.zoom = false;
    state.mode = 'single';
    stageShown = null;
    newOrder();
    setStatus('');
    state.lastReset = { reason: reason || 'manual', at: Date.now() };
    go('vote', { quiet: true });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function isFresh() {
    return state.view === 'vote' && state.mode === 'single' && state.index === 0 && !state.zoom && state.picks.length === 0 && window.scrollY === 0;
  }
  function armIdle() {
    if (!KIOSK) return;
    clearTimeout(idleTimer);
    var ms = Math.max(1, Number(settings.idleSeconds) || 45) * 1000;
    state.idleAt = Date.now() + ms;
    idleTimer = setTimeout(function () { if (!isFresh()) endSession('idle'); }, ms);
  }

  // ---------- Wiring ----------
  function wire() {
    $('btnVote').addEventListener('click', function () { var d = currentDesign(); if (d) castVote(d.id); });
    $('btnNext').addEventListener('click', function () { step(1); });
    $('btnNextArrow').addEventListener('click', function () { step(1); });
    $('btnPrev').addEventListener('click', function () { step(-1); });
    $('btnLook').addEventListener('click', toggleZoom);
    $('btnMode').addEventListener('click', function () {
      state.mode = state.mode === 'grid' ? 'single' : 'grid';
      setStatus('');
      renderVote();
      window.scrollTo(0, 0);
    });
    $('btnStandings').addEventListener('click', function () { go('results'); });
    $('btnBack').addEventListener('click', function () { go('vote'); });
    $('btnBackTop').addEventListener('click', function () { go('vote'); });
    $('btnDone').addEventListener('click', function () { endSession('done'); });

    $('dots').addEventListener('click', function (e) {
      var dot = e.target.closest ? e.target.closest('.dot') : null;
      if (!dot) return;
      var at = state.order.indexOf(dot.getAttribute('data-id'));
      if (at < 0 || at === state.index) return;
      var dir = at > state.index ? 1 : -1;
      state.index = at;
      setStatus('');
      renderSingle(dir);
    });
    $('cards').addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-vote],[data-show]') : null;
      if (!el) return;
      if (el.hasAttribute('data-show')) { showDesign(el.getAttribute('data-show')); return; }
      var id = el.getAttribute('data-vote');
      if (castVote(id)) return;
      if (state.picks.indexOf(id) < 0 && votesLeft() === 0) nudgeStandings();
    });

    // Swipe left or right on the shirt (an extra: the buttons do the same). A plain tap looks closer.
    var stage = $('stage'), start = null, ignoreClickUntil = 0;
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY };
    });
    stage.addEventListener('pointerup', function (e) {
      if (!start) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        ignoreClickUntil = e.timeStamp + 80;   // the click that ends this same drag, not the guest's next tap
        step(dx < 0 ? 1 : -1);
      }
    });
    stage.addEventListener('pointercancel', function () { start = null; });
    // A sideways drag is ours. Left to the browser it counts as a fling, and the browser then
    // ignores the guest's next tap for about a second.
    stage.addEventListener('touchmove', function (e) {
      if (!start || !e.touches || e.touches.length !== 1 || !e.cancelable) return;
      var dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y;
      if (Math.abs(dx) > Math.abs(dy)) e.preventDefault();
    }, { passive: false });
    $('stageTee').addEventListener('click', function (e) { if (e.timeStamp > ignoreClickUntil) toggleZoom(); });

    document.addEventListener('keydown', function (e) {
      if (state.view !== 'vote' || state.mode !== 'single' || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { refit(false); }, 60);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshStandings(); });
    backend.onChange(function () {
      state.deviceOnly = backend.status().deviceOnly;
      renderNote();
    });

    if (KIOSK) {
      var stop = function (e) { e.preventDefault(); };
      ['contextmenu', 'dragstart', 'selectstart', 'gesturestart', 'gesturechange', 'gestureend', 'dblclick'].forEach(function (name) {
        document.addEventListener(name, stop);
      });
      document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
      document.addEventListener('wheel', function (e) { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
      document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) >= 0) e.preventDefault();
      });
      ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(function (name) {
        window.addEventListener(name, armIdle, { passive: true, capture: true });
      });
    }
  }

  // ---------- Start ----------
  function start() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    $('logo').alt = t('logoAlt');
    $('btnStandings').textContent = t('standings');

    if (KIOSK) {
      document.documentElement.classList.add('kiosk');
      var viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) viewport.setAttribute('content', viewport.getAttribute('content') + ', maximum-scale=1, user-scalable=no');
      state.picks = [];
      savePicks();
    } else {
      // On a guest's own device the logo leads back to the website. Not on the touchscreen.
      var brand = $('brand'), link = document.createElement('a');
      link.href = '../';
      link.setAttribute('aria-label', t('logoAlt'));
      link.className = brand.className;
      link.id = 'brand';
      while (brand.firstChild) link.appendChild(brand.firstChild);
      brand.parentNode.replaceChild(link, brand);
      state.picks = loadPicks().filter(function (id, i, a) { return BY_ID[id] && a.indexOf(id) === i; }).slice(0, state.maxVotes);
    }

    if (lastSnap.rows) state.active = activeIds(lastSnap.rows);
    newOrder();
    state.deviceOnly = backend.status().deviceOnly;

    wire();
    renderProducts();
    renderNote();
    go('vote', { quiet: true });
    refreshStandings();
    armIdle();
  }

  window.__vote = {
    state: state,
    settings: settings,
    backend: backend,
    designs: ALL,
    rows: standingRows,
    go: go,
    vote: castVote,
    refresh: refreshStandings,
    endSession: endSession,
    // Clear this device's votes (this visitor's picks and anything not yet sent) and start over.
    reset: function () {
      backend.resetDevice();
      endSession('reset');
      takeSnapshot(backend.cached());
      return 'cleared';
    }
  };

  start();
})();
