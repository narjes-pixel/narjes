/* =============================================================
   music.js — یک قطعه‌ی زنده برای نرجس
   پیانوی الکتریک + پد امبینت + بیس + زنگ‌های ریز
   هیچ فایل صوتی‌ای لود نمی‌شود؛ همه چیز در لحظه ساخته می‌شود.
   ============================================================= */
(function (global) {
  "use strict";

  var A4 = 440;
  function mtof(m) { return A4 * Math.pow(2, (m - 69) / 12); }

  /* ─────────── تنظیمات قطعه ─────────── */
  var BPM = 66;
  var BEAT = 60 / BPM;          // ~0.909 ثانیه
  var BAR = BEAT * 4;           // ~3.64 ثانیه
  var BARS = 8;                 // یک جمله‌ی هشت‌میزانی

  // چهار آکورد، هر کدام دو میزان
  var CHORDS = [
    { arp: [57, 60, 64, 67, 71], pad: [57, 60, 64, 67], bass: 45 },  // Am9
    { arp: [53, 57, 60, 64, 67], pad: [53, 57, 60, 64], bass: 41 },  // Fmaj9
    { arp: [55, 60, 64, 67, 71], pad: [55, 60, 64, 67], bass: 36 },  // Cmaj7
    { arp: [55, 59, 62, 64, 69], pad: [55, 59, 62, 66], bass: 43 }   // G6/9
  ];

  // الگوهای آرپژ (اندیسِ نتِ آکورد برای هر ضربِ هشتم)
  var PATTERNS = [
    [0, 1, 2, 3, 4, 3, 2, 1],
    [0, 2, 1, 3, 2, 4, 3, 2],
    [4, 3, 2, 1, 0, 1, 2, 3],
    [0, 1, 2, 4, 3, 2, 1, 2]
  ];

  // ملودی: میزان، ضرب، نت، کشش
  var MELODY = [
    [0, 0.0, 72, 1.5], [0, 1.5, 71, 0.5], [0, 2.0, 69, 1.0], [0, 3.0, 67, 1.0],
    [1, 0.0, 69, 2.0], [1, 2.0, 76, 1.5], [1, 3.5, 74, 0.5],
    [2, 0.0, 72, 1.5], [2, 1.5, 69, 0.5], [2, 2.0, 67, 2.0],
    [3, 0.0, 65, 1.0], [3, 1.0, 64, 1.0], [3, 2.0, 67, 2.0],
    [4, 0.0, 76, 1.0], [4, 1.0, 74, 1.0], [4, 2.0, 72, 1.0], [4, 3.0, 71, 1.0],
    [5, 0.0, 69, 3.0], [5, 3.0, 71, 1.0],
    [6, 0.0, 74, 1.5], [6, 1.5, 71, 0.5], [6, 2.0, 69, 2.0],
    [7, 0.0, 67, 1.0], [7, 1.0, 64, 1.0], [7, 2.0, 69, 2.0]
  ];

  var SPARKLE = [84, 86, 88, 91, 93, 96];

  /* ─────────── وضعیت ─────────── */
  var ctx = null, bus = null, master = null, comp = null, analyser = null;
  var wetIn = null, wetOut = null;
  var timer = null, barIdx = 0, nextBarTime = 0, playing = false, session = 0;
  var live = [];
  var volume = 0.7;

  function now() { return ctx ? ctx.currentTime : 0; }

  /* ─────────── ساخت گراف صدا ─────────── */
  function impulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  function build() {
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = volume;

    bus = ctx.createGain();
    bus.gain.value = 1;

    comp = ctx.createDynamicsCompressor();
    try {
      comp.threshold.value = -18; comp.knee.value = 24;
      comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.28;
    } catch (e) {}

    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;

    bus.connect(master);
    master.connect(comp);
    comp.connect(analyser);
    comp.connect(ctx.destination);

    // ریورب
    var conv = ctx.createConvolver();
    conv.buffer = impulse(3.4, 2.6);
    wetIn = ctx.createGain(); wetIn.gain.value = 0.9;
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 260;
    wetOut = ctx.createGain(); wetOut.gain.value = 0.85;
    wetIn.connect(hp); hp.connect(conv); conv.connect(wetOut); wetOut.connect(bus);

    return true;
  }

  function reg(nodes, g, end) {
    live.push({ nodes: nodes, g: g, end: end });
    if (live.length > 400) cleanup(now() - 1);
  }
  function cleanup(t) {
    var out = [];
    for (var i = 0; i < live.length; i++) if (live[i].end > t) out.push(live[i]);
    live = out;
  }

  /* ─────────── صداها ─────────── */
  function piano(time, midi, dur, vel, pan) {
    var freq = mtof(midi);
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 0.5;
    f.frequency.setValueAtTime(4600, time);
    f.frequency.exponentialRampToValueAtTime(1250, time + 0.9);

    var car = ctx.createOscillator(); car.type = "sine"; car.frequency.value = freq;
    var mod = ctx.createOscillator(); mod.type = "sine"; mod.frequency.value = freq * 2;
    var mg = ctx.createGain();
    var idx = freq * 2.4 * vel;
    mg.gain.setValueAtTime(Math.max(1, idx), time);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, idx * 0.02), time + 0.32);
    mod.connect(mg); mg.connect(car.frequency);

    var peak = 0.20 * vel;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.006);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * 0.30), time + 0.34);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.8, dur * 0.8) + 1.1);

    var tail = g;
    if (pan && ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      f.connect(p); p.connect(g);
    } else {
      f.connect(g);
    }
    car.connect(f);
    g.connect(bus); g.connect(wetIn);

    var end = time + Math.max(0.8, dur * 0.8) + 1.2;
    car.start(time); mod.start(time);
    car.stop(end); mod.stop(end);
    reg([car, mod], tail, end);
  }

  function pad(time, midi, dur, vel) {
    var freq = mtof(midi);
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 0.7;
    f.frequency.setValueAtTime(620, time);
    f.frequency.linearRampToValueAtTime(1450, time + dur * 0.45);
    f.frequency.linearRampToValueAtTime(700, time + dur);

    var o1 = ctx.createOscillator(); o1.type = "triangle"; o1.frequency.value = freq; o1.detune.value = -7;
    var o2 = ctx.createOscillator(); o2.type = "sawtooth"; o2.frequency.value = freq; o2.detune.value = 8;
    var g2 = ctx.createGain(); g2.gain.value = 0.22;

    // لرزشِ خیلی آرام برای زنده بودن صدا
    var lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.16 + Math.random() * 0.12;
    var lg = ctx.createGain(); lg.gain.value = 4;
    lfo.connect(lg); lg.connect(o2.detune);

    var peak = 0.052 * vel;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 1.4);
    g.gain.linearRampToValueAtTime(peak * 0.92, time + Math.max(1.6, dur - Math.min(1.6, dur * 0.45)));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.9);

    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g);
    g.connect(bus); g.connect(wetIn);

    var end = time + dur + 1.0;
    o1.start(time); o2.start(time); lfo.start(time);
    o1.stop(end); o2.stop(end); lfo.stop(end);
    reg([o1, o2, lfo], g, end);
  }

  function bass(time, midi, dur, vel) {
    var freq = mtof(midi);
    var g = ctx.createGain();
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 340; f.Q.value = 0.4;

    var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq;
    var g2 = ctx.createGain(); g2.gain.value = 0.16;

    var peak = 0.30 * vel;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.03);
    g.gain.exponentialRampToValueAtTime(peak * 0.45, time + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.55, dur));

    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(bus);
    var end = time + Math.max(0.55, dur) + 0.1;
    o.start(time); o2.start(time);
    o.stop(end); o2.stop(end);
    reg([o, o2], g, end);
  }

  function bell(time, midi, vel) {
    var freq = mtof(midi);
    var g = ctx.createGain();
    var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    var o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.76;
    var g2 = ctx.createGain(); g2.gain.value = 0.24;

    var peak = 0.055 * vel;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 3.4);

    o.connect(g); o2.connect(g2); g2.connect(g);
    var node = g;
    if (ctx.createStereoPanner) {
      var p = ctx.createStereoPanner();
      p.pan.value = Math.random() * 1.6 - 0.8;
      g.connect(p); node = p;
    }
    node.connect(bus); node.connect(wetIn);
    o.start(time); o2.start(time);
    o.stop(time + 3.5); o2.stop(time + 3.5);
    reg([o, o2], g, time + 3.5);
  }

  /* ─────────── زمان‌بند ─────────── */
  function scheduleBar(b, t) {
    var ci = Math.floor(b / 2) % CHORDS.length;
    var ch = CHORDS[ci];

    // پد + بیس (سرِ هر دو میزان)
    if (b % 2 === 0) {
      for (var i = 0; i < ch.pad.length; i++) {
        pad(t + i * 0.045, ch.pad[i] - 12, BAR * 2 - 0.1, 1);
      }
      bass(t, ch.bass, BEAT * 1.7, 1);
      bass(t + BEAT * 2, ch.bass, BEAT * 1.2, 0.72);
      if (ci % 2 === 1) bass(t + BEAT * 3.5, ch.bass + 7, BEAT * 0.6, 0.55);
    }

    // آرپژ
    var pat = PATTERNS[(Math.floor(b / 2) + b) % PATTERNS.length];
    for (var k = 0; k < 8; k++) {
      var idx = pat[k];
      var note = ch.arp[idx % ch.arp.length] + (idx >= ch.arp.length ? 12 : 0);
      var vel = (k % 2 === 0 ? 0.62 : 0.38) * (0.9 + Math.random() * 0.2);
      piano(t + k * BEAT * 0.5, note, BEAT * 0.5, vel, (k % 4 - 1.5) * 0.16);
    }

    // ملودی
    for (var m = 0; m < MELODY.length; m++) {
      var ev = MELODY[m];
      if (ev[0] !== b) continue;
      var mt = t + ev[1] * BEAT;
      var md = ev[3] * BEAT;
      var mv = 0.9 - (m % 3) * 0.05;
      piano(mt, ev[2], md, mv, -0.08);
      if (ev[3] >= 1.5) piano(mt + 0.012, ev[2] + 12, md, 0.16, 0.22);
    }

    // زنگ‌های ریز
    if (b % 2 === 1 && Math.random() < 0.75) {
      bell(t + BEAT * (1 + Math.random() * 2.4), SPARKLE[(Math.random() * SPARKLE.length) | 0], 0.7 + Math.random() * 0.5);
    }
  }

  function tick() {
    if (!playing) return;
    var horizon = ctx.currentTime + 1.4;
    var guard = 0;
    cleanup(ctx.currentTime - 2);
    while (nextBarTime < horizon && guard++ < 8) {
      scheduleBar(barIdx % BARS, nextBarTime);
      nextBarTime += BAR;
      barIdx++;
    }
  }

  /* ─────────── کنترل ─────────── */
  var listeners = [];
  function emit() { for (var i = 0; i < listeners.length; i++) listeners[i](playing); }

  var api = {
    supported: function () { return !!(global.AudioContext || global.webkitAudioContext); },

    isPlaying: function () { return playing; },

    toggle: function () { return playing ? api.stop() : api.start(); },

    start: function () {
      if (playing) return Promise.resolve(true);
      if (!ctx && !build()) return Promise.resolve(false);

      var go = function () {
        playing = true;
        session++;
        barIdx = 0;
        live = [];
        var t = ctx.currentTime;
        bus.gain.cancelScheduledValues(t);
        bus.gain.setValueAtTime(0.0001, t);
        bus.gain.linearRampToValueAtTime(1, t + 2.4);
        nextBarTime = t + 0.28;
        tick();
        if (timer) clearInterval(timer);
        timer = setInterval(tick, 240);
        emit();
      };

      if (ctx.state === "suspended") {
        return ctx.resume().then(go, go);
      }
      return Promise.resolve(go());
    },

    stop: function () {
      if (!playing || !ctx) return Promise.resolve(true);
      playing = false;
      var t = ctx.currentTime;
      var token = ++session;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0.0001, t + 0.55);
      if (timer) { clearInterval(timer); timer = null; }
      var dying = live.slice();
      dying.forEach(function (v) {
        try { v.nodes.forEach(function (n) { n.stop(t + 0.7); }); } catch (e) {}
      });
      setTimeout(function () {
        if (token === session) {
          live = [];
          bus.gain.cancelScheduledValues(ctx.currentTime);
          bus.gain.setValueAtTime(1, ctx.currentTime);
        }
      }, 900);
      emit();
      return Promise.resolve(true);
    },

    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, v));
      if (master && ctx) {
        try {
          master.gain.cancelScheduledValues(ctx.currentTime);
          master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
        } catch (e) { master.gain.value = volume; }
      }
    },

    getVolume: function () { return volume; },

    analyser: function () { return analyser; },

    onChange: function (fn) { listeners.push(fn); }
  };

  // قطع و وصل شدنِ هندزفری / برگشت به برنامه
  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    if (document.hidden) return;
    if (playing && ctx.state === "suspended") ctx.resume().catch(function () {});
  });

  global.NarjesMusic = api;
})(window);
