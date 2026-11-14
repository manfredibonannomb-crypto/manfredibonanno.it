// Mappa dei processi a lisca di pesce (Ishikawa): la spina è il flusso operativo,
// dal cliente (esigenze) alla testa (soddisfazione del cliente); le lische sono
// i processi di gestione (sopra) e di supporto, le 6M, (sotto).
// Ogni processo operativo ha la sua carta di controllo: i dati scendono dal processo
// nella carta; quando un punto esce dai limiti si accende la causa (una lisca)
// e una correzione torna al processo.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var figure = document.querySelector('.map');
  var svg = document.querySelector('.map__svg');
  if (!svg) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HT = figure.classList.contains('map--hitech'); // variante hi-tech: angoli HUD, indice Cpk, griglia
  var MAIN = ['Requisiti', 'Progettazione', 'Acquisti', 'Accettazione', 'Produzione', 'Controlli', 'Spedizione'];

  // Carta di controllo, coordinate locali: larghezza CW, altezza CH; il grafico va da PL a PR,
  // con linea centrale a CY e limiti di controllo a ±3 sigma (KY unità per sigma).
  var CW = 128, CH = 72, PL = 8, PR = 116, SP = 9, NPTS = 13, CY = 41, KY = 4;
  var DROP = 0.42, GAP = 0.6;
  var TAN = 0.577; // inclinazione delle lische (60 gradi)

  // Disposizione a lisca di pesce (schermi larghi)
  function wideLayout() {
    var y = 320, x0 = 150, step = 135, gap = 26;
    var main = [{ x: 60, y: y, label: 'Cliente', sub: 'esigenze', client: true }];
    MAIN.forEach(function (l, i) {
      var x = x0 + step * i, up = i % 2 === 0;
      // Carte alternate sopra e sotto la spina, per lasciare passare le lische
      main.push({
        x: x, y: y, label: l,
        card: { x: x - CW / 2, y: up ? y - gap - CH : y + gap },
        lead: up ? { x: CW / 2, y: CH + gap - 7 } : { x: CW / 2, y: -gap + 7 },
        leadEnd: up ? { x: CW / 2, y: CH } : { x: CW / 2, y: 0 }
      });
    });

    // Ogni lisca parte dalla spina (ax) e sale o scende verso la sua etichetta (py)
    var bones = [
      { label: 'Pianificazione', kind: 'gestione', ax: 330, py: 165 },
      { label: 'Riesame', kind: 'gestione', ax: 600, py: 165 },
      { label: 'Miglioramento', kind: 'gestione', ax: 870, py: 165 },
      { label: 'Persone', kind: 'supporto', ax: 215, py: 490 },
      { label: 'Materiali', kind: 'supporto', ax: 410, py: 470 },
      { label: 'Macchine', kind: 'supporto', ax: 488, py: 510 },
      { label: 'Metodi', kind: 'supporto', ax: 680, py: 470 },
      { label: 'Misure', kind: 'supporto', ax: 758, py: 510 },
      { label: 'Ambiente', kind: 'supporto', ax: 955, py: 490 }
    ];
    bones.forEach(function (b) {
      b.px = b.ax - TAN * Math.abs(b.py - y);
      b.d = 'M' + b.ax + ',' + y + ' L' + b.px + ',' + b.py;
    });

    return {
      viewBox: '0 88 1200 450',
      main: main,
      mainPath: 'M60,' + y + ' L1030,' + y,
      head: { x: 1030, y: y, label: 'Cliente', sub: 'soddisfazione' },
      bones: bones,
      loop: 'M1152,' + y + ' C1196,' + y + ' 1196,115 1060,115 L140,115 C20,115 20,' + y + ' 60,' + y,
      loopLabel: { x: 600, y: 106, text: 'Ritorno dal cliente: ascolto, soddisfazione, miglioramento continuo' },
      groups: [
        { x: 990, y: 170, text: 'Processi di gestione' },
        { x: 990, y: 515, text: 'Processi di supporto (6M)' }
      ]
    };
  }

  // Disposizione verticale (telefono): flusso operativo con le carte a destra, anello di ritorno
  function narrowLayout() {
    var x = 70, y0 = 30, step = 86, cx = 100;
    var main = [{ x: x, y: y0, label: 'Cliente', sub: 'esigenze', client: true }];
    MAIN.forEach(function (l, i) {
      var y = y0 + step * (i + 1) - 10;
      main.push({
        x: x, y: y, label: l,
        card: { x: cx, y: y - CH / 2 },
        lead: { x: x + 8 - cx, y: CH / 2 },
        leadEnd: { x: 0, y: CH / 2 }
      });
    });
    var yEnd = y0 + step * 8 - 20;
    main.push({ x: x, y: yEnd, label: 'Cliente', sub: 'soddisfazione', client: true });
    return {
      viewBox: '0 0 ' + (cx + CW + 8) + ' ' + (yEnd + 30),
      main: main,
      mainPath: 'M' + x + ',' + y0 + ' L' + x + ',' + yEnd,
      head: null,
      bones: [],
      loop: 'M' + x + ',' + yEnd + ' C10,' + yEnd + ' 10,' + y0 + ' ' + x + ',' + y0,
      loopLabel: null,
      groups: []
    };
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var pulses = [], mainNodes = [], charts = [], causes = [], horizontal = true;
  // Apertura coreografata (variante "motion"): un fascio percorre la spina e accende
  // ogni elemento quando lo raggiunge; tutto è guidato dall'unico orologio di frame()
  var headPt = null, intro = null, steps = [], wiresAll = [], mainWire = null, mainLen = 0, loopWire = null, cycleStart = null;
  var beam = null, reveal = null, revealMax = 0;

  function build() {
    var wide = svg.clientWidth >= 680;
    horizontal = wide;
    var L = wide ? wideLayout() : narrowLayout();
    svg.innerHTML = '';
    pulses = []; mainNodes = []; charts = []; causes = []; steps = []; wiresAll = [];
    svg.setAttribute('viewBox', L.viewBox);
    var start = L.main[0];
    var endN = L.main[L.main.length - 1];
    headPt = L.head ? null : { x: endN.x, y: endN.y }; // su telefono l'arrivo è il cliente finale
    var at = function (x, y) { return horizontal ? x - start.x : y - start.y; };

    var defs = el('defs', {}, svg);
    // Bagliore: "glow" sul riquadro dell'oggetto; "glow-line" in coordinate della mappa,
    // per le linee orizzontali (spina, testimone) che hanno altezza zero e sparirebbero
    var vb = L.viewBox.split(' ').map(Number);
    [{ id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' },
     { id: 'glow-line', filterUnits: 'userSpaceOnUse', x: vb[0] - 40, y: vb[1] - 40, width: vb[2] + 80, height: vb[3] + 80 }].forEach(function (a) {
      var f = el('filter', a, defs);
      el('feGaussianBlur', { stdDeviation: '3', result: 'b' }, f);
      var m = el('feMerge', {}, f);
      el('feMergeNode', { in: 'b' }, m);
      el('feMergeNode', { in: 'SourceGraphic' }, m);
    });
    var clip = el('clipPath', { id: 'ctl-clip' }, defs);
    el('rect', { x: PL - 3, y: 18, width: PR - PL + 6, height: 46 }, clip);

    // Maschera radiale: la griglia si accende a partire dal cliente
    var rg = el('radialGradient', { id: 'mo-fade' }, defs);
    el('stop', { offset: '0.72', 'stop-color': '#fff' }, rg);
    el('stop', { offset: '1', 'stop-color': '#000' }, rg);
    var mask = el('mask', { id: 'mo-reveal', maskUnits: 'userSpaceOnUse', x: vb[0], y: vb[1], width: vb[2], height: vb[3] }, defs);
    reveal = el('circle', { cx: start.x, cy: start.y, r: 0, fill: 'url(#mo-fade)' }, mask);
    revealMax = Math.hypot(vb[2], vb[3]) * 1.3;

    // Versione hi-tech: griglia di punti sullo sfondo
    if (HT) {
      var pat = el('pattern', { id: 'ht-dots', width: 18, height: 18, patternUnits: 'userSpaceOnUse' }, defs);
      el('circle', { 'class': 'ht-dot', cx: 1, cy: 1, r: 0.9 }, pat);
      el('rect', { 'class': 'ht-grid', x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: 'url(#ht-dots)', mask: 'url(#mo-reveal)' }, svg);
    }

    L.groups.forEach(function (g) {
      el('text', { 'class': 'label-group fade', x: g.x, y: g.y }, svg).textContent = g.text;
    });

    // Fili: anello, lische, spina (nascosti finché il fascio non li raggiunge)
    loopWire = el('path', { 'class': 'wire wire--loop', d: L.loop }, svg);
    L.bones.forEach(function (b) {
      b.el = el('path', { 'class': 'wire wire--bone wire--' + b.kind, d: b.d }, svg);
      steps.push({ at: b.ax - start.x, kind: 'wire', el: b.el, dur: 1.1 });
    });
    mainWire = el('path', { 'class': 'wire wire--main', d: L.mainPath }, svg);
    mainLen = mainWire.getTotalLength();
    [loopWire, mainWire].concat(L.bones.map(function (b) { return b.el; })).forEach(function (w) {
      var len = w.getTotalLength();
      w.style.strokeDasharray = len;
      w.style.strokeDashoffset = len;
      wiresAll.push(w);
    });

    // Impulsi: il testimone (con scia luminosa) sulla spina, punti sulle lische, uno sull'anello
    var trail = el('path', { 'class': 'pulse pulse--trail fade', d: L.mainPath }, svg);
    pulses.push({ el: el('path', { 'class': 'pulse pulse--baton fade', d: L.mainPath }, svg), len: mainLen, seg: 34, main: true });
    pulses.push({ el: trail, len: mainLen, seg: 150, follow: true });
    L.bones.forEach(function (b, i) {
      pulses.push({ el: el('path', { 'class': 'pulse pulse--branch fade', d: b.d }, svg), len: b.el.getTotalLength(), seg: 1, period: 5.2 + (i % 4) * 1.1, offset: i * 1.3, mode: 'pingpong' });
    });
    // Punto in testa all'anello di ritorno: lo guida loopCycle(), non il ciclo degli impulsi
    pulses.push({ el: el('path', { 'class': 'pulse pulse--loop fade', d: L.loop }, svg), len: loopWire.getTotalLength(), seg: 1, loop: true });
    cycleStart = null;
    pulses.forEach(function (p) {
      p.el.style.strokeDasharray = p.seg + ' ' + (p.len + p.seg);
      p.el.style.strokeDashoffset = p.seg;
    });

    // Testa del pesce: l'effetto, cioè la soddisfazione del cliente
    if (L.head) {
      var h = L.head, hg = el('g', { 'class': 'mo mo-head' }, svg);
      el('path', { 'class': 'fish-head', d: 'M' + h.x + ',' + (h.y - 26) + ' H' + (h.x + 92) + ' Q' + (h.x + 122) + ',' + h.y + ' ' + (h.x + 92) + ',' + (h.y + 26) + ' H' + h.x + ' Z' }, hg);
      el('text', { 'class': 'label-main', x: h.x + 52, y: h.y - 3, 'text-anchor': 'middle' }, hg).textContent = h.label;
      el('text', { 'class': 'label-sub', x: h.x + 52, y: h.y + 12, 'text-anchor': 'middle' }, hg).textContent = h.sub;
      steps.push({ at: mainLen, kind: 'on', el: hg, ring: { x: h.x + 52, y: h.y, r: 30 } });
      headPt = { x: h.x + 52, y: h.y };
    }

    // Nodi della spina; i processi operativi hanno il nome nella loro carta
    var examined = [];
    L.main.forEach(function (n) {
      var c = el('circle', { 'class': 'node mo mo-node' + (n.client ? ' node--client' : ''), cx: n.x, cy: n.y, r: n.client ? 10 : 6 }, svg);
      var a = at(n.x, n.y);
      steps.push({ at: a, kind: 'on', el: c, ring: n.client ? { x: n.x, y: n.y, r: 12 } : null });
      if (n.client) {
        var tx = wide ? n.x : n.x + 24, ty = wide ? n.y + 30 : n.y - 2, anchor = wide ? 'middle' : 'start';
        steps.push({ at: a, kind: 'on', el: el('text', { 'class': 'label-main mo', x: tx, y: ty, 'text-anchor': anchor }, svg) });
        steps.push({ at: a, kind: 'on', el: el('text', { 'class': 'label-sub mo', x: tx, y: ty + 15, 'text-anchor': anchor }, svg) });
        steps[steps.length - 2].el.textContent = n.label;
        steps[steps.length - 1].el.textContent = n.sub;
        return;
      }
      mainNodes.push({ el: c, at: a });
      n.node = c;
      examined.push(n);
    });

    // Lische: etichette in pillola all'estremità, accese dopo che la lisca è disegnata
    L.bones.forEach(function (b) {
      var g = el('g', { 'class': 'mo mo-pill' }, svg);
      var r = el('rect', { 'class': 'pill pill--' + b.kind, rx: 14 }, g);
      var t = el('text', { 'class': 'label-pill', x: b.px, y: b.py + 4.5, 'text-anchor': 'middle' }, g);
      t.textContent = b.label;
      var w = t.getComputedTextLength() + 28;
      r.setAttribute('x', b.px - w / 2); r.setAttribute('y', b.py - 14);
      r.setAttribute('width', w); r.setAttribute('height', 28);
      causes.push({ wire: b.el, pill: r, ax: b.ax });
      steps.push({ at: b.ax - start.x, kind: 'on', el: g });
    });

    examined.forEach(function (n, i) {
      var c = buildChart(n, i);
      charts.push(c);
      steps.push({ at: at(n.x, n.y), kind: 'chart', el: c.body, chart: c });
    });

    // Il fascio che traccia la spina
    beam = el('g', { 'class': 'mo-beam', opacity: 0 }, svg);
    el('circle', { 'class': 'mo-beam__halo', r: 14 }, beam);
    el('circle', { 'class': 'mo-beam__core', r: 4 }, beam);

    figure.classList.remove('is-drawn');
    if (started || reduced) finishIntro(); else intro = { t: 0, done: false, end: 0 };
  }

  function stepOn(s, instant) {
    s.done = true;
    if (s.kind === 'wire') {
      s.el.style.transition = instant ? 'none' : 'stroke-dashoffset ' + s.dur + 's cubic-bezier(.22,1,.36,1)';
      s.el.style.strokeDashoffset = 0;
      return;
    }
    s.el.classList.add('is-on');
    if (s.kind === 'chart') s.chart.active = true;
    if (s.ring && !instant) ring(s.ring.x, s.ring.y, s.ring.r, 'teal');
  }

  // Onda che si espande da un punto (arrivo del fascio, azione correttiva)
  function ring(x, y, r, kind) {
    var c = el('circle', { 'class': 'mo-ring mo-ring--' + kind, cx: x, cy: y, r: r }, svg);
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 1500);
  }

  // Apertura: il fascio traccia la spina accendendo i processi, arriva alla testa
  // e prosegue sull'anello di ritorno, disegnandolo, fino al cliente di partenza
  var D0 = 0.6, BEAM = 5.2, PAUSE = 0.5, BACK = 3.6;
  // INTRO_SPEED: l'apertura dura circa 4 secondi invece di 10, così il flusso
  // parte prima che il visitatore scorra oltre
  var INTRO_SPEED = 2.5;
  function stepIntro(dt) {
    intro.t += dt * INTRO_SPEED;
    var t = intro.t, pt;
    var k = Math.max(0, Math.min(1, (t - D0) / BEAM));
    var s = ease(k) * mainLen;
    reveal.setAttribute('r', ease(Math.min(1, t / (D0 + BEAM))) * revealMax);
    mainWire.style.strokeDashoffset = mainLen - s;
    steps.forEach(function (st) { if (!st.done && st.at <= s + 2) stepOn(st, false); });
    var kb = Math.max(0, Math.min(1, (t - D0 - BEAM - PAUSE) / BACK));
    if (kb <= 0) {
      pt = mainWire.getPointAtLength(Math.max(0.01, s));
    } else {
      var lenL = loopWire.getTotalLength(), sl = ease(kb) * lenL;
      loopWire.style.transition = 'none';
      loopWire.style.strokeDashoffset = lenL - sl;
      pt = loopWire.getPointAtLength(sl);
      if (kb > 0.25) figure.classList.add('is-drawn');
    }
    beam.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ')');
    beam.setAttribute('opacity', k > 0 ? 1 : 0);
    if (kb >= 1) {
      beam.setAttribute('opacity', 0);
      ring(pt.x, pt.y, 12, 'teal');
      intro.done = true;
    }
  }

  function finishIntro() {
    steps.forEach(function (st) { stepOn(st, true); });
    wiresAll.forEach(function (w) { w.style.transition = 'none'; w.style.strokeDashoffset = 0; });
    if (reveal) reveal.setAttribute('r', revealMax);
    if (beam) beam.setAttribute('opacity', 0);
    figure.classList.add('is-drawn');
    intro = { done: true };
  }

  // Carte di controllo
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function calm(k) { return Math.max(-2.2, Math.min(2.2, gauss() * (k || 0.6))); }
  function vy(v) { return CY - Math.max(-4.3, Math.min(4.3, v)) * KY; }
  function ease(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function lerp(a, b, k) { return a + (b - a) * k; }

  // Andamento regolare di durata variabile, poi deriva, punto fuori limite, ritorno in controllo
  function makeQueue() {
    var s = Math.random() < 0.5 ? -1 : 1, q = [], n = 16 + Math.floor(Math.random() * 24), i;
    for (i = 0; i < n; i++) q.push({ v: calm() });
    q.push({ v: s * 1.6 }, { v: s * 2.5 }, { v: s * (3.5 + Math.random() * 0.6), out: true });
    for (i = 0; i < 3; i++) q.push({ v: calm(0.4) });
    return q;
  }

  function buildChart(n, i) {
    // Il gruppo esterno posiziona la carta; quello interno ("body") si accende come un monitor
    var outer = el('g', { 'class': 'ctl', transform: 'translate(' + n.card.x + ',' + n.card.y + ')' }, svg);
    var g = el('g', { 'class': 'mo mo-card' }, outer);
    el('line', { 'class': 'ctl-lead', x1: n.lead.x, y1: n.lead.y, x2: n.leadEnd.x, y2: n.leadEnd.y }, g);
    el('rect', { 'class': 'ctl-card', width: CW, height: CH, rx: HT ? 3 : 10 }, g);
    if (HT) {
      // Angoli da mirino e spia "dal vivo"
      [[0, 0, 1, 1], [CW, 0, -1, 1], [0, CH, 1, -1], [CW, CH, -1, -1]].forEach(function (a) {
        var x = a[0] - 3 * a[2], y = a[1] - 3 * a[3];
        el('path', { 'class': 'ht-corner', d: 'M' + x + ',' + (y + 9 * a[3]) + ' V' + y + ' H' + (x + 9 * a[2]) }, g);
      });
      el('circle', { 'class': 'ht-live', cx: CW - 10, cy: 9.5, r: 2 }, g);
    }
    el('line', { 'class': 'ctl-limit', x1: PL, x2: PR, y1: vy(3), y2: vy(3) }, g);
    el('line', { 'class': 'ctl-center', x1: PL, x2: PR, y1: CY, y2: CY }, g);
    el('line', { 'class': 'ctl-limit', x1: PL, x2: PR, y1: vy(-3), y2: vy(-3) }, g);
    var plot = el('g', { 'clip-path': 'url(#ctl-clip)' }, g);
    // Traccia da oscilloscopio: alone sfocato sotto la linea
    var glow = el('polyline', { 'class': 'ctl-glow' }, plot);
    var line = el('polyline', { 'class': 'ctl-line' }, plot);
    var pts = [];
    for (var k = 0; k < NPTS + 2; k++) pts.push(el('circle', { 'class': 'ctl-pt', r: 1.7 }, plot));
    el('text', { 'class': 'ctl-title', x: PL, y: 13 }, g).textContent = n.label;
    var status = el('text', { 'class': 'ctl-status', x: PL, y: CH - 5 }, g);
    var dot = el('circle', { 'class': 'ctl-dot', r: 2.6, opacity: 0 }, g);
    var corr = el('circle', { 'class': 'ctl-corr', r: 3.2, opacity: 0 }, g);
    var cpk = HT ? el('text', { 'class': 'ht-cpk', x: CW - 8, y: CH - 5, 'text-anchor': 'end' }, g) : null;

    var c = {
      g: outer, body: g, glow: glow, active: false, line: line, pts: pts, status: status, dot: dot, corr: corr, cpk: cpk, n: n,
      vals: [], queue: makeQueue(), drop: null, phase: 'feed', pt: -2.4 - i * 0.17,
      flashT: 0, cause: null, causeT: 0
    };
    for (k = 0; k < NPTS; k++) c.vals.push({ v: calm() });
    setStatus(c, 'in controllo');
    renderPlot(c, 0);
    return c;
  }

  function setStatus(c, text, alarm) {
    c.status.textContent = text;
    c.status.setAttribute('class', 'ctl-status' + (alarm ? ' is-alarm' : ''));
    c.g.classList.toggle('is-alarm', !!alarm);
  }

  // Disegna la serie; slide (0..1) fa scorrere i punti a sinistra mentre arriva il nuovo dato
  function renderPlot(c, slide) {
    var n = c.vals.length, coords = [];
    c.pts.forEach(function (p, j) {
      if (j >= n) { p.setAttribute('opacity', 0); return; }
      var x = PR - (n - 1 - j) * SP - SP * slide, y = vy(c.vals[j].v);
      // Persistenza del fosforo: i punti più vecchi sbiadiscono
      p.setAttribute('cx', x); p.setAttribute('cy', y); p.setAttribute('opacity', (0.25 + 0.75 * (j + 1) / n).toFixed(2));
      p.setAttribute('class', 'ctl-pt' + (c.vals[j].out ? ' is-out' : ''));
      coords.push(x + ',' + y);
    });
    c.line.setAttribute('points', coords.join(' '));
    c.glow.setAttribute('points', coords.join(' '));
    if (c.cpk && !slide) showCpk(c);
  }

  // Indice di capacità sugli ultimi punti, con i limiti a ±3 sigma come specifica
  function showCpk(c) {
    var v = c.vals.slice(-8).map(function (p) { return p.v; });
    var m = v.reduce(function (a, b) { return a + b; }, 0) / v.length;
    var sd = Math.sqrt(v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (v.length - 1)) || 1;
    var k = Math.max(0, (3 - Math.abs(m)) / (3 * sd));
    c.cpk.textContent = 'Cpk ' + k.toFixed(2);
    c.cpk.setAttribute('class', 'ht-cpk' + (k < 1 ? ' is-alarm' : ''));
  }

  // La causa più vicina al processo, tra le lische che toccano la spina nei dintorni
  function pickCause(c) {
    if (!causes.length) return null;
    var near = causes.slice().sort(function (a, b) { return Math.abs(a.ax - c.n.x) - Math.abs(b.ax - c.n.x); });
    return near[Math.floor(Math.random() * Math.min(3, near.length))];
  }

  function setCause(cause, on) {
    if (!cause) return;
    cause.wire.classList.toggle('is-cause', on);
    cause.pill.classList.toggle('is-cause', on);
  }

  function stepChart(c, dt) {
    var k, e, n = c.n;
    c.pt += dt;
    if (c.flashT > 0) {
      c.flashT -= dt;
      if (c.flashT <= 0) n.node.classList.remove('is-corrected');
    }
    if (c.causeT > 0) {
      c.causeT -= dt;
      if (c.causeT <= 0) { setCause(c.cause, false); c.cause = null; }
    }

    if (c.phase === 'feed') {
      if (!c.drop && c.pt >= GAP) {
        if (!c.queue.length) c.queue = makeQueue();
        c.drop = { item: c.queue.shift(), t: 0 };
      }
      if (!c.drop) return;
      c.drop.t += dt;
      k = Math.min(1, c.drop.t / DROP); e = ease(k);
      c.dot.setAttribute('cx', lerp(n.lead.x, PR, k));
      c.dot.setAttribute('cy', lerp(n.lead.y, vy(c.drop.item.v), k));
      c.dot.setAttribute('opacity', 1);
      renderPlot(c, e);
      if (k >= 1) {
        c.vals.push(c.drop.item);
        if (c.vals.length > NPTS + 1) c.vals.shift();
        c.dot.setAttribute('opacity', 0);
        renderPlot(c, 0);
        c.pt = 0;
        if (c.drop.item.out) {
          // Fuori limite: si accende la causa sulla lisca
          c.phase = 'alarm'; setStatus(c, 'fuori limite', true);
          c.cause = pickCause(c); c.causeT = 1.9; setCause(c.cause, true);
        } else if (c.fixing && c.vals.slice(-8).every(function (p) { return Math.abs(p.v) < 2; })) {
          c.fixing = false; setStatus(c, 'in controllo');
        }
        c.drop = null;
      }
      return;
    }

    if (c.phase === 'alarm' && c.pt >= 0.7) { c.phase = 'correct'; c.pt = 0; }

    if (c.phase === 'correct') {
      // La correzione risale dal punto fuori limite al processo
      k = Math.min(1, c.pt / 0.55); e = ease(k);
      var last = c.vals[c.vals.length - 1];
      c.corr.setAttribute('cx', lerp(PR, n.lead.x, e));
      c.corr.setAttribute('cy', lerp(vy(last.v), n.lead.y, e));
      c.corr.setAttribute('opacity', 1);
      if (k >= 1) {
        c.corr.setAttribute('opacity', 0);
        c.flashT = 0.9;
        n.node.classList.add('is-corrected');
        ring(n.x, n.y, 7, 'amber');
        setStatus(c, HT ? 'correzione' : 'azione correttiva');
        c.fixing = true;
        c.phase = 'feed'; c.pt = 0;
      }
    }
  }

  // Ciclo di animazione.
  // Un unico ciclo lega testimone e anello: il testimone attraversa tutti i processi
  // (mentre dietro di lui l'anello si ritira); arrivato alla testa, la luce torna al
  // cliente di partenza percorrendo l'anello e disegnandolo; poi il testimone riparte.
  var RUN_T = 9, BACK_T = 4, ERASE_T = 2.6;
  function cycle(t) {
    if (cycleStart === null) cycleStart = t;
    var P = RUN_T + BACK_T, c = (((t - cycleStart) % P) + P) % P, lenL = loopWire.getTotalLength();
    var r = { pos: -1, loopOff: lenL, loopDot: -1 };
    if (c < RUN_T) {
      var k = c / RUN_T;
      r.pos = (k < 0.08 ? k * k / 0.16 : k - 0.04) / 0.96 * (mainLen + 34); // partenza dolce
      r.loopOff = c < ERASE_T ? -lenL * ease(c / ERASE_T) : lenL;
      if (r.pos >= mainLen && !cycle.arrived) { cycle.arrived = true; if (headPt) ring(headPt.x, headPt.y, 30, 'teal'); }
    } else {
      cycle.arrived = false;
      var kb = ease((c - RUN_T) / BACK_T);
      r.loopOff = lenL * (1 - kb);
      r.loopDot = kb * lenL;
    }
    return r;
  }

  var running = false, started = false, t0 = 0, last = 0;
  function frame(now) {
    if (!running) return;
    var t = (now - t0) / 1000;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (intro && !intro.done) stepIntro(dt);
    charts.forEach(function (c) { if (c.active) stepChart(c, dt); });
    if (intro && !intro.done) { requestAnimationFrame(frame); return; }
    var cy = cycle(t), head = cy.pos < 0 ? -999 : cy.pos - 17, headPos = Math.max(0, cy.pos);
    loopWire.style.transition = 'none';
    loopWire.style.strokeDashoffset = cy.loopOff;
    pulses.forEach(function (p) {
      if (p.main) { p.el.style.opacity = cy.pos < 0 ? 0 : 1; p.el.style.strokeDashoffset = p.seg - headPos; return; }
      if (p.follow) { p.el.style.opacity = cy.pos < 0 ? 0 : 1; p.el.style.strokeDashoffset = p.seg - headPos; return; }
      if (p.loop) { p.el.style.opacity = cy.loopDot < 0 ? 0 : 1; p.el.style.strokeDashoffset = p.seg - Math.max(0, cy.loopDot); return; }
      var k = ((t + p.offset) / p.period) % 1;
      if (p.mode === 'pingpong') k = k < 0.5 ? k * 2 : (1 - k) * 2;
      var pos = k * (p.len + p.seg);
      p.el.style.strokeDashoffset = p.seg - pos;
    });
    mainNodes.forEach(function (n) {
      n.el.classList.toggle('is-active', Math.abs(head - n.at) < 26);
    });
    requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || running) return;
    running = true;
    last = 0;
    t0 = performance.now() - 2000;
    requestAnimationFrame(frame);
  }

  // Avvio quando la mappa è visibile, pausa quando esce dallo schermo
  function init() {
    build();
    if (reduced) return;
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        started = true;
        start();
      } else {
        running = false;
      }
    }, { threshold: 0 });
    io.observe(figure);

    var lastWide = svg.clientWidth >= 680;
    window.addEventListener('resize', function () {
      var wide = svg.clientWidth >= 680;
      if (wide !== lastWide) { lastWide = wide; build(); }
    });
  }

  if (document.fonts && HT) document.fonts.load('12px "JetBrains Mono"').then(init, init);
  else if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  else init();
})();
