/* Linda's Breakfast Rush: sound.
   Every sound is synthesized with Web Audio. There are no audio files.
   The audio context is only created after the first tap (init()). */
(function () {
  'use strict';
  var LBR = window.LBR = window.LBR || {};

  var MUTE_KEY = 'lindas-game-muted';
  var ctx = null, master = null, sfx = null, musicBus = null;
  var noiseBuf = null, sizzleGain = null;
  // Sound starts OFF. The sound button turns it on, and a phone or laptop remembers that choice.
  // The touchscreen (?kiosk=1) starts off for every new guest.
  var muted = true;
  try {
    if (!/[?&]kiosk=1(&|$)/.test(window.location.search)) muted = window.localStorage.getItem(MUTE_KEY) !== '0';
  } catch (e) { /* ignore */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended' && !held) ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    noiseBuf = makeNoise(2);
    startSizzle();
  }

  function makeNoise(seconds) {
    var n = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // A looping buffer with the crackle baked in, so the sizzle needs no extra nodes while it plays.
  function startSizzle() {
    var seconds = 3, n = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    var env = 0.4, pop = 0;
    for (var i = 0; i < n; i++) {
      if (i % 64 === 0) env += (Math.random() - 0.5) * 0.12, env = Math.max(0.22, Math.min(0.75, env));
      if (Math.random() < 0.0009) pop = 1;
      pop *= 0.9985;
      var edge = Math.min(1, i / 2000, (n - i) / 2000); // soft loop seam
      d[i] = (Math.random() * 2 - 1) * (env + pop * 0.9) * edge;
    }
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
    var bp = ctx.createBiquadFilter(); bp.type = 'peaking'; bp.frequency.value = 5600; bp.Q.value = 0.8; bp.gain.value = 6;
    sizzleGain = ctx.createGain(); sizzleGain.gain.value = 0;
    src.connect(hp); hp.connect(bp); bp.connect(sizzleGain); sizzleGain.connect(sfx);
    src.start();
  }

  function setSizzle(level) { // 0 = off, 1 = one pan, 2 = two pans
    if (!ctx || !sizzleGain) return;
    var g = level <= 0 ? 0 : 0.05 + 0.035 * Math.min(2, level);
    sizzleGain.gain.setTargetAtTime(g, ctx.currentTime, 0.12);
  }

  function tone(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0), d = o.d || 0.12;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    var peak = o.g == null ? 0.18 : o.g, a = o.a == null ? 0.006 : o.a;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    osc.connect(g); g.connect(o.bus || sfx);
    osc.start(t0); osc.stop(t0 + d + 0.04);
  }

  function noise(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0), d = o.d || 0.1;
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    f.Q.value = o.q == null ? 1 : o.q;
    var g = ctx.createGain(), peak = o.g == null ? 0.2 : o.g, a = o.a == null ? 0.005 : o.a;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    src.connect(f); f.connect(g); g.connect(o.bus || sfx);
    src.start(t0, Math.random() * 1.5); src.stop(t0 + d + 0.04);
  }

  // A small bell: a fundamental and two partials with a long tail.
  function bell(f, t, g, d) {
    tone({ f: f, t: t, d: d || 0.7, g: g || 0.16 });
    tone({ f: f * 2.01, t: t, d: (d || 0.7) * 0.6, g: (g || 0.16) * 0.35 });
    tone({ f: f * 3.02, t: t, d: (d || 0.7) * 0.35, g: (g || 0.16) * 0.15 });
  }

  var SOUNDS = {
    tap: function () { tone({ f: 620, f2: 820, d: 0.05, g: 0.06, type: 'triangle' }); },
    pick: function () { tone({ f: 480, f2: 720, d: 0.08, g: 0.12, type: 'triangle' }); },
    drop: function () { tone({ f: 330, f2: 190, d: 0.1, g: 0.14 }); noise({ f: 500, d: 0.06, g: 0.06, type: 'lowpass' }); },
    plop: function () { tone({ f: 260, f2: 520, d: 0.09, g: 0.14 }); tone({ f: 180, f2: 120, d: 0.12, g: 0.1, t: 0.03 }); },
    nope: function () { tone({ f: 190, f2: 150, d: 0.09, g: 0.1, type: 'square' }); tone({ f: 150, f2: 120, d: 0.12, g: 0.1, type: 'square', t: 0.11 }); },
    whisk: function () {
      for (var i = 0; i < 9; i++) {
        noise({ f: 2400 + (i % 2) * 700, d: 0.07, g: 0.07, t: i * 0.16, q: 2 });
        tone({ f: 1500 + (i % 3) * 180, d: 0.04, g: 0.025, t: i * 0.16 + 0.02, type: 'triangle' });
      }
    },
    pour: function () { noise({ f: 900, f2: 320, d: 0.45, g: 0.16, q: 1.4 }); noise({ f: 5200, d: 0.5, g: 0.1, t: 0.12, type: 'highpass', a: 0.08 }); },
    sizzleIn: function () { noise({ f: 4800, d: 0.5, g: 0.14, type: 'highpass', a: 0.02 }); },
    flip: function () { noise({ f: 420, f2: 1900, d: 0.2, g: 0.14, q: 1.2 }); noise({ f: 800, d: 0.07, g: 0.2, t: 0.36, type: 'lowpass' }); tone({ f: 150, f2: 90, d: 0.09, g: 0.16, t: 0.36 }); },
    perfect: function () { bell(1319, 0, 0.1, 0.35); bell(1661, 0.08, 0.1, 0.35); bell(1976, 0.16, 0.12, 0.5); },
    ding: function () { bell(1568, 0, 0.14, 0.6); },
    ready: function () { bell(1047, 0, 0.13, 0.4); bell(1568, 0.12, 0.14, 0.7); },
    warn: function () { tone({ f: 880, d: 0.08, g: 0.08, type: 'square' }); tone({ f: 880, d: 0.08, g: 0.08, type: 'square', t: 0.14 }); },
    burn: function () { tone({ f: 240, f2: 80, d: 0.55, g: 0.16, type: 'sawtooth' }); noise({ f: 3000, d: 0.7, g: 0.16, type: 'highpass', a: 0.03 }); },
    chop: function () { for (var i = 0; i < 5; i++) { noise({ f: 1400, d: 0.04, g: 0.2, t: i * 0.26, type: 'lowpass' }); tone({ f: 190, f2: 120, d: 0.05, g: 0.14, t: i * 0.26 }); } },
    peel: function () { for (var i = 0; i < 4; i++) noise({ f: 2600, f2: 3800, d: 0.16, g: 0.07, t: i * 0.2, q: 3 }); for (var j = 0; j < 4; j++) { noise({ f: 1400, d: 0.04, g: 0.2, t: 0.95 + j * 0.26, type: 'lowpass' }); tone({ f: 190, f2: 120, d: 0.05, g: 0.14, t: 0.95 + j * 0.26 }); } },
    sugar: function () { for (var i = 0; i < 3; i++) noise({ f: 6500, d: 0.07, g: 0.1, t: i * 0.17, type: 'highpass' }); },
    serve: function () { bell(2093, 0, 0.16, 0.8); bell(2093, 0.16, 0.12, 0.7); },
    tip: function () { tone({ f: 1568, d: 0.09, g: 0.1, t: 0.3, type: 'triangle' }); tone({ f: 2093, d: 0.16, g: 0.1, t: 0.38, type: 'triangle' }); },
    ticket: function () { noise({ f: 3200, d: 0.05, g: 0.06, type: 'highpass' }); tone({ f: 784, d: 0.1, g: 0.1, type: 'triangle' }); tone({ f: 1047, d: 0.14, g: 0.1, t: 0.09, type: 'triangle' }); },
    leave: function () { tone({ f: 392, d: 0.2, g: 0.13, type: 'triangle' }); tone({ f: 294, f2: 262, d: 0.34, g: 0.13, t: 0.2, type: 'triangle' }); },
    bin: function () { noise({ f: 420, d: 0.14, g: 0.22, type: 'lowpass' }); tone({ f: 130, f2: 70, d: 0.16, g: 0.16 }); tone({ f: 900, d: 0.05, g: 0.04, t: 0.1, type: 'square' }); },
    wrong: function () { tone({ f: 233, d: 0.16, g: 0.12, type: 'sawtooth' }); tone({ f: 196, d: 0.28, g: 0.12, t: 0.15, type: 'sawtooth' }); },
    start: function () { bell(784, 0, 0.1, 0.3); bell(988, 0.12, 0.1, 0.3); bell(1175, 0.24, 0.12, 0.5); },
    win: function () { var n = [523, 659, 784, 1047, 784, 1047, 1319]; for (var i = 0; i < n.length; i++) bell(n[i], i * 0.12, 0.12, i === n.length - 1 ? 1.1 : 0.4); },
    fail: function () { var n = [392, 370, 349, 294]; for (var i = 0; i < n.length; i++) tone({ f: n[i], d: i === 3 ? 0.7 : 0.26, g: 0.13, t: i * 0.24, type: 'triangle' }); },
    star: function () { bell(1319, 0, 0.1, 0.4); bell(1760, 0.07, 0.08, 0.4); },
    reward: function () { var n = [523, 659, 784, 1047, 1319, 1568, 2093]; for (var i = 0; i < n.length; i++) bell(n[i], i * 0.1, 0.11, 0.7); }
  };

  function play(name) {
    if (!ctx || muted || held || !SOUNDS[name]) return;
    try { SOUNDS[name](); } catch (e) { /* a failed sound must never stop the game */ }
  }

  /* ---------- Music: a short original loop on a soft steel-pan voice ---------- */

  var MELODY = [
    76, 0, 79, 0, 81, 79, 0, 76,   79, 0, 76, 0, 72, 0, 0, 0,
    77, 0, 81, 0, 84, 81, 0, 77,   81, 0, 77, 0, 74, 0, 0, 0,
    74, 0, 79, 0, 83, 79, 0, 74,   83, 0, 81, 0, 79, 0, 77, 0,
    76, 0, 79, 0, 84, 0, 79, 76,   72, 0, 0, 76, 72, 0, 0, 0,
    72, 0, 76, 79, 0, 76, 0, 72,   76, 0, 0, 79, 0, 0, 76, 0,
    77, 0, 81, 84, 0, 81, 0, 77,   81, 0, 0, 84, 0, 0, 81, 0,
    79, 0, 83, 86, 0, 83, 0, 79,   86, 0, 83, 0, 79, 0, 74, 0,
    84, 0, 79, 0, 76, 0, 79, 0,    72, 0, 0, 0, 0, 0, 0, 0
  ];
  var ROOTS = [48, 48, 53, 53, 55, 55, 48, 48, 48, 48, 53, 53, 55, 55, 48, 48];
  var music = { on: false, timer: null, step: 0, next: 0, tempo: 104 };
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function panNote(m, t, g) {
    var f = hz(m), rel = t - ctx.currentTime;
    tone({ f: f * 1.012, f2: f, t: rel, d: 0.42, g: g, bus: musicBus });
    tone({ f: f * 2, t: rel, d: 0.2, g: g * 0.4, bus: musicBus });
    tone({ f: f * 3.01, t: rel, d: 0.1, g: g * 0.12, bus: musicBus });
  }
  function schedule() {
    if (!ctx || !music.on || held) return;
    var stepLen = 60 / music.tempo / 2;
    if (music.next < ctx.currentTime) music.next = ctx.currentTime + 0.05;
    while (music.next < ctx.currentTime + 0.3) {
      var s = music.step, bar = Math.floor(s / 8), i = s % 8, rel = music.next - ctx.currentTime;
      if (MELODY[s]) panNote(MELODY[s], music.next, 0.07);
      var root = ROOTS[bar];
      if (i === 0 || i === 3) tone({ f: hz(root), t: rel, d: 0.3, g: 0.1, type: 'triangle', bus: musicBus });
      if (i === 6) tone({ f: hz(root + 7), t: rel, d: 0.22, g: 0.08, type: 'triangle', bus: musicBus });
      if (i === 2 || i === 5) { panNote(root + 24, music.next, 0.018); panNote(root + 28, music.next, 0.018); }
      noise({ f: 7000, t: rel, d: 0.035, g: i % 2 ? 0.022 : 0.01, type: 'highpass', bus: musicBus });
      music.step = (s + 1) % MELODY.length;
      music.next += stepLen;
    }
  }
  function musicStart(tempo) {
    if (!ctx) return;
    music.tempo = tempo || 104;
    if (music.on) return;
    music.on = true; music.step = 0; music.next = ctx.currentTime + 0.15;
    music.timer = setInterval(schedule, 70);
  }
  function musicStop() {
    music.on = false;
    if (music.timer) { clearInterval(music.timer); music.timer = null; }
  }

  /* ---------- Mute, pause ---------- */

  var held = false; // true while the game is paused or the tab is hidden
  function setMuted(m) {
    muted = !!m;
    try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }
  function hold(on) {
    held = !!on;
    if (!ctx) return;
    try { if (held) ctx.suspend(); else ctx.resume(); } catch (e) { /* ignore */ }
  }

  LBR.Sound = {
    init: init,
    play: play,
    setSizzle: setSizzle,
    musicStart: musicStart,
    musicStop: musicStop,
    setMuted: setMuted,
    isMuted: function () { return muted; },
    hold: hold,
    ready: function () { return !!ctx; },
    // For checking the sound set-up without playing anything out loud.
    status: function () {
      return {
        created: !!ctx, state: ctx ? ctx.state : 'not started', muted: muted, held: held,
        masterGain: master ? master.gain.value : null, sfxGain: sfx ? sfx.gain.value : null, musicGain: musicBus ? musicBus.gain.value : null,
        sizzleGain: sizzleGain ? sizzleGain.gain.value : null, musicPlaying: music.on, tempo: music.tempo, sounds: Object.keys(SOUNDS)
      };
    }
  };
})();
