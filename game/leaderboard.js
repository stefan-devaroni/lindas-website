/* Linda's Breakfast Rush: leaderboard.
   Everything that talks to the score backend lives in this one file,
   so the backend can be swapped later without touching the game.

   Public API (window.LBR.Board):
     submit({name, score, level, won, source}) -> Promise<{ok, id, rankToday, rankAll, local} | {ok:false, error}>
     top('today' | 'all', limit)               -> Promise<{rows, local}>
     checkName(raw)                            -> {ok, name, reason}
     cleanName(raw), arubaDay(ms), hasBackend()
*/
(function () {
  'use strict';
  var LBR = window.LBR = window.LBR || {};

  var STORE_KEY = 'lindas-game-scores-v1';
  var TIMEOUT_MS = 5000;
  var MAX_NAME = 10;
  var MAX_SCORE = 50000;
  var ARUBA_OFFSET_MS = -4 * 3600 * 1000; // Aruba is UTC-4 all year

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // Calendar day in Aruba, as YYYY-MM-DD.
  function arubaDay(ms) {
    var d = new Date((ms == null ? Date.now() : ms) + ARUBA_OFFSET_MS);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }

  function config() {
    var c = window.LINDAS_GAME_CONFIG;
    return (c && c.supabaseUrl && c.supabaseKey) ? c : null;
  }
  function hasBackend() { return !!config() && typeof window.fetch === 'function'; }

  /* ---------- Names ---------- */

  // Letters, digits and spaces only, uppercase, at most 10 characters.
  function cleanName(raw) {
    return String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/ {2,}/g, ' ').replace(/^ /, '').slice(0, MAX_NAME);
  }

  // A basic list for a public screen. The server has the final say.
  // RUDE_ANYWHERE matches inside a name (spaces ignored); RUDE_WORDS only as a whole word,
  // so names like CASSIE, GRAPE or CONOR are not refused.
  var RUDE_ANYWHERE = ['FUCK', 'FUK', 'SHIT', 'BITCH', 'CUNT', 'DICK', 'COCK', 'PUSSY', 'ASSHOLE', 'BASTARD', 'WHORE', 'SLUT', 'NIGG', 'FAGG', 'PENIS', 'VAGINA', 'PORN', 'RAPIST', 'NAZI', 'HITLER', 'WANK', 'TWAT', 'BOOB', 'DILDO', 'KANKER', 'TERING', 'TYFUS', 'KLOOT', 'NEUK', 'EIKEL', 'MONGOOL', 'PUTA', 'MIERDA', 'PENDEJ', 'COJON', 'CABRON', 'KABRON', 'MARICON'];
  var RUDE_WORDS = ['ASS', 'ARSE', 'CUM', 'FAG', 'SEX', 'SEXY', 'TIT', 'TITS', 'KUT', 'LUL', 'PIK', 'ANUS', 'ANAL', 'PISS', 'CRAP', 'KKK', 'XXX', 'CULO', 'CONO', 'PUTO', 'RAPE', 'HOER', 'SLET', 'MERDA', 'VERGA', 'ZORRA', 'NUDE'];

  function unLeet(s) {
    return s.replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A').replace(/5/g, 'S').replace(/7/g, 'T').replace(/8/g, 'B');
  }
  function isRude(name) {
    var plain = unLeet(name);
    var squashed = plain.replace(/ /g, '');
    var i;
    for (i = 0; i < RUDE_ANYWHERE.length; i++) if (squashed.indexOf(RUDE_ANYWHERE[i]) !== -1) return true;
    var words = plain.split(' ').concat([squashed]);
    for (i = 0; i < words.length; i++) if (RUDE_WORDS.indexOf(words[i]) !== -1) return true;
    return false;
  }

  function checkName(raw) {
    var name = cleanName(raw).replace(/ +$/, '');
    if (!name) return { ok: false, name: name, reason: 'empty' };
    if (isRude(name)) return { ok: false, name: name, reason: 'rude' };
    return { ok: true, name: name };
  }

  /* ---------- Scores kept on this device ---------- */

  function readLocal() {
    try {
      var rows = JSON.parse(window.localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(rows) ? rows.map(normRow).filter(Boolean) : [];
    } catch (e) { return []; }
  }
  function writeLocal(rows) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(rows.slice(0, 200))); } catch (e) { /* storage full or blocked: nothing to do */ }
  }
  function byScore(a, b) { return (b.score - a.score) || (a.created_at < b.created_at ? -1 : 1); }

  function addLocal(entry, id) {
    var rows = readLocal();
    var row = {
      id: id || ('local-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
      name: entry.name, score: entry.score, level: entry.level, won: entry.won,
      created_at: new Date().toISOString()
    };
    rows.push(row);
    rows.sort(byScore);
    writeLocal(rows);
    return row;
  }
  function localRows(period) {
    var rows = readLocal();
    if (period !== 'all') {
      var today = arubaDay();
      rows = rows.filter(function (r) { return arubaDay(Date.parse(r.created_at)) === today; });
    }
    return rows.sort(byScore);
  }
  function localRank(id, period) {
    var rows = localRows(period);
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return i + 1;
    return null;
  }

  function normRow(r) {
    if (!r || typeof r !== 'object') return null;
    var created = typeof r.created_at === 'string' && !isNaN(Date.parse(r.created_at)) ? r.created_at : new Date().toISOString();
    return {
      id: String(r.id == null ? '' : r.id),
      name: cleanName(r.name).replace(/ +$/, '') || 'GUEST',
      score: Math.max(0, Math.round(Number(r.score) || 0)),
      level: Math.max(0, Math.min(5, Math.round(Number(r.level) || 0))),
      won: !!r.won,
      created_at: created
    };
  }

  /* ---------- Backend calls ---------- */

  function rpc(fn, body) {
    var c = config();
    if (!c || typeof window.fetch !== 'function') return Promise.reject(new Error('no_config'));
    var ctrl = typeof window.AbortController === 'function' ? new window.AbortController() : null;
    var timer = null;
    var timeout = new Promise(function (resolve, reject) {
      timer = setTimeout(function () {
        if (ctrl) { try { ctrl.abort(); } catch (e) { /* ignore */ } }
        reject(new Error('timeout'));
      }, TIMEOUT_MS);
    });
    var request = window.fetch(String(c.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'apikey': c.supabaseKey, 'Authorization': 'Bearer ' + c.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().then(function (data) {
        // The submit function answers {ok:false, error} for a refused score; pass that through whatever the status.
        if (!res.ok && !(data && data.ok === false && data.error)) throw new Error('http_' + res.status);
        return data;
      });
    });
    function done() { if (timer) { clearTimeout(timer); timer = null; } }
    return Promise.race([request, timeout]).then(function (v) { done(); return v; }, function (e) { done(); throw e; });
  }

  function submit(entry) {
    var check = checkName(entry && entry.name);
    var e = {
      name: check.name || 'GUEST',
      score: Math.max(0, Math.min(MAX_SCORE, Math.round(Number(entry && entry.score) || 0))),
      level: Math.max(0, Math.min(5, Math.round(Number(entry && entry.level) || 0))),
      won: !!(entry && entry.won),
      source: entry && entry.source === 'kiosk' ? 'kiosk' : 'web'
    };
    if (check.reason === 'rude') return Promise.resolve({ ok: false, error: 'bad_name' });

    function keepOnDevice(reason) {
      var row = addLocal(e);
      return { ok: true, local: true, reason: reason, id: row.id, name: e.name, score: e.score, rankToday: localRank(row.id, 'today'), rankAll: localRank(row.id, 'all') };
    }
    if (!hasBackend()) return Promise.resolve(keepOnDevice('no_config'));

    return rpc('game_submit_score', { p_name: e.name, p_score: e.score, p_level: e.level, p_won: e.won, p_source: e.source }).then(function (res) {
      if (res && res.ok === true) {
        var id = String(res.id);
        addLocal(e, id); // mirror, so the device list still has it if the network drops later
        return { ok: true, local: false, id: id, name: e.name, score: e.score, rankToday: Number(res.rank_today) || null, rankAll: Number(res.rank_all) || null };
      }
      if (res && res.error === 'bad_name') return { ok: false, error: 'bad_name' };
      return keepOnDevice((res && res.error) || 'error'); // busy, bad_score, bad_level, anything else
    }, function () {
      return keepOnDevice('network');
    });
  }

  function top(period, limit) {
    period = period === 'all' ? 'all' : 'today';
    limit = limit || 10;
    function fromDevice() { return { rows: localRows(period).slice(0, limit), local: true }; }
    if (!hasBackend()) return Promise.resolve(fromDevice());
    return rpc('game_leaderboard', { p_period: period, p_limit: limit }).then(function (rows) {
      if (!Array.isArray(rows)) throw new Error('bad_response');
      return { rows: rows.map(normRow).filter(Boolean).slice(0, limit), local: false };
    }).catch(function () { return fromDevice(); });
  }

  LBR.Board = {
    submit: submit,
    top: top,
    checkName: checkName,
    cleanName: cleanName,
    arubaDay: arubaDay,
    hasBackend: hasBackend,
    MAX_NAME: MAX_NAME,
    MAX_SCORE: MAX_SCORE
  };
})();
