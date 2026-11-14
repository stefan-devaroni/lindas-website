/* Linda's Dutch Pancakes: "Stories" — the page logic.
   Plain script (no modules, no libraries, no network). Words come from stories-data.js,
   drawings from stories-art.js.

   Address options:
     ?kiosk=1    touchscreen mode: no links out, back to the start after 60 s without a touch,
                 no text selection, no context menu, no pinch-zoom, no pull-to-refresh
     ?idle=20    (with kiosk) change the 60 seconds, for testing
     ?lang=nl    another language, once it has been added to stories-data.js

   For testing:  window.__stories.state   where the page is now
                 window.__stories.open('hot-delight', 2)   story id, slide number counted from 0
                 (slides = the panels, then "Did you know?", the quiz and the gift shop line)
                 also .home() .next() .prev()  */

(function () {
  'use strict';

  var DATA = window.LINDAS_STORIES;
  var ART = window.LINDAS_STORY_ART;
  var doc = document;
  var root = doc.documentElement;
  if (!DATA || !ART) return;

  /* ── options from the address ── */
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
  }
  var KIOSK = param('kiosk') === '1';
  var idleParam = parseFloat(param('idle'));
  var IDLE_MS = (idleParam >= 3 ? idleParam : 60) * 1000;
  var lang = param('lang');
  if (!lang || !DATA.languages[lang]) lang = DATA.defaultLang;
  root.lang = lang;
  if (KIOSK) root.classList.add('kiosk');

  /* ── tiny helpers ── */
  function t(v, vars) {
    var s = v == null ? '' : (typeof v === 'string' ? v : (v[lang] != null ? v[lang] : (v[DATA.defaultLang] || '')));
    if (vars) for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function el(tag, cls, txt) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }
  /* A capital-letter label. The brand font has letters only, so anything else gets the normal font. */
  function caps(tag, cls, txt) {
    var n = el(tag, 'caps ' + (cls || ''), txt);
    if (!/^[A-Za-z ]+$/.test(txt)) n.classList.add('plain');
    return n;
  }
  var ICON = {
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5l-7 7l7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5l7 7l-7 7"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
    tick: '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5l9.5 -10"/></svg>',
    cross: '<svg class="cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6l-12 12"/></svg>'
  };
  function withIcon(node, label, icon, after) {
    var span = el('span', null, label);
    if (node.classList.contains('caps')) node.classList.toggle('plain', !/^[A-Za-z ]+$/.test(label));
    if (after) { node.appendChild(span); node.insertAdjacentHTML('beforeend', icon); }
    else { node.insertAdjacentHTML('beforeend', icon); node.appendChild(span); }
    return node;
  }

  /* ── state ── */
  var stories = DATA.stories;
  var byId = {};
  stories.forEach(function (s) { byId[s.id] = s; });

  var state = {
    view: 'home',        // 'home' or 'story'
    storyId: null,
    index: 0,            // which slide of the story (0 = first panel)
    total: 0,
    slideType: null,     // 'panel', 'facts', 'quiz' or 'shop'
    quiz: null,          // { picked: [..], solved: true/false } on a quiz slide
    lang: lang,
    kiosk: KIOSK,
    idleSeconds: IDLE_MS / 1000
  };

  function slidesOf(story) {
    var list = story.panels.map(function (p) { return { type: 'panel', panel: p }; });
    if (story.facts && story.facts.length) list.push({ type: 'facts' });
    if (story.quiz) list.push({ type: 'quiz' });
    list.push({ type: 'shop' });
    return list;
  }

  /* ── elements ── */
  var $home = doc.getElementById('home');
  var $story = doc.getElementById('story');
  var $backTop = doc.getElementById('backBtn');
  var $logo = doc.getElementById('logoLink');
  var $stage, $dots, $count, $prev, $next;

  /* ── start screen ── */
  function buildHome() {
    $home.textContent = '';
    var head = el('div', 'home-head');
    head.appendChild(caps('p', 'home-kicker', t(DATA.ui.homeKicker)));
    head.appendChild(el('h1', null, t(DATA.ui.homeTitle)));
    head.appendChild(el('p', 'home-sub', t(DATA.ui.homeSub)));
    $home.appendChild(head);

    var grid = el('div', 'cards');
    stories.forEach(function (s) {
      var card = el('button', 'card');
      card.type = 'button';
      card.setAttribute('data-story', s.id);
      var art = el('div', 'card-art');
      art.innerHTML = ART.make(s.art);
      card.appendChild(art);
      var body = el('div', 'card-body');
      body.appendChild(el('h2', null, t(s.title)));
      body.appendChild(el('p', null, t(s.teaser)));
      var go = el('span', 'card-go caps');
      withIcon(go, t(DATA.ui.read), ICON.right, true);
      body.appendChild(go);
      card.appendChild(body);
      card.addEventListener('click', function () { open(s.id, 0); });
      grid.appendChild(card);
    });
    $home.appendChild(grid);
  }

  /* ── story frame (built once) ── */
  function buildStoryFrame() {
    $story.textContent = '';
    $stage = el('div', 'stage');
    $stage.setAttribute('aria-live', 'polite');
    $story.appendChild($stage);

    var nav = el('nav', 'controls');
    $prev = el('button', 'btn btn-back caps'); $prev.type = 'button';
    withIcon($prev, t(DATA.ui.back), ICON.left, false);
    $next = el('button', 'btn btn-next caps'); $next.type = 'button';
    var mid = el('div', 'progress');
    $dots = el('div', 'dots'); $dots.setAttribute('aria-hidden', 'true');
    $count = el('div', 'count');
    mid.appendChild($dots); mid.appendChild($count);
    nav.appendChild($prev); nav.appendChild(mid); nav.appendChild($next);
    $story.appendChild(nav);

    $prev.addEventListener('click', prev);
    $next.addEventListener('click', next);

    $backTop.textContent = '';
    $backTop.classList.add('caps');
    withIcon($backTop, t(DATA.ui.allStories), ICON.grid, false);
    $backTop.addEventListener('click', home);
  }

  /* ── pictures ── */
  function buildFigure(artName, photo) {
    var fig = el('figure', 'figure');
    var pic = el('div', 'pic');
    fig.appendChild(pic);
    fig._ratio = 1; fig._max = Infinity;

    function useArt() {
      pic.className = 'pic';
      pic.innerHTML = ART.make(artName);
      fig.classList.remove('print');
      fig._ratio = 1; fig._max = Infinity;
      var cap = fig.querySelector('.caption');
      if (cap) cap.parentNode.removeChild(cap);
      if (fig.parentNode) fig.parentNode.classList.remove('has-photo', 'has-print');
      refit();
    }

    if (photo && photo.src) {
      pic.className = 'pic photo' + (photo.look === 'print' ? ' print' : '');
      if (photo.look === 'print') fig.classList.add('print');
      var img = new Image();
      img.alt = t(photo.alt);
      img.decoding = 'async';
      img.draggable = false;
      if (photo.width && photo.height) {
        img.width = photo.width; img.height = photo.height;
        fig._ratio = photo.width / photo.height;
        if (photo.maxScale) fig._max = photo.width * photo.maxScale;
      }
      img.addEventListener('error', useArt);                 // missing file: show the drawing instead
      img.addEventListener('load', function () {
        if (!photo.width && img.naturalWidth) { fig._ratio = img.naturalWidth / img.naturalHeight; }
        if (photo.maxScale && img.naturalWidth) fig._max = img.naturalWidth * photo.maxScale;
        fit();
      });
      img.src = photo.src;
      pic.appendChild(img);
      var capText = t(photo.caption), credit = t(photo.credit);
      if (capText || credit) {
        var cap = el('figcaption', 'caption');
        if (capText) cap.appendChild(el('span', null, capText));
        if (credit) cap.appendChild(el('span', 'credit', credit));
        fig.appendChild(cap);
      }
    } else {
      pic.innerHTML = ART.make(artName);
    }
    return fig;
  }

  /* Size the picture so that it and its caption always fit in the picture box, never cropped,
     and a small photo is never blown up beyond its `maxScale`. */
  function fit() {
    if (!$stage) return;
    var fig = $stage.querySelector('.figure');
    if (!fig) return;
    var pic = fig.querySelector('.pic');
    var cap = fig.querySelector('.caption');
    var W = fig.clientWidth, H = fig.clientHeight;
    if (!W || !H) return;
    var isPhoto = pic.classList.contains('photo');
    var isPrint = pic.classList.contains('print');
    var ratio = fig._ratio || 1;
    /* The frame around a photo: padding k (a share of the frame width), border b (px).
       The old-print look has a wider cream border, a deeper bottom edge and a slight tilt. */
    var k = isPrint ? 0.045 : (isPhoto ? 0.016 : 0);
    var bottom = isPrint ? 1.3 : 1;
    var b = isPhoto && !isPrint ? 3 : 0;
    var tilt = isPrint ? 0.045 : 0;                           // extra room a tilted frame needs, per unit of width
    var slack = isPrint ? 22 : (isPhoto ? 4 : 12);            // shadow under the picture
    var perW = (1 - 2 * k) / ratio + k * (1 + bottom) + tilt; // frame height per unit of frame width
    var fixed = 2 * b - (2 * b) / ratio + slack;
    var w = W, capH = 0, pass;
    for (pass = 0; pass < 2; pass++) {
      if (cap) {
        cap.style.maxWidth = (pass === 0 ? W : Math.max(w, Math.min(W, 440))) + 'px';
        capH = cap.offsetHeight + (parseFloat(getComputedStyle(cap).marginTop) || 0);
      }
      w = Math.min(W * (1 - tilt), (H - capH - fixed) / perW);
      if (isFinite(fig._max)) w = Math.min(w, (fig._max + 2 * b) / (1 - 2 * k));
      w = Math.max(80, Math.floor(w));
    }
    pic.style.width = w + 'px';
    pic.style.setProperty('--pad', (k * w).toFixed(1) + 'px');
  }

  /* If the words do not fit their box on a small screen, step the type down a little. */
  function fitCopy() {
    var copy = $stage && $stage.querySelector('.copy');
    if (!copy) return;
    copy.classList.remove('fit-1', 'fit-2');
    if (copy.scrollHeight > copy.clientHeight + 2) copy.classList.add('fit-1');
    if (copy.scrollHeight > copy.clientHeight + 2) { copy.classList.remove('fit-1'); copy.classList.add('fit-2'); }
  }
  function refit() { fit(); fitCopy(); fit(); }

  /* ── one slide ── */
  function buildSlide(story, slide, index) {
    var node = el('div', 'slide');
    var copy = el('div', 'copy');
    var fig, h;

    if (slide.type === 'panel') {
      var p = slide.panel;
      fig = buildFigure(p.art, p.photo);
      copy.appendChild(caps('p', 'kicker', t(story.title)));
      h = el('h2', null, t(p.heading));
      copy.appendChild(h);
      copy.appendChild(el('p', null, t(p.text)));
    }
    else if (slide.type === 'facts') {
      node.classList.add('compact');
      fig = buildFigure('facts', null);
      copy.appendChild(caps('p', 'kicker', t(DATA.ui.factsKicker)));
      h = el('h2', null, t(DATA.ui.factsTitle));
      copy.appendChild(h);
      var ul = el('ul', 'facts');
      story.facts.forEach(function (f) { ul.appendChild(el('li', null, t(f))); });
      copy.appendChild(ul);
    }
    else if (slide.type === 'quiz') {
      node.classList.add('compact');
      fig = buildFigure('quiz', null);
      var q = story.quiz;
      copy.appendChild(caps('p', 'kicker', t(DATA.ui.quizKicker)));
      h = el('h2', null, t(q.question));
      copy.appendChild(h);
      var list = el('div', 'answers');
      var verdict = el('p', 'verdict');
      verdict.setAttribute('aria-live', 'polite');
      state.quiz = { picked: [], solved: false };
      q.answers.forEach(function (a, i) {
        var b = el('button', 'answer'); b.type = 'button';
        var mark = el('span', 'mark'); mark.innerHTML = ICON.tick + ICON.cross;
        b.appendChild(mark);
        b.appendChild(el('span', null, t(a)));
        b.addEventListener('click', function () {
          if (state.quiz.solved || b.classList.contains('wrong')) return;
          state.quiz.picked.push(i);
          verdict.textContent = '';
          if (i === q.correct) {
            state.quiz.solved = true;
            b.classList.add('right');
            verdict.appendChild(el('strong', null, t(DATA.ui.quizRight) + ' '));
            verdict.appendChild(doc.createTextNode(t(q.explain)));
          } else {
            b.classList.add('wrong');
            verdict.appendChild(el('strong', null, t(DATA.ui.quizWrong) + ' '));
            verdict.appendChild(doc.createTextNode(t(DATA.ui.quizAgain)));
          }
          fitCopy();
        });
        list.appendChild(b);
      });
      copy.appendChild(list);
      copy.appendChild(verdict);
    }
    else {  /* gift shop line, sources, other stories */
      node.classList.add('compact');
      fig = buildFigure(story.shop.art || 'bag', story.shop.photo);
      copy.appendChild(caps('p', 'kicker', t(DATA.ui.shopKicker)));
      h = el('h2', null, t(story.shop.heading));
      copy.appendChild(h);
      copy.appendChild(el('p', null, t(story.shop.text)));
      if (story.sources) {
        var src = el('p', 'sources');
        src.appendChild(el('b', null, t(DATA.ui.sources) + ': '));
        src.appendChild(doc.createTextNode(t(story.sources)));
        copy.appendChild(src);
      }
      var more = el('div', 'more');
      more.appendChild(caps('p', 'more-label', t(DATA.ui.more)));
      var chips = el('div', 'more-list');
      stories.forEach(function (s) {
        if (s.id === story.id) return;
        var c = el('button', 'chip', t(s.title)); c.type = 'button';
        c.addEventListener('click', function () { open(s.id, 0); });
        chips.appendChild(c);
      });
      more.appendChild(chips);
      copy.appendChild(more);
    }

    if (fig.querySelector('.pic.photo')) node.classList.add('has-photo');
    if (fig.querySelector('.pic.print')) node.classList.add('has-print');
    node.appendChild(fig);
    node.appendChild(copy);
    return node;
  }

  /* ── moving around ── */
  function render(direction) {
    var onHome = state.view === 'home';
    $home.hidden = !onHome;
    $story.hidden = onHome;
    $backTop.hidden = onHome;
    root.setAttribute('data-view', state.view);

    if (onHome) {
      state.slideType = null; state.quiz = null; state.total = 0;
      $stage.textContent = '';
      doc.title = t(DATA.ui.homeTitle) + ' — Linda’s Dutch Pancakes';
      syncAddress();
      return;
    }

    var story = byId[state.storyId];
    var slides = slidesOf(story);
    state.total = slides.length;
    state.index = Math.max(0, Math.min(slides.length - 1, state.index));
    var slide = slides[state.index];
    state.slideType = slide.type;
    state.quiz = null;

    var node = buildSlide(story, slide, state.index);
    if (direction) node.classList.add('enter', direction < 0 ? 'from-left' : 'from-right');
    $stage.textContent = '';
    $stage.appendChild(node);

    /* dots and counter */
    $dots.textContent = '';
    slides.forEach(function (s, i) {
      var d = el('i', i === state.index ? 'on' : (i < state.index ? 'done' : ''));
      $dots.appendChild(d);
    });
    $count.textContent = t(DATA.ui.counter, { n: state.index + 1, total: slides.length });

    /* the Next button turns into "All stories" on the last slide */
    var last = state.index === slides.length - 1;
    $next.textContent = '';
    withIcon($next, last ? t(DATA.ui.allStories) : t(DATA.ui.next), last ? ICON.grid : ICON.right, !last);

    doc.title = t(story.title) + ' — Linda’s Dutch Pancakes';
    refit();
    syncAddress();
  }

  function open(storyId, panelIndex) {
    if (!byId[storyId]) return false;
    var wasHome = state.view === 'home';
    var sameStory = state.storyId === storyId && !wasHome;
    var from = state.index;
    state.view = 'story';
    state.storyId = storyId;
    state.index = Math.max(0, parseInt(panelIndex, 10) || 0);
    render(sameStory ? (state.index < from ? -1 : 1) : 1);
    return true;
  }
  function home() {
    state.view = 'home';
    state.storyId = null;
    state.index = 0;
    render(0);
    $home.scrollTop = 0;
  }
  function next() {
    if (state.view !== 'story') return;
    if (state.index >= state.total - 1) { home(); return; }
    state.index++; render(1);
  }
  function prev() {
    if (state.view !== 'story') return;
    if (state.index <= 0) { home(); return; }
    state.index--; render(-1);
  }

  /* The address keeps track of the place (#hot-delight/3), so a phone's Back button and a
     shared link work. In kiosk mode the page always starts on the start screen. */
  var lastHash = null;
  function syncAddress() {
    var hash = state.view === 'story' ? '#' + state.storyId + '/' + (state.index + 1) : '';
    if (hash === lastHash) return;
    var wasHome = !lastHash;
    lastHash = hash;
    try {
      var url = location.pathname + location.search + hash;
      if (!KIOSK && wasHome && hash) history.pushState(null, '', url);
      else history.replaceState(null, '', url);
    } catch (e) { /* opened from disk in a browser that refuses: the page still works */ }
  }
  function fromAddress() {
    var m = /^#([a-z0-9-]+)(?:\/(\d+))?$/i.exec(location.hash || '');
    if (m && byId[m[1]]) {
      state.view = 'story'; state.storyId = m[1]; state.index = Math.max(0, (parseInt(m[2], 10) || 1) - 1);
      lastHash = location.hash;
    } else {
      state.view = 'home'; state.storyId = null; state.index = 0;
      lastHash = '';
    }
    render(0);
  }

  /* ── input: swipe and keys as extras; the big buttons always work ── */
  function wireInput() {
    var sx = 0, sy = 0, st = 0, tracking = false;
    $story.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      tracking = !e.target.closest('button');
      sx = e.clientX; sy = e.clientY; st = Date.now();
    });
    $story.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - st < 900) {
        if (dx < 0) next(); else prev();
      }
    });
    $story.addEventListener('pointercancel', function () { tracking = false; });

    doc.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (state.view !== 'story') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { next(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { prev(); e.preventDefault(); }
      else if (e.key === 'Escape') { home(); }
    });

    var resizeTimer = 0;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(refit, 60); });
    window.addEventListener('orientationchange', function () { setTimeout(refit, 250); });
    if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) doc.fonts.ready.then(refit);
    window.addEventListener('load', refit);
    window.addEventListener('popstate', function () { if (!KIOSK) fromAddress(); });
  }

  /* ── kiosk mode ── */
  var idleTimer = 0;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (state.view !== 'home') home(); else $home.scrollTop = 0;
      resetIdle();
    }, IDLE_MS);
  }
  function wireKiosk() {
    /* no links that leave the page */
    $logo.removeAttribute('href');
    $logo.setAttribute('aria-disabled', 'true');
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (a) e.preventDefault();
    }, true);

    /* back to the start screen after a while without input */
    ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'].forEach(function (type) {
      doc.addEventListener(type, resetIdle, { passive: true, capture: true });
    });
    resetIdle();

    /* no context menu, no selecting or dragging, no zoom, no pull-to-refresh */
    var stop = function (e) { e.preventDefault(); };
    doc.addEventListener('contextmenu', stop);
    doc.addEventListener('selectstart', stop);
    doc.addEventListener('dragstart', stop);
    doc.addEventListener('gesturestart', stop);
    doc.addEventListener('gesturechange', stop);
    doc.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    doc.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
    doc.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) e.preventDefault();
    });
    var lastTouchEnd = 0;
    doc.addEventListener('touchend', function (e) {                // double-tap zoom on older browsers
      var now = Date.now();
      if (now - lastTouchEnd < 320 && !(e.target.closest && e.target.closest('button'))) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
    var vp = doc.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  }

  /* ── go ── */
  buildHome();
  buildStoryFrame();
  wireInput();
  if (KIOSK) { wireKiosk(); state.view = 'home'; lastHash = ''; render(0); }
  else fromAddress();

  window.__stories = {
    state: state,
    open: open,
    home: home,
    next: next,
    prev: prev,
    refit: refit,
    data: DATA
  };
})();
