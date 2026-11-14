/* Linda's Breakfast Rush: screens and buttons.
   Title, level cards, pause, name entry, leaderboard, reward, and the kiosk behaviour.
   URL options:  ?kiosk=1  for the touchscreen in the restaurant,  ?level=3  to start at a level (testing). */
(function () {
  'use strict';
  var LBR = window.LBR, Game = LBR.Game, Snd = LBR.Sound, Board = LBR.Board, A = LBR.Art;
  var S = Game.state;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(n) { try { return Math.round(n).toLocaleString('en-US'); } catch (e) { return String(Math.round(n)); } }
  function setText(el, text) { if (el && el.textContent !== text) el.textContent = text; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  var params;
  try { params = new window.URLSearchParams(window.location.search); } catch (e) { params = { get: function () { return null; } }; }
  var KIOSK = params.get('kiosk') === '1';
  // ?level= is a testing shortcut: it only works on this computer, never on the public site.
  var LOCAL_TEST = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(window.location.hostname);
  var START_LEVEL = LOCAL_TEST ? clamp(parseInt(params.get('level'), 10) || 0, 0, 5) : 0;
  var SOURCE = KIOSK ? 'kiosk' : 'web';
  var REWARD_KEY = 'lindas-game-reward-v1';
  var NAME_KEY = 'lindas-game-name';
  var IDLE_SECONDS = 60, IDLE_WARN = 10;

  var SCREENS = ['title', 'intro', 'pause', 'result', 'name', 'end', 'reward'];
  var current = 'title';
  var heroCache = null;
  var lastEntry = null;      // the score this player just saved: {id, name, score, rankToday, rankAll, local}
  var sessionReward = null;  // {day, name, score}
  var rewardBack = 'title';
  var hooks = {};

  /* ---------- copy ---------- */

  var INTRO = {
    1: { lead: 'The plain pancake. Follow the yellow arrow.', dish: 'plain',
      steps: ['Flour, eggs and milk go in the bowl.', 'Whisk it into batter.', 'Pour a ladle in the pan.', 'Flip once, when the ring is full.', 'Onto a plate. Dust with powdered sugar.', 'Serve.'] },
    2: { lead: 'New today: the banana pancake.', dish: 'banana',
      steps: ['Slice a banana at the board.', 'Cook a pancake as before.', 'Bring the plate to the board. The slices go on top.', 'Dust with powdered sugar, then serve.'] },
    3: { lead: 'New today: the bacon apple pancake.', dish: 'baconApple',
      steps: ['Peel and slice an apple at the board.', 'Apple rings and bacon go in the pan first.', 'Pour the batter over them.', 'Flip, plate, serve. No sugar on a savory pancake.'] },
    4: { lead: 'A second pan is on, and more guests are coming.', dish: null,
      steps: ['Keep both pans busy.', 'One bowl of batter makes four pancakes.', 'A pancake left too long burns. Burnt goes in the bin.'] },
    5: { lead: 'High season on Palm Beach. Everyone wants a pancake and nobody wants to wait.', dish: null,
      steps: ['All three pancakes, two pans.', 'Flip while the ring is green for a bonus.', 'Beat this level and you beat the kitchen.'] }
  };
  var PASS_TITLES = ['Level done', 'Good shift', 'Guests are fed'];
  var PASS_LINES = ['The iguana approves.', 'Clean plates all round.', 'The pans are still warm. On to the next.'];
  var FAIL_LINES = ['The iguana has seen worse. Not often.', 'Batter first, then the rest follows.', 'Every cook burns a few.'];

  /* ---------- screens ---------- */

  function show(name) {
    current = name;
    for (var i = 0; i < SCREENS.length; i++) { var s = $('screen-' + SCREENS[i]); if (s) s.hidden = SCREENS[i] !== name; }
    var inGame = name === 'play' || name === 'pause' || name === 'intro' || name === 'result';
    $('hud').hidden = !inGame;
    $('btn-pause').hidden = name !== 'play';
    document.body.setAttribute('data-screen', name);
    heroCache = null;
    if (name === 'reward') startRewardLoop(); else stopRewardLoop();
    hideIdleWarning();
  }

  hooks.hero = function () {
    if (current !== 'title') return null;
    if (heroCache) return heroCache;
    var app = $('app'), r = $('title-sheet').getBoundingClientRect(), W = app.clientWidth, H = app.clientHeight;
    heroCache = r.width >= W * 0.9 ? { x: 0, y: 0, w: W, h: Math.max(140, r.top) } : { x: 0, y: 0, w: Math.max(140, r.left), h: H };
    return heroCache;
  };
  hooks.onLayout = function (l) { document.documentElement.style.setProperty('--hud-h', l.hudH + 'px'); heroCache = null; };

  /* ---------- leaderboard widget ---------- */

  function makeBoard(root) {
    var st = { period: 'today', me: null, token: 0 };
    var tabs = el('div', 'tabs'), list = el('ol', 'rows'), note = el('p', 'board-note', 'Scores saved on this device only');
    var tToday = el('button', 'tab on', 'TODAY'), tAll = el('button', 'tab', 'ALL TIME');
    tToday.type = tAll.type = 'button';
    tabs.appendChild(tToday); tabs.appendChild(tAll);
    note.hidden = true;
    root.textContent = ''; root.appendChild(tabs); root.appendChild(list); root.appendChild(note);

    function row(rank, r, mine) {
      var li = el('li', mine ? 'me' : '');
      li.appendChild(el('span', 'rk', String(rank)));
      li.appendChild(el('span', 'nm', r.name));
      li.appendChild(el('span', r.won ? 'lv won' : 'lv', r.won ? 'Beat it' : 'Level ' + (r.level || 0)));
      li.appendChild(el('span', 'sc', fmt(r.score)));
      return li;
    }
    function render(res) {
      list.textContent = '';
      var found = false, me = st.me;
      if (!res.rows.length) list.appendChild(el('li', 'empty', st.period === 'today' ? 'No scores yet today. Be the first.' : 'No scores yet. Be the first.'));
      for (var i = 0; i < res.rows.length; i++) {
        var mine = !!(me && res.rows[i].id === me.id); if (mine) found = true;
        list.appendChild(row(i + 1, res.rows[i], mine));
      }
      if (me && !found && res.rows.length) {
        var rank = st.period === 'today' ? me.rankToday : me.rankAll;
        if (rank && rank > res.rows.length) {
          list.appendChild(el('li', 'gap', '...'));
          list.appendChild(row(rank, { name: me.name, score: me.score, level: me.level, won: me.won }, true));
        }
      }
      note.hidden = !res.local;
    }
    function load() {
      var token = ++st.token;
      if (!list.children.length) list.appendChild(el('li', 'empty', 'Loading scores'));
      Board.top(st.period, 10).then(function (res) { if (token === st.token) render(res); });
    }
    function setPeriod(p) {
      st.period = p; tToday.classList.toggle('on', p === 'today'); tAll.classList.toggle('on', p === 'all');
      list.textContent = ''; load();
    }
    tToday.addEventListener('click', function () { setPeriod('today'); });
    tAll.addEventListener('click', function () { setPeriod('all'); });
    return { refresh: function (me) { st.me = me || null; load(); } };
  }
  var titleBoard = null, endBoard = null;

  /* ---------- title ---------- */

  function showTitle() {
    Game.toTitle();
    if (KIOSK) { sessionReward = null; lastEntry = null; }
    $('btn-reward').hidden = KIOSK || !currentReward();
    show('title');
    titleBoard.refresh(lastEntry);
  }
  function startRun(level) { Snd.init(); Game.newRun(level || 1); }

  /* ---------- level intro ---------- */

  function sizeCanvas(cv, cssW, cssH) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    return cv.getContext('2d');
  }
  function drawIntroPic(dish) {
    var cv = $('intro-pic'), g = sizeCanvas(cv, 130, 130), w = cv.width, h = cv.height;
    g.clearRect(0, 0, w, h);
    if (dish) A.dish(g, w / 2, h / 2, w * 0.45, A.dishOf(dish), 0.92);
    else {
      A.dish(g, w * 0.29, h * 0.3, w * 0.26, A.dishOf('plain'), 0.92);
      A.dish(g, w * 0.71, h * 0.3, w * 0.26, A.dishOf('banana'), 0.92);
      A.dish(g, w * 0.5, h * 0.72, w * 0.26, A.dishOf('baconApple'), 0.92);
    }
  }
  hooks.onIntro = function (info) {
    var c = INTRO[info.n];
    setText($('intro-n'), String(info.n));
    setText($('intro-title'), info.title);
    setText($('intro-lead'), c.lead);
    var ol = $('intro-steps'); ol.textContent = '';
    for (var i = 0; i < c.steps.length; i++) ol.appendChild(el('li', '', c.steps[i]));
    setText($('intro-goal'), 'Serve ' + info.goal + ' of ' + info.guests + ' guests to pass.');
    drawIntroPic(c.dish);
    show('intro');
  };

  /* ---------- top bar ---------- */

  hooks.onHud = function (d) {
    setText($('hud-level'), String(d.level));
    setText($('hud-score'), fmt(d.total));
    setText($('hud-served'), d.served + '/' + d.goal);
    var box = $('hud-lost'), allowed = Math.max(0, d.guests - d.goal);
    if (box.children.length !== allowed) { box.textContent = ''; for (var i = 0; i < allowed; i++) box.appendChild(document.createElement('i')); }
    for (var k = 0; k < box.children.length; k++) box.children[k].className = k < d.lost ? 'on' : '';
  };

  /* ---------- pause ---------- */

  function doPause() { if (Game.pause()) show('pause'); }
  function doResume() { Game.resume(); show('play'); }

  /* ---------- level result ---------- */

  var lastResult = null;
  function tallyRow(dl, label, value, cls) {
    var d = el('div', cls || '');
    d.appendChild(el('dt', '', label)); d.appendChild(el('dd', '', value));
    dl.appendChild(d);
  }
  function signed(n) { return (n > 0 ? '+' : '') + fmt(n); }
  hooks.onLevelEnd = function (r) {
    lastResult = r;
    setText($('result-n'), String(r.level));
    setText($('result-title'), r.passed ? (r.won ? 'You beat the kitchen' : pick(PASS_TITLES)) : 'The kitchen fell behind');
    var stars = $('result-stars').children;
    for (var i = 0; i < 3; i++) stars[i].className = i < r.stars ? 'on' : '';
    setText($('result-lead'), r.passed
      ? 'You served ' + r.served + ' of ' + r.guests + ' guests. ' + pick(PASS_LINES)
      : 'Too many guests walked out. You served ' + r.served + ' and needed ' + r.goal + '. ' + pick(FAIL_LINES));
    var dl = $('result-tally'); dl.textContent = '';
    tallyRow(dl, 'Pancakes served', signed(r.base));
    tallyRow(dl, 'Speed tips', signed(r.tips));
    if (r.perfect) tallyRow(dl, 'Good flips (' + r.perfect + ')', signed(r.perfectPoints));
    if (r.burnt) tallyRow(dl, 'Burnt (' + r.burnt + ')', signed(r.burntPoints), 'minus');
    if (r.wrong) tallyRow(dl, 'Wrong orders (' + r.wrong + ')', signed(r.wrongPoints), 'minus');
    if (r.walkouts) tallyRow(dl, 'Walkouts (' + r.walkouts + ')', signed(r.walkoutPoints), 'minus');
    if (r.bonus) tallyRow(dl, r.lost === 0 ? 'Level done, nobody walked out' : 'Level done', signed(r.bonus));
    tallyRow(dl, 'This level', fmt(r.score), 'sum');
    tallyRow(dl, 'Your run so far', fmt(r.total));
    $('btn-next').hidden = !r.passed;
    setText($('btn-next'), r.won ? 'Claim your reward' : 'Next level');
    $('btn-retry').hidden = r.passed;
    $('btn-giveup').hidden = r.passed;
    if (r.won) setReward('GUEST', r.total); // kept even if the page is closed before a name is typed
    show('result');
    if (r.passed) for (var s = 0; s < r.stars; s++) setTimeout(function () { Snd.play('star'); }, 500 + s * 180);
  };

  /* ---------- name entry ---------- */

  var input = null, saving = false, useKeys = false;
  function nameMsg(text) { setText($('name-msg'), text || ''); }
  function goName() {
    Game.abandon();
    var run = S.run;
    setText($('name-title'), run && run.won ? 'You beat the kitchen' : 'Put your name on the board');
    setText($('name-score'), fmt(Game.runTotal()));
    var remembered = '';
    if (!KIOSK) { try { remembered = window.localStorage.getItem(NAME_KEY) || ''; } catch (e) { remembered = ''; } }
    input.value = Board.cleanName(remembered);
    nameMsg('');
    saving = false; $('btn-save').disabled = false; setText($('btn-save'), 'Save score');
    show('name');
    if (!useKeys) { try { input.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  }
  function finishRun(name, score, won) {
    if (won) { setReward(name || 'GUEST', score); showReward('end'); }
    else showEnd();
  }
  function submitName() {
    if (saving) return;
    var run = S.run, chk = Board.checkName(input.value);
    if (!chk.ok) { nameMsg(chk.reason === 'empty' ? 'Type a name first.' : 'Pick another name.'); return; }
    if (run && run.submitted) { finishRun(chk.name, Game.runTotal(), run.won); return; }
    var entry = { name: chk.name, score: Game.runTotal(), level: run ? run.completed : 0, won: !!(run && run.won), source: SOURCE };
    saving = true; $('btn-save').disabled = true; setText($('btn-save'), 'Saving'); nameMsg('');
    function settle() { saving = false; $('btn-save').disabled = false; setText($('btn-save'), 'Save score'); }
    Board.submit(entry).then(function (res) {
      settle();
      if (!res || !res.ok) { nameMsg('Pick another name.'); return; }
      if (run) { run.submitted = true; run.name = chk.name; }
      lastEntry = { id: res.id, name: chk.name, score: entry.score, level: entry.level, won: entry.won, rankToday: res.rankToday, rankAll: res.rankAll, local: !!res.local };
      if (!KIOSK) { try { window.localStorage.setItem(NAME_KEY, chk.name); } catch (e) { /* ignore */ } }
      finishRun(chk.name, entry.score, entry.won);
    }, function () { settle(); nameMsg('Could not save. Try again.'); });
  }
  function skipName() {
    if (saving) return;
    var run = S.run; lastEntry = null;
    finishRun('GUEST', Game.runTotal(), !!(run && run.won));
  }

  var KEY_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  function typeKey(ch) {
    if (ch === 'DELETE') input.value = input.value.slice(0, -1);
    else input.value = Board.cleanName(input.value + (ch === 'SPACE' ? ' ' : ch));
    nameMsg('');
  }
  function buildKeys() {
    var box = $('name-keys'); box.textContent = '';
    function key(label, cls) {
      var b = el('button', 'key' + (cls ? ' ' + cls : ''), label); b.type = 'button';
      b.addEventListener('click', function () { typeKey(label); });
      return b;
    }
    for (var r = 0; r < KEY_ROWS.length; r++) {
      var row = el('div', 'row');
      for (var i = 0; i < KEY_ROWS[r].length; i++) row.appendChild(key(KEY_ROWS[r][i]));
      box.appendChild(row);
    }
    var last = el('div', 'row'); last.appendChild(key('SPACE', 'wide')); last.appendChild(key('DELETE', 'wide')); box.appendChild(last);
  }

  /* ---------- end of a run ---------- */

  function showEnd() {
    Game.abandon();
    var run = S.run, won = !!(run && run.won), total = Game.runTotal();
    setText($('end-title'), won ? 'You beat the kitchen' : 'Kitchen closed');
    var lead;
    if (lastEntry) {
      lead = lastEntry.name + ', ' + fmt(lastEntry.score) + ' points.';
      if (lastEntry.rankToday) lead += ' Number ' + lastEntry.rankToday + ' today.';
      if (lastEntry.rankAll && !lastEntry.local) lead += ' Number ' + lastEntry.rankAll + ' of all time.';
    } else lead = fmt(total) + ' points. Not saved to the board.';
    setText($('end-lead'), lead);
    $('btn-end-reward').hidden = !(won && currentReward());
    show('end');
    endBoard.refresh(lastEntry);
  }

  /* ---------- reward ---------- */

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function arubaNow() { return new Date(Date.now() - 4 * 3600 * 1000); } // Aruba is UTC-4 all year; read it with getUTC*
  function arubaDateText(day) {
    var p = String(day).split('-'), d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }
  function arubaClockText() {
    var d = arubaNow(), h = d.getUTCHours(), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + ' ' + ap;
  }

  // On the shared touchscreen the reward is not stored: the next guest must not find it under "Your reward".
  function setReward(name, score) {
    sessionReward = { day: Board.arubaDay(), name: Board.cleanName(name).replace(/ +$/, '') || 'GUEST', score: Math.max(0, Math.round(score || 0)) };
    if (!KIOSK) { try { window.localStorage.setItem(REWARD_KEY, JSON.stringify(sessionReward)); } catch (e) { /* ignore */ } }
  }
  function currentReward() {
    var today = Board.arubaDay();
    if (sessionReward && sessionReward.day === today) return sessionReward;
    if (KIOSK) return null;
    try {
      var r = JSON.parse(window.localStorage.getItem(REWARD_KEY) || 'null');
      if (r && r.day === today) return { day: r.day, name: Board.cleanName(r.name).replace(/ +$/, '') || 'GUEST', score: Math.max(0, Math.round(Number(r.score) || 0)) };
    } catch (e) { /* ignore */ }
    return null;
  }

  var rewardShown = null, rewardTimer = null, rewardRaf = 0;
  function showReward(back) {
    var r = currentReward(); if (!r) return false;
    rewardShown = r; rewardBack = back || 'title';
    if (S.screen === 'play' || S.screen === 'intro' || S.screen === 'result') Game.abandon();
    setText($('reward-name'), r.name);
    setText($('reward-score'), fmt(r.score));
    setText($('reward-date'), arubaDateText(r.day));
    tickReward();
    show('reward');
    Snd.play('reward');
    return true;
  }
  function tickReward() {
    if (!rewardShown) return;
    setText($('reward-clock'), arubaClockText());
    var expired = Board.arubaDay() !== rewardShown.day;
    $('reward-card').classList.toggle('expired', expired);
    setText($('reward-text'), expired
      ? 'This reward was for an earlier day. It is no longer valid.'
      : "Show this screen at the gift shop in Linda's for an extra 10% off, on top of the 10% you already get. Valid today only.");
  }
  function drawRewardAnim(ts) {
    var cv = $('reward-anim'), g = cv.getContext('2d'), w = cv.width, h = cv.height;
    var t = S.reduced ? 0.5 : ts / 1000, u = h * 0.92;
    g.clearRect(0, 0, w, h);
    A.tulip(g, w * 0.07, h * 0.99, h * 0.92, '#DD3B30', '#A9241D', Math.sin(t * 1.4) * h * 0.02);
    A.tulip(g, w * 0.93, h * 0.99, h * 0.92, '#8C4BC0', '#5E2C86', Math.sin(t * 1.4 + 2) * h * 0.02);
    var cyc = (t % 1.9) / 1.9, flip = !S.reduced && cyc < 0.3 ? cyc / 0.3 : -1;
    A.pan(g, w * 0.36, h * 0.66, u, { batter: true, cook: 1, top: false, topUp: false, flip: flip, seed: 21 });
    A.iguana(g, w * 0.7, h * 0.6, u * 0.9, t, flip >= 0 ? 'happy' : null);
  }
  function startRewardLoop() {
    stopRewardLoop();
    rewardTimer = setInterval(tickReward, 250);
    var loop = function (ts) { drawRewardAnim(ts); rewardRaf = window.requestAnimationFrame(loop); };
    rewardRaf = window.requestAnimationFrame(loop);
  }
  function stopRewardLoop() {
    if (rewardTimer) { clearInterval(rewardTimer); rewardTimer = null; }
    if (rewardRaf) { window.cancelAnimationFrame(rewardRaf); rewardRaf = 0; }
  }
  hooks.onTestReward = function () {
    var run = S.run;
    setReward((run && run.name) || (lastEntry && lastEntry.name) || 'GUEST', run ? Game.runTotal() : 0);
    showReward(run ? 'end' : 'title');
    return currentReward();
  };
  hooks.onTestReset = function () { show('title'); };

  /* ---------- kiosk: back to the title after a minute without a touch ---------- */

  var idleLast = Date.now(), idleWarned = false;
  function touchIdle() { idleLast = Date.now(); if (idleWarned) hideIdleWarning(); }
  function hideIdleWarning() { idleWarned = false; var w = $('idle-warning'); if (w) w.hidden = true; }
  function idleTick() {
    if (!KIOSK) return;
    if (current === 'title') { idleLast = Date.now(); return; }
    var left = IDLE_SECONDS - (Date.now() - idleLast) / 1000;
    if (left <= 0) { hideIdleWarning(); showTitle(); idleLast = Date.now(); }
    else if (left <= IDLE_WARN) { idleWarned = true; $('idle-warning').hidden = false; setText($('idle-count'), String(Math.ceil(left))); }
  }

  /* ---------- wiring ---------- */

  function syncMute() {
    var m = Snd.isMuted(), b = $('btn-mute');
    b.classList.toggle('off', m); b.setAttribute('aria-pressed', m ? 'true' : 'false');
    b.setAttribute('aria-label', m ? 'Sound is off. Turn it on' : 'Sound is on. Turn it off');
  }

  var fitQueued = false, fitW = 0, fitH = 0;
  function fit() {
    fitQueued = false;
    var app = $('app'), cs = window.getComputedStyle($('safe-probe'));
    fitW = app.clientWidth || window.innerWidth; fitH = app.clientHeight || window.innerHeight;
    Game.resize(fitW, fitH, parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingBottom) || 0);
    heroCache = null;
  }
  // Some browsers and kiosk shells are late with, or skip, the resize event after a rotation. Check twice a second.
  function checkSize() {
    var app = $('app'), w = app.clientWidth || window.innerWidth, h = app.clientHeight || window.innerHeight;
    if (w !== fitW || h !== fitH) queueFit();
  }
  // Re-layout on the next frame, or after a short timer if frames are being throttled.
  function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    var run = function () { if (fitQueued) fit(); };
    window.requestAnimationFrame(run);
    window.setTimeout(run, 120);
  }

  function on(id, fn) { $(id).addEventListener('click', fn); }

  function boot() {
    var canvas = $('stage');
    input = $('name-input');
    if (KIOSK) { document.body.classList.add('kiosk'); setText($('btn-play'), 'Tap to play'); }
    document.body.setAttribute('data-screen', 'title');

    Game.init({ canvas: canvas, hooks: hooks, kiosk: KIOSK });
    fit();
    window.addEventListener('resize', queueFit);
    window.addEventListener('orientationchange', function () { queueFit(); setTimeout(queueFit, 350); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', queueFit);
    setInterval(checkSize, 500);

    // The real logo for the entrance sign, and the brand fonts for text on the canvas. Neither is waited for.
    A.loadLogo('../assets/logos/logo-blue.png', function () { Game.renderStatic(); });
    if (document.fonts && document.fonts.load) {
      var again = function () { Game.renderStatic(); };
      document.fonts.load("16px 'Telegrafico'").then(again, function () {});
      document.fonts.load("16px 'Olivier'").then(again, function () {});
      document.fonts.load("600 16px 'Open Sauce One'").then(again, function () {});
    }

    titleBoard = makeBoard($('board-title'));
    endBoard = makeBoard($('board-end'));

    var coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { coarse = false; }
    useKeys = KIOSK || (coarse && Math.min(window.innerWidth, window.innerHeight) >= 700);
    if (useKeys) {
      buildKeys(); $('name-keys').hidden = false; $('name-card').classList.add('keys-on');
      input.readOnly = true; input.setAttribute('inputmode', 'none');
    }

    // taps on the kitchen
    function tap(x, y) {
      var r = canvas.getBoundingClientRect();
      if (current === 'title' && KIOSK) { startRun(1); return; }
      if (current === 'play') Game.tapAt(x - r.left, y - r.top);
    }
    if (window.PointerEvent) {
      canvas.addEventListener('pointerdown', function (e) { if (e.button > 0) return; e.preventDefault(); tap(e.clientX, e.clientY); }, { passive: false });
    } else {
      canvas.addEventListener('touchstart', function (e) { e.preventDefault(); var t = e.changedTouches[0]; tap(t.clientX, t.clientY); }, { passive: false });
      canvas.addEventListener('mousedown', function (e) { if (e.button > 0) return; tap(e.clientX, e.clientY); });
    }

    // sound may only start after a touch; any touch also resets the kiosk timer
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(function (type) {
      document.addEventListener(type, function () { Snd.init(); touchIdle(); }, true);
    });

    // keep the page still: no menu, no selection, no pinch-zoom, no pull-to-refresh
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { if (e.target !== input) e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    window.addEventListener('wheel', function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

    on('btn-play', function () { startRun(1); });
    on('btn-reward', function () { showReward('title'); });
    on('btn-start', function () { Snd.init(); Game.beginLevel(); show('play'); });
    on('btn-pause', doPause);
    on('btn-resume', doResume);
    on('btn-restart', function () { var n = S.level ? S.level.cfg.n : 1; Game.resume(); Game.prepareLevel(n); Game.beginLevel(); show('play'); });
    on('btn-stop', function () { Game.resume(); Game.abandon(); if (Game.runTotal() > 0) goName(); else showTitle(); });
    on('btn-next', function () { if (!lastResult) return; if (lastResult.won) goName(); else Game.prepareLevel(lastResult.level + 1); });
    on('btn-retry', function () { if (!lastResult) return; Game.prepareLevel(lastResult.level); Game.beginLevel(); show('play'); });
    on('btn-giveup', function () { if (Game.runTotal() > 0) goName(); else showEnd(); });
    on('btn-save', submitName);
    on('btn-skip', skipName);
    on('btn-again', function () { lastEntry = null; startRun(1); });
    on('btn-end-reward', function () { showReward('end'); });
    on('btn-home', showTitle);
    on('btn-reward-done', function () { if (rewardBack === 'end' && S.run) showEnd(); else showTitle(); });
    on('btn-idle', touchIdle);
    on('btn-mute', function () { Snd.init(); Snd.setMuted(!Snd.isMuted()); syncMute(); if (!Snd.isMuted()) Snd.play('tap'); });
    syncMute();

    input.addEventListener('input', function () { var v = Board.cleanName(input.value); if (v !== input.value) input.value = v; nameMsg(''); });
    document.addEventListener('keydown', function (e) {
      if (current === 'name') {
        if (e.key === 'Enter') { e.preventDefault(); submitName(); return; }
        if (input.readOnly) {
          if (e.key === 'Backspace') { e.preventDefault(); typeKey('DELETE'); }
          else if (e.key === ' ') { e.preventDefault(); typeKey('SPACE'); }
          else if (e.key && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) typeKey(e.key.toUpperCase());
        }
        return;
      }
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (current === 'play') doPause(); else if (current === 'pause') doResume(); }
    });

    // pause when the tab is hidden
    document.addEventListener('visibilitychange', function () { if (document.hidden && current === 'play') doPause(); });

    setInterval(idleTick, 500);
    if (KIOSK) setInterval(function () { if (current === 'title') titleBoard.refresh(null); }, 60000);

    if (START_LEVEL >= 1) { $('btn-reward').hidden = true; Game.newRun(START_LEVEL); }
    else showTitle();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
