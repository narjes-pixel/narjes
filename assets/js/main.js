/* =============================================================
   main.js — برای نرجس
   ============================================================= */
(function () {
  "use strict";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var RM = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fa = function (n) { try { return Number(n).toLocaleString("fa-IR"); } catch (e) { return String(n); } };
  var raf = window.requestAnimationFrame.bind(window);
  var caf = window.cancelAnimationFrame.bind(window);
  var scrollTop = 0;

  var THEMES = { night: "#070b1e", rose: "#fff7f9", gold: "#fdf8ec" };
  var palette = { a: "#f3c96b", b: "#a78bfa", s: "#ffffff" };
  var vgrad = null;

  function refreshPalette() {
    var cs = getComputedStyle(document.documentElement);
    palette.a = (cs.getPropertyValue("--accent")  || "").trim() || "#f3c96b";
    palette.b = (cs.getPropertyValue("--accent2") || "").trim() || "#a78bfa";
    palette.s = (cs.getPropertyValue("--star")    || "").trim() || "#ffffff";
    vgrad = null;
  }

  /* ───────────────────────── تم ───────────────────────── */
  var metaTheme = $('meta[name="theme-color"]');
  function setTheme(t, save) {
    if (!THEMES[t]) t = "night";
    document.documentElement.setAttribute("data-theme", t);
    if (metaTheme) metaTheme.setAttribute("content", THEMES[t]);
    if (save) { try { localStorage.setItem("narjes-theme", t); } catch (e) {} }
    refreshPalette();
  }
  (function initTheme() {
    var t = "night";
    try { t = localStorage.getItem("narjes-theme") || "night"; } catch (e) {}
    setTheme(t, false);
  })();
  $$("[data-set-theme]").forEach(function (b) {
    b.addEventListener("click", function () { setTheme(b.getAttribute("data-set-theme"), true); });
  });

  /* ───────────────────────── آسمان ───────────────────────── */
  var sky = $("#sky");
  var sx = sky && sky.getContext ? sky.getContext("2d") : null;
  var SW = 0, SH = 0, DPR = 1, stars = [], shot = null, nextShot = 3000;
  var rafSky = null, prevSky = 0, accSky = 0;

  function sizeSky() {
    if (!sky) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);   // ستاره‌ها به رزولوشن کامل نیاز ندارند
    SW = window.innerWidth; SH = window.innerHeight;
    sky.width = Math.floor(SW * DPR);
    sky.height = Math.floor(SH * DPR);
    sx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var n = Math.max(45, Math.min(120, Math.round((SW * SH) / 16000)));
    stars = [];
    for (var i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * SW,
        y: Math.random() * SH,
        r: Math.random() * 1.25 + 0.3,
        a: Math.random() * 0.5 + 0.32,
        sp: Math.random() * 1.7 + 0.4,
        ph: Math.random() * 6.283,
        d: Math.random() * 0.7 + 0.15
      });
    }
    if (RM) drawSky(0, 16);
  }

  function drawSky(t, dt) {
    if (!sx) return;
    sx.clearRect(0, 0, SW, SH);
    var i, s, y, tw;
    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      y = s.y - scrollTop * s.d * 0.14;
      y = ((y % SH) + SH) % SH;
      tw = 0.55 + 0.45 * Math.sin(t * 0.001 * s.sp + s.ph);
      sx.fillStyle = palette.s;
      sx.globalAlpha = s.a * tw;
      sx.beginPath(); sx.arc(s.x, y, s.r, 0, 6.2832); sx.fill();
      if (s.r > 1.15) {
        sx.globalAlpha = s.a * tw * 0.14;
        sx.beginPath(); sx.arc(s.x, y, s.r * 3.6, 0, 6.2832); sx.fill();
      }
    }
    sx.globalAlpha = 1;

    if (!RM) {
      if (!shot && t > nextShot) {
        shot = {
          x: SW * (0.05 + Math.random() * 0.6),
          y: SH * (Math.random() * 0.35),
          vx: 0.42 + Math.random() * 0.34,
          vy: 0.13 + Math.random() * 0.11,
          life: 1
        };
      }
      if (shot) {
        shot.x += shot.vx * dt * 0.85;
        shot.y += shot.vy * dt * 0.85;
        shot.life -= dt / 850;
        if (shot.life <= 0 || shot.x > SW + 120 || shot.y > SH + 120) {
          shot = null;
          nextShot = t + 7000 + Math.random() * 11000;
        } else {
          var tx = shot.x - shot.vx * 120, ty = shot.y - shot.vy * 120;
          var g = sx.createLinearGradient(shot.x, shot.y, tx, ty);
          var al = Math.max(0, Math.min(1, shot.life));
          g.addColorStop(0, "rgba(255,255,255," + (0.9 * al).toFixed(3) + ")");
          g.addColorStop(1, "rgba(255,255,255,0)");
          sx.strokeStyle = g; sx.lineWidth = 1.6; sx.lineCap = "round";
          sx.beginPath(); sx.moveTo(shot.x, shot.y); sx.lineTo(tx, ty); sx.stroke();
        }
      }
    }
  }

  function loopSky(t) {
    rafSky = raf(loopSky);
    if (!prevSky) prevSky = t;
    var dt = Math.min(60, t - prevSky);
    prevSky = t; accSky += dt;
    if (accSky < 32) return;
    drawSky(t, accSky);
    accSky = 0;
  }
  function startSky() { if (!rafSky && !RM) { prevSky = 0; rafSky = raf(loopSky); } }
  function stopSky() { if (rafSky) { caf(rafSky); rafSky = null; } }

  /* ───────────────────────── گلبرگ‌ها ───────────────────────── */
  function makePetals() {
    var host = $("#petals");
    if (!host || RM) return;
    var n = window.innerWidth < 520 ? 7 : 10;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var d = document.createElement("div");
      d.className = "petal-f";
      var w = (7 + Math.random() * 8).toFixed(1);
      d.style.left = (Math.random() * 100).toFixed(2) + "%";
      d.style.width = w + "px";
      d.style.height = (parseFloat(w) * (1.1 + Math.random() * 0.5)).toFixed(1) + "px";
      d.style.animationDuration = (17 + Math.random() * 17).toFixed(1) + "s";
      d.style.animationDelay = (-Math.random() * 22).toFixed(1) + "s";
      frag.appendChild(d);
    }
    host.appendChild(frag);
  }

  /* ───────────────────────── نمایش تدریجی ───────────────────────── */
  var revealDone = false;
  function initReveal() {
    var els = $$(".reveal");
    if (RM || !("IntersectionObserver" in window)) {
      els.forEach(function (e) { e.classList.add("is-in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
      els.forEach(function (e, i) {
        e.style.transitionDelay = (Math.min(i, 4) * 0.06).toFixed(2) + "s";
        io.observe(e);
      });
    }
    revealDone = true;
    maybeType();
  }

  /* ───────────────────────── نامه ───────────────────────── */
  var letterStarted = false, letterPrepped = false, words = [];

  function prepLetter() {
    words = [];
    $$("#letter p").forEach(function (p) {
      var txt = p.textContent.replace(/\s+/g, " ").trim();
      p.textContent = "";
      var ws = txt.split(" ");
      ws.forEach(function (w, i) {
        var sp = document.createElement("span");
        sp.className = "w"; sp.textContent = w;
        p.appendChild(sp); words.push(sp);
        if (i < ws.length - 1) p.appendChild(document.createTextNode(" "));
      });
    });
    letterPrepped = true;
  }

  function typeLetter() {
    if (letterPrepped === false) prepLetter();
    if (RM) { words.forEach(function (w) { w.classList.add("on"); }); return; }
    var caret = document.createElement("span");
    caret.className = "caret";
    var per = Math.max(15, Math.min(46, Math.round(6500 / Math.max(1, words.length))));
    var i = 0;
    (function step() {
      if (i >= words.length) {
        setTimeout(function () { if (caret.parentNode) caret.parentNode.removeChild(caret); }, 2000);
        return;
      }
      var w = words[i++];
      w.classList.add("on");
      if (w.nextSibling) w.parentNode.insertBefore(caret, w.nextSibling);
      else w.parentNode.appendChild(caret);
      var extra = w.textContent.length > 7 ? 26 : 0;
      var punct = /[.،؛:؟!]$/.test(w.textContent) ? 150 : 0;
      setTimeout(step, per + extra + punct);
    })();
  }

  function maybeType() {
    if (letterStarted || !revealDone) return;
    var el = $("#letter");
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.86) { letterStarted = true; typeLetter(); }
  }

  /* ───────────────────────── ستاره‌ها ───────────────────────── */
  var modal = $("#modal"), mText = $("#modalText"), mNum = $("#modalNum");
  var starBtns = $$("#skyBox .star");
  var got = 0, lastFocus = null, pendingFinal = false;

  function updateCount() {
    var el = $("#starCount");
    if (el) el.textContent = fa(got) + " از " + fa(starBtns.length);
  }
  function openModal(text, num) {
    mText.textContent = text;
    mNum.textContent = num ? "ستاره " + fa(num) + " از " + fa(starBtns.length) : "";
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    var c = $(".modal__close", modal);
    if (c) setTimeout(function () { c.focus(); }, 40);
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    if (pendingFinal) { pendingFinal = false; setTimeout(showFinal, 600); }
  }
  function showFinal() {
    openModal("همه‌شان را پیدا کردی… یعنی صبور بودی، و این را دوست دارم.\nپس این را هم داشته باش: هر وقت دلت گرفت، این صفحه همین‌جا است — و من هم.", 0);
  }
  updateCount();

  starBtns.forEach(function (btn, idx) {
    btn.addEventListener("click", function () {
      var hint = $("#skyHint");
      if (hint) hint.classList.add("off");
      if (!btn.classList.contains("done")) {
        btn.classList.add("done");
        got++;
        updateCount();
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
        if (got === starBtns.length) pendingFinal = true;
      }
      openModal(btn.getAttribute("data-msg") || "…", idx + 1);
    });
  });
  $$("#modal [data-close]").forEach(function (el) { el.addEventListener("click", closeModal); });

  /* ───────────────────────── شکوفه ───────────────────────── */
  var hold = $("#holdFlower"), ringFg = $(".ring__fg"), note = $("#bloomNote"), stage = $(".bloom-stage");
  var HOLD_MS = 1250, CIRC = 327;
  var holding = false, prog = 0, rafB = null, progT = 0, bloomOpen = false;

  function setRing(p) { if (ringFg) ringFg.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(1); }

  function tickB(t) {
    if (bloomOpen) { rafB = null; return; }
    rafB = raf(tickB);
    if (!progT) progT = t;
    var dt = t - progT; progT = t;
    prog += holding ? dt / HOLD_MS : -dt / 400;
    prog = Math.max(0, Math.min(1, prog));
    setRing(prog);
    if (prog >= 1 && !bloomOpen) finishBloom();
    if (prog <= 0 && !holding) { caf(rafB); rafB = null; progT = 0; }
  }

  function sparkle() {
    if (!stage || RM) return;
    var box = document.createElement("div");
    box.className = "bloom-spark";
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("i");
      var ang = (i / 14) * 6.283 + Math.random() * 0.4;
      var dist = 70 + Math.random() * 70;
      s.style.setProperty("--tx", (Math.cos(ang) * dist).toFixed(1) + "px");
      s.style.setProperty("--ty", (Math.sin(ang) * dist).toFixed(1) + "px");
      s.style.animationDelay = (Math.random() * 0.18).toFixed(2) + "s";
      box.appendChild(s);
    }
    stage.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1500);
  }

  function finishBloom() {
    bloomOpen = true; holding = false;
    if (hold) { hold.classList.remove("is-closed"); hold.classList.add("is-opened"); }
    var ring = $("#bloomRing");
    if (ring) { ring.style.transition = "opacity .7s ease"; ring.style.opacity = "0"; }
    if (note) {
      note.style.opacity = "0";
      setTimeout(function () {
        note.textContent = "باز شد… مثل چیزهای خوبی که دقیقاً به وقتِ خودشان می‌رسند. 🌼";
        note.style.opacity = "1";
      }, 420);
    }
    sparkle();
    if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
  }

  if (hold) {
    hold.setAttribute("role", "button");
    hold.setAttribute("tabindex", "0");
    hold.setAttribute("aria-label", "برای شکوفه شدن، انگشتت را روی غنچه نگه‌دار");
    var begin = function (e) {
      if (bloomOpen) return;
      holding = true;
      if (e && e.cancelable) e.preventDefault();
      if (!rafB) { progT = 0; rafB = raf(tickB); }
    };
    var end = function () { holding = false; };
    hold.addEventListener("pointerdown", begin);
    hold.addEventListener("pointerup", end);
    hold.addEventListener("pointercancel", end);
    hold.addEventListener("pointerleave", end);
    window.addEventListener("pointerup", end);
    window.addEventListener("blur", end);
    hold.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    hold.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!bloomOpen) { prog = 1; setRing(1); finishBloom(); }
      }
    });
  }

  /* ───────────────────────── موسیقی ───────────────────────── */
  var M = window.NarjesMusic;
  var playBtn = $("#playBtn"), stateEl = $("#playerState"), volEl = $("#vol");
  var viz = $("#viz"), vx = viz && viz.getContext ? viz.getContext("2d") : null;
  var vw = 0, vh = 0, rafV = null, freqData = null, vizVisible = true;

  function sizeViz() {
    if (!viz || !vx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = viz.getBoundingClientRect();
    if (!r.width) return;
    vw = r.width; vh = r.height;
    viz.width = Math.round(vw * dpr);
    viz.height = Math.round(vh * dpr);
    vx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vgrad = null;
  }

  function rrect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, r); return; }
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function drawViz(t) {
    rafV = raf(drawViz);
    if (!vx || !vw) return;
    vx.clearRect(0, 0, vw, vh);
    if (!vgrad) {
      vgrad = vx.createLinearGradient(0, 0, 0, vh);
      vgrad.addColorStop(0, palette.b);
      vgrad.addColorStop(1, palette.a);
    }
    var an = M && M.analyser ? M.analyser() : null;
    if (an && !freqData) freqData = new Uint8Array(an.frequencyBinCount);
    if (an) { try { an.getByteFrequencyData(freqData); } catch (e) { an = null; } }

    var N = Math.max(24, Math.min(52, Math.round(vw / 11)));
    var bw = vw / N;
    var gap = Math.min(3, bw * 0.3);
    var cy = vh * 0.54;
    var on = !!(M && M.isPlaying());
    vx.fillStyle = vgrad;
    for (var i = 0; i < N; i++) {
      var v;
      if (an && on) {
        var idx = Math.min(an.frequencyBinCount - 1, Math.floor(Math.pow(i / N, 1.7) * 190) + 2);
        v = (freqData[idx] / 255);
        v = Math.pow(v, 1.25);
      } else {
        v = 0.045 + 0.03 * Math.sin(i * 0.55 + t * 0.0016);
      }
      var h = Math.max(1.6, v * vh * 0.46);
      rrect(vx, i * bw + gap / 2, cy - h, bw - gap, h * 2, (bw - gap) / 2);
      vx.fill();
    }
  }

  function startViz() { if (!rafV) rafV = raf(drawViz); }
  function stopViz() { if (rafV) { caf(rafV); rafV = null; } }

  function updatePlayUI() {
    var on = !!(M && M.isPlaying());
    if (playBtn) {
      playBtn.classList.toggle("is-playing", on);
      playBtn.setAttribute("aria-label", on ? "توقف موسیقی" : "پخش موسیقی");
    }
    if (stateEl) stateEl.textContent = on ? "در حال پخش · پیانو و امبینت" : "برای پخش بزن";
    if (vizVisible) { if (on) startViz(); }
  }

  if (playBtn && M) {
    playBtn.addEventListener("click", function () {
      if (!M.supported()) { if (stateEl) stateEl.textContent = "مرورگرت پخش را پشتیبانی نمی‌کند"; return; }
      M.toggle().then(updatePlayUI, updatePlayUI);
    });
  }
  if (volEl && M) {
    M.setVolume(volEl.value / 100);
    volEl.addEventListener("input", function () { M.setVolume(volEl.value / 100); });
  }
  if (M && M.onChange) M.onChange(updatePlayUI);

  if (viz && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      vizVisible = es[0].isIntersecting;
      if (vizVisible) startViz(); else stopViz();
    }, { threshold: 0 }).observe(viz);
  }

  /* ───────────────────────── اسکرول ───────────────────────── */
  var pbar = $("#progressBar"), sTick = false;
  function onScroll() {
    if (sTick) return;
    sTick = true;
    raf(function () {
      sTick = false;
      scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (pbar) pbar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, Math.max(0, scrollTop / h)) : 0) + ")";
      maybeType();
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ───────────────────────── حرف آخر ───────────────────────── */
  var lastBtn = $("#lastBtn");
  if (lastBtn) {
    lastBtn.addEventListener("click", function () {
      var t = $("#lastText");
      if (t) t.hidden = false;
      this.style.display = "none";
    });
  }

  /* ───────────────────────── درگاه ───────────────────────── */
  var gate = $("#gate"), main = $("#main"), opened = false;
  document.documentElement.classList.add("gate-open");

  function openSite() {
    if (opened) return;
    opened = true;
    document.documentElement.classList.remove("gate-open");
    if (gate) {
      gate.classList.add("is-out");
      setTimeout(function () { gate.hidden = true; }, 1300);
    }
    if (main) main.hidden = false;
    window.scrollTo(0, 0);
    sizeViz();
    setTimeout(function () { initReveal(); sizeViz(); maybeType(); }, 70);
    startSky();
    if (M && M.supported()) {
      M.start().then(updatePlayUI, updatePlayUI);
    }
  }
  var openBtn = $("#openBtn");
  if (openBtn) openBtn.addEventListener("click", openSite);

  /* ───────────────────────── رویدادهای عمومی ───────────────────────── */
  var rzT = null;
  window.addEventListener("resize", function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () { sizeSky(); sizeViz(); }, 180);
  });
  window.addEventListener("orientationchange", function () {
    setTimeout(function () { sizeSky(); sizeViz(); }, 400);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
    if (e.key === "Enter" && !opened && gate && !gate.hidden) openSite();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { stopSky(); stopViz(); }
    else { prevSky = 0; startSky(); if (vizVisible) startViz(); }
  });

  /* ───────────────────────── آغاز ───────────────────────── */
  sizeSky();
  makePetals();
  sizeViz();
  if (RM) drawSky(0, 16);
  updatePlayUI();
})();
