// Where the guest map keeps its pins.
// This is the only file that talks to the server, so the backend can be swapped by changing this file alone.
//
// It gives the page four things:
//   LindasMapStore.load()        -> Promise of the data to show (never rejects)
//   LindasMapStore.add(pin)      -> Promise of { ok, local, id, total, countries, same_country } or { ok:false, error }
//   LindasMapStore.current()     -> the data to show right now (server pins + pins still waiting on this device)
//   LindasMapStore.deviceOnly()  -> true when pins are (for now) only saved on this device
//
// If config.js is missing, or the server does not answer within 5 seconds, pins are kept in localStorage
// and sent later, when the server answers again. No names or free text are ever sent: only codes, ids and coordinates.
(function () {
  'use strict';

  var TIMEOUT_MS = 5000;
  var MAX_RESEND = 5;                       // waiting pins sent per refresh
  var K_PENDING = 'lindas_map_pending';     // pins not on the server yet
  var K_CACHE = 'lindas_map_cache';         // last answer from the server, so the map is not empty without internet

  var cfg = window.LINDAS_CONFIG;
  var hasConfig = !!(cfg && cfg.supabaseUrl && cfg.supabaseKey && window.fetch);
  var failed = !hasConfig;
  var flushing = false;
  var listeners = [];

  // ---------- small helpers ----------
  function readJson(k) { try { return JSON.parse(window.localStorage.getItem(k)); } catch (e) { return null; } }
  function writeJson(k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full or blocked: carry on */ } }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function count(v) { return Math.max(0, Math.round(num(v, 0))); }
  function code(v) { return typeof v === 'string' && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : ''; }
  function regionCode(v) { return typeof v === 'string' && /^[A-Za-z0-9]{1,3}$/.test(v) ? v.toUpperCase() : null; }
  function cityId(v) { v = Math.round(num(v, 0)); return v > 0 ? v : null; }
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) { /* keep going */ } }); }

  // One place = one dot. Same city, or same "just my state / country" centre point.
  function key(p) {
    return p.city_id ? 'c' + p.city_id : p.country + '|' + (p.region || '') + '|' + (+p.lat).toFixed(2) + ',' + (+p.lon).toFixed(2);
  }

  // Server answers are data from outside: keep only what has the right shape.
  function normalize(d) {
    var out = { total: 0, today: 0, countries: 0, by_country: [], pins: [] };
    if (Array.isArray(d) && d.length === 1) d = d[0];
    if (!d || typeof d !== 'object') return out;
    out.total = count(d.total); out.today = count(d.today); out.countries = count(d.countries);
    (Array.isArray(d.by_country) ? d.by_country : []).forEach(function (r) {
      var c = code(r && r.country), n = count(r && r.n);
      if (c && n > 0) out.by_country.push({ country: c, n: n });
    });
    (Array.isArray(d.pins) ? d.pins : []).forEach(function (p) {
      if (!p) return;
      var c = code(p.country), lat = num(p.lat, NaN), lon = num(p.lon, NaN);
      if (!c || !(lat >= -90 && lat <= 90) || !(lon >= -180 && lon <= 180)) return;
      out.pins.push({ country: c, region: regionCode(p.region), city_id: cityId(p.city_id), lat: lat, lon: lon, n: Math.max(1, count(p.n)), last: typeof p.last === 'string' ? p.last.slice(0, 40) : '' });
    });
    return out;
  }
  function cleanPin(p) {
    return { country: code(p.country), region: regionCode(p.region), city_id: cityId(p.city_id), lat: Math.round(num(p.lat, 0) * 100) / 100, lon: Math.round(num(p.lon, 0) * 100) / 100, source: p.source === 'kiosk' ? 'kiosk' : 'web' };
  }

  var server = normalize(readJson(K_CACHE));
  var pending = (readJson(K_PENDING) || []).filter(function (p) { return p && code(p.country) && p.lid; });
  function savePending() { writeJson(K_PENDING, pending.map(function (p) { return { lid: p.lid, country: p.country, region: p.region, city_id: p.city_id, lat: p.lat, lon: p.lon, source: p.source, t: p.t }; })); }
  function dropPending(lid) { pending = pending.filter(function (p) { return p.lid !== lid; }); savePending(); }

  // ---------- the two server calls ----------
  function rpc(name, body) {
    if (!hasConfig) return Promise.reject(new Error('no_config'));
    return window.fetch(String(cfg.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: cfg.supabaseKey, Authorization: 'Bearer ' + cfg.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (res) {
      if (!res.ok) throw new Error('http_' + res.status);
      return res.json();
    }).then(function (r) { return Array.isArray(r) && r.length === 1 ? r[0] : r; });
  }
  function addBody(p) {
    return { p_country: p.country, p_lat: p.lat, p_lon: p.lon, p_region: p.region || null, p_city_id: p.city_id || null, p_source: p.source };
  }
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  // ---------- what the page shows ----------
  function current() {
    var d = {
      total: server.total, today: server.today, countries: server.countries,
      by_country: server.by_country.map(function (r) { return { country: r.country, n: r.n }; }),
      pins: server.pins.map(function (p) { return { country: p.country, region: p.region, city_id: p.city_id, lat: p.lat, lon: p.lon, n: p.n, last: p.last }; })
    };
    if (!pending.length) return d;
    var byKey = {}, byCountry = {}, fresh = [], today = new Date().toDateString();
    d.pins.forEach(function (p) { byKey[key(p)] = p; });
    d.by_country.forEach(function (r) { byCountry[r.country] = r; });
    pending.forEach(function (p) {
      var k = key(p), when = new Date(p.t || Date.now());
      if (byKey[k]) { byKey[k].n++; byKey[k].last = when.toISOString(); }
      else { byKey[k] = { country: p.country, region: p.region, city_id: p.city_id, lat: p.lat, lon: p.lon, n: 1, last: when.toISOString() }; fresh.unshift(byKey[k]); }
      d.total++;
      if (when.toDateString() === today) d.today++;
      if (byCountry[p.country]) byCountry[p.country].n++;
      else { byCountry[p.country] = { country: p.country, n: 1 }; d.by_country.push(byCountry[p.country]); d.countries++; }
    });
    d.pins = fresh.concat(d.pins);
    d.by_country.sort(function (a, b) { return b.n - a.n; });
    return d;
  }

  // After the server took a pin: update our copy so the map is right before the next refresh.
  function bumpServer(p, r) {
    var k = key(p), now = new Date().toISOString(), hit = null;
    for (var i = 0; i < server.pins.length; i++) { if (key(server.pins[i]) === k) { hit = server.pins.splice(i, 1)[0]; break; } }
    if (hit) { hit.n++; hit.last = now; } else hit = { country: p.country, region: p.region, city_id: p.city_id, lat: p.lat, lon: p.lon, n: 1, last: now };
    server.pins.unshift(hit);
    var row = null;
    server.by_country.forEach(function (x) { if (x.country === p.country) row = x; });
    if (!row) { row = { country: p.country, n: 0 }; server.by_country.push(row); }
    row.n = count(r.same_country) || row.n + 1;
    server.by_country.sort(function (a, b) { return b.n - a.n; });
    server.total = count(r.total) || server.total + 1;
    server.countries = count(r.countries) || server.by_country.length;
    server.today++;
    writeJson(K_CACHE, server);
  }

  function numbersFor(p) {
    var d = current(), same = 1;
    d.by_country.forEach(function (r) { if (r.country === p.country) same = r.n; });
    return { total: d.total, countries: d.countries, same_country: same };
  }

  // Keep a pin on this device. "late" is a request that is still running after the 5 seconds were up.
  function keep(p, late) {
    var item = { lid: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), country: p.country, region: p.region, city_id: p.city_id, lat: p.lat, lon: p.lon, source: p.source, t: Date.now() };
    pending.push(item); savePending(); failed = true;
    if (late) {
      item.busy = true;
      late.then(function (r) {
        item.busy = false;
        if (r && r.ok === true) { dropPending(item.lid); bumpServer(item, r); failed = false; emit(); }
        else if (r && r.error === 'bad_place') { dropPending(item.lid); emit(); }
      }, function () { item.busy = false; });
    }
    var n = numbersFor(p);
    return { ok: true, local: true, id: null, total: n.total, countries: n.countries, same_country: n.same_country };
  }

  // Send pins that are still waiting on this device, oldest first.
  function flush() {
    if (flushing || !hasConfig) return;
    var sent = 0;
    flushing = true;
    (function next() {
      var item = null;
      for (var i = 0; i < pending.length; i++) { if (!pending[i].busy) { item = pending[i]; break; } }
      if (!item || sent >= MAX_RESEND) { flushing = false; if (sent) emit(); return; }
      rpc('guest_map_add', addBody(item)).then(function (r) {
        if (r && r.ok === true) { dropPending(item.lid); bumpServer(item, r); sent++; next(); }
        else if (r && r.error === 'bad_place') { dropPending(item.lid); sent++; next(); }
        else { flushing = false; if (sent) emit(); }           // "busy": try again at the next refresh
      }, function () { flushing = false; failed = true; if (sent) emit(); });
    })();
  }

  function load() {
    return withTimeout(rpc('guest_map_data', {}), TIMEOUT_MS).then(function (d) {
      server = normalize(d); failed = false;
      writeJson(K_CACHE, server);
      flush();
      return current();
    }, function () {
      failed = true;
      return current();
    });
  }

  function add(pin) {
    var p = cleanPin(pin);
    if (!p.country) return Promise.resolve({ ok: false, error: 'bad_place' });
    var req = rpc('guest_map_add', addBody(p));
    return withTimeout(req, TIMEOUT_MS).then(function (r) {
      if (r && r.ok === true) {
        failed = false;
        bumpServer(p, r);
        var n = numbersFor(p);
        return { ok: true, local: false, id: typeof r.id === 'string' ? r.id.slice(0, 64) : null, total: n.total, countries: n.countries, same_country: n.same_country };
      }
      if (r && r.error === 'bad_place') return { ok: false, error: 'bad_place' };
      return keep(p, null);                                     // "busy" or an answer we do not know: keep it, send later
    }, function (err) {
      return keep(p, err && err.message === 'timeout' ? req : null);
    });
  }

  window.LindasMapStore = {
    load: load,
    add: add,
    current: current,
    deviceOnly: function () { return !hasConfig || failed || pending.length > 0; },
    pendingCount: function () { return pending.length; },
    hasConfig: function () { return hasConfig; },
    onChange: function (fn) { listeners.push(fn); },
    // For testing: forget everything saved on this device.
    clearLocal: function () {
      pending = []; server = normalize(null);
      try { window.localStorage.removeItem(K_PENDING); window.localStorage.removeItem(K_CACHE); } catch (e) { /* nothing to clear */ }
    }
  };
})();
