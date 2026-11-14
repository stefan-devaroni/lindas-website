/*
 * Where the votes go. The rest of the page only talks to window.VoteBackend, so changing the
 * storage means rewriting this one file.
 *
 *   VoteBackend.vote('33', 'kiosk')  -> Promise { ok, saved: 'database' | 'device', votes, total, error }
 *   VoteBackend.standings()          -> Promise { rows: [{ design, title, votes }] or null, unsent: { '33': 2 }, live }
 *   VoteBackend.cached()             -> the same shape, straight from this device, no network
 *   VoteBackend.status()             -> { remote, deviceOnly, unsent }
 *   VoteBackend.onChange(fn)         -> fn runs whenever status or counts change in the background
 *   VoteBackend.resetDevice()        -> forget votes that only live on this device
 *
 * Storage today: two database functions (see config.js for the address and key).
 *   POST {supabaseUrl}/rest/v1/rpc/tshirt_vote          { p_design: '33', p_source: 'web' | 'kiosk' }
 *   POST {supabaseUrl}/rest/v1/rpc/tshirt_vote_results  {}
 *
 * The screen never waits on the network. If config.js is missing, a call fails or takes longer
 * than 5 seconds, the vote is kept on this device and sent again later when the line is back.
 */
(function () {
  'use strict';

  var cfg = window.LINDAS_CONFIG || {};
  var BASE = String(cfg.supabaseUrl || '').replace(/\/+$/, '');
  var KEY = String(cfg.supabaseKey || '');
  var remote = !!(BASE && KEY && typeof fetch === 'function');
  var TIMEOUT_MS = 5000;
  var RETRY_MS = 30000;

  var K_UNSENT = 'lindas-vote:unsent';   // { '33|kiosk': 2 }  votes not in the database (yet)
  var K_CACHE = 'lindas-vote:cache';     // { t, rows }        last answer from the database

  function load(key, fallback) {
    try { var v = JSON.parse(window.localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: memory only */ }
  }

  var unsent = load(K_UNSENT, {});
  var cache = load(K_CACHE, null);
  if (!unsent || typeof unsent !== 'object') unsent = {};
  if (!cache || !Array.isArray(cache.rows)) cache = null;
  var lastCallFailed = false;
  var listeners = [];
  var flushing = false, flushTimer = null;

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } }); }

  function rpc(name, body, keepalive) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (ctrl) ctrl.abort();
        reject(new Error('timeout'));
      }, TIMEOUT_MS);
      function finish(fn, value) { if (settled) return; settled = true; clearTimeout(timer); fn(value); }
      fetch(BASE + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
        cache: 'no-store',
        keepalive: !!keepalive,
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        return res.json();
      }).then(function (json) { finish(resolve, json); }, function (err) { finish(reject, err); });
    });
  }

  function keepOnDevice(design, source) {
    var k = design + '|' + source;
    unsent[k] = (unsent[k] || 0) + 1;
    save(K_UNSENT, unsent);
    if (remote) scheduleFlush();
  }

  function unsentByDesign() {
    var out = {}, total = 0;
    Object.keys(unsent).forEach(function (k) {
      var n = Number(unsent[k]) || 0, id = k.split('|')[0];
      if (n > 0) { out[id] = (out[id] || 0) + n; total += n; }
    });
    return { map: out, total: total };
  }

  // The database told us the fresh count for one design: keep our copy in step.
  function applyCount(design, votes) {
    if (!cache || typeof votes !== 'number') return;
    cache.rows.forEach(function (r) { if (r.design === design) r.votes = votes; });
    cache.rows.sort(function (a, b) { return b.votes - a.votes; });
    save(K_CACHE, cache);
  }

  function snapshot(live) {
    return { rows: cache ? cache.rows.map(function (r) { return { design: r.design, title: r.title, votes: r.votes }; }) : null,
             unsent: unsentByDesign().map, live: !!live };
  }

  function vote(design, source) {
    design = String(design);
    source = source === 'kiosk' ? 'kiosk' : 'web';
    if (!remote) {
      keepOnDevice(design, source);
      return Promise.resolve({ ok: true, saved: 'device' });
    }
    return rpc('tshirt_vote', { p_design: design, p_source: source }, true).then(function (r) {
      if (r && r.ok) {
        lastCallFailed = false;
        applyCount(design, Number(r.votes));
        flush();
        notify();
        return { ok: true, saved: 'database', votes: r.votes, total: r.total };
      }
      if (r && r.error === 'unknown_design') return { ok: false, error: 'unknown_design' };
      keepOnDevice(design, source);            // "busy" or an answer we do not know: try again later
      lastCallFailed = true;
      notify();
      return { ok: true, saved: 'device', error: (r && r.error) || 'unexpected' };
    }, function (err) {
      keepOnDevice(design, source);
      lastCallFailed = true;
      notify();
      return { ok: true, saved: 'device', error: String((err && err.message) || err) };
    });
  }

  function standings() {
    if (!remote) return Promise.resolve(snapshot(false));
    return rpc('tshirt_vote_results', {}).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error('unexpected answer');
      cache = { t: Date.now(), rows: rows.map(function (r) {
        var id = String(r.design);
        if (/^\d$/.test(id)) id = '0' + id;          // ids are two digits: '5' means '05'
        return { design: id, title: r.title, votes: Number(r.votes) || 0 };
      }) };
      save(K_CACHE, cache);
      lastCallFailed = false;
      flush();
      notify();
      return snapshot(true);
    }, function () {
      lastCallFailed = true;
      notify();
      return snapshot(false);
    });
  }

  // Send votes that were kept on the device, one at a time, oldest design first.
  function flush() {
    if (!remote || flushing) return;
    var keys = Object.keys(unsent).filter(function (k) { return unsent[k] > 0; });
    if (!keys.length) return;
    flushing = true;
    var key = keys[0], parts = key.split('|');
    rpc('tshirt_vote', { p_design: parts[0], p_source: parts[1] === 'kiosk' ? 'kiosk' : 'web' }).then(function (r) {
      flushing = false;
      if (r && (r.ok || r.error === 'unknown_design')) {   // delivered, or the design is no longer in the vote
        unsent[key] -= 1;
        if (unsent[key] <= 0) delete unsent[key];
        save(K_UNSENT, unsent);
        if (r.ok) applyCount(parts[0], Number(r.votes));
        lastCallFailed = false;
        notify();
        flush();
      } else {
        scheduleFlush();
      }
    }, function () { flushing = false; scheduleFlush(); });
  }
  function scheduleFlush() {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, RETRY_MS);
  }

  function status() {
    var u = unsentByDesign().total;
    return { remote: remote, deviceOnly: !remote || lastCallFailed || u > 0, unsent: u };
  }

  window.VoteBackend = {
    vote: vote,
    standings: standings,
    cached: function () { return snapshot(false); },
    status: status,
    onChange: function (fn) { listeners.push(fn); },
    resetDevice: function () { unsent = {}; save(K_UNSENT, unsent); notify(); },
    retryNow: flush
  };

  if (remote && unsentByDesign().total > 0) scheduleFlush();
})();
