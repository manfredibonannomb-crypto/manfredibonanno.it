// Rischi e opportunità a due vie d'uscita (UNI EN ISO 9001:2026 §6.1, ISO 31000).
// Un radar scandisce il contesto e fa emergere segnali; ogni segnale viene pesato su
// una matrice probabilità × impatto e prende una di due strade: rischio (ambra, in
// basso: evitare, ridurre, condividere, accettare) od opportunità (teal, in alto).
// Dall'azione il segnale torna nel radar: monitoraggio e riesame, senza fine.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var figure = document.querySelector('.riskop');
  var svg = figure && figure.querySelector('.riskop__svg');
  if (!svg) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var OPP = ['nuove prassi', 'nuovi prodotti', 'nuovi mercati', 'nuove tecnologie'];
  var RISK = ['evitare', 'ridurre', 'condividere', 'accettare'];

  var wide = true, G = null, sweepA = 0, signals = [], cells = [], acts = { opp: [], risk: [] };
  var sweep = null, intro = null, nextBlip = 0, layer = null;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function clamp(k) { return Math.max(0, Math.min(1, k)); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pol(cx, cy, r, a) { return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }; }

  // Geometria: in orizzontale su schermi larghi, in colonna sul telefono
  function geometry() {
    if (wide) {
      return {
        W: 1200, H: 470, rc: { x: 210, y: 235, r: 160 }, mx: { x: 520, y: 235, n: 5, s: 22, g: 5 },
        fork: { x: 700, y: 235 },
        lanes: {
          opp: { y: 110, x0: 790, x1: 1150, ret: 'top' },
          risk: { y: 360, x0: 790, x1: 1150, ret: 'bottom' }
        }
      };
    }
    return {
      W: 420, H: 760, rc: { x: 210, y: 150, r: 112 }, mx: { x: 210, y: 345, n: 5, s: 20, g: 5 },
      fork: { x: 210, y: 450 },
      lanes: {
        opp: { x: 330, y0: 520, y1: 712, ret: 'right' },
        risk: { x: 90, y0: 520, y1: 712, ret: 'left' }
      }
    };
  }

  function build(instant) {
    wide = svg.clientWidth >= 680 || svg.clientWidth === 0;
    G = geometry();
    svg.innerHTML = '';
    signals = []; cells = []; acts = { opp: [], risk: [] };
    svg.setAttribute('viewBox', '0 0 ' + G.W + ' ' + G.H);

    var defs = el('defs', {}, svg);
    var f = el('filter', { id: 'ro-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, f);
    var m = el('feMerge', {}, f); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    var pat = el('pattern', { id: 'ro-dots', width: 18, height: 18, patternUnits: 'userSpaceOnUse' }, defs);
    el('circle', { 'class': 'ro-dot', cx: 1, cy: 1, r: 0.9 }, pat);
    el('rect', { x: 0, y: 0, width: G.W, height: G.H, fill: 'url(#ro-dots)', 'class': 'ro-mo' }, svg);

    // Radar del contesto
    var R = G.rc, rg = el('g', { 'class': 'ro-radar ro-mo' }, svg);
    [1, 0.72, 0.44, 0.16].forEach(function (k) { el('circle', { 'class': 'ro-ring-line', cx: R.x, cy: R.y, r: R.r * k }, rg); });
    el('line', { 'class': 'ro-cross', x1: R.x - R.r, y1: R.y, x2: R.x + R.r, y2: R.y }, rg);
    el('line', { 'class': 'ro-cross', x1: R.x, y1: R.y - R.r, x2: R.x, y2: R.y + R.r }, rg);
    for (var i = 0; i < 36; i++) {
      var a = i / 36 * Math.PI * 2, p1 = pol(R.x, R.y, R.r, a), p2 = pol(R.x, R.y, R.r + (i % 3 ? 4 : 8), a);
      el('line', { 'class': 'ro-tick', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, rg);
    }
    // Fascio della scansione: spicchi con opacità decrescente e bordo d'attacco luminoso
    sweep = el('g', { 'class': 'ro-sweep' }, rg);
    for (i = 0; i < 10; i++) {
      var a0 = -(i + 1) * 0.07, a1 = -i * 0.07, q0 = pol(R.x, R.y, R.r, a0), q1 = pol(R.x, R.y, R.r, a1);
      el('path', { d: 'M' + R.x + ',' + R.y + ' L' + q0.x + ',' + q0.y + ' A' + R.r + ',' + R.r + ' 0 0 1 ' + q1.x + ',' + q1.y + ' Z', opacity: (0.22 * (1 - i / 10)).toFixed(3) }, sweep);
    }
    var lead = pol(R.x, R.y, R.r, 0);
    el('line', { 'class': 'ro-sweep__edge', x1: R.x, y1: R.y, x2: lead.x, y2: lead.y }, sweep);

    // Matrice probabilità × impatto
    var M = G.mx, size = M.n * M.s + (M.n - 1) * M.g, mx0 = M.x - size / 2, my0 = M.y - size / 2;
    var mg = el('g', { 'class': 'ro-matrix' }, svg);
    for (var r = 0; r < M.n; r++) {
      for (var c = 0; c < M.n; c++) {
        var cell = el('rect', { 'class': 'ro-cell ro-mo', x: mx0 + c * (M.s + M.g), y: my0 + r * (M.s + M.g), width: M.s, height: M.s, rx: 2 }, mg);
        cells.push({ el: cell, x: mx0 + c * (M.s + M.g) + M.s / 2, y: my0 + r * (M.s + M.g) + M.s / 2, k: r * M.n + c });
      }
    }
    el('text', { 'class': 'ro-axis ro-mo', x: M.x, y: my0 + size + 16, 'text-anchor': 'middle' }, mg).textContent = 'probabilità';
    el('text', { 'class': 'ro-axis ro-mo', x: mx0 - 10, y: M.y, 'text-anchor': 'middle', transform: 'rotate(-90 ' + (mx0 - 10) + ' ' + M.y + ')' }, mg).textContent = 'impatto';

    // Bivio e due vie d'uscita, con i loro anelli di ritorno verso il radar
    var F = G.fork;
    el('circle', { 'class': 'ro-fork ro-mo', cx: F.x, cy: F.y, r: 6 }, svg);
    if (wide) el('line', { 'class': 'ro-link ro-mo', x1: M.x + size / 2 + 6, y1: M.y, x2: F.x - 6, y2: F.y }, svg);
    else el('line', { 'class': 'ro-link ro-mo', x1: M.x, y1: my0 + size + 24, x2: F.x, y2: F.y - 6 }, svg);
    ['opp', 'risk'].forEach(function (kind) {
      var Ln = G.lanes[kind], g = el('g', { 'class': 'ro-lane ro-lane--' + kind }, svg), d, ret, names = kind === 'opp' ? OPP : RISK;
      if (wide) {
        d = 'M' + F.x + ',' + F.y + ' C' + (F.x + 50) + ',' + F.y + ' ' + (Ln.x0 - 50) + ',' + Ln.y + ' ' + Ln.x0 + ',' + Ln.y + ' H' + Ln.x1;
        var yr = kind === 'opp' ? 28 : G.H - 22, top = kind === 'opp';
        ret = 'M' + Ln.x1 + ',' + Ln.y + ' C' + (Ln.x1 + 34) + ',' + Ln.y + ' ' + (Ln.x1 + 34) + ',' + yr + ' ' + (Ln.x1 - 20) + ',' + yr +
              ' H' + (R.x + 40) + ' C' + R.x + ',' + yr + ' ' + R.x + ',' + yr + ' ' + R.x + ',' + (top ? R.y - R.r : R.y + R.r);
      } else {
        d = 'M' + F.x + ',' + F.y + ' C' + F.x + ',' + (F.y + 40) + ' ' + Ln.x + ',' + (Ln.y0 - 40) + ' ' + Ln.x + ',' + Ln.y0 + ' V' + Ln.y1;
        var xr = kind === 'opp' ? G.W - 14 : 14, right = kind === 'opp';
        ret = 'M' + Ln.x + ',' + Ln.y1 + ' C' + Ln.x + ',' + (Ln.y1 + 30) + ' ' + xr + ',' + (Ln.y1 + 30) + ' ' + xr + ',' + (Ln.y1 - 20) +
              ' V' + (R.y + 30) + ' C' + xr + ',' + R.y + ' ' + xr + ',' + R.y + ' ' + (right ? R.x + R.r : R.x - R.r) + ',' + R.y;
      }
      var lane = el('path', { 'class': 'ro-lane__path', d: d }, g);
      var back = el('path', { 'class': 'ro-lane__ret', d: ret }, g);
      Ln.path = lane; Ln.back = back; Ln.len = lane.getTotalLength(); Ln.backLen = back.getTotalLength();
      [lane, back].forEach(function (p) {
        var l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = instant ? 0 : l;
      });
      // titolo della via e azioni lungo la via
      var tx = wide ? Ln.x0 : Ln.x, ty = wide ? Ln.y - 22 : Ln.y0 - 14;
      var title = el('text', { 'class': 'ro-lane__title ro-mo', x: wide ? tx : tx, y: wide ? ty : ty, 'text-anchor': wide ? 'start' : 'middle' }, g);
      title.textContent = kind === 'opp' ? 'opportunità' : 'rischi';
      names.forEach(function (n, j) {
        var px, py;
        if (wide) { px = Ln.x0 + 40 + j * ((Ln.x1 - Ln.x0 - 60) / (names.length - 1)); py = Ln.y; }
        else { px = Ln.x; py = Ln.y0 + 30 + j * ((Ln.y1 - Ln.y0 - 40) / (names.length - 1)); }
        var ng = el('g', { 'class': 'ro-act ro-mo' }, g);
        el('circle', { 'class': 'ro-act__dot', cx: px, cy: py, r: 5 }, ng);
        var t = el('text', { 'class': 'ro-act__label', x: wide ? px : (kind === 'opp' ? px - 12 : px + 12), y: wide ? (kind === 'opp' ? py + 22 : py + 22) : py + 3.5, 'text-anchor': wide ? 'middle' : (kind === 'opp' ? 'end' : 'start') }, ng);
        t.textContent = n;
        acts[kind].push({ g: ng, x: px, y: py, at: wide ? px - Ln.x0 : py - Ln.y0 });
      });
      Ln.g = g;
    });

    layer = el('g', { 'class': 'ro-signals' }, svg);
    if (instant || reduced) finishIntro(); else intro = { t: 0, done: false };
    if (reduced) staticScene();
  }

  function ring(x, y, r, kind) {
    var c = el('circle', { 'class': 'ro-pulse ro-pulse--' + kind, cx: x, cy: y, r: r }, layer || svg);
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 1500);
  }

  // Un percorso temporaneo (curva) da un punto all'altro, per far viaggiare il segnale
  function curve(a, b, bend) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + (bend || 0);
    var p = el('path', { d: 'M' + a.x + ',' + a.y + ' Q' + mx + ',' + my + ' ' + b.x + ',' + b.y, fill: 'none', stroke: 'none' }, layer);
    return p;
  }

  function newSignal() {
    var R = G.rc, ang = sweepA + rnd(0.2, 0.9), rad = R.r * rnd(0.25, 0.85);
    var p = pol(R.x, R.y, rad, ang), kind = Math.random() < 0.5 ? 'opp' : 'risk';
    var s = { kind: kind, x: p.x, y: p.y, ang: ang, stage: 'wait', t: 0, trail: [] };
    s.dot = el('circle', { 'class': 'ro-sig', r: 4, cx: p.x, cy: p.y, opacity: 0 }, layer);
    s.tr = el('polyline', { 'class': 'ro-sig__trail' }, layer);
    signals.push(s);
  }

  function angDiff(a, b) { var d = (a - b) % (Math.PI * 2); return d < 0 ? d + Math.PI * 2 : d; }

  function along(s, path, len, k) {
    var pt = path.getPointAtLength(len * k);
    s.x = pt.x; s.y = pt.y;
  }

  function stepSignals(dt) {
    var Mx = G.mx;
    signals.forEach(function (s) {
      s.t += dt;
      if (s.stage === 'wait') {                       // compare quando il fascio lo raggiunge
        if (angDiff(sweepA, s.ang) < 0.2) { s.stage = 'blip'; s.t = 0; s.dot.setAttribute('opacity', 1); ring(s.x, s.y, 5, 'white'); }
      } else if (s.stage === 'blip' && s.t > 0.9) {
        var pool = cells.filter(function (c) { return !c.busy; });
        s.cell = pool[Math.floor(Math.random() * pool.length)] || cells[12];
        s.cell.busy = true;
        s.path = curve({ x: s.x, y: s.y }, s.cell, wide ? -40 : 30); s.len = s.path.getTotalLength();
        s.stage = 'toMatrix'; s.t = 0;
      } else if (s.stage === 'toMatrix') {
        var k = ease(clamp(s.t / 1.8)); along(s, s.path, s.len, k);
        if (k >= 1) { s.stage = 'assess'; s.t = 0; s.cell.el.classList.add('is-' + s.kind); s.dot.setAttribute('class', 'ro-sig ro-sig--' + s.kind); ring(s.cell.x, s.cell.y, 8, s.kind); }
      } else if (s.stage === 'assess' && s.t > 1.1) {
        s.path.remove();
        s.path = curve({ x: s.x, y: s.y }, G.fork, 0); s.len = s.path.getTotalLength();
        s.stage = 'toFork'; s.t = 0;
        var c = s.cell; setTimeout(function () { c.el.classList.remove('is-opp', 'is-risk'); c.busy = false; }, 1600);
      } else if (s.stage === 'toFork') {
        var k2 = ease(clamp(s.t / 1.0)); along(s, s.path, s.len, k2);
        if (k2 >= 1) {
          s.path.remove();
          var Ln = G.lanes[s.kind], list = acts[s.kind];
          s.target = list[Math.floor(Math.random() * list.length)];
          s.stopAt = (Ln.len - (wide ? Ln.x1 - Ln.x0 : Ln.y1 - Ln.y0)) + s.target.at;
          s.stage = 'branch'; s.t = 0;
        }
      } else if (s.stage === 'branch') {
        var L1 = G.lanes[s.kind], k3 = ease(clamp(s.t / 2.2));
        var pt = L1.path.getPointAtLength(s.stopAt * k3); s.x = pt.x; s.y = pt.y;
        if (k3 >= 1) {
          s.target.g.classList.add('is-hit'); ring(s.target.x, s.target.y, 7, s.kind);
          var tg = s.target.g; setTimeout(function () { tg.classList.remove('is-hit'); }, 1400);
          s.stage = 'hold'; s.t = 0;
        }
      } else if (s.stage === 'hold' && s.t > 0.9) {
        s.stage = 'onLane'; s.t = 0; s.from = s.stopAt;
      } else if (s.stage === 'onLane') {          // completa la via, poi l'anello di ritorno
        var L2 = G.lanes[s.kind], k4 = clamp(s.t / 1.0);
        var pt2 = L2.path.getPointAtLength(s.from + (L2.len - s.from) * k4); s.x = pt2.x; s.y = pt2.y;
        if (k4 >= 1) { s.stage = 'return'; s.t = 0; }
      } else if (s.stage === 'return') {
        var L3 = G.lanes[s.kind], k5 = ease(clamp(s.t / 3.6));
        along(s, L3.back, L3.backLen, k5);
        s.dot.setAttribute('opacity', 1 - Math.max(0, k5 - 0.85) / 0.15);
        if (k5 >= 1) { s.dead = true; s.dot.remove(); s.tr.remove(); }
      }
      if (!s.dead && s.stage !== 'wait') {
        s.dot.setAttribute('cx', s.x.toFixed(1)); s.dot.setAttribute('cy', s.y.toFixed(1));
        s.trail.push(s.x.toFixed(1) + ',' + s.y.toFixed(1));
        if (s.trail.length > 14) s.trail.shift();
        s.tr.setAttribute('points', s.trail.join(' '));
        s.tr.setAttribute('class', 'ro-sig__trail' + (s.dot.getAttribute('class').indexOf('--') > 0 ? ' ro-sig__trail--' + s.kind : ''));
      }
    });
    signals = signals.filter(function (s) { return !s.dead; });
  }

  function stepSweep(dt) {
    sweepA = (sweepA + dt * 0.9) % (Math.PI * 2);
    sweep.setAttribute('transform', 'rotate(' + (sweepA * 180 / Math.PI) + ' ' + G.rc.x + ' ' + G.rc.y + ')');
  }

  // Apertura: radar, matrice, bivio e vie si accendono in sequenza
  function stepIntro(dt) {
    intro.t += dt;
    var t = intro.t;
    var on = function (sel, at) { if (t > at) svg.querySelectorAll(sel).forEach(function (e) { e.classList.add('is-on'); }); };
    on('rect.ro-mo, .ro-radar', 0.2);
    cells.forEach(function (c, i) { if (t > 0.9 + i * 0.05) c.el.classList.add('is-on'); });
    on('.ro-axis, .ro-fork, .ro-link', 2.2);
    if (t > 2.5) {
      ['opp', 'risk'].forEach(function (kind) {
        var Ln = G.lanes[kind], k = ease(clamp((t - 2.5) / 2.2));
        Ln.path.style.strokeDashoffset = Ln.len * (1 - k);
        acts[kind].forEach(function (a) { if (k * Ln.len > (Ln.len - (wide ? Ln.x1 - Ln.x0 : Ln.y1 - Ln.y0)) + a.at) a.g.classList.add('is-on'); });
        if (k > 0.2) Ln.g.querySelector('.ro-lane__title').classList.add('is-on');
        var kb = ease(clamp((t - 4.4) / 2.4));
        Ln.back.style.strokeDashoffset = Ln.backLen * (1 - kb);
      });
    }
    if (t > 6.9) intro.done = true;
  }

  function finishIntro() {
    svg.querySelectorAll('.ro-mo, .ro-radar').forEach(function (e) { e.classList.add('is-on'); });
    ['opp', 'risk'].forEach(function (kind) { var Ln = G.lanes[kind]; Ln.path.style.strokeDashoffset = 0; Ln.back.style.strokeDashoffset = 0; });
    intro = { done: true };
  }

  function staticScene() {
    sweep.setAttribute('transform', 'rotate(-35 ' + G.rc.x + ' ' + G.rc.y + ')');
    cells[7].el.classList.add('is-risk'); cells[16].el.classList.add('is-opp');
    acts.opp[1].g.classList.add('is-hit'); acts.risk[2].g.classList.add('is-hit');
  }

  var running = false, last = 0;
  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    stepSweep(dt);
    if (intro && !intro.done) stepIntro(dt);
    else {
      nextBlip -= dt;
      if (nextBlip <= 0 && signals.length < 4) { nextBlip = rnd(2.2, 3.4); newSignal(); }
    }
    stepSignals(dt);
    requestAnimationFrame(frame);
  }

  function init() {
    build(false);
    if (reduced) return;
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !running) { running = true; last = 0; requestAnimationFrame(frame); }
      if (!e[0].isIntersecting) running = false;
    }, { threshold: 0.2 }).observe(svg);
    var lastWide = wide;
    window.addEventListener('resize', function () {
      var w = svg.clientWidth >= 680;
      if (w !== lastWide) { lastWide = w; build(true); }
    });
  }

  if (document.fonts && document.fonts.load) document.fonts.load('12px "JetBrains Mono"').then(init, init);
  else init();
})();
